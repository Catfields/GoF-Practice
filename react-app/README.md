# 设计模式刷题平台（前端）

React + Vite 客户端，采用 **Neo-Brutalism（粗野主义）** UI 风格，设计语言镜像
[BrutxUI](https://www.brutxui.site/docs/components)：粗 3px 描边、硬质偏移投影、
无圆角、高对比配色。全局 token 定义在 `src/index.css`，组件样式集中在
`src/components/ui/brutal.css`，改一处即可全局换肤。

## 目录

```
src/
  main.jsx               应用入口（挂载 <App/>）
  App.jsx                路由：/ 与 /problem/:id
  index.css              Neo-Brutalism 全局 token 与基底
  lib/                   纯函数：api 封装、输出格式化
  pages/                 页面（首页 / 题目详情页）
  components/
    ui/                  Brutalist 基础组件：Button / Card / Badge / Dialog / Console / Progress
    layout/              TopBar 与侧边栏布局
    editor/              零依赖代码编辑器（CodeEditor + 词法高亮）
```

## 代码编辑器

编辑器是零依赖的自研实现（`src/components/editor/`），保留原版三层结构：
行号层 `.ced-gutter`、高亮层 `.ced-code`、透明输入层 `textarea`。
`editor-lexer.js` 是词法分析器，为 Python / Java / Go / JavaScript 提供逐行高亮。

## 开发

```bash
npm install
npm run dev       # Vite 开发服务器（代理 /api 到后端，见 vite.config.js）
npm run build     # 产物输出到 dist/
npm run lint      # oxlint 检查
```

> 生产模式由仓库根目录的 `server.js` 托管本目录的 `dist/`（SPA 入口），
> `/api/*` 与自检页 `/browser-check` 由后端直接提供。改代码后 `npm run build` 即可。