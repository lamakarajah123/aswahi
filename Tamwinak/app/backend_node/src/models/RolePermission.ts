import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface RolePermissionAttributes {
    id: number;
    role_id: number;
    permission_id: number;
    created_at?: Date | null;
}

export type RolePermissionCreationAttributes = Optional<RolePermissionAttributes, 'id'>;

export class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes> implements RolePermissionAttributes {
    declare id: number;
    declare role_id: number;
    declare permission_id: number;
    declare created_at: Date | null;
}

RolePermission.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        permission_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'role_permissions',
        timestamps: false,
        indexes: [
            { fields: ['role_id'] },
            { fields: ['permission_id'] },
        ],
    }
);

