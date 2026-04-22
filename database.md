# 在线商城数据库设计

## 用户表（users）

- id、username、email、password、avatar
- created_at

## 商品表（products）

- id、name、description、price、stock（库存）
- images: 图片 URL（JSON 数组）
- category: 分类
- created_at、updated_at

## 购物车表（cart_items）

- id、user_id、product_id、quantity（数量）
- created_at

## 地址表（addresses）

- id、user_id、name（收货人）、phone、province、city、district、detail
- is_default: 是否默认地址
- created_at

## 订单表（orders）

- id、order_no（订单号）、user_id、address_id
- total_price: 总价
- status: 状态（待支付、已支付、已发货、已完成、已取消）
- created_at、updated_at

## 订单商品表（order_items）

- id、order_id、product_id、quantity、price（下单时的价格）
