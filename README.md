# Mini 版在线商城

一个轻量级电商示例项目：商品展示、购物车、订单、地址管理。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Redux Toolkit + Ant Design + React Router v6 + Axios + SCSS
- **后端**：Node.js 18+ + Express 4 + TypeScript + Sequelize + MySQL 8
- **工具**：ESLint + Prettier

## 目录结构

```
.
├── frontend/     # React 前端
├── backend/      # Express API
├── database/     # DB 初始化脚本与设计
├── PRD.md
├── TECH_DESIGN.md
└── CLAUDE.md
```

## 快速开始

### 用 Docker（最省事）

前置：Docker Desktop / Docker Engine + Compose V2。

```bash
docker compose up --build
```

- 前端：http://localhost:8080
- 后端健康检查：http://localhost:3001/api/health
- MySQL：`localhost:3307`（容器内 `mysql:3306`，data volume 持久化）

`database/init.sql` 会在 mysql 容器首次启动时自动执行（建表 + 种子商品）。要重置所有数据：

```bash
docker compose down -v
```

镜像细节：
- backend 多阶段（deps → build → runtime），non-root `node` 用户运行
- frontend build 产物交给 nginx，`/api/*` 反代到 `backend:3001`，SPA fallback 兜底未知路由
- 环境变量在 [docker-compose.yml](docker-compose.yml) 里就地定义；`JWT_SECRET` 是演示值，真部署前务必换掉

### 本地手动启动

#### 数据库

1. 安装 MySQL 8。
2. 执行 `database/init.sql` 创建库和表。

#### 后端

```bash
cd backend
cp .env.example .env   # 修改 DB_PASSWORD 等
npm install
npm run dev
```

默认在 `http://localhost:3001` 启动。

#### 前端

```bash
cd frontend
npm install
npm run dev
```

默认在 `http://localhost:5173` 启动，API 代理到后端。

## 测试

后端（vitest + supertest，~125 用例，独立 `mini_mall_test` 库）：

```bash
cd backend
npm test               # 跑一次（mini_mall_test 库需先建好）
npm run test:watch     # 监听模式
npm run test:coverage  # 覆盖率报告
```

测试需要 `mini_mall_test` 数据库存在：

```sql
CREATE DATABASE IF NOT EXISTS mini_mall_test DEFAULT CHARACTER SET utf8mb4;
```

前端（vitest + @testing-library/react + jsdom，聚焦 utils / hooks / slices / 关键守卫 / 登录表单）：

```bash
cd frontend
npm test               # 跑一次
npm run test:watch
npm run test:coverage
```

## 数据库迁移

使用 [Umzug](https://github.com/sequelize/umzug)（Sequelize 自家）管理增量 schema 变更，避免"改了 init.sql 但线上已经跑过"的尴尬。

目录 `backend/src/migrations/` 每个文件按 `NNN-description.ts` 命名，导出 `up({ context })` / `down({ context })`，记录表是 `SequelizeMeta`。

```bash
cd backend
npm run migrate:status   # 看哪些已应用 / 哪些待应用
npm run migrate          # 应用全部未应用的
npm run migrate:down     # 回滚最近一条
```

**每次改 schema 都同时改两处**：

1. `database/init.sql` — 新库（Docker 首次 up）直接拿到新 schema
2. 新增 `backend/src/migrations/NNN-xxx.ts` — 已有库通过 `npm run migrate` 对齐

两条路径最终应该得到同一份 schema。迁移刻意不在 backend 启动钩子里跑，避免启动时悄悄改表。

## CI

GitHub Actions 配置在 [.github/workflows/ci.yml](.github/workflows/ci.yml)，每次 push / PR 触发：

- **backend job**：起 MySQL 8 服务 → `npm ci` → `npm run typecheck` → `npm run test:coverage`，覆盖率作为 artifact 上传
- **frontend job**：`npm ci` → `npm run typecheck` → `npm test` → `npm run build`，dist 作为 artifact 上传

本地复现 CI 行为：

```bash
cd backend && npm run verify     # typecheck + test
cd frontend && npm run verify    # typecheck + test + build
```

## 文档

- [PRD.md](PRD.md) — 产品需求
- [TECH_DESIGN.md](TECH_DESIGN.md) — 技术设计
- [database.md](database.md) — 数据库设计草案
- [CLAUDE.md](CLAUDE.md) — 项目上下文（给 Claude Code 使用）
