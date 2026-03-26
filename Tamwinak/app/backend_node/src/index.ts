import { env } from './config/env';
import app from './app';
import { sequelize, connectDB } from './config/database';
import { Language, Industry } from './models';

const startServer = async () => {
    await connectDB();

    // Sync database models in development
    if (env.NODE_ENV === 'development') {
        try {
            await sequelize.sync({ alter: true });
            console.log('✅ Database models synchronized successfully.');
        } catch (error) {
            console.error('❌ Failed to synchronize database models:', error);
        }
    }

    // Seed default language if none exist
    const langCount = await Language.count();
    if (langCount === 0) {
        await Language.create({
            code: 'ar',
            name: 'العربية',
            isDefault: true,
            isRtl: true,
            translations: {
                "app.title": "تموينك",
                "auth.welcome": "أهلاً بك في تموينك",
                "auth.signin_desc": "سجل الدخول للوصول إلى لوحة التحكم الخاصة بك",
                "auth.email": "البريد الإلكتروني",
                "auth.email_placeholder": "أدخل بريدك الإلكتروني",
                "auth.password": "كلمة المرور",
                "auth.password_placeholder": "أدخل كلمة المرور",
                "auth.forgot_password": "هل نسيت كلمة المرور؟",
                "auth.signin_button": "تسجيل الدخول",
                "auth.signing_in": "جاري تسجيل الدخول...",
                "auth.signup_prompt": "ليس لديك حساب؟",
                "auth.signup_link": "إنشاء حساب",
                "auth.reset_password": "إعادة تعيين كلمة المرور",
                "auth.reset_code_desc": "أدخل بريدك الإلكتروني لتلقي رمز التحقق المكون من 6 أرقام.",
                "auth.otp_code": "رمز التحقق",
                "auth.new_password": "كلمة المرور الجديدة",
                "auth.send_code": "إرسال الرمز",
                "auth.signin_required": "تسجيل الدخول مطلوب",
                "nav.home": "الرئيسية",
                "nav.stores": "المتاجر",
                "nav.products": "المنتجات",
                "nav.users": "المستخدمين",
                "nav.drivers": "السائقين",
                "nav.orders": "الطلبات",
                "nav.cart": "السلة",
                "nav.profile": "حسابي",
                "nav.admin": "لوحة التحكم",
                "nav.analytics": "التقارير",
                "nav.settings": "الإعدادات",
                "nav.languages": "اللغات",
                "nav.login": "تسجيل الدخول",
                "nav.logout": "تسجيل الخروج",
                "nav.back_home": "العودة للرئيسية",
                "nav.my_store": "متجري",
                "nav.super_admin": "مدير النظام",
                "nav.store_owner": "صاحب متجر",
                "nav.driver": "سائق",
                "nav.system_admin": "النظام",
                "common.add": "إضافة",
                "common.edit": "تعديل",
                "common.delete": "حذف",
                "common.save": "حفظ",
                "common.cancel": "إلغاء",
                "common.loading": "جاري التحميل...",
                "common.error": "خطأ",
                "common.success": "تم بنجاح",
                "common.search": "بحث",
                "common.view_all": "عرض الكل",
                "common.no_results": "لا توجد نتائج",
                "common.items": "عناصر",
                "common.processing": "جاري المعالجة...",
                "common.per": "لكل",
                "home.hero_title": "بقالة طازجة، توصيل سريع",
                "home.hero_subtitle": "اطلب منتجاتك المفضلة واحصل عليها عند باب منزلك في دقائق بدون عناء!",
                "home.search_placeholder": "ابحث عن جميع المنتجات القريبة...",
                "home.no_products": "لا توجد منتجات",
                "home.no_products_desc": "جرب تعديل بحثك أو تغيير الفئات للعثور على ما تحتاجه.",
                "cart.title": "سلة التسوق",
                "cart.empty": "سلتك فارغة",
                "cart.checkout_button": "الدفع",
                "cart.subtotal": "المجموع الفرعي",
                "cart.view_cart": "عرض السلة",
                "checkout.title": "الدفع",
                "checkout.delivery_address": "عنوان التوصيل",
                "checkout.address_placeholder": "أدخل عنوان التوصيل الخاص بك",
                "checkout.notes": "ملاحظات (اختياري)",
                "checkout.notes_placeholder": "أي تعليمات خاصة للسائق...",
                "checkout.delivery_fee": "رسوم التوصيل",
                "checkout.total": "الإجمالي",
                "checkout.place_order": "إتمام الطلب",
                "checkout.placing_order": "جاري إتمام الطلب...",
                "checkout.success_title": "تم تقديم الطلب!",
                "checkout.success_desc": "تم تقديم طلبك بنجاح. يمكنك تتبعه في صفحة الطلبات.",
                "checkout.view_orders": "عرض الطلبات",
                "checkout.continue_shopping": "مواصلة التسوق",
                "store.no_products_cat": "لا توجد منتجات في هذه الفئة",
                "admin.languages": "اللغات",
                "admin.add_language": "إضافة لغة",
                "admin.edit_language": "تعديل اللغة",
                "admin.basic_info": "المعلومات الأساسية",
                "admin.lang_code": "رمز اللغة (مثلاً en, ar)",
                "admin.lang_name": "اسم اللغة (مثلاً English, العربية)",
                "admin.default_lang": "اللغة الافتراضية",
                "admin.is_rtl": "من اليمين لليسار (RTL)",
                "admin.translations_title": "ترجمة التسميات الثابتة",
                "admin.default_ar": "العربية الافتراضية",
                "admin.default_en": "الإنجليزية الافتراضية",
                "admin.translation_placeholder": "أدخل الترجمة لـ",
                "admin.delete_confirm": "هل أنت متأكد أنك تريد حذف هذه اللغة؟",
                "success.updated": "تم التحديث بنجاح",
                "success.created": "تم الإنشاء بنجاح",
                "success.deleted": "تم الحذف بنجاح",
                "error.fetch_languages": "فشل في جلب اللغات",
                "error.save": "فشل في حفظ اللغة",
                "error.delete": "فشل في حذف اللغة"
            }
        });
        console.log('✅ Seeded default Arabic language.');
    }

    // Seed default industries if none exist
    const industryCount = await Industry.count();
    if (industryCount === 0) {
        await Industry.bulkCreate([
            { name: 'Grocery', name_ar: 'بقالة', icon: '🛒', description: 'Supermarkets and grocery stores', is_active: true, created_at: new Date() },
            { name: 'Bakery', name_ar: 'مخبز', icon: '🍞', description: 'Bread, pastries and baked goods', is_active: true, created_at: new Date() },
            { name: 'Restaurant', name_ar: 'مطعم', icon: '🍽️', description: 'Cooked meals and food delivery', is_active: true, created_at: new Date() },
            { name: 'Pharmacy', name_ar: 'صيدلية', icon: '💊', description: 'Medicines and health products', is_active: true, created_at: new Date() },
            { name: 'Electronics', name_ar: 'إلكترونيات', icon: '📱', description: 'Electronic devices and accessories', is_active: true, created_at: new Date() },
            { name: 'Fashion', name_ar: 'أزياء', icon: '👗', description: 'Clothing and accessories', is_active: true, created_at: new Date() },
        ]);
        console.log('✅ Seeded default industries.');
    }

    app.listen(env.PORT, () => {
        console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
        console.log(`🏥 Health check: http://localhost:${env.PORT}/health`);
    });
};

startServer();









