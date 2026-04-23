import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Order } from './Order';
import { Product } from './Product';
import { User } from './User';

interface ReviewAttributes {
  id: number;
  userId: number;
  productId: number;
  orderId: number;
  rating: number;
  content: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type ReviewCreationAttributes = Optional<ReviewAttributes, 'id' | 'content'>;

export class Review extends Model<ReviewAttributes, ReviewCreationAttributes> implements ReviewAttributes {
  public id!: number;
  public userId!: number;
  public productId!: number;
  public orderId!: number;
  public rating!: number;
  public content!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Review.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    rating: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    content: { type: DataTypes.STRING(1000), allowNull: true },
  },
  {
    sequelize,
    tableName: 'reviews',
    modelName: 'Review',
    indexes: [
      { unique: true, fields: ['userId', 'productId'] },
      { fields: ['productId'] },
    ],
  },
);

Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Review.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
