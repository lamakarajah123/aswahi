import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface RatingAttributes {
    id: number;
    user_id: string;
    order_id: number;
    store_id?: number | null;
    driver_id?: string | null;
    store_rating?: number | null;
    driver_rating?: number | null;
    comment?: string | null;
    created_at?: Date | null;
}

export type RatingCreationAttributes = Optional<RatingAttributes, 'id'>;

export class Rating extends Model<RatingAttributes, RatingCreationAttributes> implements RatingAttributes {
    declare id: number;
    declare user_id: string;
    declare order_id: number;
    declare store_id: number | null;
    declare driver_id: string | null;
    declare store_rating: number | null;
    declare driver_rating: number | null;
    declare comment: string | null;
    declare created_at: Date | null;
}

Rating.init(
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
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        store_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        driver_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        store_rating: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        driver_rating: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        comment: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'ratings',
        timestamps: false,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['order_id'] },
            { fields: ['store_id'] },
            { fields: ['driver_id'] },
        ],
    }
);

