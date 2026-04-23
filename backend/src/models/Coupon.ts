import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export const COUPON_TYPE = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
} as const;

export type CouponType = (typeof COUPON_TYPE)[keyof typeof COUPON_TYPE];

interface CouponAttributes {
  id: number;
  code: string;
  name: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  startsAt: Date;
  expiresAt: Date;
  totalQuantity: number | null;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type CouponCreationAttributes = Optional<
  CouponAttributes,
  'id' | 'usedCount' | 'totalQuantity' | 'perUserLimit' | 'isActive' | 'minOrderAmount'
>;

export class Coupon
  extends Model<CouponAttributes, CouponCreationAttributes>
  implements CouponAttributes
{
  public id!: number;
  public code!: string;
  public name!: string;
  public type!: CouponType;
  public value!: number;
  public minOrderAmount!: number;
  public startsAt!: Date;
  public expiresAt!: Date;
  public totalQuantity!: number | null;
  public usedCount!: number;
  public perUserLimit!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Coupon.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false },
    value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    minOrderAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    startsAt: { type: DataTypes.DATE, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    totalQuantity: { type: DataTypes.INTEGER, allowNull: true },
    usedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    perUserLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'coupons',
    modelName: 'Coupon',
    indexes: [{ fields: ['code'], unique: true }, { fields: ['isActive'] }],
  },
);
