# Haili 物资管理助手

<p align="center">
  <strong>📦 办公室物资管理微信小程序</strong>
</p>

<p align="center">
  面向高校/行政办公室的轻量级物资管理工具，以活动为维度管理物资的借出与归还，让帐篷、桌子、胶凳等物资的进出库管理透明、可追溯。
</p>

---

## 📋 目录

- [项目介绍](#项目介绍)
- [版本信息](#版本信息)
- [技术栈](#技术栈)
- [项目架构](#项目架构)
- [功能概览](#功能概览)
- [页面说明](#页面说明)
- [用户角色与权限](#用户角色与权限)
- [数据模型](#数据模型)
- [业务流程](#业务流程)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [测试账号](#测试账号)
- [种子数据](#种子数据)
- [提交审核信息](#提交审核信息)

---

## 项目介绍

**Haili**（海丽）是一款办公室物资管理助手微信小程序。

在日常行政工作中，帐篷、折叠桌、胶凳等物资经常需要借出给各部门使用，传统的手写登记方式容易丢失记录、难以追溯。Haili 解决了这个问题：

- **去向可查** — 每件物资谁借的、谁还的、什么时候、多少数量，一目了然
- **状态可见** — 当前库存、借出中、待归还，看板式直观展示
- **操作可溯** — 每一次编辑、借出、归还都有完整操作日志

---

## 版本信息

| 项目 | 信息 |
|------|------|
| **版本号** | v1.0.0 |
| **种子数据版本** | v4 |
| **基础库最低版本** | 2.32.3 |
| **渲染引擎** | Skyline |
| **组件框架** | glass-easel |
| **开发语言** | TypeScript + Sass |
| **数据层** | 微信本地存储（wx.setStorageSync） |

---

## 技术栈

### 前端

| 技术 | 用途 |
|------|------|
| **TypeScript** | 全部业务逻辑，禁用 any 类型声明 |
| **Sass/SCSS** | 样式预编译（.scss → .wxss） |
| **WXML** | 微信小程序视图层模板 |
| **WXSS** | 微信小程序样式层（WXSS 不支持 // 注释） |
| **Skyline 渲染引擎** | 微信新一代渲染引擎，替代 WebView |
| **glass-easel** | 微信新版组件框架 |
| **微信原生 API** | wx.setStorageSync / wx.showToast / wx.navigateTo 等 |

### 架构

- **客户端**：纯微信小程序，不依赖第三方库
- **数据层**：本地存储（wx.setStorageSync），JSON 序列化
- **路由**：微信原生路由体系，9 个页面
- **认证**：自定义账号密码 + 本地 Session

> 后续可接入微信云开发或自建后端替换本地存储层。

---

## 项目架构

### 设计理念

系统以**活动（Activity）**为核心维度组织物资借还：

```
活动（Activity）     ← 一次借出/归还事件
 ├── 活动名称、举办时间、主办单位、申请单位
 ├── 负责人、联系人、联系方式
 ├── 学生助理（经办人）
 ├── 物资用途、备注
 │
 └── 活动物资明细（ActivityItem）  ← 每种物资的借还数量
      ├── 帐篷 × 3 顶（已还 0）
      ├── 胶凳 × 10 张（已还 5）
      └── ...
```

### 数据流

```
借出操作
  → 创建 Activity + ActivityItem  →  扣减 Material.currentStock  →  写入 OperationLog

归还操作
  → 更新 ActivityItem.returnedQuantity  →  恢复 Material.currentStock  →  更新 Activity.status  →  写入 OperationLog

物资管理操作
  → 新增/修改/删除 Material  →  写入 OperationLog（类型：material_change）
```

### 活动状态机

```
                  ┌─────────┐
    借出          │ active  │ ◀── 逾期判定 → overdue（UI 标记）
     │            └────┬────┘
     ▼                 │
  ┌────────┐           │ 部分归还
  │ partial│◀──────────┘
  └───┬────┘
      │ 全部归还              其他处理
      ▼                        ▼
  ┌──────────┐           ┌─────────┐
  │ returned │           │ special │ ──→ resolved
  └──────────┘           └─────────┘
```

---

## 功能概览

### 核心功能

| 功能 | 说明 |
|------|------|
| 🔑 **登录认证** | 账号密码登录，区分管理员和学生助理 |
| 📋 **操作日志** | 三类日志（因活动借出 / 因活动归还 / 物资变动），支持分类筛选 |
| 📤 **借出物资** | 按活动多物资借出，完整信息链（活动名称→举办时间→主办单位→申请单位→物资用途→联系人→负责人） |
| 📥 **归还物资** | 按活动归还，每种物资独立填写归还数量，支持部分归还 |
| 🔶 **其他处理** | 标记活动为"特殊"或"已处理"（不归还物资，仅状态变更） |
| 📦 **物资管理** | 物资的增删改查，自动记录操作日志 |
| 👥 **账号管理** | 管理员管理学生助理账号，支持启用/禁用 |

### 辅助功能

- 日期选择器（picker mode="date"）
- 键盘防遮挡（cursor-spacing="300"）
- 库存进度条可视化
- iOS 日期兼容（parseDate 函数）
- 种子数据版本控制自动刷新

---

## 页面说明

| # | 页面 | 路由 | 功能概要 | 访问权限 |
|:-:|------|------|----------|:--------:|
| 1 | 🔑 登录 | `/pages/login` | 账号密码登录，底部显示测试账号 | - |
| 2 | 🏠 看板 | `/pages/dashboard` | 用户身份、借出中活动数、逾期数、快捷操作入口、最近动态 | 所有登录用户 |
| 3 | 📋 日志列表 | `/pages/logs` | 三种分类筛选，标题仅显示活动名称，点击进入详情 | 所有登录用户 |
| 4 | 📄 日志详情 | `/pages/log-detail` | 完整活动信息（活动名称→举办时间→主办单位→申请单位→物资用途→联系人→借出时间→预计归还→负责人） | 所有登录用户 |
| 5 | 📤 借出物资 | `/pages/borrow` | 填写活动信息 → 选择多物资 → 设置数量 → 提交借出 | 仅学生助理 |
| 6 | 📥 借出/归还 | `/pages/borrow-list` | 借出中/全部活动 Tab，归还弹窗，其他处理（特殊/已处理） | 学生助理可操作，管理员可查看 |
| 7 | 📦 物资目录 | `/pages/materials` | 物资列表、搜索、库存进度条，FAB 按钮新增 | 所有登录用户，编辑仅助理 |
| 8 | ✏️ 物资编辑 | `/pages/material-edit` | 新增/编辑/删除物资，自动记录物资变动日志 | 仅学生助理 |
| 9 | 👥 账号管理 | `/pages/users` | 新增/编辑/删除/启用禁用学生助理，显示可用/禁用状态 | 仅管理员 |

---

## 用户角色与权限

| 功能 | 管理员 | 学生助理 |
|------|:------:|:--------:|
| 登录 | ✅ | ✅ |
| 查看看板/目录/日志 | ✅ | ✅ |
| 查看借出/归还记录 | ✅ | ✅ |
| 借出物资 | ❌ | ✅ |
| 归还物资 | ❌ | ✅ |
| 其他处理（特殊/已处理） | ❌ | ✅ |
| 新增/编辑/删除物资 | ❌ | ✅ |
| 创建学生助理账号 | ✅ | ❌ |
| 编辑学生助理账号 | ✅ | ❌ |
| 删除学生助理账号 | ✅ | ❌ |
| 启用/禁用学生助理 | ✅ | ❌ |

---

## 数据模型

### 用户（User）

```typescript
interface User {
  id: string;           // 唯一标识
  username: string;     // 登录账号
  password: string;     // 登录密码
  name: string;         // 显示姓名
  role: 'admin' | 'assistant';  // 角色
  phone?: string;       // 电话
  createdAt: string;    // 创建时间
  isActive: boolean;    // 是否启用
}
```

### 物资（Material）

```typescript
interface Material {
  id: string;
  name: string;           // 物资名称（如"帐篷"）
  category: string;       // 类别
  spec?: string;          // 规格
  totalQuantity: number;  // 总数量
  currentStock: number;   // 当前在库
  unit: string;           // 单位（个/张/把/顶/箱）
  createdAt: string;
  updatedAt: string;
}
```

### 活动（Activity）

```typescript
interface Activity {
  id: string;
  activityName: string;       // 活动名称
  holdDate: string;           // 举办时间
  organizer: string;          // 主办单位
  borrower: string;           // 申请单位/借用人
  contactPerson: string;      // 联系人
  contactPhone: string;       // 联系方式
  responsiblePerson: string;  // 负责人
  assistantName: string;      // 学生助理（经办人）
  borrowTime: string;
  expectedReturnTime: string;
  actualReturnTime?: string;
  status: ActivityStatus;     // active / partial / returned / special / resolved
  note: string;               // 物资用途
  extraNote: string;          // 额外备注
  handler: string;            // 处理人（其他处理时）
  createdAt: string;
}
```

### 活动物资明细（ActivityItem）

```typescript
interface ActivityItem {
  id: string;
  activityId: string;
  materialId: string;
  materialName: string;
  quantity: number;          // 借出数量
  returnedQuantity: number;  // 已归还数量
  unit: string;
}
```

### 操作日志（OperationLog）

```typescript
interface OperationLog {
  id: string;
  operatorName: string;         // 操作人
  operationType: OperationType; // activity_borrow / activity_return / material_change
  activityId?: string;          // 关联活动 ID
  activityName?: string;        // 活动名称
  materialId: string;
  materialName: string;
  quantityChange?: number;
  relatedPerson?: string;
  beforeSnapshot?: object;
  afterSnapshot?: object;
  timestamp: string;
  detail: string;
}
```

---

## 业务流程

### 借出流程

```
1. 填写活动信息
   ├── 活动名称（必填）
   ├── 举办时间（日期选择器）
   ├── 主办单位（必填）
   ├── 申请单位（必填）
   ├── 物资用途（可选）
   ├── 联系人 + 联系方式（必填）
   ├── 负责人（必填）
   ├── 预计归还日期（日期选择器）
   └── 备注（可选）

2. 选择物资
   ├── 点击"点击选择物资" → 弹出库存列表
   ├── 点击物资 → 添加到已选列表
   └── 修改每种物资的借出数量

3. 提交
   ├── 创建 Activity 记录
   ├── 创建 ActivityItem 记录（每种物资一条）
   ├── 扣减对应库存
   └── 写入 OperationLog（类型：activity_borrow）
```

### 归还流程

```
1. 借出中 Tab → 找到活动卡片
2. 点击"归还物资"
3. 弹窗填写
   ├── 每种物资输入归还数量
   ├── 接收人（必填）
   └── 备注（可选）
4. 提交
   ├── 更新 ActivityItem.returnedQuantity
   ├── 恢复物资库存
   ├── 更新 Activity.status（partial / returned）
   └── 写入 OperationLog（类型：activity_return）
```

### 其他处理流程

```
1. 借出中 Tab → 点击"其他处理"
2. 弹窗填写
   ├── 处理人（必填）
   └── 处理说明（可选）
3. 操作
   ├── "标记为特殊" → Activity.status = special
   └── "标记为已处理" → Activity.status = resolved
   ※ 此操作不归还物资、不影响库存
```

---

## 项目结构

```
Haili/                          # 项目根目录
├── project.config.json         # 微信开发者工具配置
├── project.private.config.json # 私有配置
├── tsconfig.json               # TypeScript 配置
├── typings/                    # 类型定义
│
├── .agents/
│   └── AGENTS.md               # AI 开发规范约束（最高优先级）
│
└── miniprogram/                # 小程序源码
    ├── app.json                # 全局配置（9 个页面路由）
    ├── app.ts                  # 应用入口（初始化种子数据）
    ├── app.scss                # 全局样式 + CSS 变量
    ├── sitemap.json            # 搜索索引配置
    │
    ├── config/
    │   └── config.json         # 测试账号参考（不参与逻辑）
    │
    ├── models/
    │   └── index.ts            # 所有 TypeScript 数据模型定义
    │
    ├── services/
    │   ├── auth.service.ts     # 登录/注销/权限守卫
    │   ├── storage.service.ts  # 本地存储 CRUD + 种子数据（v4）
    │   └── log.service.ts      # 操作日志记录工具
    │
    ├── pages/
    │   ├── login/              # 🔑 登录页
    │   ├── dashboard/          # 🏠 看板主页
    │   ├── logs/               # 📋 操作日志列表
    │   ├── log-detail/         # 📄 日志详情页
    │   ├── borrow/             # 📤 借出物资
    │   ├── borrow-list/        # 📥 借出/归还（含其他处理）
    │   ├── materials/          # 📦 物资目录
    │   ├── material-edit/      # ✏️ 物资编辑
    │   └── users/              # 👥 账号管理
    │
    ├── components/
    │   └── navigation-bar/     # 自定义导航栏组件
    │
    └── utils/
        └── util.ts             # 工具函数
```

---

## 快速开始

### 前置条件

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 微信小程序 AppID（在微信公众平台申请）

### 运行步骤

```bash
# 1. 下载项目（暂未开放克隆）

# 2. 用微信开发者工具打开 Haili 目录
```

> ⚠️ 微信开发者工具中，如首次运行或种子数据有更新，请点击 **"清除缓存 → 清除数据缓存"** 刷新种子数据。

### 注意事项

- 项目使用 **Skyline 渲染引擎**，确认微信开发者工具已开启 Skyline 模式
- 使用 **Sass** 预编译器，在 `project.config.json` 中已配置 `useCompilerPlugins: ["typescript", "sass"]`
- 微信开发者工具需开启 **ES6 转 ES5**(`"es6": false`)，因此不兼容可选链 `?.` 语法

---

## 测试账号

| 账号 | 密码 | 角色 | 姓名 |
|:----:|:----:|:----:|:----:|
| `admin` | `admin123` | 管理员 | 管理员 |
| `zhang` | `123456` | 学生助理 | 张助理 |
| `li` | `123456` | 学生助理 | 李助理 |
| `wang` | `123456` | 学生助理 | 王助理 |

---

## 种子数据

### 物资（7 种）

| 物资 | 库存 | 单位 |
|------|:----:|:----:|
| 帐篷 | 17 | 顶 |
| 折叠桌 | 24 | 张 |
| 胶凳 | 90 | 张 |
| 遮阳伞 | 15 | 把 |
| 扩音器 | 8 | 个 |
| 警戒带 | 38 | 卷 |
| 矿泉水 | 42 | 箱 |

### 活动（3 条）

| 活动 | 物资 | 状态 |
|------|------|:----:|
| 校运会 | 帐篷×3、胶凳×10 | 📤 借出中（已逾期） |
| 学生会团建 | 矿泉水×8、警戒带×2 | 📤 借出中 |
| 办公室会议 | 折叠桌×6、胶凳×10 | ✅ 已归还 |

---

## 提交审核信息

- **名称：** Haili 物资管理助手
- **描述：** 办公室物资管理工具。管理员可管理学生助理账号，学生助理可登记物资的借出与归还，支持按活动分类管理，自动生成操作日志，方便追踪物资去向。
- **测试账号：** 管理员账号：admin / admin123；学生助理账号：zhang / li / wang，密码均为 123456

---

## 开发规范

项目配置了完整的 AI 开发约束体系，使用时优先读取：

```
1️⃣ AGENTS.md        ← 微信小程序硬性规范（最高优先级）
2️⃣ Haili/_guide/goal.md      ← 产品目标与功能定义
3️⃣ Haili/_guide/skills.md    ← 开发技能与工作方式
```

---

## 项目信息

- **作者：** 韦永昌（Yonon）
- **开源地址：** [Yonon-wxStorageManage](https://github.com/Y0N0N/Yonon-wxStorageManage)

---

## License

MIT
