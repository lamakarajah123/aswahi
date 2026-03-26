import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AuditLogAttributes {
    id: number;
    user_id: string;
    action: string;
    target_type?: string | null;
    target_id?: string | null;
    details?: string | null;
    ip_address?: string | null;
    created_at?: Date | null;
}

export type AuditLogCreationAttributes = Optional<AuditLogAttributes, 'id'>;

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
    declare id: number;
    declare user_id: string;
    declare action: string;
    declare target_type: string | null;
    declare target_id: string | null;
    declare details: string | null;
    declare ip_address: string | null;
    declare created_at: Date | null;
}

AuditLog.init(
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
        action: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        target_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        target_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        details: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ip_address: {
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
        tableName: 'audit_logs',
        timestamps: false,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['created_at'] },
        ],
    }
);

