# ============================================
# 阶段 1: 构建前端 (Vue 3)
# ============================================
FROM node:20-slim AS frontend-builder

WORKDIR /app
RUN corepack enable && pnpm -v

COPY client/package.json client/pnpm-lock.yaml* ./
RUN pnpm install

COPY client/ ./
RUN pnpm build

# ============================================
# 阶段 2: 构建后端 (NestJS)
# ============================================
FROM node:20-slim AS backend-builder

WORKDIR /app
RUN corepack enable && pnpm -v

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY src/ ./src/
COPY nest-cli.json tsconfig.json ./
RUN pnpm build

# ============================================
# 阶段 3: 运行应用 (重写逻辑)
# ============================================
FROM node:20-slim AS runtime

WORKDIR /app

# 1. 必须先安装构建工具，以便 pnpm install 时能直接编译 native 模块
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# 2. 设置用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# 3. 【关键改动】使用 NPM 进行生产环境安装
# pnpm 的软链接在隔离的 runtime 镜像中非常容易导致 native bindings 丢失
# 在最终运行阶段使用 npm install --omit=dev 可以生成更简单的路径结构
COPY package.json pnpm-lock.yaml* ./
RUN npm install --omit=dev

# 4. 复制编译好的代码
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/dist ./dist/frontend

# 5. 权限修复
RUN chown -R nodejs:nodejs /app
USER nodejs

# 环境变量默认值（可在运行时覆盖）
ENV NODE_ENV=production
ENV DB_TYPE=sqlite
ENV DB_PATH=/app/db/knowhub-database.sqlite

EXPOSE 3000

CMD ["node", "dist/main.js"]
