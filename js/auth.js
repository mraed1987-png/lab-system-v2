// =========================================================
// نظام الأدوار والمصادقة
// =========================================================

const ROLES = {
    admin: {
        label: 'مدير المدرسة',
        icon: '🏫',
        badge: 'admin',
        tabs: ['archiveTab', 'requestsTab', 'weeklyPlanTab', 'statsTab', 'monthlyReportTab', 'auditTab'],
        canDelete: false,
        canEditSettings: false,
        canSaveRecord: false,
        canPrint: true,
        defaultPassword: 'admin123'
    },
    tech: {
        label: 'فني المختبر',
        icon: '🔬',
        badge: 'tech',
        tabs: ['formTab', 'archiveTab', 'requestsTab', 'weeklyPlanTab', 'statsTab', 'suppliesTab', 'monthlyReportTab', 'settingsTab', 'auditTab'],
        canDelete: true,
        canEditSettings: true,
        canSaveRecord: true,
        canPrint: true,
        defaultPassword: 'lab123'
    },
    teacher: {
        label: 'معلم / معلمة',
        icon: '👨‍🏫',
        badge: 'teacher',
        tabs: ['formTab', 'archiveTab', 'requestsTab', 'weeklyPlanTab'],
        canDelete: false,
        canEditSettings: false,
        canSaveRecord: true,
        canPrint: false,
        defaultPassword: 'teacher123'
    }
};

let currentRole = null;
let currentRoleKey = null;
let currentUserName = '';

// كلمات المرور المخزنة (قابلة للتعديل من الإعدادات)
function getPasswords() {
    return JSON.parse(localStorage.getItem('cfg_passwords')) || {
        admin: 'admin123',
        tech: 'lab123',
        teacher: 'teacher123'
    };
}

function savePasswords(passwords) {
    localStorage.setItem('cfg_passwords', JSON.stringify(passwords));
}

// =========================================================
// إدارة المستخدمين (معلمين وفنيين بأسماء وكلمات مرور فردية)
// =========================================================

function getUsers() {
    return JSON.parse(localStorage.getItem('cfg_users')) || [];
}

function saveUsers(users) {
    localStorage.setItem('cfg_users', JSON.stringify(users));
}

function seedDefaultUsers() {
    let users = getUsers();
    if (users.length > 0) return;
    const passwords = getPasswords();
    users.push({ name: 'مدير المدرسة', role: 'admin', password: passwords.admin });
    teachers.forEach(t => users.push({ name: t, role: 'teacher', password: '1234' }));
    users.push({ name: document.getElementById('cfgLabTech')?.value || 'فني مختبر', role: 'tech', password: '1234' });
    saveUsers(users);
    // Sync admin password back to legacy system
    savePasswords({ admin: passwords.admin, tech: 'lab123', teacher: 'teacher123' });
}

// =========================================================
// تسجيل الدخول والخروج
// =========================================================

let selectedLoginRole = 'tech';

function selectLoginRole(role) {
    selectedLoginRole = role;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.role-btn[data-role="${role}"]`).classList.add('active');
    document.getElementById('loginError').style.display = 'none';

    const userGroup = document.getElementById('loginUserGroup');
    const userSel = document.getElementById('loginUserSelect');
    const pwdLabel = document.getElementById('loginPasswordLabel');
    if (role === 'admin') {
        if (userGroup) userGroup.style.display = 'none';
        if (pwdLabel) pwdLabel.innerText = 'كلمة المرور';
    } else {
        if (userGroup) userGroup.style.display = '';
        if (userSel) {
            const cur = userSel.value;
            userSel.innerHTML = '<option value="">-- اختر اسمك --</option>';
            const users = getUsers().filter(u => u.role === role);
            users.forEach(u => userSel.appendChild(new Option(u.name, u.name)));
            if (cur && users.some(u => u.name === cur)) userSel.value = cur;
            if (users.length === 0) userSel.innerHTML += '<option value="" disabled>⚠️ لا يوجد مستخدمين — أضفهم من الإعدادات</option>';
        }
        if (pwdLabel) pwdLabel.innerText = 'كلمة المرور الفردية';
    }
}

function doLogin() {
    const role = selectedLoginRole;

    if (role !== 'admin') {
        const userName = document.getElementById('loginUserSelect').value;
        const password = document.getElementById('loginPassword').value;

        if (!userName) { showLoginError('اختر اسمك من القائمة'); return; }
        if (!password) { showLoginError('الرجاء إدخال كلمة المرور الفردية'); return; }

        const users = getUsers();
        const user = users.find(u => u.name === userName && u.role === role);
        if (!user || user.password !== password) {
            showLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
            return;
        }
        currentUserName = userName;
    } else {
        const password = document.getElementById('loginPassword').value;
        if (!password) { showLoginError('الرجاء إدخال كلمة المرور'); return; }
        const adminUser = getUsers().find(u => u.role === 'admin');
        const validPwd = adminUser ? adminUser.password : (getPasswords()).admin;
        if (password !== validPwd) {
            showLoginError('كلمة المرور غير صحيحة');
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
            return;
        }
        currentUserName = 'مدير المدرسة';
    }

    currentRoleKey = role;
    currentRole = ROLES[role];

    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';

    updateSupabaseStatus();
    seedDefaultUsers();

    const renderAll = () => {
        applyRolePermissions();
        initSystemConfiguration(); // already calls: renderSettingsTables, renderStoreExperiments, renderSavedTargetsTable, renderPasswordSettings, renderUsersTable, initRequestsForm, renderRequestsTable, updateRequestsCount
        loadSchoolMeta();
        loadStatsMeta();
        renderArchive();
        updateExpNum();
        generateMonthlyReportData();
        generateWeeklyPlan();
        if (typeof renderMaterialsTable === 'function') renderMaterialsTable();
    };

    const hideLoadingOverlay = () => {
        const el = document.getElementById('loadingOverlay');
        if (el) el.style.display = 'none';
    };

    const showLoadingOverlay = () => {
        const el = document.getElementById('loadingOverlay');
        if (el) el.style.display = 'flex';
    };

    const waitForSupabase = (maxMs = 2000) => new Promise(resolve => {
        if (supabaseConnected) { resolve(true); return; }
        if (typeof supabaseConnectionAttempted !== 'undefined' && supabaseConnectionAttempted) {
            resolve(false); return;
        }
        const started = Date.now();
        const tick = () => {
            if (supabaseConnected) { resolve(true); return; }
            if (Date.now() - started >= maxMs) { resolve(false); return; }
            setTimeout(tick, 200);
        };
        tick();
    });

    const loadWithTimeout = (ms = 6000) => Promise.race([
        loadAllFromSupabase(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('cloud_timeout')), ms))
    ]);

    const loadData = async () => {
        // أولاً: اعرض الواجهة فوراً بالبيانات المحلية (بدون انتظار السحابة)
        hideLoadingOverlay();
        renderAll();

        // ثانياً: في الخلفية، حاول تحميل من السحابة
        const hasCloudConfig = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
        if (!hasCloudConfig) return;

        try {
            const connected = supabaseConnected || await waitForSupabase();
            if (connected) {
                await loadWithTimeout();
                // أعِد الرسم بعد تحميل بيانات السحابة
                renderAll();
            }
        } catch (e) {
            console.warn('☁️ Supabase: فشل التحميل الخلفي — استمرار بالبيانات المحلية', e);
        }
    };

    loadData();
}

function doLogout() {
    currentRole = null;
    currentRoleKey = null;
    currentUserName = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('appPage').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';
}

function showLoginError(msg) {
    const el = document.getElementById('loginError');
    el.textContent = msg;
    el.style.display = 'block';
}

// =========================================================
// تطبيق صلاحيات الدور
// =========================================================

function applyRolePermissions() {
    // تحديث شريط المستخدم
    document.getElementById('topBarUserName').textContent = currentUserName || currentRole.label;
    const badge = document.getElementById('topBarRoleBadge');
    badge.textContent = currentRole.label;
    badge.className = `role-badge ${currentRoleKey}`;

    // إخفاء / إظهار التبويبات
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        if (currentRole.tabs.includes(tab)) {
            btn.classList.remove('restricted');
            btn.style.display = '';
        } else {
            btn.classList.add('restricted');
            btn.style.display = 'none';
        }
    });

    // إخفاء المجموعة إذا كل أزرارها مخفية
    document.querySelectorAll('.tab-group').forEach(group => {
        const visibleTabs = group.querySelectorAll('.tab-btn:not(.restricted)');
        const groupBtn = group.querySelector('.tab-group-btn');
        if (visibleTabs.length === 0) {
            group.style.display = 'none';
        } else {
            group.style.display = '';
        }
    });

    // فتح أول مجموعة وأول تبويب مسموح
    const firstAllowed = currentRole.tabs[0];
    openGroupForTab(firstAllowed);
    switchTabById(firstAllowed);

    // أزرار الحذف
    document.querySelectorAll('.btn-delete-row').forEach(b => {
        b.style.display = currentRole.canDelete ? '' : 'none';
    });

    // زر الحفظ في النموذج
    const btnSave = document.getElementById('btnSaveRecord');
    if (btnSave) {
        btnSave.style.display = currentRole.canSaveRecord ? '' : 'none';
    }

    // أزرار الطباعة
    document.querySelectorAll('.btn-print-all').forEach(b => {
        b.style.display = currentRole.canPrint ? '' : 'none';
    });

    // إعدادات النظام — إخفاء أقسام التعديل لغير الفني
    const settingsEditSections = document.querySelectorAll('.settings-edit-only');
    settingsEditSections.forEach(el => {
        el.style.display = currentRole.canEditSettings ? '' : 'none';
    });

    // لافتة المدير في الأرشيف
    const adminBanner = document.getElementById('adminViewBanner');
    if (adminBanner) {
        adminBanner.style.display = (currentRoleKey === 'admin') ? 'flex' : 'none';
    }
}

