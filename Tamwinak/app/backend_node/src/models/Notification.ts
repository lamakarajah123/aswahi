import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface NotificationAttributes {
    id: number;
    user_id: string;
    title: string;
    body: string;
    type: string;
    order_id?: number | null;
    is_read?: boolean | null;
    created_at?: Date | null;
}

export type NotificationCreationAttributes = Optional<NotificationAttributes, 'id'>;

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
    declare id: number;
    declare user_id: string;
    declare title: string;
    declare body: string;
    declare type: string;
    declare order_id: number | null;
    declare is_read: boolean | null;
    declare created_at: Date | null;
}

Notification.init(
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
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        body: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        is_read: {
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
        tableName: 'notifications',
        timestamps: false,
        indexes: [
            { fields: ['user_id', 'is_read'] },
            { fields: ['user_id', 'created_at'] },
        ],
    }
);

