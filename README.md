# 设计模式刷题平台

本地版刷题网站：通过 23 道算法题学习 23 种设计模式。前端使用 **React + Vite**，
采用 **Neo-Brutalism（粗野主义）** UI 风格（镜像 [BrutxUI](https://www.brutxui.site/docs/components)
的设计语言：粗 3px 描边、硬质偏移投影、无圆角、高对比配色）。

## 快速开始

首次使用先安装后端 / SQLite 与前端依赖，并构建一次：

```bash
npm install           # 安装服务端和 SQLite 依赖
npm run install:ui     # 在 react-app/ 里 npm install
npm run build          # 构建 React 产物到 react-app/dist
node server.js         # 默认 http://localhost:3000
PORT=3123 node server.js   # 换端口
```

server.js 会在启动时优先托管 `react-app/dist`（把它作为 SPA 入口），`/api/*`
接口与自检页面（`/browser-check`）仍按原样工作。改前端代码后重新 `npm run build`
即可，无需重启后端（接口未变）；开发期也可用 `npm run dev` 起 Vite 热更新。

首次启动会探测本机的 Python / Java / Go / Node 运行时，只启用装好的语言。

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 题目列表 | 按创建型 / 结构型 / 行为型分组，显示每题通过状态与总进度 |
| 题目详情 | 题干含「题目说明（背景）」故事、题目讲解、模式结构、适用场景、输入输出、示例 |
| 代码编辑器 | 自研零依赖编辑器：语法高亮、行号、自动缩进、括号引号配对、注释切换、软换行开关 |
| 在线运行 | 自定义输入运行，展示 stdout / stderr / 超时 |
| 在线判题 | 逐条测试用例比对，全部通过才记为 AC |
| 数据持久化 | SQLite 保存通过的提交历史；JSON 保存答题进度、代码草稿与自定义输入 |
| 提交记录 | 每次通过的提交（代码 + 测试结果）都会持久化保留，可在对应题目页自行翻阅 |

### 代码编辑器

编辑器由三层构成（`react-app/src/components/editor/editor.js` +
`react-app/src/components/editor/editor-lexer.js`，React 组件封装为 `CodeEditor`）：

- **行号层**：`.ced-gutter`，随滚动同步位移；
- **高亮层**：`.ced-code`，由词法分析器输出带 class 的 span；
- **输入层**：透明文字的 `textarea`，负责真实输入与选区。

键盘行为：

| 按键 | 行为 |
| --- | --- |
| `Enter` | 按上一行缩进自动续行；行尾是 `:` `{` `(` `[` 时多缩进一级；在空括号中间回车会展开成三行 |
| `Tab` / `Shift+Tab` | 缩进 / 反缩进（支持多行选区整体缩进） |
| `Alt+/`（或 `Ctrl+/`） | 注释 / 取消注释选中行，按语言选择注释符 |
| `Backspace` | 在空括号中间一次删掉一对；在空白缩进处按档位退格 |
| `Ctrl/Cmd+Z`、`Ctrl/Cmd+Y` | 撤销 / 重做（回落 textarea 原生历史） |

工具栏提供「自动换行」软换行开关（状态记在 localStorage）与「注释」按钮。

### 数据持久化

- 进度：`data/progress.json`，记录 `solved` / `attempts` / `lastLang` / `lastTime` / `firstSolvedTime`。
- 草稿：`data/drafts.json`，结构为 `{ 题目id: { 语言: { code, input, updatedAt } } }`。
  编辑后 800ms 防抖保存，切换语言、运行、提交、离开页面时立即落盘；重新打开题目会
  自动恢复草稿、自定义输入与上次使用的语言。
- 提交记录：保存到 `data/history.sqlite` 的 SQLite 数据库中，包含提交代码、输入、逐用例测试结果和时间。
  仅当某次提交全部测试用例通过（AC）时才写入，在题目页点「提交记录」按钮即可查看。
  首次启动会自动把旧的 `data/submissions.json` 导入数据库；列表只返回概览，代码与结果在
  点击某条记录时再按需拉取。
- 「重置」会删除当前语言的草稿并恢复初始模板。

接口：

```
GET    /api/meta                          运行时与存储信息
GET    /api/patterns                      题目列表 + 进度
GET    /api/problem/:id                   题目详情（含 background / drafts / progress）
GET    /api/problem/:id/solution?lang=    参考答案
GET    /api/problem/:id/submissions        已通过的提交记录列表（概览）
GET    /api/problem/:id/submissions/:sid   某条提交记录的完整详情（代码 + 测试结果）
DELETE /api/problem/:id/submissions/:sid   删除某条提交记录
GET    /api/draft/:id/:lang               读取草稿
PUT    /api/draft/:id/:lang               保存草稿 { code, input }
DELETE /api/draft/:id/:lang               删除某语言草稿
DELETE /api/drafts                        清空所有草稿
POST   /api/run                           运行 { language, code, input }
POST   /api/submit                        判题 { id, language, code }
```

### 存储位置回退

项目内 `data/` 不可写时（例如放进只读目录，或在受限沙箱里运行），服务会自动把
`progress.json` / `drafts.json` / `history.sqlite` / 运行临时文件放到系统临时目录，并在启动日志与
`/api/meta` 里给出提示，功能不中断。可用 `DP_DATA_DIR` 强制指定目录：

```bash
DP_DATA_DIR=D:\dp-data node server.js
```

读取时会合并「项目目录」与「回退目录」两份副本，以较新的为准，所以在可写与不可写
两种运行方式之间来回切换也不会丢记录。

## 自检

```bash
npm test              # 词法单测 + 接口端到端（需要先启动服务）
npm run test:lexer    # 只跑词法单测，不需要服务
npm run test:browser  # 用本机 Chrome/Edge 无头跑编辑器行为自检（需要先启动服务）
```

- `lexer-test.cjs`：11 条用例，覆盖四种语言的关键字/字符串/注释/数字/类名识别，
  以及三引号、文本块、块注释跨行、模板串、Go 原始字符串、中文标识符等边界。
- `history-store-test.cjs`：验证 JSON 历史迁移、SQLite 持久化、重启读取和记录删除。
- `e2e-verify.cjs`：接口断言，含提交历史读写删、草稿读写删、多语言隔离、非法入参与进度落盘。
- `browser-check.html` + `browser-verify.cjs`：61 项浏览器断言，覆盖高亮、自动缩进、
  括号配对、注释切换、行号、滚动同步、两层几何对齐、软换行高度、草稿往返。
  其中 `shot.cjs` 可用于给题目页截图，便于人工确认外观。
  （自检页走老的 `public/` 编辑器副本；React 版编辑器是同一逻辑的 ES Module 移植，
  词法单测 `lexer-test.cjs` 已指向 `react-app/` 的权威实现。）

## 实现备注（踩过的坑）

`public/js/editor-lexer.js` 里把每条规则拼成一个合并正则，用 `exec` 逐个取 token。
（说明：这段源码在历史上位于 `public/js/`，React 版已移植到
`react-app/src/components/editor/editor-lexer.js`，逻辑一致。）
这里有三处很容易写错、已在本项目踩到并修复的地方，注释里都有标注：

1. **规则不能匹配空串**。曾经用 `(?:[fFrRbBuU]{1,3})?(?=""")` 表示 Python 字符串
   前缀，它整体可空，会在每次 `exec` 时命中行首的零长结果。
2. **不能反向引用不存在的捕获组**。`\1` 指向不存在的组时被当成空串，配合 `*`
   量词同样会匹配零长字符串。三引号规则因此改用等价字符类写法。
3. **合并正则里不能用 `\b`**。正则前面多了 `(?:`，而 `:` 是非单词字符，于是 `\b`
   会在 `:` 与首字母之间「成立」，产生一个带捕获的零长假匹配。现在统一用
   `(?<![0-9A-Za-z_$]) ... (?![0-9A-Za-z_$])` 显式表达单词边界，也顺带正确处理了
   中文标识符（JS 的 `\b` 不把中文当单词字符）。

多行结构（三引号、Java 文本块、Go 原始字符串、块注释、JS 模板串）统一用
「查找闭合定界符」的状态机推进，而不是用带 `*` 量词的正则去匹配，否则遇到
「只剩开头定界符」的情况会只匹配开头、把状态又推回给自己，导致闭合被吞掉、
后续所有行都变成字符串（表现为整篇代码失去高亮）。
