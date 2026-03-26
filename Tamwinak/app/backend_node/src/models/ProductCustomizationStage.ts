import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductCustomizationStageAttributes {
    id: number;
    product_id: number;
    name: string;
    name_ar: string | null;
    sort_order: number;
    min_selections: number;
    max_selections: number;
    is_required: boolean;
    is_active: boolean;
}

export type ProductCustomizationStageCreationAttributes = Optional<ProductCustomizationStageAttributes, 'id' | 'sort_order' | 'min_selections' | 'max_selections' | 'is_required' | 'is_active'>;

export class ProductCustomizationStage extends Model<ProductCustomizationStageAttributes, ProductCustomizationStageCreationAttributes> implements ProductCustomizationStageAttributes {
    declare id: number;
    declare product_id: number;
    declare name: string;
    declare name_ar: string | null;
    declare sort_order: number;
    declare min_selections: number;
    declare max_selections: number;
    declare is_required: boolean;
    declare is_active: boolean;

    // Associations
    public readonly options?: any[];
}

ProductCustomizationStage.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        product_id: {
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
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        min_selections: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        max_selections: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        is_required: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: 'product_customization_stages',
        timestamps: false,
    }
);
