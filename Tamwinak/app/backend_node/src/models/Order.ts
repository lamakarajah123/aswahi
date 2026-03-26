import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface OrderAttributes {
    id: number;
    user_id: string;
    store_id: number;
    driver_id: string | null;
    status: string;
    subtotal: number;
    delivery_fee: number;
    total: number;
    delivery_address: string | null;
    delivery_lat: number | null;
    delivery_lng: number | null;
    notes: string | null;
    group_id?: string | null;
    issue_details?: string | null;
    created_at?: Date | null;
    updated_at?: Date | null;
}

export type OrderCreationAttributes = Optional<OrderAttributes, 'id'>;

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
    declare id: number;
    declare user_id: string;
    declare store_id: number;
    declare driver_id: string | null;
    declare status: string;
    declare subtotal: number;
    declare delivery_fee: number;
    declare total: number;
    declare delivery_address: string | null;
    declare delivery_lat: number | null;
    declare delivery_lng: number | null;
    declare notes: string | null;
    declare group_id: string | null;
    declare issue_details: string | null;
    declare created_at: Date | null;
    declare updated_at: Date | null;
    declare items?: any[]; // Keep this for easier access to associated items
}

Order.init(
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
        store_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        driver_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        subtotal: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        delivery_fee: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        total: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        delivery_address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        delivery_lat: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        delivery_lng: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        notes: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        group_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        issue_details: {
            type: DataTypes.TEXT,
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
    },
    {
        sequelize,
        tableName: 'orders',
        timestamps: false,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['store_id'] },
            { fields: ['driver_id'] },
            { fields: ['status'] },
            { fields: ['group_id'] },
            { fields: ['created_at'] },
        ],
    }
);

