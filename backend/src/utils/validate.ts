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
});

export const orderStatusQuerySchema = z
  .enum(['待支付', '已支付', '已发货', '已完成', '已取消'])
  .optional();
