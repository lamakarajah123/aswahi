import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface CategoryAttributes {
    id: number;
    name: string;
    name_ar: string | null;
    icon: string | null;
    description: string | null;
    sort_order: number;
    is_active: boolean;
    created_at?: Date | null;
}

export type CategoryCreationAttributes = Optional<CategoryAttributes, 'id' | 'sort_order' | 'is_active'>;

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
    declare id: number;
    declare name: string;
    declare name_ar: string | null;
    declare icon: string | null;
    declare description: string | null;
    declare sort_order: number;
    declare is_active: boolean;
    declare created_at: Date | null;
}

Category.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        name_ar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        icon: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        sort_order: {
            type: DataTypes.INTEGER,
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
        },
    },
    {
        sequelize,
        tableName: 'categories',
        timestamps: false,
        indexes: [
            { fields: ['is_active'] },
            { fields: ['sort_order'] },
        ],
    }
);
