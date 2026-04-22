# CLAUDE.md

此文件用于向 Claude Code 提供项目上下文，在会话启动时自动加载。

## 项目

Mini 版在线商城：商品、购物车、订单、地址管理。参见 [PRD.md](PRD.md) 与 [TECH_DESIGN.md](TECH_DESIGN.md)。

## 技术栈

- 前端：React 18 + TypeScript + Vite + Redux Toolkit + Ant Design + React Router v6 + Axios + SCSS
- 后端：Node.js 18+ + Express 4 + TypeScript + Sequelize + MySQL 8
- 数据库：MySQL，schema 见 [database/init.sql](database/init.sql)

## 目录约定

```
frontend/
  src/
    components/  通用组件
    pages/       页面组件
    services/    API 调用（axios 实例）
    store/       Redux Toolkit slices
    types/       TS 类型
    utils/       工具
    styles/      全局样式

backend/
  src/
    controllers/ HTTP 控制器
    services/    业务逻辑
    models/      Sequelize 模型
    routes/      Express 路由
    middleware/  中间件
    config/      配置
    utils/       工具
```

## 约定

- 字段命名统一使用 camelCase（前后端、DB 字段）。
- API 返回统一信封：`{ success, data, message, meta? }`。
- 错误通过 Express 错误中间件统一处理。
- 前端通过 Vite dev proxy 调用 `/api/*` 转发到后端。
- P0 不做登录注册；JWT 相关代码可保留占位。

## 当前进度

- 骨架已搭建（配置、入口、模型/路由/控制器/服务占位）。
- 业务逻辑尚未实现。优先按 PRD 第 4 节"必须实现的功能（P0）"顺序落地。

## 开发规范

- 函数 < 50 行，文件 < 800 行。
- 新功能走 TDD：先写测试 → 实现 → 重构。
- 提交前检查：无硬编码密钥、所有输入已验证、无 console.log。
