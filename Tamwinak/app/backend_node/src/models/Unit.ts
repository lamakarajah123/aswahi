import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UnitAttributes {
    id: number;
    name: string;
    name_ar: string | null;
    is_active: boolean;
    step: number;
    allow_decimal: boolean;
}

export type UnitCreationAttributes = Optional<UnitAttributes, 'id' | 'is_active' | 'step' | 'allow_decimal'>;

export class Unit extends Model<UnitAttributes, UnitCreationAttributes> implements UnitAttributes {
    declare id: number;
    declare name: string;
    declare name_ar: string | null;
    declare is_active: boolean;
    declare step: number;
    declare allow_decimal: boolean;
}

Unit.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name_ar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        step: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 1.0,
        },
        allow_decimal: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        sequelize,
        tableName: 'units',
        timestamps: false,
    }
);
