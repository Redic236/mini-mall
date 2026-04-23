import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Order } from './Order';

export const PAYMENT_METHOD = {
  ALIPAY_SANDBOX: 'alipay_sandbox',
  WECHAT_SANDBOX: 'wechat_sandbox',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

interface PaymentAttributes {
  id: number;
  orderId: number;
  userId: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  gatewayTxId: string | null;
  paidAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type PaymentCreationAttributes = Optional<
  PaymentAttributes,
  'id' | 'status' | 'gatewayTxId' | 'paidAt'
>;

export class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  public id!: number;
  public orderId!: number;
  public userId!: number;
  public method!: PaymentMethod;
  public amount!: number;
  public status!: PaymentStatus;
  public gatewayTxId!: string | null;
  public paidAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    method: { type: DataTypes.STRING(50), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: PAYMENT_STATUS.PENDING,
    },
    gatewayTxId: { type: DataTypes.STRING(64), allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'payments',
    modelName: 'Payment',
    indexes: [{ fields: ['orderId'] }, { fields: ['userId'] }, { fields: ['status'] }],
  },
);

Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });
