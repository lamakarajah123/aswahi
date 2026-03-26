import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface StoreIndustryAttributes {
    store_id: number;
    industry_id: number;
}

export class StoreIndustry extends Model<StoreIndustryAttributes> implements StoreIndustryAttributes {
    declare store_id: number;
    declare industry_id: number;
}

StoreIndustry.init(
    {
        store_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        industry_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
    },
    {
        sequelize,
        tableName: 'store_industries',
        timestamps: false,
        indexes: [
            { fields: ['industry_id'] },
        ],
    }
);
