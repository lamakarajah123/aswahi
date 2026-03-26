import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserAttributes {
    id: string; // Platform sub
    email: string;
    name: string | null;
    role: string;
    status?: string;
    password_hash?: string | null;
    created_at?: Date;
    last_login?: Date | null;
    phone?: string | null;
    address?: string | null;
    work_area?: string | null;
    working_hours?: string | null;
    vehicle_type?: string | null;
    reset_otp?: string | null;
    reset_otp_expires?: Date | null;
    is_available?: boolean;
}

export type UserCreationAttributes = Optional<UserAttributes, 'role' | 'status' | 'created_at'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    declare id: string;
    declare email: string;
    declare name: string | null;
    declare role: string;
    declare status: string;
    declare password_hash: string | null;
    declare readonly created_at: Date;
    declare last_login: Date | null;
    declare phone: string | null;
    declare address: string | null;
    declare work_area: string | null;
    declare working_hours: string | null;
    declare vehicle_type: string | null;
    declare reset_otp: string | null;
    declare reset_otp_expires: Date | null;
    declare is_available: boolean;
}

User.init(
    {
        id: {
            type: DataTypes.STRING(255),
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        role: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'user',
        },
        status: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'active',
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        work_area: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        working_hours: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        vehicle_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        reset_otp: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        reset_otp_expires: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        is_available: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: false, // Disabling automatic timestamps since created_at is strictly defined
        indexes: [
            { unique: true, fields: ['email'] },
            { fields: ['role'] },
            { fields: ['status'] },
            { fields: ['is_available'] },
        ],
    }
);

