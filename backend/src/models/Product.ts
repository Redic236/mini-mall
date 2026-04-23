import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ProductAttributes {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category: string;
  image: string | null;
  stock: number;
  salesCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type ProductCreationAttributes = Optional<
  ProductAttributes,
  'id' | 'description' | 'image' | 'stock' | 'category' | 'salesCount'
>;

export class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: number;
  public name!: string;
  public price!: number;
  public description!: string | null;
  public category!: string;
  public image!: string | null;
  public stock!: number;
  public salesCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '其他' },
    image: { type: DataTypes.STRING(512), allowNull: true },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    salesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 'products',
    modelName: 'Product',
    indexes: [{ fields: ['category'] }],
  },
);
