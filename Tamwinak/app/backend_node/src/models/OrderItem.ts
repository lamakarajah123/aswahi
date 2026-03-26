import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface OrderItemAttributes {
    id: number;
    order_id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    unit_name: string | null;
    unit_name_ar: string | null;
    status: string;
    customizations: any | null;
}

export type OrderItemCreationAttributes = Optional<OrderItemAttributes, 'id' | 'status' | 'customizations'>;

export class OrderItem extends Model<OrderItemAttributes, OrderItemCreationAttributes> implements OrderItemAttributes {
    declare id: number;
    declare order_id: number;
    declare product_id: number;
    declare product_name: string;
    declare quantity: number;
    declare unit_price: number;
    declare subtotal: number;
    declare unit_name: string | null;
    declare unit_name_ar: string | null;
    declare status: string;
    declare customizations: any | null;
}

OrderItem.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        product_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        quantity: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        unit_price: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        subtotal: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        unit_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        unit_name_ar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'available'
        },
        customizations: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'order_items',
        timestamps: false,
        indexes: [
            { fields: ['order_id'] },
            { fields: ['status'] },
        ],
    }
);

