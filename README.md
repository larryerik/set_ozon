# Ozon 供货管理工具 (Set Ozon)

一个基于 React + Vite 构建的 Ozon 平台供货装配管理系统，用于帮助卖家高效管理供货订单、配置箱子/托盘装配方案，并一键提交到 Ozon 仓库。

## ✨ 功能特性

- **供货订单同步** - 从 Ozon API 同步最新供货订单数据
- **供货管理** - 查看和管理多个供货任务
- **装配配置**
  - 设置单箱数量、箱条码、保质期
  - 灵活分配箱数和托盘数
  - 自动校验：最大 200 箱，有托盘时箱子最多 30 个
- **产品配置缓存** - 全局缓存产品配置，提高效率
- **一键执行** - 批量提交所有供货装配数据到后端 API

## 🛠️ 技术栈

- **前端框架**: React 19
- **构建工具**: Vite 7
- **路由**: React Router DOM 7
- **样式**: TailwindCSS 3
- **UI 组件**: Radix UI + shadcn/ui 风格组件
- **图标**: Lucide React

## 📁 项目结构

```
set_ozon/
├── src/
│   ├── components/
│   │   └── ui/           # UI 基础组件 (Button, Table, Input 等)
│   ├── pages/
│   │   ├── Home.jsx      # 首页 - 供货订单列表和同步
│   │   ├── Edit.jsx      # 编辑页 - 装配配置
│   │   ├── Settings.jsx  # 设置页 - API 配置
│   │   └── RootLayout.jsx
│   ├── lib/
│   │   └── utils.js      # 工具函数
│   ├── main.jsx          # 应用入口
│   └── index.css         # 全局样式
├── public/
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
# 克隆项目
git clone <your-repo-url>
cd set_ozon

# 安装依赖
npm install
```

### 开发

```bash
# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 查看应用。

### 构建

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📖 使用指南

### 1. 配置 API

首先进入 **设置** 页面，填写您的 Ozon API 凭证：

- **Client-Id**: Ozon 提供的客户端 ID
- **Api-Key**: Ozon 提供的 API 密钥

### 2. 同步供货订单

在首页点击 **同步** 按钮，从 Ozon API 获取最新的供货订单数据。

### 3. 编辑装配

点击供货订单的 **编辑** 按钮进入供货订单详情，然后：

1. 选择供货项，点击 **编辑装配**
2. 在弹窗中配置：
   - **单箱数量**: 每箱包含的产品数量
   - **箱条码**: 箱子的条形码（已分配时必填）
   - **保质期**: 可选的产品保质期
3. 分配箱数到对应产品
4. 如需托盘，点击 **添加托盘** 并分配箱数
5. 点击 **保存**

### 4. 执行供货

配置完成后，点击页面顶部的 **执行** 按钮，系统会：

- 检查是否所有产品都已完全装配
- 提示未完全装配的产品
- 确认后发送数据到后端 API

## ⚙️ 后端 API

本应用需要配合后端服务使用，后端应提供以下接口：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/orders` | POST | 同步供货订单数据 |
| `/create-cargoes` | POST | 提交装配数据 |

默认后端地址: `http://localhost:8000`

## 📋 业务规则

- 最大箱数限制：**200 箱**
- 使用托盘时，散箱最多 **30 箱**
- 每个托盘最多 **30 箱**
- 已分配产品必须填写箱条码

## 🔧 脚本命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产版本 |
| `npm run lint` | 运行 ESLint 检查 |

## 📄 许可证

私有项目 - 保留所有权利

---

> 如有问题或建议，欢迎提交 Issue 或 PR。
