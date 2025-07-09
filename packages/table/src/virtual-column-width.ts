/**
 * 虚拟滚动场景下的列宽自适应优化模块
 */
import XEUtils from 'xe-utils'
import { VxeUI } from '../../ui'
import type { VxeTableDefines, VxeTableConstructor } from '../../../types'
import { warnLog } from '../../ui/src/log'

const { formats } = VxeUI

// 列宽计算缓存接口
interface ColumnWidthCache {
  width: number
  dataLength: number
  timestamp: number
  columnHash: string // 列配置的哈希值，用于检测列配置变化
}

// 缓存存储
const autoWidthCacheMap = new Map<string, ColumnWidthCache>()

// 生成列配置哈希
const generateColumnHash = (column: VxeTableDefines.ColumnInfo) => {
  const key = `${column.field}_${column.formatter}_${column.width}_${column.minWidth}`
  return XEUtils.toValueString(key)
}

/**
 * 优化的列宽自适应计算函数
 * 针对虚拟滚动场景进行性能优化
 */
export const calcColumnAutoWidthOptimized = (
  column: VxeTableDefines.ColumnInfo,
  wrapperEl: HTMLDivElement,
  $xeTable: VxeTableConstructor,
  options: {
    isCalcHeader?: boolean
    isCalcBody?: boolean
    isCalcFooter?: boolean
    scrollXLoad?: boolean
    scrollYLoad?: boolean
    tableData?: any[]
    afterFullData?: any[]
  }
) => {
  const {
    isCalcHeader = true,
    isCalcBody = true,
    isCalcFooter = false,
    scrollXLoad = false,
    scrollYLoad = false,
    tableData = [],
    afterFullData = []
  } = options

  // 生成缓存键
  const columnHash = generateColumnHash(column)
  const cacheKey = `${column.id}_${scrollXLoad ? 'virtual' : 'normal'}_${columnHash}`

  // 检查缓存
  const cached = autoWidthCacheMap.get(cacheKey)
  if (cached) {
    const isCacheValid = (
      cached.dataLength === tableData.length &&
      cached.columnHash === columnHash &&
      cached.timestamp > Date.now() - 5000 // 5秒缓存
    )

    if (isCacheValid) {
      return cached.width
    }
  }

  let finalWidth: number

  // 虚拟滚动优化策略
  if (scrollXLoad || scrollYLoad) {
    finalWidth = calcVirtualScrollColumnWidth(column, wrapperEl, $xeTable, {
      isCalcHeader,
      isCalcBody,
      isCalcFooter,
      afterFullData
    })
  } else {
    finalWidth = calcNormalColumnWidth(column, wrapperEl, {
      isCalcHeader,
      isCalcBody,
      isCalcFooter
    })
  }

  // 缓存结果
  autoWidthCacheMap.set(cacheKey, {
    width: finalWidth,
    dataLength: tableData.length,
    timestamp: Date.now(),
    columnHash
  })

  return finalWidth
}

/**
 * 虚拟滚动场景下的列宽计算
 */
const calcVirtualScrollColumnWidth = (
  column: VxeTableDefines.ColumnInfo,
  wrapperEl: HTMLDivElement,
  $xeTable: VxeTableConstructor,
  options: {
    isCalcHeader: boolean
    isCalcBody: boolean
    isCalcFooter: boolean
    afterFullData: any[]
  }
) => {
  const { isCalcHeader, isCalcBody, isCalcFooter, afterFullData } = options

  // 查询可见的单元格
  const querySelections: string[] = []
  if (isCalcHeader) {
    querySelections.push(`.vxe-header-cell--wrapper[colid="${column.id}"]`)
  }
  if (isCalcBody) {
    querySelections.push(`.vxe-body-cell--wrapper[colid="${column.id}"]`)
  }
  if (isCalcFooter) {
    querySelections.push(`.vxe-footer-cell--wrapper[colid="${column.id}"]`)
  }

  const cellElemList = querySelections.length
    ? wrapperEl.querySelectorAll(querySelections.join(','))
    : []

  // 如果可见单元格数量不足，使用采样策略
  if (cellElemList.length < afterFullData.length && isCalcBody && afterFullData.length > 0) {
    return calcColumnWidthBySampling(column, wrapperEl, afterFullData)
  }

  // 使用可见单元格计算宽度
  return calcWidthFromElements(column, cellElemList as NodeListOf<HTMLElement>)
}

/**
 * 普通模式下的列宽计算
 */
const calcNormalColumnWidth = (
  column: VxeTableDefines.ColumnInfo,
  wrapperEl: HTMLDivElement,
  options: {
    isCalcHeader: boolean
    isCalcBody: boolean
    isCalcFooter: boolean
  }
) => {
  const { isCalcHeader, isCalcBody, isCalcFooter } = options

  const querySelections: string[] = []
  if (isCalcHeader) {
    querySelections.push(`.vxe-header-cell--wrapper[colid="${column.id}"]`)
  }
  if (isCalcBody) {
    querySelections.push(`.vxe-body-cell--wrapper[colid="${column.id}"]`)
  }
  if (isCalcFooter) {
    querySelections.push(`.vxe-footer-cell--wrapper[colid="${column.id}"]`)
  }

  const cellElemList = querySelections.length
    ? wrapperEl.querySelectorAll(querySelections.join(','))
    : []

  return calcWidthFromElements(column, cellElemList as NodeListOf<HTMLElement>)
}

/**
 * 从DOM元素计算列宽
 */
const calcWidthFromElements = (
  column: VxeTableDefines.ColumnInfo,
  cellElemList: NodeListOf<HTMLElement>
) => {
  let leftRightPadding = 0
  const firstCellEl = cellElemList[0]

  if (firstCellEl && firstCellEl.parentElement) {
    const cellStyle = getComputedStyle(firstCellEl.parentElement)
    leftRightPadding = Math.ceil(
      XEUtils.toNumber(cellStyle.paddingLeft) +
      XEUtils.toNumber(cellStyle.paddingRight)
    )
  }

  let colWidth = (column.renderAutoWidth || 100) - leftRightPadding

  for (let i = 0; i < cellElemList.length; i++) {
    const cellEl = cellElemList[i]
    if (cellEl) {
      colWidth = Math.max(colWidth, Math.ceil(cellEl.scrollWidth) + 4)
    }
  }

  return colWidth + leftRightPadding
}

/**
 * 采样计算列宽（用于虚拟滚动场景下可见单元格不足的情况）
 * 智能采样版本：确保捕获最长内容
 */
const calcColumnWidthBySampling = (
  column: VxeTableDefines.ColumnInfo,
  wrapperEl: HTMLDivElement,
  afterFullData: any[]
) => {
  const { field, formatter } = column

  if (!field || !afterFullData.length) {
    return column.renderAutoWidth || 100
  }

  // 创建临时测量元素
  const measureEl = document.createElement('div')
  measureEl.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: nowrap;
    font-size: inherit;
    font-family: inherit;
    font-weight: inherit;
    letter-spacing: inherit;
    padding: 0;
    margin: 0;
    border: 0;
    top: -9999px;
    left: -9999px;
  `

  // 复制表格单元格的样式
  const existingCell = wrapperEl.querySelector('.vxe-body-cell--wrapper')
  if (existingCell) {
    const styles = getComputedStyle(existingCell)
    measureEl.style.fontSize = styles.fontSize
    measureEl.style.fontFamily = styles.fontFamily
    measureEl.style.fontWeight = styles.fontWeight
    measureEl.style.letterSpacing = styles.letterSpacing
  }

  wrapperEl.appendChild(measureEl)

  let maxWidth = 0

  try {
    // 计算表头宽度
    if (column.getTitle) {
      measureEl.textContent = column.getTitle()
      maxWidth = Math.max(maxWidth, measureEl.offsetWidth)
    }

    // 智能采样策略：基于内容长度的采样
    const contentLengthMap: { index: number; length: number; value: string }[] = []

    // 第一步：遍历所有数据，记录内容长度
    afterFullData.forEach((row, index) => {
      let cellValue = XEUtils.get(row, field)

      // 应用格式化器
      if (formatter) {
        try {
          if (XEUtils.isString(formatter)) {
            const formatOpts = formats.get(formatter)
            if (formatOpts) {
              const formatMethod = formatOpts.tableCellFormatMethod ||
                                 formatOpts.cellFormatMethod
              if (formatMethod) {
                cellValue = formatMethod({ cellValue, row, column })
              }
            }
          } else if (XEUtils.isFunction(formatter)) {
            cellValue = formatter({ cellValue, row, column })
          }
        } catch (e) {
          warnLog('Column formatter error:', e)
        }
      }

      const displayValue = XEUtils.isNull(cellValue) ? '' : String(cellValue)
      contentLengthMap.push({
        index,
        length: displayValue.length,
        value: displayValue
      })
    })

    // 第二步：按内容长度排序，优先采样长内容
    contentLengthMap.sort((a, b) => b.length - a.length)

    // 第三步：智能分层采样
    const sampledIndexes = new Set<number>()
    const maxSamples = 100 // 增加采样数量以提高准确性

    // 3.1 采样最长的内容（前20%）
    const topLongCount = Math.min(20, Math.floor(contentLengthMap.length * 0.2))
    for (let i = 0; i < topLongCount; i++) {
      sampledIndexes.add(contentLengthMap[i].index)
    }

    // 3.2 按长度分层采样（确保不同长度区间都有代表）
    const lengthRanges = 5 // 分成5个长度区间
    const maxLength = contentLengthMap[0]?.length || 0
    const minLength = contentLengthMap[contentLengthMap.length - 1]?.length || 0
    const lengthStep = Math.max(1, Math.floor((maxLength - minLength) / lengthRanges))

    for (let range = 0; range < lengthRanges; range++) {
      const rangeMin = minLength + range * lengthStep
      const rangeMax = minLength + (range + 1) * lengthStep

      // 在每个长度区间内采样几个代表
      const rangeItems = contentLengthMap.filter(item =>
        item.length >= rangeMin && item.length < rangeMax
      )

      const rangeSamples = Math.min(3, Math.ceil(rangeItems.length * 0.1))
      for (let j = 0; j < rangeSamples && j < rangeItems.length; j++) {
        const sampleIndex = Math.floor(j * rangeItems.length / rangeSamples)
        sampledIndexes.add(rangeItems[sampleIndex].index)
      }
    }

    // 3.3 均匀位置采样（确保数据分布的代表性）
    const positionSamples = Math.min(20, Math.floor(afterFullData.length * 0.05))
    const positionStep = Math.max(1, Math.floor(afterFullData.length / positionSamples))
    for (let i = 0; i < afterFullData.length; i += positionStep) {
      sampledIndexes.add(i)
    }

    // 3.4 随机采样补充
    const remainingSamples = maxSamples - sampledIndexes.size
    if (remainingSamples > 0) {
      const remainingIndexes = []
      for (let i = 0; i < afterFullData.length; i++) {
        if (!sampledIndexes.has(i)) {
          remainingIndexes.push(i)
        }
      }

      // 随机选择剩余的采样点
      for (let i = 0; i < Math.min(remainingSamples, remainingIndexes.length); i++) {
        const randomIndex = Math.floor(Math.random() * remainingIndexes.length)
        sampledIndexes.add(remainingIndexes[randomIndex])
        remainingIndexes.splice(randomIndex, 1)
      }
    }

    // 第四步：测量采样的内容宽度
    const sortedSampleIndexes = Array.from(sampledIndexes).sort((a, b) => a - b)

    // console.log(`智能采样策略：总数据${afterFullData.length}条，采样${sortedSampleIndexes.length}条`)
    // console.log(`最长内容长度：${maxLength}，最短内容长度：${minLength}`)
    // console.log(`采样覆盖范围：第${sortedSampleIndexes[0]}行到第${sortedSampleIndexes[sortedSampleIndexes.length - 1]}行`)

    // 额外记录：优先测量最长的几个内容
    const topLongContents = contentLengthMap.slice(0, Math.min(10, contentLengthMap.length))
    topLongContents.forEach(item => {
      measureEl.textContent = item.value
      const width = measureEl.offsetWidth
      maxWidth = Math.max(maxWidth, width)
      // console.log(`最长内容测量：长度${item.length}，宽度${width}px，内容："${item.value.substring(0, 20)}${item.value.length > 20 ? '...' : ''}"`)
    })

    // 测量采样的所有内容
    for (const index of sortedSampleIndexes) {
      const item = contentLengthMap.find(item => item.index === index)
      if (item) {
        measureEl.textContent = item.value
        maxWidth = Math.max(maxWidth, measureEl.offsetWidth)
      }
    }

    // 添加额外的间距和安全边距
    maxWidth += 24
  } finally {
    wrapperEl.removeChild(measureEl)
  }

  return Math.max(maxWidth, column.renderAutoWidth || 100)
}

/**
 * 清除列宽缓存
 */
export const clearColumnWidthCache = (columnId?: string) => {
  if (columnId) {
    // 清除特定列的缓存
    for (const key of autoWidthCacheMap.keys()) {
      if (key.startsWith(columnId)) {
        autoWidthCacheMap.delete(key)
      }
    }
  } else {
    // 清除所有缓存
    autoWidthCacheMap.clear()
  }
}

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => {
  return {
    size: autoWidthCacheMap.size,
    keys: Array.from(autoWidthCacheMap.keys())
  }
}
