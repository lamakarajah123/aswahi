import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IndustryAttributes {
    id: number;
    name: string;
    name_ar: string | null;
    icon: string | null;
    image_url: string | null;
    description: string | null;
    is_active: boolean;
    created_at?: Date | null;
}

export type IndustryCreationAttributes = Optional<IndustryAttributes, 'id'>;

export class Industry extends Model<IndustryAttributes, IndustryCreationAttributes> implements IndustryAttributes {
    declare id: number;
    declare name: string;
    declare name_ar: string | null;
    declare icon: string | null;
    declare image_url: string | null;
    declare description: string | null;
    declare is_active: boolean;
    declare created_at: Date | null;
}

Industry.init(
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
        image_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
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
        tableName: 'industries',
        timestamps: false,
        indexes: [
            { fields: ['is_active'] },
        ],
    }
);
