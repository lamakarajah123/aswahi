import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductAttributes {
    id: number;
    industry_id: number | null;
    category_id: number | null;
    name: string;
    name_ar: string | null;
    description: string | null;
    image_url: string | null;
    category: string | null;
    is_available: boolean | null;
    has_customizations: boolean | null;
    created_at?: Date | null;
}

export type ProductCreationAttributes = Optional<ProductAttributes, 'id' | 'is_available' | 'has_customizations'>;

export class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
    declare id: number;
    declare industry_id: number | null;
    declare category_id: number | null;
    declare name: string;
    declare name_ar: string | null;
    declare description: string | null;
    declare image_url: string | null;
    declare category: string | null;
    declare is_available: boolean | null;
    declare has_customizations: boolean | null;
    declare created_at: Date | null;

    // Associations
    public readonly industry?: any;
    public readonly product_units?: any[];
}

Product.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        industry_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name_ar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        image_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_available: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
        },
        has_customizations: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'products',
        timestamps: false,
        indexes: [
            { fields: ['is_available'] },
            { fields: ['category_id'] },
            { fields: ['industry_id'] },
            { fields: ['name'] },
        ],
    }
);
