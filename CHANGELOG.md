# Changelog / 更新日志

All notable changes to this project will be documented in this file.  
本项目的所有重要变更都会记录在此文件中。

This project follows Semantic Versioning (`MAJOR.MINOR.PATCH`).  
本项目遵循语义化版本规范（`MAJOR.MINOR.PATCH`）。

## Project Origin / 项目来源

- EN: This project is a secondary development based on the original Schema project.
- 中文：本项目是在原始 Schema 项目基础上的二次开发版本。
- EN: Original upstream repository: `https://github.com/LunaDeerTech/Schema`
- 中文：原项目仓库：`https://github.com/LunaDeerTech/Schema`
- EN: Current repository: `https://github.com/NebulaX-Team/KnowHub`
- 中文：当前仓库：`https://github.com/NebulaX-Team/KnowHub`

## [1.0.0] - 2026-03-21

### Added / 新增

- EN: Initial public release of KnowHub (secondary development based on Schema).
- 中文：KnowHub 首个公开版本发布（基于 Schema 的二次开发）。
- EN: Core backend based on NestJS and SQLite.
- 中文：基于 NestJS 与 SQLite 的后端核心能力上线。
- EN: Core frontend based on Vue 3 + Vite + Tiptap.
- 中文：基于 Vue 3 + Vite + Tiptap 的前端核心能力上线。
- EN: User authentication, library/page management, search, upload, and public sharing modules.
- 中文：用户认证、知识库/页面管理、搜索、上传与公开分享模块上线。
- EN: Added full frontend i18n scaffold (`zh-CN` / `en-US`) with locale persistence and language switching support.
- 中文：新增前端完整 i18n 体系（`zh-CN` / `en-US`），支持语言切换与本地持久化。
- EN: Added backend message translation pipeline for common success/error messages, based on request language.
- 中文：新增后端消息翻译链路，可根据请求语言返回中英提示信息。
- EN: Added bilingual site info data model (`titleI18n`, `descriptionI18n`) and bilingual defaults.
- 中文：新增站点信息双语数据结构（`titleI18n`、`descriptionI18n`）及双语默认值。
- EN: Added development fallback for email verification: when SMTP is not configured, verification code is generated and printed in backend logs.
- 中文：新增邮箱验证码开发兜底：未配置 SMTP 时可直接生成验证码并在后端日志输出。
- EN: Added page-break extension support (`[========]` / `data-page-break`) for editor and Markdown conversion.
- 中文：新增分页符扩展支持（`[========]` / `data-page-break`），覆盖编辑器与 Markdown 转换。
- EN: Added flowchart and sequence diagram rendering support for `flow` / `seq` code blocks, including preview mode in editor.
- 中文：新增 `flow` / `seq` 代码块流程图与时序图渲染能力，并支持编辑器预览。
- EN: Added package-manager detection and unified client script runner (`scripts/package-manager.js`, `scripts/run-client-script.js`) for bun/pnpm/npm/yarn.
- 中文：新增包管理器自动识别与统一前端脚本入口（`scripts/package-manager.js`、`scripts/run-client-script.js`），兼容 bun/pnpm/npm/yarn。
- EN: Added project changelog documentation file (`CHANGELOG.md`) with bilingual structure.
- 中文：新增项目更新日志文件（`CHANGELOG.md`），采用中英双语结构。
- EN: Added group node support (`type='group'`) in knowledge trees, including create/read operations and tree rendering.
- 中文：新增知识树分组节点能力（`type='group'`），支持创建、查询与树结构展示。
- EN: Added dedicated settings route and view for group management (`/settings/groups`), separated from page management.
- 中文：新增分组管理独立设置页与路由（`/settings/groups`），与页面管理解耦。
- EN: Added "Group" column in page settings list (between Library and Public) to display the parent group name.
- 中文：页面设置列表新增“组”列（位于“知识库”和“公开”之间），用于展示父分组名称。
- EN: Added optional PostgreSQL backend support with `DB_TYPE` switching (`sqlite` / `postgres`) while keeping SQLite as default.
- 中文：新增可选 PostgreSQL 后端支持，通过 `DB_TYPE` 在 `sqlite` / `postgres` 间切换，SQLite 仍为默认配置。

### Changed / 变更

- EN: Rebranded project naming from Schema to KnowHub / 知枢, and updated related in-app text and docs.
- 中文：项目品牌由 Schema 统一调整为 KnowHub / 知枢，并同步更新站内文案与文档。
- EN: Updated repository links from `LunaDeerTech/Schema` to `NebulaX-Team/KnowHub` in user-facing UI and docs.
- 中文：用户可见 UI 与文档中的仓库链接已由 `LunaDeerTech/Schema` 更新为 `NebulaX-Team/KnowHub`。
- EN: Unified database path configuration to `DB_PATH`, with compatibility for legacy `file:` path formats.
- 中文：数据库路径配置统一为 `DB_PATH`，并兼容历史 `file:` 路径格式。
- EN: Updated backend startup behavior: if frontend build is missing, static hosting is skipped and a clear fallback message is returned.
- 中文：后端启动逻辑优化：当前端构建不存在时跳过静态托管，并返回明确的回退提示信息。
- EN: Updated Vite proxy target resolution to follow backend port from root `.env` and support `VITE_API_PROXY_TARGET` override.
- 中文：Vite 代理目标解析改为读取根目录 `.env` 端口，并支持 `VITE_API_PROXY_TARGET` 覆盖。
- EN: Refined public sidebar layout and interaction style (simplified visual style, stable footer area placement).
- 中文：优化公开页侧边栏布局与交互样式（更简洁视觉、底部信息区域稳定贴底）。
- EN: Refined editor handling for Markdown tables and GFM task list import scenarios.
- 中文：优化编辑器对 Markdown 表格与 GFM 任务列表的导入处理逻辑。
- EN: Updated README (`README.md`, `README_ZH.md`) to reflect group-based hierarchy and settings console capabilities while keeping release version at `1.0.0`.
- 中文：更新 README（`README.md`、`README_ZH.md`）以反映分组层级与设置中心能力，版本仍保持 `1.0.0`。
- EN: Refactored database access layer to asynchronous APIs to support both SQLite and PostgreSQL with a unified query interface.
- 中文：数据库访问层重构为异步 API，提供统一查询接口以同时支持 SQLite 与 PostgreSQL。
- EN: Updated Docker deployment workflow to local compose build mode (no pre-published image dependency).
- 中文：Docker 部署流程调整为本地 compose 构建模式（不再依赖预先发布镜像）。

### Fixed / 修复

- EN: Fixed frontend route fallback behavior to avoid direct `ENOENT` index file errors when frontend assets are absent.
- 中文：修复前端静态资源缺失时的路由回退行为，避免直接出现 `ENOENT` 索引文件错误。
- EN: Fixed print-mode page-break behavior so inserted page-break markers can produce actual page breaks.
- 中文：修复打印模式分页行为，使插入的分页符可在打印时产生实际分页效果。
- EN: Fixed table cell alignment editing behavior for left/center/right alignment in editor.
- 中文：修复编辑器表格单元格左对齐/居中/右对齐的编辑行为。
- EN: Fixed diagram preview clipping issues (including sequence diagram render area) in editor code block view.
- 中文：修复编辑器代码块图表预览区域（含时序图）被裁切的问题。
- EN: Fixed admin user list `createdAt` display showing `Invalid Date` by preserving `Date` objects in backend response translation and adding robust frontend date parsing fallback.
- 中文：修复管理员用户列表 `createdAt` 显示 `Invalid Date` 的问题：后端响应翻译链路保留 `Date` 对象，前端增加日期解析兜底。
- EN: Fixed empty-looking actions column for the current admin user by showing explicit non-operable text instead of a blank cell.
- 中文：修复当前管理员行“操作”列视觉空白的问题，改为显示明确的不可操作提示文本。
