# KnowHub API 参考文档（中文）

> Language: [English](./API.md) | [简体中文](./API_ZH.md)

## 基础地址

- API 前缀：`/api/v1`
- 本地示例：`http://localhost:3000/api/v1`

## 认证与权限

- `Public`：无需登录
- `JWT`：需要 `Authorization: Bearer <token>`
- `Admin`：需要 JWT 且账号为管理员

## 统一响应格式

成功响应由全局拦截器包装：

```json
{
  "code": 0,
  "data": {}
}
```

错误响应由全局异常过滤器返回：

```json
{
  "code": 1001,
  "message": "Validation error message"
}
```

说明：
- 支持通过 `Accept-Language` 返回中英文错误/部分消息（`zh-CN` / `en-US`）。
- 部分接口支持查询参数，见各模块说明。

## 健康检查

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/health` | Public | 服务健康检查 |

## 认证模块（`/auth`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | 邮箱密码注册 |
| POST | `/auth/send-verification` | Public | 发送注册验证码 |
| POST | `/auth/verify-code` | Public | 校验验证码 |
| POST | `/auth/register-with-code` | Public | 验证码注册 |
| POST | `/auth/login` | Public | 邮箱密码登录 |
| GET | `/auth/profile` | JWT | 获取当前登录用户信息 |
| POST | `/auth/send-reset-password` | Public | 发送重置密码验证码 |
| POST | `/auth/reset-password` | Public | 通过验证码重置密码 |

## 系统模块（`/system`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/system/setup-status` | Public | 检查是否需要首次初始化 |
| POST | `/system/setup` | Public | 首次初始化（仅允许一次） |
| GET | `/system/site-info` | Public | 获取站点信息（支持 `Accept-Language`） |
| PUT | `/system/site-info` | Admin | 更新站点信息 |
| GET | `/system/smtp-config` | Admin | 获取 SMTP 配置 |
| PUT | `/system/smtp-config` | Admin | 更新 SMTP 配置 |
| POST | `/system/smtp-test` | Admin | 测试 SMTP 连接 |
| GET | `/system/access-config` | Public | 获取公开访问配置 |
| PUT | `/system/access-config` | Admin | 更新访问配置 |

## 用户模块（`/user`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| PATCH | `/user/profile` | JWT | 更新当前用户资料 |
| PATCH | `/user/password` | JWT | 修改当前用户密码 |
| DELETE | `/user/account` | JWT | 删除当前用户账号 |
| GET | `/user` | Admin | 用户列表 |
| PATCH | `/user/:id/ban` | Admin | 封禁/解封用户 |
| DELETE | `/user/:id` | Admin | 删除指定用户 |

## 知识库模块（`/libraries`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/libraries` | JWT | 创建知识库 |
| GET | `/libraries` | JWT | 获取知识库列表 |
| GET | `/libraries/:id` | JWT | 获取知识库详情 |
| PUT | `/libraries/:id` | JWT | 更新知识库 |
| DELETE | `/libraries/:id` | JWT | 删除知识库 |

## 页面模块（`/pages`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/pages` | JWT | 创建页面/分组 |
| GET | `/pages` | JWT | 页面列表 |
| GET | `/pages/archived` | JWT | 归档项列表 |
| GET | `/pages/on-this-day` | JWT | 历史上的今天 |
| GET | `/pages/long-unvisited` | JWT | 久未访问页面 |
| GET | `/pages/tree/:libraryId` | JWT | 获取知识库树 |
| GET | `/pages/:id` | JWT | 获取页面详情 |
| PUT | `/pages/:id` | JWT | 更新页面 |
| DELETE | `/pages/:id` | JWT | 删除页面（可能是软删除） |
| POST | `/pages/:id/archive` | JWT | 归档页面/分组 |
| POST | `/pages/:id/unarchive` | JWT | 取消归档 |
| DELETE | `/pages/:id/permanent` | JWT | 永久删除归档项 |
| GET | `/pages/:id/tags` | JWT | 获取页面标签 |
| POST | `/pages/:id/tags/attach` | JWT | 为页面添加标签 |
| POST | `/pages/:id/tags/detach` | JWT | 为页面移除标签 |
| PUT | `/pages/:id/tags` | JWT | 覆盖更新页面标签列表 |
| POST | `/pages/:id/move` | JWT | 移动页面/分组节点 |
| GET | `/pages/:id/versions` | JWT | 获取版本历史 |
| POST | `/pages/:id/versions` | JWT | 创建版本快照 |
| POST | `/pages/:id/versions/:versionId/restore` | JWT | 恢复指定版本 |
| POST | `/pages/:id/versions/cleanup` | JWT | 清理历史版本 |
| DELETE | `/pages/:id/versions/:versionId` | JWT | 删除指定版本 |
| PUT | `/pages/:id/settings` | JWT | 更新页面设置 |

## 标签模块（`/tags`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/tags` | JWT | 创建标签 |
| GET | `/tags` | JWT | 获取标签列表 |
| GET | `/tags/page/:pageId` | JWT | 获取页面标签 |
| POST | `/tags/attach` | JWT | 绑定页面与标签 |
| POST | `/tags/detach` | JWT | 解绑页面与标签 |
| DELETE | `/tags/:id` | JWT | 删除标签 |

## 搜索模块（`/search`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/search/suggestions?q=<keyword>` | JWT | 搜索建议 |

## 上传模块（`/upload`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/upload/image` | JWT | 上传图片（`multipart/form-data`，字段名：`file`） |
| GET | `/upload/images` | JWT | 获取上传图片列表 |
| DELETE | `/upload/images/:id` | JWT | 删除图片并清理页面引用 |
| PUT | `/upload/images/:id/replace` | JWT | 替换已有图片（`multipart/form-data`） |

## 模板模块（`/templates`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/templates` | JWT | 获取模板列表（内置 + 用户） |
| GET | `/templates/:id` | JWT | 获取模板详情 |
| POST | `/templates` | JWT | 创建模板 |
| PUT | `/templates/:id` | JWT | 更新模板 |
| DELETE | `/templates/:id` | JWT | 删除模板 |
| POST | `/templates/:id/duplicate` | JWT | 复制模板 |

## 协作模块（`/collab`）

### 团队

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/collab/teams` | JWT | 创建团队 |
| GET | `/collab/teams` | JWT | 获取我的团队 |
| GET | `/collab/teams/:teamId/members` | JWT | 获取团队成员 |
| POST | `/collab/teams/:teamId/members` | JWT | 添加成员 |
| PUT | `/collab/teams/:teamId/members/:memberId` | JWT | 更新成员角色 |
| DELETE | `/collab/teams/:teamId/members/:memberId` | JWT | 移除成员 |
| PUT | `/collab/teams/:teamId/owner/:memberId` | JWT | 转让团队所有者 |

### 资源权限

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/collab/resources/:pageId/access` | JWT | 获取资源访问摘要 |
| GET | `/collab/resources/:pageId/permissions` | JWT | 获取资源授权列表 |
| POST | `/collab/resources/:pageId/permissions` | JWT | 新增/更新授权 |
| PUT | `/collab/resources/:pageId/permissions/:permissionId` | JWT | 更新授权角色 |
| DELETE | `/collab/resources/:pageId/permissions/:permissionId` | JWT | 删除授权 |

### 邀请

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/collab/resources/:pageId/invites` | JWT | 获取资源邀请列表 |
| POST | `/collab/resources/:pageId/invites` | JWT | 创建邀请 |
| DELETE | `/collab/invites/:inviteId` | JWT | 取消邀请 |
| GET | `/collab/invites/me` | JWT | 获取我的邀请 |
| POST | `/collab/invites/:token/accept` | JWT | 接受邀请 |
| POST | `/collab/invites/:token/decline` | JWT | 拒绝邀请 |

## 公开接口（`/public`）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/public/search?q=<keyword>` | Public | 公开搜索 |
| GET | `/public/users/:name` | Public | 公开用户资料 |
| GET | `/public/pages/:slug` | Public | 按 slug 获取公开页面 |
| GET | `/public/libraries/:slug` | Public | 按 slug 获取公开知识库 |
| GET | `/public/libraries/:id/tree` | Public | 获取公开知识库树 |

## 前端对接提示

- 所有受保护接口默认需要在请求头中携带 `Authorization`。
- 首次初始化建议调用顺序：
  1. `GET /system/setup-status`
  2. `POST /system/setup`（当 `needsSetup=true`）
- 初始化接口支持中英文字段：
  - `siteTitleI18n`
  - `siteDescriptionI18n`
- 同时兼容旧字段 `siteTitle`、`siteDescription`。
