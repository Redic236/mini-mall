-- Mini 版在线商城 —— 数据库初始化脚本
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `mini_mall`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `mini_mall`;

-- -------------------------------
-- products
-- -------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id`          INT             NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(255)    NOT NULL,
  `price`       DECIMAL(10, 2)  NOT NULL,
  `description` TEXT            NULL,
  `image`       VARCHAR(512)    NULL,
  `stock`       INT             NOT NULL DEFAULT 0,
  `createdAt`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_products_stock_nonneg` CHECK (`stock` >= 0),
  CONSTRAINT `chk_products_price_nonneg` CHECK (`price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------
-- addresses
-- -------------------------------
CREATE TABLE IF NOT EXISTS `addresses` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(50)   NOT NULL,
  `phone`     VARCHAR(20)   NOT NULL,
  `province`  VARCHAR(50)   NOT NULL,
  `city`      VARCHAR(50)   NOT NULL,
  `district`  VARCHAR(50)   NOT NULL,
  `detail`    VARCHAR(255)  NOT NULL,
  `isDefault` BOOLEAN       NOT NULL DEFAULT FALSE,
  `createdAt` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_addresses_is_default` (`isDefault`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------
-- carts
-- -------------------------------
CREATE TABLE IF NOT EXISTS `carts` (
  `id`        INT       NOT NULL AUTO_INCREMENT,
  `productId` INT       NOT NULL,
  `quantity`  INT       NOT NULL DEFAULT 1,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_carts_product_id` (`productId`),
  CONSTRAINT `chk_carts_quantity_positive` CHECK (`quantity` > 0),
  CONSTRAINT `fk_carts_product`
    FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------
-- orders
-- -------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id`          INT            NOT NULL AUTO_INCREMENT,
  `orderNo`     VARCHAR(32)    NOT NULL,
  `addressId`   INT            NOT NULL,
  `totalAmount` DECIMAL(10, 2) NOT NULL,
  `status`      VARCHAR(50)    NOT NULL DEFAULT '待支付',
  `createdAt`   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_orders_order_no` (`orderNo`),
  KEY `idx_orders_address_id` (`addressId`),
  KEY `idx_orders_status` (`status`),
  CONSTRAINT `chk_orders_total_nonneg` CHECK (`totalAmount` >= 0),
  CONSTRAINT `fk_orders_address`
    FOREIGN KEY (`addressId`) REFERENCES `addresses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------
-- order_items
-- -------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id`        INT            NOT NULL AUTO_INCREMENT,
  `orderId`   INT            NOT NULL,
  `productId` INT            NOT NULL,
  `quantity`  INT            NOT NULL,
  `price`     DECIMAL(10, 2) NOT NULL,
  `createdAt` TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`orderId`),
  KEY `idx_order_items_product_id` (`productId`),
  CONSTRAINT `chk_order_items_quantity_positive` CHECK (`quantity` > 0),
  CONSTRAINT `chk_order_items_price_nonneg` CHECK (`price` >= 0),
  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product`
    FOREIGN KEY (`productId`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------
-- Seed data (示例商品)
-- -------------------------------
INSERT INTO `products` (`name`, `price`, `description`, `image`, `stock`) VALUES
  ('经典白 T 恤',    59.00,  '纯棉短袖，舒适透气',         'https://picsum.photos/seed/tee/400/400', 100),
  ('牛仔裤',         199.00, '修身直筒，百搭款式',         'https://picsum.photos/seed/jeans/400/400', 80),
  ('运动鞋',         399.00, '轻量缓震，日常通勤',         'https://picsum.photos/seed/sneakers/400/400', 50),
  ('双肩背包',       159.00, '大容量，适合学生及通勤',     'https://picsum.photos/seed/backpack/400/400', 60),
  ('无线蓝牙耳机',   299.00, '主动降噪，长续航',           'https://picsum.photos/seed/earbuds/400/400', 40);
