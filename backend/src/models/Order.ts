import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Address } from './Address';

export const ORDER_STATUS = {
  PENDING: '待支付',
  PAID: '已支付',
  SHIPPED: '已发货',
  DONE: '已完成',
  CANCELLED: '已取消',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

interface OrderAttributes {
  id: number;
  orderNo: string;
  addressId: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

type OrderCreationAttributes = Optional<OrderAttributes, 'id' | 'status'>;

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public id!: number;
  public orderNo!: string;
  public addressId!: number;
  public totalAmount!: number;
  public status!: OrderStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderNo: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    addressId: { type: DataTypes.INTEGER, allowNull: false },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: ORDER_STATUS.PENDING },
  },
  {
    sequelize,
    tableName: 'orders',
    modelName: 'Order',
  },
);

Order.belongsTo(Address, { foreignKey: 'addressId', as: 'address' });
