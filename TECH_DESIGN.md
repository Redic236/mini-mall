# Mini版商城技术架构文档

## 1. 技术栈选择

### 1.1 前端技术
- **框架**：React 18
- **语言**：TypeScript
- **构建工具**：Vite
- **状态管理**：Redux Toolkit
- **HTTP客户端**：Axios
- **UI组件库**：Ant Design
- **样式**：SCSS
- **路由**：React Router v6

### 1.2 后端技术
- **语言**：Node.js 18+
- **框架**：Express 4.x
- **数据库**：MySQL 8.0
- **ORM**：Sequelize
- **认证**：JWT（预留扩展）
- **日志**：Winston
- **CORS**：cors

### 1.3 开发工具
- **版本控制**：Git
- **包管理**：npm
- **代码规范**：ESLint + Prettier
- **编辑器**：VS Code

## 2. 项目结构

### 2.1 前端项目结构
```
frontend/
├── public/              # 静态资源
├── src/
│   ├── components/      # 通用组件
│   │   ├── ProductCard/       # 商品卡片组件
│   │   ├── ShoppingCart/      # 购物车组件
│   │   ├── OrderList/         # 订单列表组件
│   │   └── AddressForm/       # 地址表单组件
│   ├── pages/           # 页面组件
│   │   ├── Home/              # 首页
│   │   ├── ProductDetail/     # 商品详情页
│   │   ├── Cart/              # 购物车页
│   │   ├── OrderConfirm/      # 订单确认页
│   │   ├── OrderList/         # 订单列表页
│   │   └── AddressManagement/ # 地址管理页
│   ├── services/        # API服务
│   │   ├── product.ts         # 商品相关API
│   │   ├── cart.ts            # 购物车相关API
│   │   ├── order.ts           # 订单相关API
│   │   └── address.ts         # 地址相关API
│   ├── store/           # Redux状态管理
│   │   ├── slices/            # Redux切片
│   │   │   ├── productSlice.ts
│   │   │   ├── cartSlice.ts
│   │   │   ├── orderSlice.ts
│   │   │   └── addressSlice.ts
│   │   └── store.ts           # Redux store配置
│   ├── types/           # TypeScript类型定义
│   ├── utils/           # 工具函数
│   ├── styles/          # 全局样式
│   ├── App.tsx          # 应用根组件
│   ├── main.tsx         # 应用入口
│   └── routes.tsx       # 路由配置
├── tsconfig.json        # TypeScript配置
├── vite.config.ts       # Vite配置
├── package.json         # 项目依赖
└── README.md            # 前端项目说明
```

### 2.2 后端项目结构
```
backend/
├── src/
│   ├── controllers/     # 控制器
│   │   ├── productController.ts    # 商品相关控制器
│   │   ├── cartController.ts       # 购物车相关控制器
│   │   ├── orderController.ts      # 订单相关控制器
│   │   └── addressController.ts    # 地址相关控制器
│   ├── models/          # 数据模型
│   │   ├── Product.ts              # 商品模型
│   │   ├── Cart.ts                 # 购物车模型
│   │   ├── Order.ts                # 订单模型
│   │   ├── OrderItem.ts            # 订单项模型
│   │   └── Address.ts              # 地址模型
│   ├── routes/          # 路由
│   │   ├── productRoutes.ts        # 商品相关路由
│   │   ├── cartRoutes.ts           # 购物车相关路由
│   │   ├── orderRoutes.ts          # 订单相关路由
│   │   └── addressRoutes.ts        # 地址相关路由
│   ├── services/        # 业务逻辑
│   │   ├── productService.ts       # 商品相关服务
│   │   ├── cartService.ts          # 购物车相关服务
│   │   ├── orderService.ts         # 订单相关服务
│   │   └── addressService.ts       # 地址相关服务
│   ├── config/          # 配置文件
│   │   ├── database.ts             # 数据库配置
│   │   └── app.ts                  # 应用配置
│   ├── middleware/      # 中间件
│   │   ├── errorHandler.ts         # 错误处理中间件
│   │   └── cors.ts                 # CORS中间件
│   ├── utils/           # 工具函数
│   ├── app.ts           # Express应用实例
│   └── server.ts        # 服务器入口
├── .env                 # 环境变量
├── package.json         # 项目依赖
└── README.md            # 后端项目说明
```

## 3. 数据模型

### 3.1 商品表 (products)
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | 商品ID |
| `name` | `VARCHAR(255)` | `NOT NULL` | 商品名称 |
| `price` | `DECIMAL(10,2)` | `NOT NULL` | 商品价格 |
| `description` | `TEXT` | | 商品描述 |
| `image` | `VARCHAR(255)` | | 商品图片URL |
| `stock` | `INT` | `NOT NULL DEFAULT 0` | 商品库存 |
| `createdAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updatedAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |

### 3.2 购物车表 (carts)
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | 购物车ID |
| `productId` | `INT` | `FOREIGN KEY REFERENCES products(id)` | 商品ID |
| `quantity` | `INT` | `NOT NULL DEFAULT 1` | 商品数量 |
| `createdAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updatedAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |

### 3.3 订单表 (orders)
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | 订单ID |
| `addressId` | `INT` | `FOREIGN KEY REFERENCES addresses(id)` | 收货地址ID |
| `totalAmount` | `DECIMAL(10,2)` | `NOT NULL` | 订单总金额 |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT '待支付'` | 订单状态 |
| `createdAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updatedAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |

### 3.4 订单项表 (order_items)
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | 订单项ID |
| `orderId` | `INT` | `FOREIGN KEY REFERENCES orders(id)` | 订单ID |
| `productId` | `INT` | `FOREIGN KEY REFERENCES products(id)` | 商品ID |
| `quantity` | `INT` | `NOT NULL` | 商品数量 |
| `price` | `DECIMAL(10,2)` | `NOT NULL` | 商品价格 |
| `createdAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updatedAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |

### 3.5 地址表 (addresses)
| 字段名 | 数据类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | 地址ID |
| `name` | `VARCHAR(50)` | `NOT NULL` | 收货人姓名 |
| `phone` | `VARCHAR(20)` | `NOT NULL` | 收货人电话 |
| `province` | `VARCHAR(50)` | `NOT NULL` | 省份 |
| `city` | `VARCHAR(50)` | `NOT NULL` | 城市 |
| `district` | `VARCHAR(50)` | `NOT NULL` | 区县 |
| `detail` | `VARCHAR(255)` | `NOT NULL` | 详细地址 |
| `isDefault` | `BOOLEAN` | `DEFAULT FALSE` | 是否默认地址 |
| `createdAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | 创建时间 |
| `updatedAt` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新时间 |

## 4. 关键技术点

### 4.1 前端关键技术点

#### 4.1.1 状态管理
- 使用Redux Toolkit管理全局状态，包括商品列表、购物车、订单和地址信息
- 实现异步Action处理API请求，使用createAsyncThunk
- 设计合理的状态结构，避免状态冗余

#### 4.1.2 路由管理
- 使用React Router v6实现页面路由
- 实现路由守卫，确保页面访问权限
- 设计清晰的路由结构，便于维护

#### 4.1.3 组件设计
- 采用组件化思想，将UI拆分为可复用的组件
- 使用TypeScript定义组件Props类型，提高代码可维护性
- 实现响应式设计，适配不同设备屏幕

#### 4.1.4 API调用
- 封装Axios实例，统一处理API请求和响应
- 实现请求拦截器和响应拦截器，处理认证和错误
- 使用TypeScript定义API响应类型，确保类型安全

### 4.2 后端关键技术点

#### 4.2.1 数据库设计
- 设计合理的数据库表结构，确保数据完整性
- 使用Sequelize ORM简化数据库操作
- 实现数据库索引，优化查询性能

#### 4.2.2 API设计
- 遵循RESTful API设计规范
- 实现合理的API路由结构
- 使用中间件处理CORS、错误等通用逻辑

#### 4.2.3 业务逻辑
- 实现购物车管理逻辑，包括添加、删除、修改数量
- 实现订单创建逻辑，包括库存检查、价格计算
- 实现地址管理逻辑，包括设置默认地址

#### 4.2.4 性能优化
- 实现数据库查询优化，避免N+1查询问题
- 使用适当的缓存策略，提高系统响应速度
- 实现错误处理和日志记录，便于问题排查

### 4.3 前后端交互
- 定义清晰的API接口文档
- 实现前后端数据结构一致
- 使用TypeScript确保类型安全
- 实现合理的错误处理机制

## 5. 部署与集成

### 5.1 前端部署
- 使用Vite构建生产版本
- 部署到静态文件服务器（如Nginx）
- 配置CDN加速静态资源

### 5.2 后端部署
- 使用PM2管理Node.js进程
- 部署到云服务器或容器平台
- 配置环境变量和数据库连接

### 5.3 数据库部署
- 部署MySQL数据库
- 配置数据库备份策略
- 优化数据库配置参数

## 6. 技术风险与应对策略

### 6.1 技术风险
- **数据库性能**：随着数据量增长，可能出现查询性能问题
- **前后端一致性**：前后端数据结构不一致可能导致功能异常
- **错误处理**：未处理的错误可能导致系统崩溃
- **安全性**：缺乏适当的安全措施可能导致数据泄露

### 6.2 应对策略
- **数据库性能**：定期优化数据库查询，使用索引，考虑分库分表
- **前后端一致性**：使用TypeScript确保类型安全，编写API文档
- **错误处理**：实现全局错误处理中间件，完善日志记录
- **安全性**：实现适当的安全措施，如输入验证、XSS防护等

## 7. 总结

本技术架构文档基于React+TypeScript+Vite前端技术栈，Node.js+Express后端技术栈，MySQL数据库，设计了一个Mini版商城的技术方案。文档包含了技术栈选择、项目结构、数据模型和关键技术点等内容，为项目的开发和部署提供了指导。

通过合理的技术选型和架构设计，确保了系统的可扩展性、可维护性和性能。同时，针对可能的技术风险，提出了相应的应对策略，为项目的顺利实施提供了保障。