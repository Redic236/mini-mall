import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Order } from './Order';

export const SHIPMENT_STATUS = {
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  ARRIVED: 'arrived',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
} as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUS)[keyof typeof SHIPMENT_STATUS];

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  picked_up: '已揽件',
  in_transit: '运输中',
  arrived: '已到达站点',
  out_for_delivery: '派送中',
  delivered: '已签收',
};

interface ShipmentEventAttributes {
  id: number;
  orderId: number;
  status: ShipmentStatus;
  location: string | null;
  note: string | null;
  happenedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type ShipmentEventCreationAttributes = Optional<ShipmentEventAttributes, 'id' | 'location' | 'note'>;

export class ShipmentEvent
  extends Model<ShipmentEventAttributes, ShipmentEventCreationAttributes>
  implements ShipmentEventAttributes
{
  public id!: number;
  public orderId!: number;
  public status!: ShipmentStatus;
  public location!: string | null;
  public note!: string | null;
  public happenedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ShipmentEvent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false },
    location: { type: DataTypes.STRING(100), allowNull: true },
    note: { type: DataTypes.STRING(255), allowNull: true },
    happenedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'shipment_events',
    modelName: 'ShipmentEvent',
    indexes: [{ fields: ['orderId'] }],
  },
);

ShipmentEvent.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(ShipmentEvent, { foreignKey: 'orderId', as: 'shipmentEvents' });
