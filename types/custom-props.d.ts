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
