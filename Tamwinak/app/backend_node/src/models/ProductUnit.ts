import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductUnitAttributes {
    id: number;
    product_id: number;
    unit_id: number;
    price: number;
}

export type ProductUnitCreationAttributes = Optional<ProductUnitAttributes, 'id'>;

export class ProductUnit extends Model<ProductUnitAttributes, ProductUnitCreationAttributes> implements ProductUnitAttributes {
    declare id: number;
    declare product_id: number;
    declare unit_id: number;
    declare price: number;
}

ProductUnit.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        unit_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'product_units',
        timestamps: false,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['unit_id'] },
        ],
    }
);
