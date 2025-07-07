import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, PropType, reactive, Ref, ref, watch } from 'vue'
import {
  TooltipInternalData, TooltipMethods,
  TooltipPrivateRef,
  TooltipReactData,
  VxeTooltipConstructor,
  VxeTooltipPropTypes
} from 'vxe-pc-ui'
import { getAbsolutePos } from '../../ui/src/dom'
import { getLastZIndex, nextZIndex } from '../../ui/src/utils'
import { getSlotVNs } from '../../ui/src/vn'
import XEUtils from 'xe-utils'

export default defineComponent({
  name: 'VxeCustomSeqTooltip',
  props: {
    content: {
      type: [String, Number] as PropType<VxeTooltipPropTypes.Content>,
      default: null
    },
    enterable: {
      type: Boolean as PropType<boolean>,
      default: true
    },
    leaveDelay: {
      type: Number as PropType<number>,
      default: 0
    },
    zIndex: [String, Number] as PropType<VxeTooltipPropTypes.ZIndex>
  },
  setup (props, context) {
    const { slots } = context

    const reactData = reactive<TooltipReactData>({
      target: null,
      isUpdate: false,
      visible: false,
      tipContent: '',
      tipActive: false,
      tipTarget: null,
      tipZindex: 0,
      tipStore: {
        style: {},
        placement: 'right',
        arrowStyle: {}
      }
    })

    const internalData: TooltipInternalData = {}

    const refElem = ref() as Ref<HTMLDivElement>
    const refMaps: TooltipPrivateRef = { refElem }

    const $xeTooltip = {
      props,
      context,
      reactData,
      internalData,
      getRefMaps: () => refMaps
    } as unknown as VxeTooltipConstructor

    let tooltipMethods = {} as Pick<TooltipMethods, 'open' | 'close' | 'updatePlacement' | 'isActived' | 'setActived'>

    // 只实现右侧显示
    const updateTipStyle = () => {
      const { tipTarget, tipStore } = reactData
      if (tipTarget) {
        const { left, top } = getAbsolutePos(tipTarget)
        const el = refElem.value
        const marginSize = 6
        const offsetHeight = el.offsetHeight
        // 右侧显示
        const tipLeft = left + tipTarget.offsetWidth + marginSize + 6
        const tipTop = top + Math.floor((tipTarget.offsetHeight - offsetHeight) / 2)
        tipStore.placement = 'right'
        tipStore.style.top = `${tipTop}px`
        tipStore.style.left = `${tipLeft}px`
        tipStore.arrowStyle.top = `${offsetHeight / 2}px`
        tipStore.arrowStyle.left = '-6px'
      }
    }

    const updateValue = (value: VxeTooltipPropTypes.ModelValue) => {
      if (value !== reactData.visible) {
        reactData.visible = value
        reactData.isUpdate = true
      }
    }

    const updateZIndex = () => {
      if (reactData.tipZindex < getLastZIndex()) {
        reactData.tipZindex = nextZIndex()
      }
    }

    const showTip = () => {
      const { tipStore } = reactData
      const el = refElem.value
      if (el && !el.parentNode) {
        document.body.appendChild(el)
      }
      updateValue(true)
      updateZIndex()
      tipStore.placement = 'right'
      tipStore.style = { width: 'auto', left: 0, top: 0, zIndex: props.zIndex || reactData.tipZindex }
      tipStore.arrowStyle = { left: '-6px' }
      return tooltipMethods.updatePlacement()
    }

    const handleDelayFn = () => {
      internalData.showDelayTip = XEUtils.debounce(() => {
        if (reactData.tipActive) {
          showTip()
        }
      }, 500, { leading: false, trailing: true })
    }
    handleDelayFn()

    const handleVisible = (target: HTMLElement | null, content?: VxeTooltipPropTypes.Content) => {
      if (!content) return nextTick()
      if (target) {
        const { showDelayTip } = internalData
        reactData.tipActive = true
        reactData.tipTarget = target
        reactData.tipContent = content
        if (showDelayTip) {
          showDelayTip()
        }
      }
      return nextTick()
    }

    tooltipMethods = {
      open (target?: HTMLElement | null, content?: VxeTooltipPropTypes.Content) {
        return handleVisible(target || reactData.target as HTMLElement, content)
      },
      close () {
        reactData.tipTarget = null
        reactData.tipActive = false
        Object.assign(reactData.tipStore, {
          style: {},
          placement: '',
          arrowStyle: null
        })
        updateValue(false)
        return nextTick()
      },
      updatePlacement () {
        return nextTick().then(() => {
          const { tipTarget } = reactData
          const el = refElem.value
          if (tipTarget && el) {
            updateTipStyle()
            return nextTick().then(() => {
              updateTipStyle()
            })
          }
        })
      },
      isActived () {
        return reactData.tipActive
      },
      setActived (active) {
        reactData.tipActive = active
      }
    }

    Object.assign($xeTooltip, tooltipMethods)

    const renderContent = () => {
      const { tipContent } = reactData
      const contentSlot = slots.content
      if (contentSlot) {
        return h('div', { class: 'vxe-custom-seq-tooltip-content' }, getSlotVNs(contentSlot({})))
      }
      return h('div', { class: 'vxe-custom-seq-tooltip-content' }, `${tipContent}`)
    }

    const renderVN = () => {
      const { enterable } = props
      const { tipActive, visible, tipStore } = reactData
      const defaultSlot = slots.default
      let ons
      if (enterable) {
        ons = {
          onMouseenter: () => { reactData.tipActive = true },
          onMouseleave: () => { reactData.tipActive = false; tooltipMethods.close() }
        }
      }
      return h('div', {
        ref: refElem,
        class: [
          'vxe-custom-seq-tooltip-wrapper',
          'placement--right',
          'is--enterable',
          { 'is--visible': visible, 'is--active': tipActive }
        ],
        style: tipStore.style,
        ...ons
      }, [
        renderContent(),
        h('div', { class: 'vxe-custom-seq-tooltip-arrow', style: tipStore.arrowStyle }),
        ...(defaultSlot ? getSlotVNs(defaultSlot({})) : [])
      ])
    }

    watch(() => props.content, (val) => {
      reactData.tipContent = val
    })

    onMounted(() => {
      nextTick(() => {
        const wrapperElem = refElem.value
        if (wrapperElem) {
          const parentNode = wrapperElem.parentNode
          if (parentNode) {
            reactData.tipContent = props.content
            reactData.tipZindex = nextZIndex()
            XEUtils.arrayEach(wrapperElem.children, (elem, index) => {
              if (index > 1) {
                parentNode.insertBefore(elem, wrapperElem)
                if (!reactData.target) {
                  reactData.target = elem as HTMLElement
                }
              }
            })
            parentNode.removeChild(wrapperElem)
          }
        }
      })
    })

    onBeforeUnmount(() => {
      const { target } = reactData
      const wrapperElem = refElem.value
      if (target) {
        target.onmouseenter = null
        target.onmouseleave = null
        target.onclick = null
      }
      if (wrapperElem) {
        const parentNode = wrapperElem.parentNode
        if (parentNode) {
          parentNode.removeChild(wrapperElem)
        }
      }
    })

    $xeTooltip.renderVN = renderVN

    return $xeTooltip
  },
  render () {
    return this.renderVN()
  }
})
