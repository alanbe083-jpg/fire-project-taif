# 🔥 نظام متابعة مشروع مكافحة الحريق — الطائف
## دليل الإعداد الكامل

---

## 📁 هيكل المشروع

```
fire-project/
├── src/
│   ├── app/
│   │   ├── page.tsx                    ← شاشة Login
│   │   ├── layout.tsx                  ← Root Layout (RTL)
│   │   ├── globals.css                 ← الأنماط العامة
│   │   └── dashboard/
│   │       ├── layout.tsx              ← Dashboard Layout + Sidebar + Alerts
│   │       ├── page.tsx                ← لوحة التحكم الرئيسية
│   │       ├── works/page.tsx          ← الأعمال
│   │       ├── vehicles/page.tsx       ← العربات
│   │       ├── tools/page.tsx          ← العدة
│   │       ├── workers/page.tsx        ← العاملين
│   │       ├── approvals/page.tsx      ← الاعتمادات
│   │       ├── documents/page.tsx      ← الورقيات والمستندات
│   │       ├── custody/page.tsx        ← العهدة
│   │       ├── inventory/page.tsx      ← المخزون
│   │       ├── reports/page.tsx        ← التقارير
│   │       └── activity/page.tsx       ← سجل العمليات
│   ├── components/
│   │   ├── layout/Sidebar.tsx          ← الشريط الجانبي
│   │   └── ui/DataTable.tsx            ← جدول البيانات المشترك
│   └── lib/
│       ├── supabase.ts                 ← إعداد Supabase + أنواع البيانات
│       ├── auth-context.tsx            ← سياق المصادقة
│       └── utils.ts                    ← مساعدات (تصدير، تواريخ، تنبيهات)
├── supabase_schema.sql                 ← ملف SQL لقاعدة البيانات
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── .env.local.example
```

---

## 🗄️ الخطوة 1: إعداد Supabase

### 1.1 إنشاء المشروع
1. اذهب إلى [supabase.com](https://supabase.com) وسجّل دخولك
2. اضغط **New Project**
3. أدخل اسم المشروع: `fire-project-taif`
4. اختر كلمة مرور قوية لقاعدة البيانات
5. اختر المنطقة: **Middle East (Bahrain)**
6. انتظر حتى يكتمل الإنشاء (~2 دقيقة)

### 1.2 تشغيل SQL Schema
1. من القائمة الجانبية اختر **SQL Editor**
2. اضغط **New Query**
3. انسخ محتوى ملف `supabase_schema.sql` بالكامل والصقه
4. اضغط **Run** ✅

### 1.3 إعداد Storage
1. من القائمة اختر **Storage**
2. اضغط **New Bucket**
3. الاسم: `project-files`
4. **غيّر** `Public bucket` إلى **OFF** (خاص)
5. اضغط **Save**
6. اذهب إلى **Policies** ثم أضف السياسات التالية:

```sql
-- السماح للـ Admin برفع الملفات
CREATE POLICY "Admins can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-files' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- السماح لجميع المستخدمين بقراءة الملفات
CREATE POLICY "Authenticated can read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-files');

-- السماح للـ Admin بحذف الملفات
CREATE POLICY "Admins can delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

### 1.4 الحصول على مفاتيح API
1. من القائمة اختر **Settings → API**
2. انسخ:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 👤 الخطوة 2: إنشاء المستخدمين

### إنشاء مستخدم Admin (مدير المشروع)
1. من Supabase Dashboard → **Authentication → Users**
2. اضغط **Add User → Create new user**
3. البريد: `admin@yourproject.com`
4. كلمة المرور: `Admin@123456` (غيّرها)
5. اضغط **Create User**
6. انسخ الـ UUID للمستخدم الجديد
7. اذهب إلى **Table Editor → profiles**
8. اضغط **Insert Row**:
   - `id`: الـ UUID المنسوخ
   - `full_name`: اسمك
   - `role`: `admin`

### إنشاء مستخدم Viewer (مديرك)
1. نفس الخطوات السابقة
2. البريد: `manager@yourproject.com`
3. عند إضافة Profile: `role` = `viewer`

> **ملاحظة**: الـ Viewer يمكنه فقط المشاهدة، ممنوع منه الإضافة/التعديل/الحذف من خلال RLS في Supabase وليس فقط الواجهة.

---

## 💻 الخطوة 3: إعداد المشروع محلياً

```bash
# 1. فك الضغط وادخل للمجلد
cd fire-project

# 2. ثبّت المكتبات
npm install

# 3. أنشئ ملف البيئة
cp .env.local.example .env.local

# 4. عدّل .env.local وضع مفاتيح Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# 5. شغّل محلياً للتجربة
npm run dev
# افتح: http://localhost:3000
```

---

## 🚀 الخطوة 4: نشر على Vercel

### الطريقة السريعة عبر GitHub
1. ارفع المشروع إلى GitHub:
```bash
git init
git add .
git commit -m "Initial commit - Fire Project Management System"
git remote add origin https://github.com/yourusername/fire-project-taif.git
git push -u origin main
```

2. اذهب إلى [vercel.com](https://vercel.com)
3. اضغط **New Project**
4. اختر مستودعك من GitHub
5. في **Environment Variables** أضف:
   - `NEXT_PUBLIC_SUPABASE_URL` = رابط مشروعك في Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = مفتاح anon
6. اضغط **Deploy** 🎉

### بعد النشر
- ستحصل على رابط مثل: `https://fire-project-taif.vercel.app`
- **شارك هذا الرابط مع مديرك** مع بيانات دخول الـ Viewer
- أنت تدخل بحساب Admin وتحدّث البيانات يومياً
- مديرك يدخل بحساب Viewer ويشوف فقط

---

## 🔐 ملخص الصلاحيات

| الإجراء | Admin | Viewer |
|---------|-------|--------|
| مشاهدة البيانات | ✅ | ✅ |
| إضافة سجلات | ✅ | ❌ |
| تعديل سجلات | ✅ | ❌ |
| حذف سجلات | ✅ | ❌ |
| رفع ملفات | ✅ | ❌ |
| تصدير التقارير | ✅ | ✅ |
| طباعة | ✅ | ✅ |

> الصلاحيات محمية من Supabase RLS — حتى لو حاول Viewer الاختراق من DevTools أو API فلن يتمكن.

---

## 🔔 التنبيهات التلقائية

النظام يتحقق تلقائياً ويُنبّه عند:
- ⚠️ إقامات عمال تنتهي خلال 30 يوماً أو منتهية
- ⚠️ رخص عمل تنتهي قريباً
- ⚠️ استمارات ووثائق عربات تنتهي
- ⚠️ تأمين عربات ينتهي
- 🔴 مخزون أقل من الحد الأدنى
- 🔴 اعتمادات مرفوضة أو تحتاج تعديل

---

## 📊 التصدير المتاح

كل قسم يدعم:
- **Excel (.xlsx)** — تصدير بيانات الجدول
- **PDF** — تقرير مُنسَّق جاهز للطباعة
- **طباعة مباشرة** — واجهة محسّنة للطباعة

---

## 🛠️ استكشاف الأخطاء

**مشكلة: لا تظهر البيانات بعد تسجيل الدخول**
- تأكد من إضافة السجل في جدول `profiles` للمستخدم

**مشكلة: خطأ في رفع الملفات**
- تأكد من إنشاء bucket `project-files` في Storage
- تأكد من إضافة policies التخزين

**مشكلة: الـ Viewer يستطيع التعديل**
- تأكد من تشغيل ملف SQL كاملاً (RLS policies)

---

## 📞 دعم التطوير

المشروع مبني بـ:
- **Next.js 14** (App Router)
- **Tailwind CSS** (RTL)
- **Supabase** (Auth + DB + Storage)
- **Recharts** (الرسوم البيانية)
- **jsPDF + SheetJS** (التصدير)
