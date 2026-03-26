import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductCustomizationOptionAttributes {
    id: number;
    stage_id: number;
    name: string;
    name_ar: string | null;
    price_modifier: number;
    is_available: boolean;
    sort_order: number;
}

export type ProductCustomizationOptionCreationAttributes = Optional<ProductCustomizationOptionAttributes, 'id' | 'price_modifier' | 'is_available' | 'sort_order'>;

export class ProductCustomizationOption extends Model<ProductCustomizationOptionAttributes, ProductCustomizationOptionCreationAttributes> implements ProductCustomizationOptionAttributes {
    declare id: number;
    declare stage_id: number;
    declare name: string;
    declare name_ar: string | null;
    declare price_modifier: number;
    declare is_available: boolean;
    declare sort_order: number;
}

ProductCustomizationOption.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        stage_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name_ar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        price_modifier: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0,
        },
        is_available: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        sequelize,
        tableName: 'product_customization_options',
        timestamps: false,
    }
);
