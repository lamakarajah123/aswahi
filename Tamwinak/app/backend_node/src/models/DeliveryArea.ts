import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface DeliveryAreaAttributes {
    id: number;
    store_id: number | null;
    name: string;
    name_ar: string | null;
    boundaries: object; // GeoJSON Polygon
    color: string | null;
    is_active: boolean;
    area_type: 'A' | 'B' | 'C' | null;
    delivery_fee: number;
    created_at?: Date | null;
    updated_at?: Date | null;
}

export type DeliveryAreaCreationAttributes = Optional<DeliveryAreaAttributes, 'id'>;

export class DeliveryArea extends Model<DeliveryAreaAttributes, DeliveryAreaCreationAttributes> implements DeliveryAreaAttributes {
    declare id: number;
    declare store_id: number | null;
    declare name: string;
    declare name_ar: string | null;
    declare boundaries: object;
    declare color: string | null;
    declare is_active: boolean;
    declare area_type: 'A' | 'B' | 'C' | null;
    declare delivery_fee: number;
    declare created_at: Date | null;
    declare updated_at: Date | null;
}

DeliveryArea.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        store_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'stores',
                key: 'id'
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name_ar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        boundaries: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: '#3B82F6',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        area_type: {
            type: DataTypes.ENUM('A', 'B', 'C'),
            allowNull: true,
        },
        delivery_fee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
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
        tableName: 'delivery_areas',
        timestamps: false,
        indexes: [
            { fields: ['is_active'] },
            { fields: ['store_id'] },
            { fields: ['area_type'] },
        ],
    }
);

