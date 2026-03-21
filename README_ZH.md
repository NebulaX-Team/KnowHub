# 知枢 - 个人知识管理系统（中文文档）

> 语言切换: [English](./README.md) | [简体中文](./README_ZH.md)
>
> 原项目地址（Upstream）：https://github.com/LunaDeerTech/Schema
>
> 更新日志：[`CHANGELOG.md`](./CHANGELOG.md)

知枢 是一个面向个人使用的知识管理系统，可理解为“个人版 Confluence”。

## 功能概览

- 富文本编辑：基于 Tiptap，支持表格、任务列表、代码块、图片、页面引用、数学公式等
- 层级知识组织：支持知识库（Library）、分组（Group）与页面（Page）树形结构
- 分组节点：可在知识库内创建类似文件夹的分组，用于组织页面层级
- 标签管理：页面可关联标签并进行筛选
- 版本历史：支持页面版本记录、恢复与清理
- 文件上传：支持图片上传、替换、删除，并关联页面/知识库
- 公开分享：可通过 `publicSlug` 对外公开页面、知识库和用户资料
- 认证与权限：JWT 登录鉴权 + 管理员能力（用户管理、系统设置）
- 设置中心：后台提供知识库、页面、分组、用户、资源与系统配置等独立管理页
- 系统配置：站点信息、SMTP 配置可通过后台管理

## 技术栈

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 后端 | NestJS 10 + TypeScript | API 服务与业务逻辑 |
| 数据库 | better-sqlite3 / PostgreSQL | 默认 SQLite，支持切换 PostgreSQL |
| 前端 | Vue 3 + Vite + TypeScript | 单页应用 |
| 状态管理 | Pinia | 前端状态管理 |
| UI 组件 | Naive UI | 组件库 |
| 编辑器 | Tiptap | 富文本编辑 |

## 架构与模块

- API 前缀：`/api/v1`
- 后端核心模块：
  - `auth`：登录、注册、验证码、重置密码
  - `user`：用户信息与密码相关能力
  - `library`：知识库管理（数据存储在 `Page` 表，`type='library'`）
  - `page`：页面管理、树结构、标签关联、版本历史
  - `tag`：标签 CRUD
  - `search`：登录态搜索建议
  - `public`：公开页面/知识库/用户资料查询
  - `upload`：图片上传与资源管理
  - `system`：站点信息与 SMTP 配置
  - `health`：健康检查

## 快速开始

## 前置要求

- Node.js 20+（建议 LTS）
- bun 或 pnpm
- Git

## 安装依赖

```bash
git clone https://github.com/NebulaX-Team/KnowHub.git
cd KnowHub

# 方式 A（bun）
bun install

# 方式 B（pnpm）
# pnpm install
```

`client` 已配置为 workspace 子包，所以在根目录安装一次即可。

## 配置环境变量

```bash
cp .env.example .env
```

推荐从以下模板开始（按需调整）：

```env
# Runtime
NODE_ENV=development
PORT=3000

# Database
DB_TYPE=sqlite
DB_PATH=./dev.db

# PostgreSQL（当 DB_TYPE=postgres 时生效）
# DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/knowhub
# PGHOST=127.0.0.1
# PGPORT=5432
# PGUSER=postgres
# PGPASSWORD=postgres
# PGDATABASE=knowhub
# PGSSL=false
# PGSSL_REJECT_UNAUTHORIZED=false

# JWT
JWT_SECRET=please-change-me
JWT_EXPIRES_IN=7d

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

注意：
- `DB_TYPE` 支持 `sqlite` 与 `postgres`（默认 `sqlite`）。
- 当 `DB_TYPE=sqlite` 时，后端数据库路径使用 `DB_PATH`。
- SQLite 支持 `file:./dev.db` 与普通路径两种写法。
- 当 `DB_TYPE=postgres` 时，推荐使用 `DATABASE_URL`，也支持 `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`。

PostgreSQL 示例配置：
```env
DB_TYPE=postgres
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/knowhub
```

## 本地开发

建议使用两个终端分别启动：

```bash
# 终端 1：后端
bun run dev

# 终端 2：前端
bun run dev:client
```

访问地址：

- 前端开发服务：`http://localhost:5173`
- 后端 API：`http://localhost:<PORT>/api/v1`
- 健康检查：`http://localhost:<PORT>/api/v1/health`

端口说明：
- 当前 `client/vite.config.ts` 默认将 `/api` 与 `/uploads` 代理到 `http://localhost:<PORT>`（读取环境变量 `PORT`，默认 `3000`）
- 也可通过 `VITE_API_PROXY_TARGET` 覆盖代理目标，例如：
```bash
VITE_API_PROXY_TARGET=http://localhost:3001 bun run dev:client
```

## 常用脚本

根目录（后端）：

| 命令 | 说明 |
| --- | --- |
| `dev` | 启动后端开发服务（热更新） |
| `build` | 构建后端到 `dist/` |
| `start` | 运行构建后的后端 |
| `lint` | 后端代码检查 |
| `build:client` | 触发前端构建 |
| `pack` | 一键构建并整理前后端产物 |

`client/` 目录（前端）：

| 命令 | 说明 |
| --- | --- |
| `dev` | 启动 Vite 开发服务 |
| `build` | 构建前端产物 |
| `preview` | 预览前端生产构建 |
| `lint` | 前端代码检查 |

## 构建与发布

## 常规构建

```bash
# 后端
bun run build

# 前端
cd client && bun run build && cd ..
```

## 使用 `pack`

执行 `bun run pack`（或 `pnpm pack`）会调用 `pack.js`，流程是：

1. 清理根目录 `dist/`
2. 构建后端
3. 构建前端
4. 将前端构建目录移动到 `dist/frontend`

重要说明：
- 当前 `pack.js` 会自动识别 bun/pnpm/npm/yarn 并执行对应脚本

## Docker 部署

项目提供 `Dockerfile` 与 `docker-compose.yml`，当前 `docker-compose` 已改为本地构建模式（不依赖远程镜像）。

```bash
# 构建并启动
docker compose up -d --build

# 仅重建镜像
docker compose build --no-cache
```

默认暴露端口 `3000`。请务必修改以下配置后再用于生产：

- `JWT_SECRET`
- 挂载卷路径（数据库与上传目录）
- 数据库相关配置（`DB_TYPE` / `DB_PATH` 或 PostgreSQL 连接参数）

## 项目结构

```text
KnowHub/
├── src/                   # NestJS 后端
│   ├── main.ts            # 入口（CORS、静态资源、SPA 回退）
│   ├── app.module.ts      # 根模块
│   ├── database/          # SQLite / PostgreSQL 初始化与迁移
│   └── modules/           # 业务模块
├── client/                # Vue 3 前端
│   ├── src/api/           # API 封装
│   ├── src/stores/        # Pinia stores
│   ├── src/views/         # 页面视图
│   ├── src/components/    # 组件
│   └── src/router/        # 路由与守卫
├── pack.js                # 构建打包脚本
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 运行注意事项

- 后端会自动初始化数据表、运行迁移并检查完整性（见 `DatabaseModule` 生命周期）
- 图片静态资源通过 `/uploads` 暴露，前端静态资源由后端统一托管
- 若 `dist/frontend/index.html` 不存在（例如仅启动了后端开发服务），非 API 请求会返回提示信息而非 500

## 许可证

本项目使用 MIT 许可证，详见 [LICENSE](./LICENSE)。
