import { Language } from '../models';

export class LanguageService {
    async getList(skip = 0, limit = 20) {
        const { count, rows } = await Language.findAndCountAll({
            offset: skip,
            limit: limit,
            order: [['id', 'DESC']]
        });

        return { items: rows, total: count, skip, limit };
    }

    async getById(id: number) {
        return Language.findOne({ where: { id } });
    }

    async getByCode(code: string) {
        return Language.findOne({ where: { code } });
    }

    async create(data: any) {
        if (data.isDefault) {
            // ensure only one default language
            await Language.update({ isDefault: false }, { where: { isDefault: true } });
        }
        return Language.create(data);
    }

    async update(id: number, data: any) {
        const language = await Language.findOne({ where: { id } });
        if (!language) return null;

        if (data.isDefault) {
            // ensure only one default language
            await Language.update({ isDefault: false }, { where: { isDefault: true } });
        }

        return language.update(data);
    }

    async delete(id: number) {
        const language = await Language.findOne({ where: { id } });
        if (!language) return false;
        if (language.isDefault) {
            throw new Error("Cannot delete default language");
        }
        await language.destroy();
        return true;
    }
}
