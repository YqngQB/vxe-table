# vxe-table

[简体中文](README.md) | [繁體中文](README.zh-TW.md) | English | [日本語](README.ja-JP.md)  

[![star](https://gitee.com/x-extends/vxe-table/badge/star.svg?theme=gvp)](https://gitee.com/x-extends/vxe-table/stargazers)
[![npm version](https://img.shields.io/npm/v/vxe-table.svg?style=flat-square)](https://www.npmjs.com/package/vxe-table)
[![NodeJS with Webpack](https://github.com/x-extends/vxe-table/actions/workflows/webpack.yml/badge.svg)](https://github.com/x-extends/vxe-table/actions/workflows/webpack.yml)
[![npm downloads](https://img.shields.io/npm/dt/vxe-table.svg?style=flat-square)](https://npm-stat.com/charts.html?package=vxe-table)
[![issues](https://img.shields.io/github/issues/x-extends/vxe-table.svg)](https://github.com/x-extends/vxe-table/issues)
[![issues closed](https://img.shields.io/github/issues-closed/x-extends/vxe-table.svg)](https://github.com/x-extends/vxe-table/issues?q=is%3Aissue+is%3Aclosed)
[![pull requests](https://img.shields.io/github/issues-pr/x-extends/vxe-table.svg)](https://github.com/x-extends/vxe-table/pulls)
[![pull requests closed](https://img.shields.io/github/issues-pr-closed/x-extends/vxe-table.svg)](https://github.com/x-extends/vxe-table/pulls?q=is%3Apr+is%3Aclosed)
[![npm license](https://img.shields.io/github/license/mashape/apistatus.svg)](LICENSE)

A [vue](https://www.npmjs.com/package/vue) based PC form component, support add delete change check, virtual tree, drag and drop, lazy loading, shortcut menu, data verification, import/export/print, form rendering, custom template, renderer, JSON configuration...

## Browser Support

![Edge](https://raw.github.com/alrra/browser-logos/master/src/edge/edge_48x48.png) | ![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png) | ![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png) | ![Opera](https://raw.github.com/alrra/browser-logos/master/src/opera/opera_48x48.png) | ![Safari](https://raw.github.com/alrra/browser-logos/master/src/safari/safari_48x48.png)
--- | --- | --- | --- | --- |
Latest ✔ | Latest ✔ | Latest ✔ | Latest ✔ | Latest ✔ |

## Features

* [x] Basic table
* [x] Configuration grid
* [x] Striped
* [x] Table with border
* [x] Cell style
* [x] Column resizing
* [x] Column drag and drop
* [x] Row drag and drop
* [x] Minimum/maximum height
* [x] Resize height & width
* [x] Fixed column
* [x] Grouping table header
* [x] Table footer
* [x] Highlight row & column
* [x] Table sequence
* [x] Radio
* [x] Checkbox
* [x] Sorting
* [x] Multi field sorting
* [x] Filter
* [x] Merged cells
* [x] Merged footer items
* [x] 行分组
* [x] Import/Export/Print
* [x] Show/Hide column
* [x] Drag and drop/Customize column sorting
* [x] Loading
* [x] Formatted cell
* [x] Slot - template
* [x] Context menu
* [x] Detail - Expandable row
* [x] Toolbar
* [x] Virtual tree
* [x] Editable CRUD
* [x] Validate
* [x] Data Proxy
* [x] Keyboard navigation
* [x] VxeGlobalRenderer
* [x] Virtual scroll
* [x] Virtual merger
* [x] CSS Variable Theme
* [x] ([Enterprise](https://vxetable.cn/pluginDocs/)) Grouping summary
* [x] ([Enterprise](https://vxetable.cn/pluginDocs/)) Aggregation
* [x] ([Enterprise](https://vxetable.cn/pluginDocs/)) Cell area selection
* [x] ([Enterprise](https://vxetable.cn/pluginDocs/)) Cell copy & paste
* [x] ([Enterprise](https://vxetable.cn/pluginDocs/)) Cell find and replace
* [x] ([Enterprise](https://vxetable.cn/pluginDocs/)) Full keyboard operation
* [x] ([Enterprise](https://vxetable.cn/pluginDocs/)) Integrated chart

## Installing

Version: [vue](https://www.npmjs.com/package/vue) 3.x

```shell
npm install vxe-table@next
```

Get on [unpkg](https://unpkg.com/vxe-table/) and [cdnjs](https://cdn.jsdelivr.net/npm/vxe-table/)

### NPM

### Use Table

```javascript
// ...
import VxeTable from 'vxe-table'
import 'vxe-table/lib/style.css'
// ...

createApp(App).use(VxeTable).mount('#app')
```

### Use Table and UI

```javascript
// ...
import VxeTable from 'vxe-table'
import 'vxe-table/lib/style.css'
// ...

import VxeUI from 'vxe-pc-ui'
import 'vxe-pc-ui/lib/style.css'
// ...

createApp(App).use(VxeUI).use(VxeTable).mount('#app')
```

### CDN

Use a third-party CDN to remember to lock the version number to avoid being affected by incompatible updates.  
***It is not recommended to use the CDN address of a third party in a formal environment because the connection can fail at any time***  

```HTML
<!-- style -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vxe-pc-ui/lib/style.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vxe-table@next/lib/style.css">
<!-- vue -->
<script src="https://cdn.jsdelivr.net/npm/vue"></script>
<!-- table -->
<script src="https://cdn.jsdelivr.net/npm/xe-utils"></script>
<script src="https://cdn.jsdelivr.net/npm/vxe-pc-ui"></script>
<script src="https://cdn.jsdelivr.net/npm/vxe-table@next"></script>
```

## Example

```html
<template>
  <div>
    <vxe-table :data="tableData">
      <vxe-column type="seq" title="Seq" width="60"></vxe-column>
      <vxe-column field="name" title="Name"></vxe-column>
      <vxe-column field="role" title="Role"></vxe-column>
      <vxe-colgroup title="Group1">
        <vxe-column field="sex" title="Sex"></vxe-column>
        <vxe-column field="address" title="Address"></vxe-column>
      </vxe-colgroup>
    </vxe-table>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const tableData = ref([
  { id: 10001, name: 'Test1', role: 'Develop', sex: 'Man', address: 'Shenzhen' },
  { id: 10002, name: 'Test2', role: 'Test', sex: 'Man', address: 'Guangzhou' },
  { id: 10003, name: 'Test3', role: 'PM', sex: 'Man', address: 'Shanghai' }
])
</script>
```

## Online Documents

👉 [UI Document](https://vxeui.com)  
👉 [Table Document](https://vxetable.cn)  

## Run the project

Install dependencies

```shell
npm run update
```

Start local debugging

```shell
npm run serve
```

Compile packaging, generated compiled directory: es,lib

```shell
npm run lib
```

## Contributors

Thank you to everyone who contributed to this project.

[![vxe-table](https://contrib.rocks/image?repo=x-extends/vxe-table)](https://github.com/x-extends/vxe-table/graphs/contributors)

## License

[MIT](LICENSE) © 2019-present, Xu Liangzhan
