import { ref, watch, Ref, computed, onMounted, nextTick } from 'vue'
import { type VxeTableConstructor } from '../../../types'
import { getRefElem } from './util'
import { useKeyModifier, usePointer } from '@vueuse/core'

/**
 * 鼠标位置与表格滚动位置绑定功能
 * @param tableRef 表格组件的引用
 * @param containerRef 表格容器元素的引用
 * @param options 配置选项
 * @returns 返回包含状态和方法的对象
 */
export function useTableMouseScroll (
  tableRef: VxeTableConstructor,
  containerRef: Ref<HTMLDivElement | undefined>,
  options: {
    requireKey?: 'Shift' | 'CapsLock' | 'Alt' | 'Meta' | null,
    edgeSensitivity?: number, // 边缘灵敏度，值越大越容易触发边缘滚动
    monitorFixedColumns?: boolean // 是否监听固定列区域
  } = {}
) {
  // 默认配置
  const { requireKey = null, edgeSensitivity = 20, monitorFixedColumns = true } = options

  // 是否启用鼠标位置绑定滚动
  const manualEnabled = ref(false)

  // 表格区域引用
  const fixedColumnsInitialized = ref(false)

  // 监听修饰键状态
  const shiftPressed = useKeyModifier('Shift')
  const capsLockPressed = useKeyModifier('CapsLock')
  const altPressed = useKeyModifier('Alt')
  const metaPressed = useKeyModifier('Meta')

  // 根据配置和修饰键状态计算是否启用
  const isEnabled = computed(() => {
    // 如果需要按住特定修饰键
    if (requireKey) {
      switch (requireKey) {
        case 'Shift': return manualEnabled.value && shiftPressed.value
        case 'CapsLock': return manualEnabled.value && capsLockPressed.value
        case 'Alt': return manualEnabled.value && altPressed.value
        // 检测 Meta 键（Windows 上是 Win 键，Mac 上是 Command 键）
        case 'Meta': return manualEnabled.value && metaPressed.value
        default: return manualEnabled.value
      }
    } else {
      return manualEnabled.value
    }
  })

  // 初始化多个区域的鼠标追踪
  const mainPointer = { x: ref(0), y: ref(0) }
  const leftFixedPointer = { x: ref(0), y: ref(0) }
  const rightFixedPointer = { x: ref(0), y: ref(0) }

  // 延迟初始化固定列
  const initFixedColumns = () => {
    if (!tableRef || fixedColumnsInitialized.value) return

    const { internalData } = tableRef

    // 检查 elemStore 是否存在
    if (!internalData?.elemStore) {
      console.warn('表格内部数据结构不完整，无法初始化固定列监听')
      return
    }

    const { x, y } = usePointer({ target: getRefElem(internalData.elemStore['main-body-table']) })
    if (x && y) {
      mainPointer.x = x
      mainPointer.y = y
    } else {
      console.warn('未找到主表格元素，无法初始化鼠标位置追踪')
      return
    }

    // 检查左侧固定列表格
    const leftBodyTable = getRefElem(internalData.elemStore['left-body-table'])
    if (leftBodyTable) {
      const { x, y } = usePointer({ target: leftBodyTable })
      leftFixedPointer.x = x
      leftFixedPointer.y = y
    } else {
      console.log('未找到左侧固定列表格')
    }

    // 检查右侧固定列表格
    const rightBodyTable = getRefElem(internalData.elemStore['right-body-table'])
    if (rightBodyTable) {
      console.log('找到右侧固定列表格', rightBodyTable)
      const { x, y } = usePointer({ target: rightBodyTable })
      rightFixedPointer.x = x
      rightFixedPointer.y = y

      fixedColumnsInitialized.value = true
    }
  }

  // 当启用固定列监听时，初始化左右固定区域的鼠标追踪
  if (monitorFixedColumns) {
    onMounted(() => {
      // 表格可能需要一点时间来渲染固定列
      setTimeout(() => {
        initFixedColumns()
      }, 20)
    })
  }

  // 监听鼠标位置变化
  watch(
    [
      () => mainPointer.x.value,
      () => mainPointer.y.value,
      () => leftFixedPointer.x.value,
      () => leftFixedPointer.y.value,
      () => rightFixedPointer.x.value,
      () => rightFixedPointer.y.value,
      isEnabled
    ],
    ([mainX, mainY, leftX, leftY, rightX, rightY, enabled]) => {
      if (!enabled || !containerRef.value || !tableRef) return

      // 获取表格容器的边界信息
      const containerRect = containerRef.value.getBoundingClientRect()

      // 获取表格内部结构元素
      const { internalData } = tableRef
      const bodyElement = getRefElem(internalData.elemStore['main-body-scroll'])
      const headerElement = getRefElem(internalData.elemStore['main-header-scroll'])
      const footerElement = getRefElem(internalData.elemStore['main-footer-scroll'])

      if (!bodyElement) return

      // 计算表头和表尾的高度
      const headerHeight = headerElement ? headerElement.offsetHeight : 0
      const footerHeight = footerElement ? footerElement.offsetHeight : 0

      // 使用的鼠标坐标 - 优先使用当前激活区域的坐标
      let currentX = mainX
      let currentY = mainY

      // 检查鼠标是否在固定列区域
      if (monitorFixedColumns && fixedColumnsInitialized.value) {
        const leftTable = getRefElem(internalData.elemStore['left-body-table'])
        const rightTable = getRefElem(internalData.elemStore['right-body-table'])

        // 判断鼠标是否在左侧固定区域
        if (leftTable) {
          const leftRect = leftTable.getBoundingClientRect()
          if (
            mainX >= leftRect.left &&
            mainX <= leftRect.right &&
            mainY >= leftRect.top &&
            mainY <= leftRect.bottom
          ) {
            currentX = leftX || mainX
            currentY = leftY || mainY
          }
        }

        // 判断鼠标是否在右侧固定区域
        if (rightTable) {
          const rightRect = rightTable.getBoundingClientRect()
          if (
            mainX >= rightRect.left &&
            mainX <= rightRect.right &&
            mainY >= rightRect.top &&
            mainY <= rightRect.bottom
          ) {
            currentX = rightX || mainX
            currentY = rightY || mainY
          }
        }
      }

      // 计算鼠标相对于表格体（不包括表头和表尾）的位置
      const relativeX = currentX - containerRect.left
      const relativeY = currentY - containerRect.top - headerHeight

      // 获取表格容器的可见尺寸（不包括表头和表尾）
      const containerWidth = containerRef.value.clientWidth
      const containerHeight = containerRef.value.clientHeight - headerHeight - footerHeight

      // 获取表格内容的总尺寸
      const totalWidth = bodyElement.scrollWidth
      const totalHeight = bodyElement.scrollHeight

      // 计算可滚动的最大距离
      const maxScrollLeft = totalWidth - containerWidth
      const maxScrollTop = totalHeight - containerHeight

      // 如果内容不需要滚动，则不执行操作
      if (maxScrollLeft <= 0 && maxScrollTop <= 0) return

      // 判断是否在边缘区域，优化极端位置的体验
      let percentX = 0
      let percentY = 0

      // 水平方向边缘检测
      if (relativeX <= edgeSensitivity) {
        // 左边缘区域
        percentX = 0
      } else if (relativeX >= containerWidth - edgeSensitivity) {
        // 右边缘区域
        percentX = 1
      } else {
        // 非边缘区域，正常计算比例
        percentX = Math.max(0, Math.min(1, relativeX / containerWidth))
      }

      // 垂直方向边缘检测
      if (relativeY <= edgeSensitivity) {
        // 上边缘区域
        percentY = 0
      } else if (relativeY >= containerHeight - edgeSensitivity) {
        // 下边缘区域
        percentY = 1
      } else {
        // 非边缘区域，正常计算比例
        percentY = Math.max(0, Math.min(1, relativeY / containerHeight))
      }

      // 计算对应的滚动位置
      const scrollLeft = maxScrollLeft > 0 ? Math.round(percentX * maxScrollLeft) : 0
      const scrollTop = maxScrollTop > 0 ? Math.round(percentY * maxScrollTop) : 0

      // 设置表格滚动位置
      tableRef.scrollTo(scrollLeft, scrollTop).then(_ => {})
    },
    {
      deep: true
    }
  )

  // 启用鼠标位置绑定滚动
  const enable = () => {
    manualEnabled.value = true
  }

  // 禁用鼠标位置绑定滚动
  const disable = () => {
    manualEnabled.value = false
  }

  // 切换启用/禁用状态
  const toggle = () => {
    manualEnabled.value = !manualEnabled.value
  }

  return {
    isEnabled,
    enable,
    disable,
    toggle
  }
}
