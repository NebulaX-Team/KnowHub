# KnowHub - Personal Knowledge Management System

> Language: [English](./README.md) | [简体中文](./README_ZH.md)
>
> Original upstream project: https://github.com/LunaDeerTech/Schema
>
> Changelog: [CHANGELOG.md](./CHANGELOG.md)

<p align="center">
  <a href="https://github.com/NebulaX-Team/KnowHub" target="_blank">
    <img src="https://img.shields.io/badge/Status-Active-brightgreen" alt="Status">
    <img src="https://img.shields.io/badge/NestJS-10.x-blue" alt="NestJS">
    <img src="https://img.shields.io/badge/Vue-3.x-green" alt="Vue">
  </a>
</p>

<p align="center">
  <strong>KnowHub</strong> is a modern personal knowledge management system - Think Confluence for personal use.
</p>

## ✨ Features

### Core Features
- 📝 **Rich Text Editor** - Tiptap-based editor with tables, task lists, code blocks, and mentions
- 🏷️ **Tag System** - Organize pages with flexible tagging
- 🔍 **Full-Text Search** - Fast search across all pages
- 📚 **Hierarchical Structure** - Libraries and nested pages
- 🔄 **Version History** - Track changes with page versioning
- 🔗 **Page References** - Bidirectional linking between pages
- 📤 **File Uploads** - Image and file uploads with metadata
- 👥 **Public Sharing** - Share pages via public URLs with slugs

### Authentication & Security
- 🔐 **JWT Authentication** - Secure token-based authentication
- 📧 **Email Verification** - SMTP-based verification (configurable)
- 🔑 **Password Reset** - Email-based password recovery
- 👤 **User Management** - Profile and security settings
- 🛡️ **Admin Controls** - Admin user management

### Technical Features
- ⚡ **Hot Reload** - Fast development with NestJS and Vite
- 🎨 **Modern UI** - Naive UI component library
- 📱 **Responsive** - Works on desktop and mobile
- 🗄️ **SQLite Database** - Lightweight, file-based storage
- 📦 **Single Binary** - Easy deployment with packaging script

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | NestJS 10 | API server & business logic |
| **Database** | Better-sqlite3 | SQLite with WAL mode |
| **Frontend** | Vue 3 + Vite | SPA with hot reload |
| **State** | Pinia | Client-side state management |
| **UI** | Naive UI | Component library |
| **Editor** | Tiptap | Rich text editor |
| **HTTP** | Axios | API client with interceptors |

### Key Design Patterns

**Backend (NestJS):**
- **Module Pattern** - Each feature is a self-contained module
- **Controller-Service Pattern** - Separation of concerns
- **Global Components** - Interceptors, filters, guards
- **Dependency Injection** - NestJS DI system

**Frontend (Vue 3):**
- **Composition API** - Modern Vue 3 patterns
- **Pinia Stores** - Centralized state management
- **API Layer** - Dedicated API modules
- **Component-Based** - Reusable UI components

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **bun** or **pnpm** (package manager)
- **Git** (for cloning)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/NebulaX-Team/KnowHub.git
cd KnowHub
```

2. **Install dependencies:**
```bash
# Option A (bun)
bun install

# Option B (pnpm)
# pnpm install
```

`client` is configured as a workspace package, so running install at the root is enough.

3. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=3000
DB_PATH="./dev.db"
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

4. **Start development servers:**

Backend (port 3000):
```bash
bun run dev
```

Frontend (port 5173):
```bash
bun run dev:client
```

5. **Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:\<PORT\>/api/v1
- Health: http://localhost:\<PORT\>/api/v1/health

Proxy note:
- `client/vite.config.ts` proxies `/api` and `/uploads` to `http://localhost:<PORT>` by default (`PORT` from your environment, fallback `3000`).
- You can override it via `VITE_API_PROXY_TARGET`, for example:
```bash
VITE_API_PROXY_TARGET=http://localhost:3001 bun run dev:client
```

## 🛠️ Development

### Available Scripts

#### Backend (Root Directory)

| Script | Description |
|--------|-------------|
| `dev` | Start backend with hot reload (NestJS) |
| `build` | Build backend for production |
| `start` | Run built backend server |
| `lint` | Lint TypeScript code |
| `build:client` | Build frontend separately |
| `pack` | Package both backend and frontend |

#### Frontend (client/ Directory)

| Script | Description |
|--------|-------------|
| `dev` | Start Vite dev server (HMR) |
| `build` | Build for production |
| `preview` | Preview production build |
| `lint` | Lint TypeScript/Vue code |

### Development Workflow

**Option 1: Separate Terminals (Recommended)**
```bash
# Terminal 1 - Backend
bun run dev

# Terminal 2 - Frontend
bun run dev:client
```

**Option 2: Single Terminal (using concurrently)**
```bash
# Install concurrently globally
bun add -g concurrently

# Run both
concurrently "bun run dev" "bun run dev:client"
```

### Building for Production

```bash
# Build both backend and frontend
bun run pack

# Output: dist/ directory with:
# - dist/main.js (backend)
# - dist/frontend/ (frontend assets)
# - dist/ (config files)

# Run production server
bun run start
```

`pack.js` auto-detects bun/pnpm/npm/yarn and runs the matching scripts.

### Code Quality

**Backend Linting:**
```bash
bun run lint
```

**Frontend Linting:**
```bash
cd client && bun run lint
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_PATH="./dev.db"

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# Optional: SMTP (for email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

Notes:
- Database path is configured via `DB_PATH`.
- Both plain paths (for example `./dev.db`) and `file:` format are supported.

## 📁 Project Structure

```
KnowHub/
├── .env                    # Environment variables
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
├── CLAUDE.md             # Project guidelines
├── LICENSE               # MIT License
├── README.md             # This file
├── nest-cli.json         # NestJS CLI config
├── package.json          # Backend dependencies
├── pnpm-lock.yaml        # Lock file
├── pack.js               # Build & packaging script
├── tsconfig.json         # TypeScript config
│
├── src/                  # Backend source
│   ├── main.ts          # Application entry
│   ├── app.module.ts    # Root module
│   │
│   ├── common/          # Shared components
│   │   ├── decorators/  # Custom decorators
│   │   ├── filters/     # Exception filters
│   │   ├── guards/      # Auth guards
│   │   └── interceptors/# Response interceptors
│   │
│   ├── database/        # Database layer
│   │   ├── database.module.ts
│   │   ├── database.service.ts
│   │   ├── migrator.ts
│   │   └── init-db.ts
│   │
│   └── modules/         # Feature modules
│       ├── auth/
│       ├── user/
│       ├── page/
│       ├── library/
│       ├── tag/
│       ├── search/
│       ├── public/
│       ├── upload/
│       ├── system/
│       └── health/
│
├── client/               # Frontend source
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   │
│   └── src/
│       ├── main.ts      # Vue app entry
│       ├── App.vue      # Root component
│       │
│       ├── api/         # API modules
│       │   ├── http.ts
│       │   ├── auth.ts
│       │   ├── page.ts
│       │   └── ...
│       │
│       ├── stores/      # Pinia stores
│       │   ├── user.ts
│       │   ├── page.ts
│       │   └── ...
│       │
│       ├── router/      # Vue Router
│       │   └── index.ts
│       │
│       ├── views/       # Page views
│       │   ├── Login.vue
│       │   ├── Home.vue
│       │   └── ...
│       │
│       ├── layouts/     # Layout components
│       │   ├── MainLayout.vue
│       │   └── PublicLayout.vue
│       │
│       ├── components/  # UI components
│       │   ├── common/
│       │   ├── editor/
│       │   └── layout/
│       │
│       └── styles/      # Global styles
│
├── uploads/             # Uploaded files
│   └── images/         # Uploaded images
│
└── dist/               # Build output
    ├── main.js        # Backend bundle
    └── frontend/      # Frontend assets
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### How to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/KnowHub.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation

4. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature"
   ```

5. **Push and create a PR**
   ```bash
   git push origin feature/your-feature
   ```

### Development Guidelines

**Backend:**
- Follow NestJS best practices
- Use proper DTOs for validation
- Keep modules focused and cohesive
- Use dependency injection

**Frontend:**
- Use Composition API
- Follow Vue 3 best practices
- Use Pinia for state management
- Keep components reusable

### Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include environment details (OS, Node version, etc.)
- Provide steps to reproduce
- Include error logs if applicable

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Backend framework
- [Vue 3](https://vuejs.org/) - Frontend framework
- [Tiptap](https://tiptap.dev/) - Rich text editor
- [Naive UI](https://www.naiveui.com/) - Component library
- [SQLite](https://www.sqlite.org/) - Database
