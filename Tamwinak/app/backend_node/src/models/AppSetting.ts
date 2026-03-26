import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AppSettingAttributes {
    id: number;
    key: string;
    value: string;
    description?: string | null;
}

export type AppSettingCreationAttributes = Optional<AppSettingAttributes, 'id'>;

export class AppSetting extends Model<AppSettingAttributes, AppSettingCreationAttributes> implements AppSettingAttributes {
    declare id: number;
    declare key: string;
    declare value: string;
    declare description: string | null;
}

AppSetting.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        value: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'app_settings',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['key'] },
        ],
    }
);

