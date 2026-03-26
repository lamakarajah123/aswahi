import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface StoreGroupAttributes {
    id: number;
    name: string;
    delivery_fee: number;
    is_active: boolean;
    created_at?: Date | null;
    updated_at?: Date | null;
}

export type StoreGroupCreationAttributes = Optional<StoreGroupAttributes, 'id'>;

export class StoreGroup extends Model<StoreGroupAttributes, StoreGroupCreationAttributes> implements StoreGroupAttributes {
    declare id: number;
    declare name: string;
    declare delivery_fee: number;
    declare is_active: boolean;
    declare created_at: Date | null;
    declare updated_at: Date | null;
}

StoreGroup.init(
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
        delivery_fee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'store_groups',
        timestamps: false,
    }
);
