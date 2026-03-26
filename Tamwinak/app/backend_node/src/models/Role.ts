import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface RoleAttributes {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean | null;
    created_at?: Date | null;
    updated_at?: Date | null;
    deleted_at?: Date | null;
}

export type RoleCreationAttributes = Optional<RoleAttributes, 'id'>;

export class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
    declare id: number;
    declare name: string;
    declare description: string | null;
    declare is_active: boolean | null;
    declare created_at: Date | null;
    declare updated_at: Date | null;
    declare deleted_at: Date | null;
}

Role.init(
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
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'roles',
        timestamps: false,
        indexes: [
            { fields: ['is_active'] },
        ],
    }
);

