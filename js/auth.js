const ROLES = {
    admin: {
        label: 'مدير المدرسة', icon: '🏫', badge: 'admin',
        tabs: ['archiveTab', 'requestsTab', 'weeklyPlanTab', 'statsTab', 'monthlyReportTab', 'auditTab'],
        canDelete: false, canEditSettings: false, canSaveRecord: false, canPrint: true,
        defaultPassword: 'admin123'
    },
    tech: {
        label: 'فني المختبر', icon: '🔬', badge: 'tech',
        tabs: ['formTab', 'archiveTab', 'requestsTab', 'weeklyPlanTab', 'statsTab', 'suppliesTab', 'monthlyReportTab', 'settingsTab', 'auditTab'],
        canDelete: true, canEditSettings: true, canSaveRecord: true, canPrint: true,
        defaultPassword: 'lab123'
    },
    teacher: {
        label: 'معلم / معلمة', icon: '👨‍🏫', badge: 'teacher',
        tabs: ['formTab', 'archiveTab', 'requestsTab', 'weeklyPlanTab'],
        canDelete: false, canEditSettings: false, canSaveRecord: true, canPrint: false,
        defaultPassword: 'teacher123'
    }
};

let currentRole = null;
let currentRoleKey = null;
let currentUserName = '';

function getPasswords() {
    return JSON.parse(localStorage.getItem('cfg_passwords')) || {
        admin: 'admin123', tech: 'lab123', teacher: 'teacher123'
    };
}
function savePasswords(passwords) {
    localStorage.setItem('cfg_passwords', JSON.stringify(passwords));
}

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
    savePasswords({ admin: passwords.admin, tech: 'lab123', teacher: 'teacher123' });
}

// ---- Supabase Auth helpers ----

function nameToEmail(role, name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    return `${role}-${Math.abs(hash).toString(36)}@lab.app`;
}

function getUserEmail(user) {
    return user.authEmail || nameToEmail(user.role, user.name);
}

async function createAuthUser(displayName, role, password) {
    if (!supabaseConnected || !supabaseClient) return { error: new Error('السحابة غير متصلة') };
    const email = nameToEmail(role, displayName);
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { role, display_name: displayName } }
    });
    if (error && error.message?.includes('already')) return { data: null, error: null, exists: true };
    if (data?.user) {
        const users = getUsers();
        const u = users.find(x => x.name === displayName && x.role === role);
        if (u) { u.authEmail = email; saveUsers(users); }
    }
    return { data, error };
}

async function migrateAllUsersToAuth() {
    if (!supabaseConnected) { alert('⚠️ السحابة غير متصلة — تأكد من ضبط مفاتيح Supabase'); return; }
    if (!await showConfirm('🚀 ترحيل كل المستخدمين إلى نظام الدخول الآمن؟\n\nسيتم إنشاء حسابات دخول سحابية لكافة المستخدمين بنفس كلمات المرور.')) return;
    const users = getUsers();
    let ok = 0, fail = 0;
    for (const u of users) {
        const email = nameToEmail(u.role, u.name);
        const { error } = await supabaseClient.auth.signUp({
            email,
            password: u.password,
            options: { data: { role: u.role, display_name: u.name } }
        });
        if (error && !error.message?.includes('already')) { fail++; console.warn('فشل ترحيل', u.name, error); }
        else {
            u.authEmail = email;
            ok++;
        }
    }
    saveUsers(users);
    alert(`✅ تم ترحيل ${ok} مستخدم بنجاح${fail ? `، فشل ${fail}` : ''}`);
    renderUsersTable();
}

// ---- Login / Logout ----

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
            if (users.length === 0) userSel.innerHTML += '<option value="" disabled>⚠️ لا يوجد مستخدمين</option>';
        }
        if (pwdLabel) pwdLabel.innerText = 'كلمة المرور الفردية';
    }
}

async function doLogin() {
    const role = selectedLoginRole;
    let userName = '';
    let password = document.getElementById('loginPassword').value;

    if (role !== 'admin') {
        userName = document.getElementById('loginUserSelect').value;
        if (!userName) { showLoginError('اختر اسمك من القائمة'); return; }
        if (!password) { showLoginError('الرجاء إدخال كلمة المرور'); return; }
    } else {
        userName = 'مدير المدرسة';
        if (!password) { showLoginError('الرجاء إدخال كلمة المرور'); return; }
    }

    // 1) Try Supabase Auth
    if (supabaseConnected && supabaseClient) {
        const users = getUsers();
        const user = users.find(u => u.name === userName && u.role === role);
        const email = user ? getUserEmail(user) : nameToEmail(role, userName);
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (data?.user) {
            const meta = data.user.user_metadata || {};
            currentRoleKey = meta.role || role;
            currentRole = ROLES[currentRoleKey];
            currentUserName = meta.display_name || userName;
            return finishLogin();
        }
        if (error && !error.message?.includes('Invalid login')) {
            console.warn('⚠️ Auth error:', error.message);
        }
    }

    // 2) Fallback: local password check
    const users = getUsers();
    if (role !== 'admin') {
        const user = users.find(u => u.name === userName && u.role === role);
        if (!user || user.password !== password) {
            showLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
            return;
        }
        currentUserName = userName;
    } else {
        const adminUser = users.find(u => u.role === 'admin');
        const validPwd = adminUser ? adminUser.password : getPasswords().admin;
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

    if (supabaseConnected) {
        setTimeout(() => {
            const hint = document.getElementById('migrationHint');
            if (hint) hint.style.display = 'block';
        }, 2000);
    }

    finishLogin();
}

function finishLogin() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
    updateSupabaseStatus();
    seedDefaultUsers();
    const renderAll = () => {
        applyRolePermissions();
        initSystemConfiguration();
        loadSchoolMeta();
        loadStatsMeta();
        renderArchive();
        updateExpNum();
        generateMonthlyReportData();
        generateWeeklyPlan();
        if (typeof renderMaterialsTable === 'function') renderMaterialsTable();
    };
    const hideLoadingOverlay = () => { const el = document.getElementById('loadingOverlay'); if (el) el.style.display = 'none'; };
    const waitForSupabase = (maxMs = 2000) => new Promise(resolve => {
        if (supabaseConnected) { resolve(true); return; }
        if (typeof supabaseConnectionAttempted !== 'undefined' && supabaseConnectionAttempted) { resolve(false); return; }
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
        hideLoadingOverlay();
        renderAll();
        const hasCloudConfig = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
        if (!hasCloudConfig) return;
        try {
            const connected = supabaseConnected || await waitForSupabase();
            if (connected) {
                await loadWithTimeout();
                renderAll();
            }
        } catch (e) {
            console.warn('☁️ Supabase: فشل التحميل الخلفي', e);
        }
    };
    loadData();
}

async function doLogout() {
    if (supabaseConnected && supabaseClient) {
        try { await supabaseClient.auth.signOut(); } catch (e) {}
    }
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

function applyRolePermissions() {
    document.getElementById('topBarUserName').textContent = currentUserName || currentRole.label;
    const badge = document.getElementById('topBarRoleBadge');
    badge.textContent = currentRole.label;
    badge.className = `role-badge ${currentRoleKey}`;
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
    document.querySelectorAll('.tab-group').forEach(group => {
        const visibleTabs = group.querySelectorAll('.tab-btn:not(.restricted)');
        if (visibleTabs.length === 0) group.style.display = 'none';
        else group.style.display = '';
    });
    const firstAllowed = currentRole.tabs[0];
    openGroupForTab(firstAllowed);
    switchTabById(firstAllowed);
    document.querySelectorAll('.btn-delete-row').forEach(b => {
        b.style.display = currentRole.canDelete ? '' : 'none';
    });
    const btnSave = document.getElementById('btnSaveRecord');
    if (btnSave) btnSave.style.display = currentRole.canSaveRecord ? '' : 'none';
    document.querySelectorAll('.btn-print-all').forEach(b => {
        b.style.display = currentRole.canPrint ? '' : 'none';
    });
    document.querySelectorAll('.settings-edit-only').forEach(el => {
        el.style.display = currentRole.canEditSettings ? '' : 'none';
    });
    const adminBanner = document.getElementById('adminViewBanner');
    if (adminBanner) adminBanner.style.display = (currentRoleKey === 'admin') ? 'flex' : 'none';
}
