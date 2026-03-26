import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { StoreGroup } from './StoreGroup';

export interface StoreAttributes {
    id: number;
    user_id: string;
    name: string;
    description: string | null;
    group_id: number | null;
    address: string;
    latitude: number;
    longitude: number;
    phone: string | null;
    image_url: string | null;
    is_approved: boolean | null;
    is_active: boolean | null;
    is_accepting_orders: boolean | null;
    rating: number | null;
    total_ratings: number | null;
    working_hours: string | null;
    can_manage_prices?: boolean | null;
    created_at?: Date | null;
}

export type StoreCreationAttributes = Optional<StoreAttributes, 'id'>;

export class Store extends Model<StoreAttributes, StoreCreationAttributes> implements StoreAttributes {
    declare id: number;
    declare user_id: string;
    declare name: string;
    declare description: string | null;
    declare group_id: number | null;
    declare group?: StoreGroup;
    declare address: string;
    declare latitude: number;
    declare longitude: number;
    declare phone: string | null;
    declare image_url: string | null;
    declare is_approved: boolean | null;
    declare is_active: boolean | null;
    declare is_accepting_orders: boolean | null;
    declare rating: number | null;
    declare total_ratings: number | null;
    declare working_hours: string | null;
    declare can_manage_prices: boolean | null;
    declare created_at: Date | null;
}

Store.init(
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
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        group_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'store_groups',
                key: 'id'
            }
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        latitude: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        longitude: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        image_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        is_approved: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        is_accepting_orders: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
        },
        rating: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        total_ratings: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        working_hours: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: '00:00-23:59',
        },
        can_manage_prices: {
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
        tableName: 'stores',
        timestamps: false,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['is_approved'] },
            { fields: ['is_active'] },
            { fields: ['created_at'] },
        ],
    }
);
