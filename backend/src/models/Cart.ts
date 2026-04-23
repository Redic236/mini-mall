import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Product } from './Product';
import { User } from './User';

interface CartAttributes {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type CartCreationAttributes = Optional<CartAttributes, 'id' | 'quantity'>;

export class Cart extends Model<CartAttributes, CartCreationAttributes> implements CartAttributes {
  public id!: number;
  public userId!: number;
  public productId!: number;
  public quantity!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Cart.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  },
  {
    sequelize,
    tableName: 'carts',
    modelName: 'Cart',
    indexes: [{ unique: true, fields: ['userId', 'productId'] }],
  },
);

Cart.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
