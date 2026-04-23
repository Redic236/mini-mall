import { z, ZodError, ZodSchema } from 'zod';
import { HttpError } from './apiResponse';

export function parseOrThrow<T>(schema: ZodSchema<T>, input: unknown, context = '请求参数'): T {
  try {
    return schema.parse(input);
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const path = first.path.length > 0 ? first.path.join('.') : context;
      throw new HttpError(400, `${path}: ${first.message}`);
    }
    throw err;
  }
}

// Reusable primitives
export const idSchema = z.coerce.number().int().positive();
export const positiveIntSchema = z.number().int().positive();
export const nonNegativeNumberSchema = z.number().nonnegative();

// Auth
export const registerBodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, '用户名至少 3 个字符')
    .max(50, '用户名不超过 50 个字符')
    .regex(/^[\w一-龥]+$/, '用户名只能包含字母、数字、下划线或中文'),
  email: z.string().trim().email('邮箱格式不正确').max(255),
  password: z.string().min(6, '密码至少 6 位').max(128, '密码不超过 128 位'),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

// Reviews
export const createReviewBodySchema = z.object({
  productId: positiveIntSchema,
  rating: z.number().int().min(1, '评分最低 1 星').max(5, '评分最高 5 星'),
  content: z.string().trim().max(1000, '内容不超过 1000 字').optional(),
});

export const updateReviewBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().max(1000).optional(),
});

export const reviewListQuerySchema = z.object({
  productId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const myReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Products
export const productListQuerySchema = z.object({
  keyword: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(50).optional(),
});

// Cart
export const addCartBodySchema = z.object({
  productId: positiveIntSchema,
  quantity: positiveIntSchema,
});

export const updateCartBodySchema = z.object({
  quantity: positiveIntSchema,
});

// Address
export const addressBodySchema = z.object({
  name: z.string().trim().min(1).max(50),
  phone: z.string().trim().min(1).max(20),
  province: z.string().trim().min(1).max(50),
  city: z.string().trim().min(1).max(50),
  district: z.string().trim().min(1).max(50),
  detail: z.string().trim().min(1).max(255),
  isDefault: z.boolean().optional(),
});

// Order
export const createOrderBodySchema = z.object({
  addressId: positiveIntSchema,
  cartItemIds: z.array(positiveIntSchema).min(1, '请至少选择一件商品'),
  couponCode: z.string().trim().min(1).max(40).optional(),
});

// Coupons
export const couponPreviewBodySchema = z.object({
  code: z.string().trim().min(1).max(40),
  orderAmount: z.coerce.number().nonnegative(),
});

export const couponBodySchema = z
  .object({
    code: z.string().trim().min(1).max(40).regex(/^[A-Z0-9_-]+$/, 'code 仅允许大写字母、数字、下划线和连字符'),
    name: z.string().trim().min(1).max(100),
    type: z.enum(['fixed', 'percentage']),
    value: z.coerce.number().nonnegative(),
    minOrderAmount: z.coerce.number().nonnegative().default(0),
    startsAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
    totalQuantity: z.coerce.number().int().positive().nullable().optional(),
    perUserLimit: z.coerce.number().int().positive().default(1),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.startsAt < v.expiresAt, {
    message: '生效时间必须早于过期时间',
    path: ['expiresAt'],
  });

export const orderStatusQuerySchema = z
  .enum(['待支付', '已支付', '已发货', '已完成', '已取消'])
  .optional();

// Shipment events
export const shipmentEventBodySchema = z.object({
  status: z.enum(['picked_up', 'in_transit', 'arrived', 'out_for_delivery', 'delivered']),
  location: z.string().trim().max(100).nullable().optional(),
  note: z.string().trim().max(255).nullable().optional(),
  happenedAt: z.coerce.date().optional(),
});

// Admin
export const adminOrderListQuerySchema = z.object({
  status: z.enum(['待支付', '已支付', '已发货', '已完成', '已取消']).optional(),
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adminProductBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  price: z.coerce.number().nonnegative(),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.string().trim().min(1).max(50),
  image: z.string().trim().max(512).nullable().optional(),
  stock: z.coerce.number().int().nonnegative(),
});

// Payments (sandbox)
export const payIntentBodySchema = z.object({
  method: z.enum(['alipay_sandbox', 'wechat_sandbox']),
});

export const paymentCallbackBodySchema = z.object({
  paymentId: positiveIntSchema,
  outcome: z.enum(['success', 'failed', 'cancelled']),
  amount: nonNegativeNumberSchema,
  signature: z.string().regex(/^[a-f0-9]{64}$/, 'signature 格式错误'),
});
