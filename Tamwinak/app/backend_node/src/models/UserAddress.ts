import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserAddressAttributes {
    id: number;
    user_id: string;
    label: string;
    address: string;
    latitude: number;
    longitude: number;
    is_default: boolean;
    created_at?: Date;
}

export type UserAddressCreationAttributes = Optional<UserAddressAttributes, 'id' | 'is_default' | 'created_at'>;

export class UserAddress extends Model<UserAddressAttributes, UserAddressCreationAttributes> implements UserAddressAttributes {
    declare id: number;
    declare user_id: string;
    declare label: string;
    declare address: string;
    declare latitude: number;
    declare longitude: number;
    declare is_default: boolean;
    declare readonly created_at: Date;
}

UserAddress.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        label: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'Home',
        },
        address: {
            type: DataTypes.STRING(500),
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
        is_default: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'user_addresses',
        timestamps: false,
        indexes: [
            { fields: ['user_id'] },
        ],
    }
);
