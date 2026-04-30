# 🤖 Agent Context: Wayland Debug Reader

> **写给未来的 AI 助手（Agent）**：
> 这份文档总结了本项目的架构设计、业务逻辑以及迭代过程中形成的关键决策。请在接手后续开发或进行 Debug 时，首先阅读本文档以建立正确的项目上下文。

---

## 1. 项目简介 (Project Overview)
本项目是一个**纯前端的 Web 端 Wayland 协议日志阅读器**。
它用于解析并可视化由设置了 `WAYLAND_DEBUG=1` 环境变量产生出的调试日志，以友好的 UI（包含语法高亮、侧边栏对象追踪、搜索与过滤）帮助开发者排查 Wayland 协议的通讯细节。

*   **部署环境**：纯静态 Web 应用，托管于 GitHub Pages。
*   **依赖声明**：**零依赖**。没有使用 React/Vue、没有使用 npm、没有使用 TailwindCSS。全部由纯 HTML、CSS 和 Vanilla JavaScript 构建。

## 2. 核心架构与文件结构

项目代码极度精简，主要围绕两个文件展开：

*   **`index.html` (View & Controller)**：
    *   包含所有的布局结构、CSS 样式（深色护眼模式）。
    *   处理所有的交互逻辑（拖拽文件、粘贴、搜索、过滤、侧边栏拖拽重置宽度）。
    *   负责构建 DOM (`renderLog`) 并管理全局状态（如过滤开关、多选对象 `highlightedUniqueIds`、搜索匹配高亮）。
*   **`wayland-debug-tools.js` (Model / Parser)**：
    *   核心的日志解析引擎。
    *   使用正则表达式匹配现代 Wayland 日志格式：`[timestamp] {Queue Name} obj#id.fn(...)`。
    *   负责将纯文本拆解为结构化的数据 (`event`, `request`, `comment`)，并跟踪所有的对象生成与参数关联（`appState`）。

## 3. 关键业务逻辑与踩坑点 (Critical Context)

未来的 Agent 在修改代码时，请**务必注意以下几点历史遗留的知识和决策**：

### 3.1 Wayland 对象的 ID 复用 (ID Recycling)
*   **现象**：在 Wayland 协议中，对象销毁后，其 ID（如 `wl_callback#38`）会被频繁回收重用。
*   **处理策略**：解析器（`wayland-debug-tools.js`）在遇到 `new id` 时，如果发现 `id` 已经在 `liveObjectsById` 字典中，**直接覆盖即可**，无需抛出异常。
*   **唯一标识**：为了区分复用同一个 ID 的不同对象生命周期，我们为每个新对象生成了 `uniqueId`。UI 层的所有高亮和选择，**必须依赖 `uniqueId`** 而不是协议原生的 `id`。

### 3.2 多选高亮逻辑 (Multi-Selection Highlighting)
*   **数据结构**：在 `index.html` 中，选中的对象保存在 `let highlightedUniqueIds = new Set();` 中。
*   **功能表现**：用户可以点击左侧侧边栏的 Object Chip，或日志行中的对象标签，实现**多对象的叠加选择**。
*   **过滤联动**：当开启“仅高亮对象” (`highlight-only`) 时，只有事件/请求的**发送者 (object)** 或**参数 (args)** 中包含了任何一个存在于 `highlightedUniqueIds` 里的对象，该行才会被显示。

### 3.3 “搜索” 与 “过滤” 的模式分离 (Search vs Filter)
*   **过滤模式 (Filter)**：不包含搜索词的行会被直接隐藏（在构建 DOM 时被丢弃）。
*   **搜索模式 (Search)**：**不隐藏任何行**，保留完整的日志上下文流。
    *   匹配的行会添加 `.search-match`（蓝色发光边带）。
    *   当前通过导航按钮（上一个/下一个）激活的行会添加 `.search-active`（带有高亮背景色和强烈的纯白 Outline 以增加辨识度）。
    *   搜索导航具有状态数组 `currentSearchMatches` 和 `currentSearchIndex`。

### 3.4 时间戳解析与相对时间 (Timestamp & Time Diff)
*   日志正则 `logLine` 会捕获最前面的时间戳字符串，并由 `parseFloat()` 转化为 `line.timestamp`。
*   如果开启了**相对时间** (`showTimeDiff = true`)，系统会寻找日志中**第一个有效的数字时间戳作为基准 0 点**，后续日志显示为相对时间差（如 `[+0.016]`），便于排查性能和延迟问题。

## 4. 性能边界 (Performance Limitations)

*   **当前做法**：`renderLog()` 会清空 `log-panel` 并使用 `DocumentFragment` 一次性全量插入所有通过了过滤条件的行。
*   **潜在瓶颈**：对于十万行以上的巨型日志，如果用户选择显示所有内容（不进行任何过滤），DOM 的一次性生成会导致浏览器短时间卡顿。
*   **未来优化建议**：如果未来用户抱怨性能问题，请不要盲目引入第三方库，建议使用原生的 **Virtual Scrolling (虚拟列表)** 技术来重构 `renderLog()` 的输出。

---
> *Keep it simple, keep it fast.* 🚀
