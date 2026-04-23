import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

interface UserAttributes {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  avatar: string | null;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'avatar' | 'role'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public passwordHash!: string;
  public avatar!: string | null;
  public role!: UserRole;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    avatar: { type: DataTypes.STRING(512), allowNull: true },
    role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: USER_ROLE.USER },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    scopes: {
      withPassword: { attributes: { include: ['passwordHash'] } },
    },
  },
);
