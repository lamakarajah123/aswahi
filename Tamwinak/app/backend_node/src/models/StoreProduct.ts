import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface StoreProductAttributes {
    store_id: number;
    product_id: number;
    is_available: boolean;
    override_price: number | null;
    sale_price: number | null;
    stock_quantity: number | null;
    available_units: number[] | null;
    sale_start: Date | null;
    sale_end: Date | null;
    added_at?: Date | null;
}

export class StoreProduct extends Model<StoreProductAttributes> implements StoreProductAttributes {
    declare store_id: number;
    declare product_id: number;
    declare is_available: boolean;
    declare override_price: number | null;
    declare sale_price: number | null;
    declare stock_quantity: number | null;
    declare available_units: number[] | null;
    declare sale_start: Date | null;
    declare sale_end: Date | null;
    declare added_at: Date | null;
}

StoreProduct.init(
    {
        store_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        is_available: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        override_price: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        sale_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        sale_start: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        sale_end: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        stock_quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        available_units: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
        },
        added_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'store_products',
        timestamps: false,
        indexes: [
            { fields: ['is_available'] },
            { fields: ['product_id'] },
        ],
    }
);
