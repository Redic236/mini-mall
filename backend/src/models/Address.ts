import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface AddressAttributes {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type AddressCreationAttributes = Optional<AddressAttributes, 'id' | 'isDefault'>;

export class Address extends Model<AddressAttributes, AddressCreationAttributes> implements AddressAttributes {
  public id!: number;
  public name!: string;
  public phone!: string;
  public province!: string;
  public city!: string;
  public district!: string;
  public detail!: string;
  public isDefault!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Address.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    province: { type: DataTypes.STRING(50), allowNull: false },
    city: { type: DataTypes.STRING(50), allowNull: false },
    district: { type: DataTypes.STRING(50), allowNull: false },
    detail: { type: DataTypes.STRING(255), allowNull: false },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    tableName: 'addresses',
    modelName: 'Address',
  },
);
