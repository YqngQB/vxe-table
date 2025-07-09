import { clearColumnWidthCache, calcColumnAutoWidthOptimized } from './virtual-column-width'
import { unref } from 'vue'
import { warnLog } from '../../ui/src/log'

/**
 * 虚拟滚动列宽自适应优化补丁
 * 用于集成到 table.ts 中的优化代码
 */

// 替换原始的 calcColumnAutoWidth 函数：
export const optimizedCalcColumnAutoWidth = (column: any, wrapperEl: HTMLDivElement, $xeTable: any) => {
  const { reactData, internalData } = $xeTable
  const { scrollXLoad, scrollYLoad, tableData } = reactData
  const { afterFullData } = internalData

  const columnOpts = $xeTable.computeColumnOpts?.value || {}
  const { autoOptions } = columnOpts
  const { isCalcHeader = true, isCalcBody = true, isCalcFooter = false } = autoOptions || {}

  // 虚拟滚动优化：使用专门的优化算法
  if (scrollXLoad || scrollYLoad) {
    try {
      // 导入优化模块
      return calcColumnAutoWidthOptimized(column, wrapperEl, $xeTable, {
        isCalcHeader,
        isCalcBody,
        isCalcFooter,
        scrollXLoad,
        scrollYLoad,
        tableData,
        afterFullData
      })
    } catch (error) {
      warnLog('虚拟滚动列宽优化失败，降级到原始算法')
    }
  }

  // 原始算法（保持向后兼容）
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

  const cellElemList = querySelections.length ? wrapperEl.querySelectorAll(querySelections.join(',')) : []
  let leftRightPadding = 0
  const firstCellEl = cellElemList[0]
  if (firstCellEl && firstCellEl.parentElement) {
    const cellStyle = getComputedStyle(firstCellEl.parentElement)
    leftRightPadding = Math.ceil(
      parseFloat(cellStyle.paddingLeft || '0') +
      parseFloat(cellStyle.paddingRight || '0')
    )
  }

  let colWidth = (column.renderAutoWidth || 100) - leftRightPadding
  for (let i = 0; i < cellElemList.length; i++) {
    const celEl = cellElemList[i] as HTMLDivElement
    colWidth = Math.max(colWidth, celEl ? Math.ceil(celEl.scrollWidth) + 4 : 0)
  }
  return colWidth + leftRightPadding
}

// 优化的 calcCellWidth 函数：
export const optimizedCalcCellWidth = ($xeTable: any) => {
  const { reactData, internalData } = $xeTable
  const { scrollXLoad, scrollYLoad } = reactData
  const autoWidthColumnList = $xeTable.computeAutoWidthColumnList?.value || []
  const { fullColumnIdData } = internalData
  const el = unref($xeTable.getRefMaps().refElem)

  if (!el) return

  // 虚拟滚动场景下的优化策略
  if (scrollXLoad || scrollYLoad) {
    // 分批处理列宽计算，避免一次性计算所有列导致的性能问题
    const batchSize = 5
    const batches:any[] = []
    for (let i = 0; i < autoWidthColumnList.length; i += batchSize) {
      batches.push(autoWidthColumnList.slice(i, i + batchSize))
    }

    // 使用 requestAnimationFrame 分批处理
    const processBatch = (batchIndex: number) => {
      if (batchIndex >= batches.length) {
        $xeTable.analyColumnWidth()
        el.removeAttribute('data-calc-col')
        return
      }

      const batch = batches[batchIndex]
      el.setAttribute('data-calc-col', 'Y')

      batch.forEach((column: any) => {
        const colid = column.id
        const colRest = fullColumnIdData[colid]
        const colWidth = optimizedCalcColumnAutoWidth(column, el, $xeTable)

        if (colRest) {
          colRest.width = Math.max(colWidth, colRest.width)
        }
        column.renderAutoWidth = colWidth
      })

      // 下一帧处理下一批
      requestAnimationFrame(() => processBatch(batchIndex + 1))
    }

    processBatch(0)
  } else {
    // 非虚拟滚动场景使用原始逻辑
    el.setAttribute('data-calc-col', 'Y')
    autoWidthColumnList.forEach((column: any) => {
      const colid = column.id
      const colRest = fullColumnIdData[colid]
      const colWidth = optimizedCalcColumnAutoWidth(column, el, $xeTable)

      if (colRest) {
        colRest.width = Math.max(colWidth, colRest.width)
      }
      column.renderAutoWidth = colWidth
    })
    $xeTable.analyColumnWidth()
    el.removeAttribute('data-calc-col')
  }
}

// 添加缓存清理函数到 tableMethods 中：
export const addCacheClearMethod = (tableMethods: any) => {
  tableMethods.clearColumnWidthCache = (columnId?: string) => {
    try {
      clearColumnWidthCache(columnId)
    } catch (error) {
      warnLog('清除列宽缓存失败')
    }
  }
}

// 在数据更新时清除缓存的优化逻辑：
export const optimizedDataUpdateHandler = ($xeTable: any) => {
  const { reactData } = $xeTable
  const { scrollXLoad, scrollYLoad } = reactData

  // 在虚拟滚动场景下，数据更新时清除相关缓存
  if (scrollXLoad || scrollYLoad) {
    try {
      clearColumnWidthCache() // 清除所有缓存
    } catch (error) {
      warnLog('清除列宽缓存失败')
    }
  }
}
