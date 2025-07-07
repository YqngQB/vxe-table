import type { VxeGridConstructor, VxeGridPrivateMethods } from './index'
import { VNode } from 'vue'

export type MouseScrollConfig = {
  /**
   * 让表格可以根据鼠标在表格区域的位置自动滚动内容
   */
  enabled?: boolean
  /**
   * 配置项
   */
  config?: {
    /**
     * 需要按下的按键
     */
    requireKey?: 'Shift' | 'CapsLock' | 'Alt' | 'Meta' | 'Control' | null,
    /**
     * 边缘灵敏度，值越大越容易触发边缘滚动
     */
    edgeSensitivity?: number,
  }
}

export type SeqTooltipConfig = {
  /**
   * 启用自定义序列号提示,一般用于显示当前行的唯一id
   */
  enabled?: boolean
  /**
   * 需要显示的行字段
   */
  field: string
  formatMethod?: (params:any)=> string | null | undefined
  /**
   * 提示内容插槽
   */
  contentSlot: ((params: {
    $grid: (VxeGridConstructor<any> & VxeGridPrivateMethods<any>) | null;
    tooltip: any
  }) => VNode)
}
