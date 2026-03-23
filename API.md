# KnowHub API Reference

> Language: [English](./API.md) | [简体中文](./API_ZH.md)

## Base URL

- API prefix: `/api/v1`
- Local example: `http://localhost:3000/api/v1`

## Auth & Access

- `Public`: no token required
- `JWT`: requires `Authorization: Bearer <token>`
- `Admin`: requires JWT and admin role

## Response Format

Successful responses are wrapped by the global interceptor:

```json
{
  "code": 0,
  "data": {}
}
```

Error responses are returned by the global exception filter:

```json
{
  "code": 1001,
  "message": "Validation error message"
}
```

Notes:
- `Accept-Language` is supported for localized error/some response messages (`zh-CN` / `en-US`).
- Some endpoints support query parameters; details are in each module section.

## Health

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Health check |

## Authentication (`/auth`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register with email/password |
| POST | `/auth/send-verification` | Public | Send verification code (register flow) |
| POST | `/auth/verify-code` | Public | Verify code |
| POST | `/auth/register-with-code` | Public | Register with verification code |
| POST | `/auth/login` | Public | Login with email/password |
| GET | `/auth/profile` | JWT | Get current user profile |
| POST | `/auth/send-reset-password` | Public | Send reset-password verification code |
| POST | `/auth/reset-password` | Public | Reset password with code |

## System (`/system`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/system/setup-status` | Public | Check if first-run setup is required |
| POST | `/system/setup` | Public | First-run initialization (one-time) |
| GET | `/system/site-info` | Public | Get site info (supports `Accept-Language`) |
| PUT | `/system/site-info` | Admin | Update site info |
| GET | `/system/smtp-config` | Admin | Get SMTP config |
| PUT | `/system/smtp-config` | Admin | Update SMTP config |
| POST | `/system/smtp-test` | Admin | Test SMTP connection |
| GET | `/system/access-config` | Public | Get public access config |
| PUT | `/system/access-config` | Admin | Update access config |

## User (`/user`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| PATCH | `/user/profile` | JWT | Update current user profile |
| PATCH | `/user/password` | JWT | Change current user password |
| DELETE | `/user/account` | JWT | Delete current user account |
| GET | `/user` | Admin | List users |
| PATCH | `/user/:id/ban` | Admin | Ban/unban a user |
| DELETE | `/user/:id` | Admin | Delete a user |

## Libraries (`/libraries`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/libraries` | JWT | Create library |
| GET | `/libraries` | JWT | List libraries |
| GET | `/libraries/:id` | JWT | Get library detail |
| PUT | `/libraries/:id` | JWT | Update library |
| DELETE | `/libraries/:id` | JWT | Delete library |

## Pages (`/pages`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/pages` | JWT | Create page/group |
| GET | `/pages` | JWT | List pages |
| GET | `/pages/archived` | JWT | List archived pages/groups |
| GET | `/pages/on-this-day` | JWT | On-this-day pages |
| GET | `/pages/long-unvisited` | JWT | Long-unvisited pages |
| GET | `/pages/tree/:libraryId` | JWT | Get page tree by library |
| GET | `/pages/:id` | JWT | Get page detail |
| PUT | `/pages/:id` | JWT | Update page |
| DELETE | `/pages/:id` | JWT | Delete page (soft delete flow may apply) |
| POST | `/pages/:id/archive` | JWT | Archive page/group |
| POST | `/pages/:id/unarchive` | JWT | Unarchive page/group |
| DELETE | `/pages/:id/permanent` | JWT | Permanently delete archived item |
| GET | `/pages/:id/tags` | JWT | Get page tags |
| POST | `/pages/:id/tags/attach` | JWT | Attach tag to page |
| POST | `/pages/:id/tags/detach` | JWT | Detach tag from page |
| PUT | `/pages/:id/tags` | JWT | Replace page tag list |
| POST | `/pages/:id/move` | JWT | Move page/group in tree |
| GET | `/pages/:id/versions` | JWT | List version history |
| POST | `/pages/:id/versions` | JWT | Create a version snapshot |
| POST | `/pages/:id/versions/:versionId/restore` | JWT | Restore a version |
| POST | `/pages/:id/versions/cleanup` | JWT | Cleanup old versions |
| DELETE | `/pages/:id/versions/:versionId` | JWT | Delete a version |
| PUT | `/pages/:id/settings` | JWT | Update page settings |

## Tags (`/tags`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/tags` | JWT | Create tag |
| GET | `/tags` | JWT | List tags |
| GET | `/tags/page/:pageId` | JWT | List tags on a page |
| POST | `/tags/attach` | JWT | Attach tag to page |
| POST | `/tags/detach` | JWT | Detach tag from page |
| DELETE | `/tags/:id` | JWT | Delete tag |

## Search (`/search`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/search/suggestions?q=<keyword>` | JWT | Search suggestions |

## Upload (`/upload`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/upload/image` | JWT | Upload image (`multipart/form-data`, field: `file`) |
| GET | `/upload/images` | JWT | List uploaded images |
| DELETE | `/upload/images/:id` | JWT | Delete image and cleanup references |
| PUT | `/upload/images/:id/replace` | JWT | Replace existing image file (`multipart/form-data`) |

## Templates (`/templates`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/templates` | JWT | List templates (built-in + user-owned) |
| GET | `/templates/:id` | JWT | Get template detail |
| POST | `/templates` | JWT | Create template |
| PUT | `/templates/:id` | JWT | Update template |
| DELETE | `/templates/:id` | JWT | Delete template |
| POST | `/templates/:id/duplicate` | JWT | Duplicate template |

## Collaboration (`/collab`)

### Teams

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/collab/teams` | JWT | Create team |
| GET | `/collab/teams` | JWT | List my teams |
| GET | `/collab/teams/:teamId/members` | JWT | List team members |
| POST | `/collab/teams/:teamId/members` | JWT | Add team member |
| PUT | `/collab/teams/:teamId/members/:memberId` | JWT | Update member role |
| DELETE | `/collab/teams/:teamId/members/:memberId` | JWT | Remove team member |
| PUT | `/collab/teams/:teamId/owner/:memberId` | JWT | Transfer team ownership |

### Resource Access & Permissions

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/collab/resources/:pageId/access` | JWT | Get resource access summary |
| GET | `/collab/resources/:pageId/permissions` | JWT | List permissions on resource |
| POST | `/collab/resources/:pageId/permissions` | JWT | Create/upsert permission |
| PUT | `/collab/resources/:pageId/permissions/:permissionId` | JWT | Update permission role |
| DELETE | `/collab/resources/:pageId/permissions/:permissionId` | JWT | Remove permission |

### Invites

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/collab/resources/:pageId/invites` | JWT | List invites for resource |
| POST | `/collab/resources/:pageId/invites` | JWT | Create invite |
| DELETE | `/collab/invites/:inviteId` | JWT | Cancel invite |
| GET | `/collab/invites/me` | JWT | List my invites |
| POST | `/collab/invites/:token/accept` | JWT | Accept invite |
| POST | `/collab/invites/:token/decline` | JWT | Decline invite |

## Public (`/public`)

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/public/search?q=<keyword>` | Public | Public search |
| GET | `/public/users/:name` | Public | Public user profile |
| GET | `/public/pages/:slug` | Public | Public page by slug |
| GET | `/public/libraries/:slug` | Public | Public library by slug |
| GET | `/public/libraries/:id/tree` | Public | Public tree of a library |

## Notes for Frontend Integration

- Default protected endpoints require JWT token in `Authorization` header.
- During first-run setup, frontend should call:
  1. `GET /system/setup-status`
  2. `POST /system/setup` (if `needsSetup=true`)
- Setup supports bilingual site info fields (`siteTitleI18n`, `siteDescriptionI18n`) plus legacy single-language fields (`siteTitle`, `siteDescription`) for compatibility.
