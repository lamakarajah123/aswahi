import { Language } from './src/models';
import { connectDB } from './src/config/database';

async function run() {
    await connectDB();
    const langs = await Language.findAll();
    console.log('Available Languages:', langs.map(l => ({ code: l.code, name: l.name })));

    // If English is missing, add it for testing
    const enExists = langs.some(l => l.code === 'en');
    if (!enExists) {
        await Language.create({
            code: 'en',
            name: 'English',
            isDefault: false,
            isRtl: false,
            translations: {} // It will fall back to STATIC_LABELS in frontend
        });
        console.log('Added English language for testing.');
    }
}
run();
