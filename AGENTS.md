<!--
  ============================================================
  Haili 物资管理助手
  作者：韦永昌（Yonon） | https://github.com/Y0N0N/Yonon-wxStorageManage
  ============================================================
-->

# 🚫 硬性规则：微信小程序开发规范

> 本文档为 **最高优先级约束**，所有后续指令、代码修改、文件操作必须遵循以下硬性规则。

---

## 〇、启动读取顺序

每次启动或接受新任务时，按以下顺序读取约束文件：

```
1️⃣ .agents/AGENTS.md          ← 本文档（项目总则，最高优先级）
2️⃣ Haili/_guide/goal.md       ← 产品目标、用户需求、架构定义
3️⃣ Haili/_guide/skills.md     ← 开发技能与工作方式
```

> 任何 `Haili/_guide/` 下的 `.md` 文件与本文档冲突时，以本文档为准。`_guide/` 文件之间的冲突以 `goal.md` 为准。

---

## 一、项目边界

1. **本项目为微信小程序项目**，所有代码、文件、架构决策必须围绕微信小程序展开。
2. **根目录为 `d:\Coding\wx`**，源码位于 `Haili/miniprogram/`。
3. **禁止** 引入任何与微信小程序无关的技术栈（如 React、Vue、Angular、Node.js 后端代码等）。

---

## 二、文件结构规则

### 2.1 页面/组件文件结构
每个页面或组件由 **4 个同名字文件** 组成：

| 文件 | 扩展名 | 用途 |
|------|--------|------|
| 模板 | `.wxml` | 视图层（WeiXin Markup Language） |
| 样式 | `.wxss` | 样式层，**禁止** 使用 `.css` |
| 逻辑 | `.ts` | 逻辑层，微信小程序 + TypeScript |
| 配置 | `.json` | 组件/页面配置 |

### 2.2 目录约定

```
miniprogram/
├── app.json              # 全局配置（页面路由、窗口等）
├── app.scss              # 全局样式（编译为 .wxss）
├── app.ts                # 应用实例入口
├── pages/                # 页面目录
│   └── [page-name]/
│       ├── index.wxml    # 模板
│       ├── index.wxss    # 样式
│       ├── index.ts      # 逻辑
│       └── index.json    # 配置
├── components/           # 公共组件目录
│   └── [component-name]/
│       ├── index.wxml
│       ├── index.wxss
│       ├── index.ts
│       └── index.json
├── utils/                # 工具函数
├── services/             # API 请求封装
├── assets/               # 静态资源（图片、字体等）
│   └── images/
└── models/               # 类型定义 / 数据模型
```

---

## 三、技术选型（硬性）

| 类别 | 强制要求 |
|------|----------|
| 语言 | **TypeScript**（`.ts`），禁止使用纯 JS |
| 样式预处理器 | **Sass/SCSS**（`.scss`）→ 编译为 `.wxss` |
| 渲染引擎 | **Skyline**（已启用，不可回退到 WebView） |
| 组件框架 | **glass-easel**（项目已启用） |
| 基础库最低版本 | **2.32.3** |

---

## 四、API 使用规则

### 4.1 微信原生 API 优先
1. **禁止直接操作 DOM**：微信小程序无 BOM/DOM，所有 UI 变更通过 **数据绑定 + setData** 完成。
2. **必须使用 wx.xxx 系列 API**：
   - 路由：`wx.navigateTo` / `wx.switchTab` / `wx.redirectTo`
   - 网络：`wx.request` / `wx.uploadFile`
   - 存储：`wx.setStorageSync` / `wx.getStorageSync`
   - 交互：`wx.showToast` / `wx.showModal`
3. **禁止** 使用 `window`、`document`、`localStorage`、`XMLHttpRequest` 等 Web API。

### 4.2 数据绑定
1. 使用 `{{ }}` 语法进行数据绑定（WXML 中）。
2. 使用 `wx:for` 进行列表渲染，`wx:if` / `wx:elif` / `wx:else` 进行条件渲染。
3. `setData` 是唯一的视图更新方式，**禁止** 直接修改 `this.data`。

### 4.3 生命周期
严格遵守微信小程序生命周期钩子：

**页面生命周期**（`Page`）：
- `onLoad(options)` — 页面加载时
- `onShow()` — 页面显示时
- `onReady()` — 页面初次渲染完成
- `onHide()` — 页面隐藏时
- `onUnload()` — 页面卸载时
- `onPullDownRefresh()` — 下拉刷新
- `onReachBottom()` — 上拉触底
- `onShareAppMessage()` — 分享

**组件生命周期**（`Component`）：
- `created()` — 组件创建
- `attached()` — 组件挂载
- `ready()` — 组件就绪
- `detached()` — 组件卸载

---

## 五、Skyline 渲染引擎规则

1. **开启状态**：`project.config.json` 中 `skylineRenderEnable: true`
2. **Skyline 下限制**：
   - 部分旧版 WebView 组件**不可用**（如 `textarea`、`video`、`map` 在 Skyline 行为不同）
   - 动画推荐使用 `wx.createAnimation` 或 CSS animation
   - 页面滚动使用 `scroll-view` 替代 `page` 原生滚动（Skyline 下控制更精确）
3. **配置了版本范围**：`"sdkVersionBegin": "3.0.0"` 到 `"sdkVersionEnd": "15.255.255"`

---

## 六、性能规则

1. **setData 精简**：每次 `setData` 仅传递变化的字段，不传整个对象。
2. **避免频繁 setData**：合并多次 `setData` 调用。
3. **列表渲染优化**：
   - 使用 `wx:key` 提高 diff 效率
   - 长列表使用 `recycle-view` 或分页加载
4. **分包加载**：当项目超过 2MB，必须配置 `subPackages`。
5. **图片处理**：
   - 使用 WebP 格式
   - 尺寸适配屏幕密度
   - 使用 `image` 组件的 `lazy-load` 属性

---

## 七、代码风格（硬性）

1. **命名**：
   - 文件/文件夹：`kebab-case`（全小写连字符）
   - 变量/函数：`camelCase`
   - 类/类型/接口：`PascalCase`
   - 常量：`UPPER_SNAKE_CASE`
2. **缩进**：2 空格（项目已配置）
3. **分号**：行末加分号
4. **所有新增页面路径必须注册到 `app.json` 的 `pages` 数组中**
5. **所有新增组件必须注册到 `app.json` 的 `usingComponents` 或页面级 `usingComponents`**

---

## 八、禁止事项

🚫 **以下行为严格禁止：**
1. 生成 React / Vue / Angular 代码
2. 使用 npm 包不兼容微信小程序运行时（无原生 Node.js 模块）
3. 引入 `jQuery`、`axios`、`lodash` 等浏览器/Node 库
4. 使用 `import ... from 'fs'` / `path` 等 Node.js 核心模块
5. 修改 `project.config.json` 中 `miniprogramRoot` 或 `appid`
6. 生成不包含 `.wxml`、`.wxss`、`.ts`、`.json` 四件套的页面/组件
7. 使用 CSS 而非 WXSS / Sass

---

## 九、新增功能流程

新增功能需遵循以下流程：

```
需求分析 → 规划文件结构 → 注册路由/组件 → 
实现 WXML 模板 → 实现 WXSS 样式 → 
实现 TS 逻辑 → 配置 JSON → 验证
```

**每一步都必须检查前一步是否完成。**

---

## 十、关键参考文件

- **项目配置**: `Haili/project.config.json`
- **全局配置**: `Haili/miniprogram/app.json`
- **应用入口**: `Haili/miniprogram/app.ts`
- **全局样式**: `Haili/miniprogram/app.scss`
- **TypeScript 配置**: `Haili/tsconfig.json`
- **产品目标**: `Haili/_guide/goal.md`
- **开发技能规范**: `Haili/_guide/skills.md`

---

*此文件修改需项目负责人确认。*
