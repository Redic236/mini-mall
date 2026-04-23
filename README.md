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

E2E（Playwright + Chromium，冒烟 4 条关键路径：auth / 浏览+搜索 / 下单+状态机 / 评价）：

```bash
cd e2e
npm install
npm run install:browsers     # 首次拉 Chromium（~170MB，一次就好）
npm test                     # 先 seed mini_mall_e2e，再跑 playwright
npm run test:ui              # Playwright 交互式 UI 模式
npm run report               # 看上一次的 HTML 报告
```

注意：
- E2E 用独立的 `mini_mall_e2e` 数据库，每次 `npm test` 会被 `pretest` 钩子 force-sync + 种子固定商品（见 [backend/scripts/seed-e2e.ts](backend/scripts/seed-e2e.ts)）。不会碰 `mini_mall` 或 `mini_mall_test`。
- Playwright 自启 backend（`npm run e2e:dev`）和 frontend（`npm run dev`）。跑前请确保 `3001` 和 `5173` 没被占用（Docker stack 同时起着的话先 `docker compose stop`）。
- 后端进入 E2E 模式会 bypass rate limiter（`E2E=true` 触发 middleware 绕行），避免多个 spec 连续注册被限速。

## 文件上传

头像上传走本地磁盘，存在 `backend/uploads/avatars/` 下。线上用 docker-compose 的 `backend-uploads` named volume 持久化，镜像每次重建不会掉头像。

- 服务端：`POST /api/auth/me/avatar`（multipart，字段名 `avatar`，登录必须）
- 白名单：`image/jpeg` / `image/png` / `image/webp`，≤ 2 MB
- 命名：multer 用 UUID + 白名单扩展名生成，不信任客户端 filename
- 旧头像：若是本站上传（`/uploads/` 前缀）会 best-effort 删除；外链 URL（如 seed 用的 picsum）原样留着，不碰文件系统
- 静态服务：`app.use('/uploads', express.static(...))`，在 dev 由 Vite 代理、在 docker 由 nginx 代理到 backend

不是 prod 级方案：横向扩展时本地磁盘会裂。若要上 S3/OSS，只需替换 `backend/src/middleware/upload.ts` 里的 storage 即可，其他接口保持不变。

## 管理后台

`users` 表加了 `role` 列（`user` / `admin`），`/api/admin/*` 走 `requireAuth + requireAdmin` 中间件，非管理员命中返回 403。

管理入口：登录后若是 admin，header 下拉菜单出现 **管理后台** → `/admin`。三页：
- **总览** — 六块 tile：总订单数、今日订单、累计营收、待发货订单、商品总数、低库存商品
- **订单管理** — 全站订单分页 + 按状态筛选 + **发货**按钮（管理员专属，原用户侧的"发货（管理）"按钮已撤下）
- **商品管理** — 新增 / 编辑 / 删除（若商品已被订单引用则拒绝删除）

提权方式：
```bash
cd backend
npm run admin:promote -- user@example.com
```
脚本直接连 `mini_mall` 把指定邮箱的用户 `role` 设为 `admin`。E2E 环境由 `seed-e2e.ts` 固定创建 `admin@e2e.test / AdminPass123`。

## 支付沙箱

订单的 `待支付 → 已支付` 流转从"一键切状态"升级成了一个小型的模拟网关流：

1. `POST /api/orders/:id/pay-intent { method }` 创建 `payments` 行（pending），返回 `{ paymentId, gatewayUrl, debugSignatures }`；`gatewayUrl` 形如 `/checkout?pid=...`
2. 前端跳到 `/checkout`，展示订单摘要 + 三个出口按钮（成功 / 失败 / 取消）
3. 用户选一个 → `POST /api/payments/callback { paymentId, outcome, amount, signature }`，signature 是 HMAC-SHA256(`${paymentId}|${outcome}|${amount}`, secret)
4. 后端验签 + 验金额 + 验状态（拒重放），事务内同时更新 payment 和 order

`debugSignatures` 是沙箱特供：真实网关里，签名由网关 server 算、客户端从不接触 secret。这里为了闭环演示直接随 intent 一起返回，代码注释里点名了这点。

环境变量：`PAYMENT_SANDBOX_SECRET`（生产必填，未设置直接 throw）。

`PUT /api/orders/:id/pay` 端点保留用于测试 / admin 场景，但 UI 不再走它。

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
- **e2e job**（在 backend/frontend 绿灯后跑）：起 MySQL → 装 3 个包 → `playwright install --with-deps chromium` → `npm test`（Playwright 自己拉起两端）；HTML report 恒定上传，trace 仅失败时上传

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
