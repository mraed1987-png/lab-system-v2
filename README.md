# 🧪 نظام حوسبة وأرشفة السجل المخبري اليومي

## هيكل المشروع

```
lab-system/
├── index.html              ← هيكل الصفحة فقط
├── netlify.toml            ← إعدادات النشر على Netlify
├── netlify/functions/      ← دوال Netlify السحابية (اختياري)
├── css/
│   └── style.css           ← كل التصميم
└── js/
    ├── modal.js            ← نظام النوافذ المنبثقة
    ├── supabase.js         ← تكامل قاعدة البيانات السحابية
    ├── auth.js             ← تسجيل الدخول والأدوار والصلاحيات
    ├── data.js             ← البيانات العامة والتبويبات والتهيئة
    ├── archive.js          ← السجل اليومي والأرشيف
    ├── print.js            ← دوال الطباعة
    ├── settings.js         ← الإعدادات ومستودع التجارب والأهداف
    ├── supplies.js         ← سجل اللوازم والمواد والحركات
    ├── stats.js            ← إحصائية المختبرات
    ├── requests.js         ← نموذج طلبات المعلمين
    └── weekly.js           ← خطة العمل الأسبوعي
```

## كيف تعدّل؟

| تريد تعديل | افتح الملف |
|-----------|-----------|
| التصميم والألوان | `css/style.css` |
| تسجيل الدخول وكلمات المرور | `js/auth.js` |
| تسجيل حصة جديدة | `js/archive.js` |
| طلبات المعلمين | `js/requests.js` |
| الخطة الأسبوعية | `js/weekly.js` |
| التقارير والإحصائيات | `js/stats.js` |
| إعدادات Supabase | `js/supabase.js` |
| النوافذ المنبثقة | `js/modal.js` |

## النشر على Netlify + GitHub

### الطريقة الأولى: Netlify Drop (بدون GitHub)
1. اسحب مجلد المشروع على https://app.netlify.com/drop
2. Netlify ينشر الموقع فوراً ويعطيك رابط مباشر

### الطريقة الثانية: من GitHub (CI/CD تلقائي)
1. ارفع المشروع على GitHub
2. في Netlify: اضغط **Add new site → Import an existing project**
3. اختر GitHub واربط المستودع
4. إعدادات البناء (تعبأ تلقائياً من `netlify.toml`):
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions`
5. اضغط **Deploy**

### متغيرات البيئة (Environment Variables)
إذا استخدمت Netlify Functions، أضف في Netlify:
- `SUPABASE_URL` — رابط مشروع Supabase
- `SUPABASE_ANON_KEY` — المفتاح العام (أنون)

### التطوير المحلي
```bash
npm install
npx http-server . -p 8080 --cors
```
أو مع Netlify CLI:
```bash
npm install -g netlify-cli
netlify dev
```

