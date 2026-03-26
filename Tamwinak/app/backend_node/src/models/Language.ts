import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface LanguageAttributes {
    id: number;
    code: string;
    name: string;
    isDefault: boolean;
    isRtl: boolean;
    translations: Record<string, string>;
}

export type LanguageCreationAttributes = Optional<LanguageAttributes, 'id'>;

export class Language extends Model<LanguageAttributes, LanguageCreationAttributes> implements LanguageAttributes {
    declare id: number;
    declare code: string;
    declare name: string;
    declare isDefault: boolean;
    declare isRtl: boolean;
    declare translations: Record<string, string>;
}

Language.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        code: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        isDefault: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isRtl: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        translations: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
        },
    },
    {
        sequelize,
        tableName: 'languages',
        timestamps: true,
    }
);
