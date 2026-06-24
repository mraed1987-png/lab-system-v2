/* =========================================================
   نظام السجل المخبري اليومي — app.js
   ========================================================= */

// =========================================================
// Supabase Integration — ضبط الاتصال بقاعدة البيانات
// =========================================================
// 🚀 اذهب إلى https://supabase.com - أنشئ مشروعاً مجانياً
//    ثم ضع الرابط والمفتاح أدناه (من Project Settings → API)
let SUPABASE_URL = localStorage.getItem('cfg_supabase_url') || 'https://cznpyejuqavandicdrln.supabase.co';
let SUPABASE_ANON_KEY = localStorage.getItem('cfg_supabase_key') || 'sb_publishable_qEftyYSfLkGTPoxSfDYT9A_vtDfm_v2';

let supabaseClient = null;
let supabaseConnected = false;
let supabaseConnectionAttempted = false;
let needsFullSync = false;
let realtimeChannel = null; // قناة التحديث اللحظي
let _supabaseSilent = false; // كتم المزامنة التلقائية أثناء التحميل

(function tryConnectSupabase(retries = 0) {
    if (typeof supabase === 'undefined') {
        if (retries < 50) { setTimeout(() => tryConnectSupabase(retries + 1), 200); }
        return;
    }
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            supabaseConnected = true;
            console.log('☁️ Supabase: متصل بقاعدة البيانات');

            // اشتراك التحديث اللحظي — أي تغيير في أي جدول يحدث الواجهة
            realtimeChannel = supabaseClient.channel('db-changes')
                .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                    if (currentRole) {
                        loadAllFromSupabase().then(() => {
                            initSystemConfiguration();
                            loadSchoolMeta();
                            renderArchive();
                            renderRequestsTable();
                            updateRequestsCount();
                            generateMonthlyReportData();
                            generateWeeklyPlan();
                            if (typeof renderStoreExperiments === 'function') renderStoreExperiments();
                            if (typeof renderMaterialsTable === 'function') renderMaterialsTable();
                            if (typeof renderSavedTargetsTable === 'function') renderSavedTargetsTable();
                        }).catch(e => console.warn('☁️ Supabase realtime refresh failed:', e));
                    }
                })
                .subscribe();
            setTimeout(() => {
                if (needsFullSync) {
                    pushAllLocalToSupabase();
                    needsFullSync = false;
                }
                if (currentRole && typeof loadAllFromSupabase === 'function') {
                    loadAllFromSupabase().then(() => {
                        initSystemConfiguration();
                        loadSchoolMeta();
                        renderArchive();
                        renderRequestsTable();
                        updateRequestsCount();
                        generateMonthlyReportData();
                        generateWeeklyPlan();
                        if (typeof renderStoreExperiments === 'function') renderStoreExperiments();
                        if (typeof renderMaterialsTable === 'function') renderMaterialsTable();
                        if (typeof renderSavedTargetsTable === 'function') renderSavedTargetsTable();
                    });
                }
            }, 500);
        } catch (e) {
            console.warn('⚠️ Supabase: فشل الاتصال', e);
        }
    } else {
        console.log('ℹ️ Supabase: لم تضبط المفاتيح بعد — استخدم localStorage');
    }
    supabaseConnectionAttempted = true;
})();

// جدول ربط localStorage keys → أسماء جداول Supabase
const SUPABASE_TABLES = {
    'cfg_passwords':       { table: 'passwords',     type: 'single',  keyField: 'role',   keyValue: null },
    'cfg_teachers':        { table: 'settings_list', type: 'list',    filter: { type: 'teacher' } },
    'cfg_classes':         { table: 'settings_list', type: 'list',    filter: { type: 'class' } },
    'cfg_divisions':       { table: 'settings_list', type: 'list',    filter: { type: 'division' } },
    'cfg_labtypes':        { table: 'settings_list', type: 'list',    filter: { type: 'labtype' } },
    'cfg_users':           { table: 'settings_list', type: 'list',    filter: { type: 'user' } },
    'cfg_database':        { table: 'experiments',   type: 'full',    filter: null },
    'labArchive':          { table: 'archive',       type: 'full',    filter: null },
    'cfg_plan_targets_v2': { table: 'plan_targets',  type: 'full',    filter: null },
    'cfg_school_meta':     { table: 'school_meta',   type: 'single',  keyField: 'id',    keyValue: 1 },
    'labMaterials':        { table: 'materials',     type: 'full',    filter: null },
    'labTransactions':      { table: 'transactions',  type: 'full',    filter: null },
    'cfg_stats_meta':      { table: 'stats_meta',    type: 'full',    filter: null },
    'labRequests':         { table: 'requests',      type: 'full',    filter: null },
    'cfg_audit_log':       { table: 'audit_log',     type: 'full',    filter: null },
};

// =========================================================
// دالة مزامنة البيانات مع Supabase
// =========================================================
async function syncToSupabase(localKey, data) {
    if (!supabaseConnected || !supabaseClient) return false;
    const mapping = SUPABASE_TABLES[localKey];
    if (!mapping) return false;

    try {
        if (mapping.type === 'single') {
            // معالجة خاصة لكلمات المرور — upsert آمن (لا يحتاج DELETE policy)
            if (localKey === 'cfg_passwords') {
                const rows = Object.keys(data).map(role => ({ role, password: data[role] }));
                for (const row of rows) {
                    const { error } = await supabaseClient.from(mapping.table).upsert(row, { onConflict: 'role' });
                    if (error) console.warn(`⚠️ Supabase sync password ${row.role}:`, error);
                }
            } else {
                // إضافة المفتاح الأساسي للتحديث
                const payload = { ...data };
                if (mapping.keyField && mapping.keyValue) payload[mapping.keyField] = mapping.keyValue;
                const { error } = await supabaseClient
                    .from(mapping.table)
                    .upsert(payload, { onConflict: mapping.keyField });
                if (error) console.warn(`⚠️ Supabase sync ${localKey}:`, error);
            }
        } else if (mapping.type === 'list') {
            // حذف القديم ثم إدراج الجديد
            await supabaseClient.from(mapping.table).delete().match(mapping.filter);
            if (data && data.length > 0) {
                const rows = data.map(v => ({ ...mapping.filter, value: typeof v === 'object' ? JSON.stringify(v) : v }));
                const { error } = await supabaseClient.from(mapping.table).insert(rows);
                if (error) console.warn(`⚠️ Supabase sync ${localKey}:`, error);
            }
        } else if (mapping.type === 'full') {
            // للجداول الكبيرة: حذف الكل ثم إدراج
            if (localKey === 'cfg_database') {
                // customDatabase هو كائن { subject: [ {name, tools, class, month}, ... ] }
                await supabaseClient.from(mapping.table).delete().neq('id', 0);
                const rows = [];
                Object.keys(data).forEach(subject => {
                    (data[subject] || []).forEach(exp => {
                        rows.push({ subject, name: exp.name, tools: exp.tools || '', class: exp.class || '', month: exp.month || '' });
                    });
                });
                if (rows.length > 0) {
                    const { error } = await supabaseClient.from(mapping.table).insert(rows);
                    if (error) console.warn(`⚠️ Supabase sync experiments:`, error);
                }
            } else if (localKey === 'cfg_plan_targets_v2') {
                // planTargets هو كائن { "month||subject||class": count }
                await supabaseClient.from(mapping.table).delete().neq('id', 0);
                const rows = Object.keys(data).map(key => {
                    const parts = key.split('||');
                    return { month: parts[0] || '', subject: parts[1] || '', class: parts[2] || '', count: data[key] };
                });
                if (rows.length > 0) {
                    const { error } = await supabaseClient.from(mapping.table).insert(rows);
                    if (error) console.warn(`⚠️ Supabase sync targets:`, error);
                }
            } else {
                // Arrays — حذف وإدراج
                await supabaseClient.from(mapping.table).delete().neq('id', 0);
                if (data && data.length > 0) {
                    const { error } = await supabaseClient.from(mapping.table).insert(data);
                    if (error) console.warn(`⚠️ Supabase sync ${localKey}:`, error);
                }
            }
        }
        return true;
    } catch (e) {
        console.warn(`⚠️ Supabase error ${localKey}:`, e);
        return false;
    }
}

// =========================================================
// تحميل البيانات من Supabase
// =========================================================
async function loadFromSupabase(localKey) {
    if (!supabaseConnected || !supabaseClient) return null;
    const mapping = SUPABASE_TABLES[localKey];
    if (!mapping) return null;

    try {
        let query = supabaseClient.from(mapping.table).select('*');

        if (mapping.type === 'single') {
            if (localKey === 'cfg_passwords') {
                const { data, error } = await supabaseClient.from(mapping.table).select('role, password');
                if (error) { console.warn(`⚠️ Supabase load passwords:`, error); return null; }
                const result = {};
                (data || []).forEach(r => { result[r.role] = r.password; });
                return result;
            }
            if (mapping.keyField && mapping.keyValue) {
                query = query.eq(mapping.keyField, mapping.keyValue);
            }
            const { data, error } = await query.single();
            if (error && error.code !== 'PGRST116') { console.warn(`⚠️ Supabase load ${localKey}:`, error); return null; }
            return data || null;
        } else if (mapping.type === 'list') {
            const { data, error } = await query.match(mapping.filter).order('id');
            if (error) { console.warn(`⚠️ Supabase load ${localKey}:`, error); return null; }
            return (data || []).map(r => {
                const v = r.value;
                if (localKey === 'cfg_users') { try { return JSON.parse(v); } catch(e) { return v; } }
                return v;
            });
        } else if (mapping.type === 'full') {
            const { data, error } = await query.order('id');
            if (error) { console.warn(`⚠️ Supabase load ${localKey}:`, error); return null; }
            return data || [];
        }
    } catch (e) {
        console.warn(`⚠️ Supabase load error ${localKey}:`, e);
        return null;
    }
}

// =========================================================
// تحميل كل البيانات من Supabase إلى المتغيرات
// =========================================================
async function loadAllFromSupabase() {
    if (!supabaseConnected) return false;

    _supabaseSilent = true;
    try {
        const localPassRaw = localStorage.getItem('cfg_passwords');
        if (localPassRaw) {
            try { await syncToSupabase('cfg_passwords', JSON.parse(localPassRaw)); } catch (e) {}
        }

        const results = await Promise.allSettled([
            loadFromSupabase('cfg_teachers'),
            loadFromSupabase('cfg_classes'),
            loadFromSupabase('cfg_divisions'),
            loadFromSupabase('cfg_labtypes'),
            loadFromSupabase('cfg_school_meta'),
            loadFromSupabase('cfg_passwords'),
            loadFromSupabase('cfg_database'),
            loadFromSupabase('labArchive'),
            loadFromSupabase('labRequests'),
            loadFromSupabase('cfg_plan_targets_v2'),
            loadFromSupabase('labMaterials'),
            loadFromSupabase('labTransactions'),
        ]);

        const [
            teachersResult,
            classesResult,
            divisionsResult,
            labTypesResult,
            schoolMetaResult,
            passwordsResult,
            experimentsResult,
            archiveResult,
            requestsResult,
            targetsResult,
            materialsResult,
            transactionsResult,
        ] = results;

        const loadedTeachers = teachersResult.status === 'fulfilled' ? teachersResult.value : null;
        if (loadedTeachers && loadedTeachers.length > 0) teachers = loadedTeachers;

        const loadedClasses = classesResult.status === 'fulfilled' ? classesResult.value : null;
        if (loadedClasses && loadedClasses.length > 0) classes = loadedClasses;

        const loadedDivisions = divisionsResult.status === 'fulfilled' ? divisionsResult.value : null;
        if (loadedDivisions && loadedDivisions.length > 0) divisions = loadedDivisions;

        const loadedLabTypes = labTypesResult.status === 'fulfilled' ? labTypesResult.value : null;
        if (loadedLabTypes && loadedLabTypes.length > 0) labTypes = loadedLabTypes;

        const loadedSchoolMeta = schoolMetaResult.status === 'fulfilled' ? schoolMetaResult.value : null;
        if (loadedSchoolMeta && (loadedSchoolMeta.dir || loadedSchoolMeta.name || loadedSchoolMeta.tech || loadedSchoolMeta.principal)) {
            const meta = { dir: loadedSchoolMeta.dir || '', name: loadedSchoolMeta.name || '', tech: loadedSchoolMeta.tech || '', principal: loadedSchoolMeta.principal || '' };
            localStorage.setItem('cfg_school_meta', JSON.stringify(meta));
        }

        const loadedPasswords = passwordsResult.status === 'fulfilled' ? passwordsResult.value : null;
        if (loadedPasswords) {
            localStorage.setItem('cfg_passwords', JSON.stringify(loadedPasswords));
        }

        const loadedExperiments = experimentsResult.status === 'fulfilled' ? experimentsResult.value : null;
        if (loadedExperiments && loadedExperiments.length > 0) {
            const db = {};
            loadedExperiments.forEach(exp => {
                if (!db[exp.subject]) db[exp.subject] = [];
                db[exp.subject].push({ name: exp.name, tools: exp.tools || '', class: exp.class || '', month: exp.month || '' });
            });
            customDatabase = db;
            localStorage.setItem('cfg_database', JSON.stringify(customDatabase));
        } else {
            customDatabase = {};
            localStorage.removeItem('cfg_database');
        }

        const loadedArchive = archiveResult.status === 'fulfilled' ? archiveResult.value : null;
        if (loadedArchive && loadedArchive.length > 0) {
            archive = loadedArchive;
            localStorage.setItem('labArchive', JSON.stringify(archive));
        } else {
            archive = [];
            localStorage.removeItem('labArchive');
        }

        const loadedRequests = requestsResult.status === 'fulfilled' ? requestsResult.value : null;
        if (loadedRequests && loadedRequests.length > 0) {
            requests = loadedRequests;
            localStorage.setItem('labRequests', JSON.stringify(requests));
        }

        const loadedTargets = targetsResult.status === 'fulfilled' ? targetsResult.value : null;
        if (loadedTargets && loadedTargets.length > 0) {
            const targets = {};
            loadedTargets.forEach(t => {
                targets[`${t.month}||${t.subject}||${t.class}`] = t.count;
            });
            planTargets = targets;
            localStorage.setItem('cfg_plan_targets_v2', JSON.stringify(planTargets));
        }

        const loadedMaterials = materialsResult.status === 'fulfilled' ? materialsResult.value : null;
        if (loadedMaterials && loadedMaterials.length > 0) {
            materials = loadedMaterials;
            localStorage.setItem('labMaterials', JSON.stringify(materials));
        }

        const loadedTransactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : null;
        if (loadedTransactions && loadedTransactions.length > 0) {
            const txns = {};
            loadedTransactions.forEach(t => {
                if (!txns[t.mat_id]) txns[t.mat_id] = [];
                txns[t.mat_id].push(t);
            });
            transactions = txns;
            localStorage.setItem('labTransactions', JSON.stringify(transactions));
        }

        console.log('☁️ تم تحميل البيانات من Supabase بنجاح');
        updateSupabaseStatus();
        return true;
    } catch (e) {
        console.warn('⚠️ فشل تحميل البيانات من Supabase:', e);
        updateSupabaseStatus();
        return false;
    } finally {
        _supabaseSilent = false;
    }
}

// =========================================================
// ترحيل البيانات من localStorage إلى Supabase
// =========================================================
async function migrateLocalStorageToSupabase() {
    if (!supabaseConnected) {
        alert('⚠️ Supabase غير متصل. تأكد من ضبط SUPABASE_URL و SUPABASE_ANON_KEY');
        return;
    }
    const keys = Object.keys(SUPABASE_TABLES);
    for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                await syncToSupabase(key, data);
                console.log(`✓ تم ترحيل ${key}`);
            } catch (e) {
                console.warn(`✗ فشل ترحيل ${key}:`, e);
            }
        }
    }
    alert('☁️ تم ترحيل كل البيانات إلى Supabase بنجاح!');
}

// =========================================================
// دفع كل البيانات المحلية إلى Supabase (تُستدعى بعد الاتصال)
// =========================================================
function pushAllLocalToSupabase() {
    if (!supabaseConnected) return;
    Object.keys(SUPABASE_TABLES).forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
            try { syncToSupabase(key, JSON.parse(raw)); } catch(e) {}
        }
    });
}

// فحص دوري: إذا في تغييرات محلية لم تصل السحابة ندفعها
setInterval(() => {
    if (needsFullSync && supabaseConnected) {
        needsFullSync = false;
        pushAllLocalToSupabase();
    }
}, 3000);

// إعادة الاتصال بالسحابة عند عودة النت
window.addEventListener('online', () => {
    console.log('☁️ تم اكتشاف عودة الاتصال — محاولة إعادة الاتصال بقاعدة البيانات');
    if (!supabaseConnected && SUPABASE_URL && SUPABASE_ANON_KEY && typeof supabase !== 'undefined') {
        try {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            supabaseConnected = true;
            supabaseConnectionAttempted = true;
            console.log('☁️ Supabase: تمت إعادة الاتصال');
            updateSupabaseStatus();
            if (needsFullSync) {
                needsFullSync = false;
                pushAllLocalToSupabase();
                console.log('☁️ تم دفع التعديلات المحلية المعلقة');
            }
            if (currentRole) {
                loadAllFromSupabase().then(() => {
                    initSystemConfiguration();
                    loadSchoolMeta();
                    renderArchive();
                    renderRequestsTable();
                    updateRequestsCount();
                    generateMonthlyReportData();
                    generateWeeklyPlan();
                    if (typeof renderStoreExperiments === 'function') renderStoreExperiments();
                    if (typeof renderMaterialsTable === 'function') renderMaterialsTable();
                    if (typeof renderSavedTargetsTable === 'function') renderSavedTargetsTable();
                });
            }
        } catch (e) {
            console.warn('⚠️ Supabase: فشلت إعادة الاتصال', e);
        }
    }
});

// =========================================================
// تحديث مؤشر حالة الاتصال بقاعدة البيانات
// =========================================================
function updateSupabaseStatus() {
    const el = document.getElementById('supabaseStatus');
    if (el) {
        if (supabaseConnected && SUPABASE_URL) {
            if (needsFullSync) {
                el.innerHTML = '☁️⏳ قيد المزامنة...';
                el.style.color = '#e67e22';
            } else {
                el.innerHTML = '☁️ متصل';
                el.style.color = '#27ae60';
            }
        } else if (SUPABASE_URL && !supabaseConnected) {
            el.innerHTML = '☁️ غير متصل';
            el.style.color = '#e67e22';
        } else {
            el.innerHTML = '💾 محلي';
            el.style.color = '#95a5a6';
        }
    }
    const card = document.getElementById('supabaseStatusCard');
    if (card) {
        if (supabaseConnected && SUPABASE_URL) {
            card.innerHTML = '☁️ الوضع: متصل بقاعدة البيانات السحابية';
            card.style.color = '#27ae60';
        } else if (SUPABASE_URL && !supabaseConnected) {
            card.innerHTML = '☁️ الوضع: فشل الاتصال — تحقق من المفاتيح';
            card.style.color = '#e67e22';
        } else {
            card.innerHTML = '💾 الوضع: تخزين محلي (localStorage)';
            card.style.color = '#7f8c8d';
        }
    }
}

// =========================================================
// حفظ إعدادات Supabase من واجهة الإعدادات
// =========================================================
function saveSupabaseConfig() {
    const url = document.getElementById('cfgSupabaseUrl').value.trim();
    const key = document.getElementById('cfgSupabaseKey').value.trim();
    if (!url || !key) {
        document.getElementById('supabaseLog').innerHTML = '⚠️ الرجاء إدخال الرابط والمفتاح';
        return;
    }
    localStorage.setItem('cfg_supabase_url', url);
    localStorage.setItem('cfg_supabase_key', key);
    // إعادة تحميل الإعدادات
    SUPABASE_URL = url;
    SUPABASE_ANON_KEY = key;
    if (typeof supabase !== 'undefined') {
        try {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            supabaseConnected = true;
            document.getElementById('supabaseLog').innerHTML = '✅ تم الاتصال بقاعدة البيانات السحابية بنجاح';
            updateSupabaseStatus();
            // تحميل البيانات
            loadAllFromSupabase().then(() => {
                initSystemConfiguration();
                renderArchive();
                renderRequestsTable();
                updateRequestsCount();
                generateMonthlyReportData();
            });
        } catch (e) {
            supabaseConnected = false;
            document.getElementById('supabaseLog').innerHTML = '❌ فشل الاتصال: ' + e.message;
            updateSupabaseStatus();
        }
    } else {
        document.getElementById('supabaseLog').innerHTML = '⚠️ مكتبة Supabase غير محملة. تحقق من اتصال الإنترنت.';
    }
}

// اعتراض localStorage.setItem لمزامنة البيانات تلقائياً مع Supabase
const _originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
    _originalSetItem(key, value);
    if (_supabaseSilent) return;
    if (SUPABASE_TABLES[key]) {
        if (supabaseConnected) {
            try {
                const data = JSON.parse(value);
                setTimeout(() => syncToSupabase(key, data), 100);
            } catch (e) { /* ignore */ }
        } else {
            needsFullSync = true;
        }
    }
};


