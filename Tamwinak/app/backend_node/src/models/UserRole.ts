import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserRoleAttributes {
    id: number;
    user_id: string;
    role_id: number;
    assigned_at?: Date | null;
    assigned_by?: string | null;
}

export type UserRoleCreationAttributes = Optional<UserRoleAttributes, 'id'>;

export class UserRole extends Model<UserRoleAttributes, UserRoleCreationAttributes> implements UserRoleAttributes {
    declare id: number;
    declare user_id: string;
    declare role_id: number;
    declare assigned_at: Date | null;
    declare assigned_by: string | null;
}

UserRole.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        assigned_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        assigned_by: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'user_roles',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['user_id', 'role_id'] },
        ],
    }
);

