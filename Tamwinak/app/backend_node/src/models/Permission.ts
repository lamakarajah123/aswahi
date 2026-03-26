import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface PermissionAttributes {
    id: number;
    name: string;
    description: string | null;
    module: string;
    action: string;
    created_at?: Date | null;
}

export type PermissionCreationAttributes = Optional<PermissionAttributes, 'id'>;

export class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
    declare id: number;
    declare name: string;
    declare description: string | null;
    declare module: string;
    declare action: string;
    declare created_at: Date | null;
}

Permission.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        module: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'permissions',
        timestamps: false,
        indexes: [
            { fields: ['module'] },
        ],
    }
);

