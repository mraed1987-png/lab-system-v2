// =========================================================
// الإعدادات
// =========================================================

function saveSchoolMeta() {
    const meta = {
        dir:       document.getElementById('cfgSchoolDir').value,
        name:      document.getElementById('cfgSchoolName').value,
        tech:      document.getElementById('cfgLabTech').value,
        principal: document.getElementById('cfgPrincipal').value
    };
    localStorage.setItem('cfg_school_meta', JSON.stringify(meta));
    applySchoolMetaToPrint(meta);
}

function loadSchoolMeta() {
    const meta = JSON.parse(localStorage.getItem('cfg_school_meta')) || { dir: '', name: '', tech: '', principal: '' };
    document.getElementById('cfgSchoolDir').value   = meta.dir;
    document.getElementById('cfgSchoolName').value  = meta.name;
    document.getElementById('cfgLabTech').value     = meta.tech;
    document.getElementById('cfgPrincipal').value   = meta.principal;
    applySchoolMetaToPrint(meta);
}

function applySchoolMetaToPrint(meta) {
    document.querySelectorAll('.pSchoolDirText').forEach(el => el.innerText = 'مديرية التربية والتعليم: ' + (meta.dir || '................................'));
    document.querySelectorAll('.pSchoolNameText').forEach(el => el.innerText = 'اسم المدرسة: ' + (meta.name || '................................'));
    document.querySelectorAll('.classLabTechText').forEach(el => el.innerText = 'الاسم والتوقيع: ' + (meta.tech || '................................'));
    document.querySelectorAll('.classPrincipalText').forEach(el => el.innerText = 'الاسم والتوقيع والخاتم الرسمي: ' + (meta.principal || '................................'));
}

// =========================================================
// تصدير Excel
// =========================================================

function exportArchiveToExcel() {
    if (!currentRole || archive.length === 0) { alert('السجل فارغ!'); return; }
    if (typeof XLSX === 'undefined') { alert('مكتبة Excel غير محملة. تأكد من اتصالك بالإنترنت.'); return; }
    const rows = [['م', 'التاريخ', 'الحصة', 'اسم المعلم', 'الصف / الشعبة', 'المبحث', 'اسم التجربة', 'الأدوات', 'التوقيع']];
    archive.forEach((a, i) => rows.push([i + 1, a.rawDate || a.date, a.lesson, a.teacher, a.clsDiv || `${a.cls}/${a.div}`, a.subject, a.expName, a.tools || '—', '']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'السجل');
    XLSX.writeFile(wb, `السجل_المخبري_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportWeeklyPlanToExcel() {
    if (typeof XLSX === 'undefined') { alert('مكتبة Excel غير محملة.'); return; }
    const date = document.getElementById('weeklyFromDate')?.value;
    if (!date) { alert('اختر تاريخ الأسبوع أولاً.'); return; }
    const table = document.querySelector('#weeklyPlanPreview .weekly-table');
    if (!table) { alert('لا توجد خطة أسبوعية للتصدير.'); return; }
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الخطة');
    XLSX.writeFile(wb, `الخطة_الأسبوعية_${date}.xlsx`);
}

function exportMonthlyReportToExcel() {
    if (typeof XLSX === 'undefined') { alert('مكتبة Excel غير محملة.'); return; }
    const month = document.getElementById('monthlyReportFilter')?.value;
    if (!month) { alert('اختر الشهر أولاً.'); return; }
    const table = document.querySelector('.monthly-report-table');
    if (!table || table.rows.length <= 1) { alert('لا يوجد تقرير شهري للتصدير — تأكد من اختيار شهر وتوليد التقرير أولاً.'); return; }
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'التقرير الشهري');
    XLSX.writeFile(wb, `التقرير_الشهري_${month}.xlsx`);
}

function exportStatsToExcel() {
    if (typeof XLSX === 'undefined') { alert('مكتبة Excel غير محملة.'); return; }
    const content = document.getElementById('previewStatsContent');
    if (!content || content.innerText.trim() === '') { alert('لا توجد إحصائية للتصدير.'); return; }
    const text = content.innerText;
    const lines = text.split('\n').filter(l => l.trim());
    const rows = lines.map(l => [l]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'إحصائية');
    XLSX.writeFile(wb, `إحصائية_المختبرات_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportMaterialsToExcel() {
    if (typeof XLSX === 'undefined') { alert('مكتبة Excel غير محملة.'); return; }
    const tbody = document.getElementById('materialsTableBody');
    if (!tbody || tbody.rows.length === 0) { alert('لا توجد مواد للتصدير.'); return; }
    const rows = [['م', 'اسم المادة', 'الكمية', 'حالة', 'ملاحظات']];
    for (let i = 0; i < tbody.rows.length; i++) {
        const cells = tbody.rows[i].cells;
        rows.push([i + 1, cells[0]?.innerText || '', cells[1]?.innerText || '', cells[2]?.innerText || '', cells[3]?.innerText || '']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'المواد');
    XLSX.writeFile(wb, `سجل_المواد_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// =========================================================
// إدارة المستخدمين (معلمين وفنيين بأسماء)
// =========================================================

function renderUsersTable() {
    const tbody = document.getElementById('usersListTable');
    if (!tbody) return;
    const users = getUsers();
    tbody.innerHTML = '';
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#95a5a6">لا يوجد مستخدمون — أضف أول مستخدم</td></tr>';
        return;
    }
    tbody.innerHTML = users.map((u, i) => {
        const roleLabel = u.role === 'admin' ? '🏫 مدير' : u.role === 'tech' ? '🔬 فني مختبر' : '🧑‍🏫 معلم';
        const canDel = currentRole && currentRole.canDelete;
        const hasAuth = u.authEmail ? '☁️' : '💾';
        return `<tr>
            <td style="font-weight:bold; text-align:right">${u.name}</td>
            <td>${roleLabel}</td>
            <td style="direction:ltr; text-align:center; font-family:monospace">${u.password}</td>
            <td style="text-align:center" title="${u.authEmail || 'محلي فقط'}">${hasAuth}</td>
            <td><button class="btn-edit-row" onclick="editUserPassword(${i})" style="background:none; border:none; cursor:pointer; font-size:16px" title="تعديل كلمة المرور">🔑</button></td>
            <td><button class="btn-delete-row" onclick="deleteUser(${i})" style="display:${canDel ? '' : 'none'}">❌</button></td>
        </tr>`;
    }).join('');
}

async function editUserPassword(index) {
    const users = getUsers();
    const user = users[index];
    if (!user) return;
    const newPwd = await showInputModal({ title: `تعديل كلمة مرور المستخدم "${user.name}"`, label: 'كلمة المرور الجديدة:', defaultValue: user.password });
    if (!newPwd) return;
    user.password = newPwd;
    saveUsers(users);
    if (user.role === 'admin') {
        const passwords = getPasswords();
        passwords.admin = newPwd.trim();
        savePasswords(passwords);
    }
    if (supabaseConnected && currentUserName === user.name) {
        try {
            const { error } = await supabaseClient.auth.updateUser({ password: newPwd });
            if (error) console.warn('⚠️ فشل تحديث كلمة مرور Auth:', error.message);
        } catch (e) {}
    }
    renderUsersTable();
    addAuditLog('🔑 تعديل كلمة مرور', `المستخدم "${user.name}"`);
}

function addUser() {
    const name = document.getElementById('newUserName').value.trim();
    const role = document.getElementById('newUserRole').value;
    const password = document.getElementById('newUserPassword').value.trim();
    if (!name) { alert('الرجاء إدخال اسم المستخدم'); return; }
    if (!password) { alert('الرجاء إدخال كلمة مرور'); return; }
    const users = getUsers();
    if (users.some(u => u.name === name)) { alert('هذا الاسم موجود مسبقاً'); return; }
    users.push({ name, role, password });
    saveUsers(users);
    if (supabaseConnected) {
        createAuthUser(name, role, password).then(r => {
            if (r?.error) console.warn('⚠️ لم يتم إنشاء حساب السحابة:', r.error.message);
        });
    }
    document.getElementById('newUserName').value = '';
    renderUsersTable();
    updateSupabaseStatus();
    const roleLabel = role === 'admin' ? 'مدير' : role === 'tech' ? 'فني' : 'معلم';
    addAuditLog('👤 إضافة مستخدم', `${name} (${roleLabel})`);
}

async function deleteUser(index) {
    if (!currentRole.canDelete) { alert('ليس لديك صلاحية الحذف.'); return; }
    const users = getUsers();
    const name = users[index].name;
    if (!await showConfirm(`حذف المستخدم "${name}"؟`)) return;
    users.splice(index, 1);
    saveUsers(users);
    renderUsersTable();
    addAuditLog('🗑️ حذف مستخدم', name);
}

// إدارة كلمات المرور
function renderPasswordSettings() {
    const passwords = getPasswords();
    ['admin', 'tech', 'teacher'].forEach(role => {
        const el = document.getElementById(`pwd_${role}`);
        if (el) el.value = passwords[role];
    });
}

function savePasswords_UI() {
    const passwords = {
        admin:   document.getElementById('pwd_admin').value.trim(),
        tech:    document.getElementById('pwd_tech').value.trim(),
        teacher: document.getElementById('pwd_teacher').value.trim()
    };
    if (!passwords.admin || !passwords.tech || !passwords.teacher) {
        alert('كلمات المرور لا يمكن أن تكون فارغة!'); return;
    }
    savePasswords(passwords);
    alert('✅ تم حفظ كلمات المرور بنجاح!');
}

// إدارة القوائم
function addSettingItem(type, inputId) {
    if (!currentRole.canEditSettings) { alert('ليس لديك صلاحية التعديل.'); return; }
    const input = document.getElementById(inputId);
    const value = input.value.trim();
    if (!value) return;
    if (type === 'teachers') teachers.push(value);
    if (type === 'classes')  classes.push(value);
    if (type === 'divisions') divisions.push(value);
    if (type === 'labtypes') labTypes.push(value);
    localStorage.setItem(`cfg_${type === 'labtypes' ? 'labtypes' : type}`, JSON.stringify(getArrayVar(type)));
    input.value = '';
    initSystemConfiguration();
    const typeLabel = type === 'teachers' ? 'معلم' : type === 'classes' ? 'صف' : type === 'divisions' ? 'شعبة' : 'نوع مختبر';
    addAuditLog('➕ إضافة عنصر', `${typeLabel}: ${value}`);
}

async function deleteSettingItem(type, index) {
    if (!currentRole.canEditSettings) { alert('ليس لديك صلاحية التعديل.'); return; }
    if (await showConfirm('هل أنت متأكد من الحذف؟')) {
        if (type === 'teachers') teachers.splice(index, 1);
        if (type === 'classes')  classes.splice(index, 1);
        if (type === 'divisions') divisions.splice(index, 1);
        if (type === 'labtypes') labTypes.splice(index, 1);
        localStorage.setItem(`cfg_${type === 'labtypes' ? 'labtypes' : type}`, JSON.stringify(getArrayVar(type)));
        initSystemConfiguration();
    }
}

function getArrayVar(type) {
    if (type === 'teachers') return teachers;
    if (type === 'classes')  return classes;
    if (type === 'divisions') return divisions;
    if (type === 'labtypes') return labTypes;
}

function renderSettingsTables() {
    const delStyle = currentRole && currentRole.canDelete ? '' : 'none';
    const tTable = document.getElementById('teachersListTable');
    if (tTable) tTable.innerHTML = teachers.map((t, i) => `<tr><td style="text-align:right; padding-right:15px; font-weight:bold">${t}</td><td><button class="btn-delete-row" onclick="deleteSettingItem('teachers',${i})" style="display:${delStyle}">❌</button></td></tr>`).join('');
    const cTable = document.getElementById('classesListTable');
    if (cTable) cTable.innerHTML = classes.map((c, i) => `<tr><td style="text-align:right; padding-right:15px; font-weight:bold">${c}</td><td><button class="btn-delete-row" onclick="deleteSettingItem('classes',${i})" style="display:${delStyle}">❌</button></td></tr>`).join('');
    const dTable = document.getElementById('divisionsListTable');
    if (dTable) dTable.innerHTML = divisions.map((d, i) => `<tr><td style="text-align:right; padding-right:15px; font-weight:bold">الشعبة ${d}</td><td><button class="btn-delete-row" onclick="deleteSettingItem('divisions',${i})" style="display:${delStyle}">❌</button></td></tr>`).join('');
    const lTable = document.getElementById('labtypesListTable');
    if (lTable) lTable.innerHTML = labTypes.map((lt, i) => `<tr><td style="text-align:right; padding-right:15px; font-weight:bold">${lt}</td><td><button class="btn-delete-row" onclick="deleteSettingItem('labtypes',${i})" style="display:${delStyle}">❌</button></td></tr>`).join('');
}

// مخزن التجارب
function renderStoreExperiments() {
    const tbody = document.getElementById('storeExperimentsTableBody');
    if (!tbody) return;
    const filterMonth = (document.getElementById('filterStoreMonth')?.value || '').trim();
    const filterSubj  = (document.getElementById('filterStoreSubject')?.value || '').trim();
    const filterClass = (document.getElementById('filterStoreClass')?.value || '').trim();
    const filterText  = (document.getElementById('filterStoreText')?.value || '').trim().toLowerCase();

    let total = 0;
    let filtered = 0;
    const delStyle = currentRole && currentRole.canDelete ? '' : 'none';
    const rows = [];
    Object.keys(customDatabase).forEach(subj => {
        customDatabase[subj].forEach((exp, idx) => {
            total++;
            let match = true;
            if (filterMonth && exp.month !== filterMonth) match = false;
            if (filterSubj && subj !== filterSubj) match = false;
            if (filterClass && (exp.class || '') !== filterClass) match = false;
            if (filterText && !exp.name.toLowerCase().includes(filterText)) match = false;
            if (!match) return;
            filtered++;
            rows.push(`<tr>
                <td>شهر ${exp.month || '10'}</td>
                <td>${exp.class || 'العاشر'}</td>
                <td style="text-align:right; font-weight:bold; color:#1a5276">${subj}</td>
                <td style="text-align:right">${exp.name}</td>
                <td style="text-align:right; font-size:11px; color:#555">${exp.tools}</td>
                <td><button class="btn-delete-row" onclick="deleteExperimentFromStore('${subj.replace(/'/g, "\\'")}',${idx})" style="display:${delStyle}">❌</button></td>
            </tr>`);
        });
    });
    tbody.innerHTML = rows.join('');
    const badge = document.getElementById('storeTotalCountBadge');
    if (badge) badge.innerText = total;
    const countEl = document.getElementById('storeFilteredCount');
    if (countEl) countEl.innerText = filtered;
}

async function deleteExperimentFromStore(subject, index) {
    if (!currentRole.canEditSettings) { alert('ليس لديك صلاحية.'); return; }
    if (await showConfirm('شطب هذه التجربة؟')) {
        customDatabase[subject].splice(index, 1);
        if (customDatabase[subject].length === 0) delete customDatabase[subject];
        localStorage.setItem('cfg_database', JSON.stringify(customDatabase));
        initSystemConfiguration();
    }
}

async function clearFullExperimentsStore() {
    if (!currentRole.canEditSettings) { alert('ليس لديك صلاحية.'); return; }
    if (await showConfirm('🚨 تفريغ مخزن التجارب بالكامل؟')) {
        customDatabase = {};
        localStorage.setItem('cfg_database', JSON.stringify(customDatabase));
        initSystemConfiguration();
        alert('🧹 تم التصفير!');
    }
}

// أهداف الخطة
function laserTargetFromStore() {
    if (!currentRole.canEditSettings) { alert('ليس لديك صلاحية.'); return; }
    const month = document.getElementById('filterStoreMonth')?.value || '';
    const subj  = document.getElementById('filterStoreSubject')?.value || '';
    const cls   = document.getElementById('filterStoreClass')?.value || '';
    const count = parseInt(document.getElementById('storeFilteredCount')?.innerText) || 0;
    if (!month || !subj || !cls) { alert('⚠️ اختر الشهر والمبحث والصف من فلتر مخزن التجارب أولاً'); return; }
    if (count === 0) { alert('⚠️ لا توجد تجارب مطابقة للفلتر'); return; }
    const key = `${month}||${subj}||${cls}`;
    planTargets[key] = count;
    localStorage.setItem('cfg_plan_targets_v2', JSON.stringify(planTargets));
    renderSavedTargetsTable();
    generateMonthlyReportData();
    alert(`🎯 تمت إضافة ${count} تجربة كهدف للخطة (${subj} - ${cls})`);
}
function submitCustomPlanTargetItem() {
    if (!currentRole.canEditSettings) { alert('ليس لديك صلاحية.'); return; }
    const m   = document.getElementById('tgtMonth').value;
    const s   = document.getElementById('tgtSubject').value;
    const c   = document.getElementById('tgtClass').value;
    const val = document.getElementById('tgtCountInput').value.trim();
    if (!s || !c || val === '') { alert('الرجاء التحقق من المدخلات.'); return; }
    planTargets[`${m}||${s}||${c}`] = parseInt(val) || 0;
    localStorage.setItem('cfg_plan_targets_v2', JSON.stringify(planTargets));
    document.getElementById('tgtCountInput').value = '';
    renderSavedTargetsTable();
    generateMonthlyReportData();
    alert('💾 تم حفظ الهدف بنجاح!');
}

function renderSavedTargetsTable() {
    const tbody = document.getElementById('savedTargetsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const canEdit = currentRole && currentRole.canEditSettings;
    const canDel  = currentRole && currentRole.canDelete;
    const esc = s => String(s).replace(/[&<>"']/g, function(m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
    tbody.innerHTML = Object.keys(planTargets).map(key => {
        const p = key.split('||');
        const encodedKey = encodeURIComponent(key);
        return `<tr id="row_${encodedKey}">
            <td>${esc(p[0])}</td>
            <td style="text-align:right; font-weight:bold">${esc(p[1])}</td>
            <td>${esc(p[2])}</td>
            <td id="val_${encodedKey}" style="font-weight:bold; color:#2980b9">${planTargets[key]}</td>
            <td><button class="btn-edit-row" onclick="editTargetItem('${encodedKey}')" style="display:${canEdit ? '' : 'none'}" title="تعديل">✏️</button></td>
            <td><button class="btn-delete-row" onclick="deleteTargetItem('${encodedKey}')" style="display:${canDel ? '' : 'none'}" title="حذف">❌</button></td>
        </tr>`;
    }).join('');
}

function editTargetItem(encodedKey) {
    if (!currentRole.canEditSettings) return;
    const key = decodeURIComponent(encodedKey);
    const encodedKey2 = btoa(encodeURIComponent(key));
    const row = document.getElementById(`row_${encodedKey}`);
    if (!row || row.classList.contains('editing')) return;
    row.classList.add('editing');

    const p = key.split('||');
    const currentMonth = p[0];
    const currentSubj  = p[1];
    const currentClass = p[2];
    const currentVal   = planTargets[key];

    // بناء خيارات الأشهر
    const monthOptions = [
        ['09','أيلول'],['10','تشرين الأول'],['11','تشرين الثاني'],['12','كانون الأول'],
        ['01','كانون الثاني'],['02','شباط'],['03','آذار'],['04','نيسان'],['05','أيار'],['06','حزيران']
    ].map(([v,l]) => `<option value="${v}" ${v===currentMonth?'selected':''}>${l}</option>`).join('');

    // بناء خيارات المباحث
    const subjOptions = Object.keys(customDatabase).length > 0
        ? Object.keys(customDatabase).map(s => `<option value="${s.replace(/"/g,'&quot;')}" ${s===currentSubj?'selected':''}>${s}</option>`).join('')
        : `<option value="${currentSubj.replace(/"/g,'&quot;')}" selected>${currentSubj}</option>`;

    // بناء خيارات الصفوف
    const classOptions = classes.map(c => `<option value="${c.replace(/"/g,'&quot;')}" ${c===currentClass?'selected':''}>${c}</option>`).join('');

    const inputStyle = 'padding:4px 6px; border:1.5px solid #2980b9; border-radius:5px; font-size:12px; font-family:inherit; width:100%';
    const btnStyle   = (bg) => `background:${bg}; color:white; border:none; border-radius:4px; padding:4px 9px; cursor:pointer; font-size:13px; font-weight:bold`;

    row.innerHTML = `
        <td><select id="edit_month_${encodedKey2}" style="${inputStyle}">${monthOptions}</select></td>
        <td><select id="edit_subj_${encodedKey2}"  style="${inputStyle}">${subjOptions}</select></td>
        <td><select id="edit_class_${encodedKey2}" style="${inputStyle}">${classOptions}</select></td>
        <td><input  id="edit_val_${encodedKey2}"   type="number" min="0" value="${currentVal}"
                style="${inputStyle}; width:70px; text-align:center"
                onkeydown="if(event.key==='Enter') confirmEditTarget('${encodedKey}'); if(event.key==='Escape') renderSavedTargetsTable()"></td>
        <td colspan="2" style="white-space:nowrap">
            <button onclick="confirmEditTarget('${encodedKey}')" title="حفظ"   style="${btnStyle('#27ae60')}">✔ حفظ</button>
            &nbsp;
            <button onclick="renderSavedTargetsTable()"          title="إلغاء" style="${btnStyle('#e74c3c')}">✖</button>
        </td>`;

    setTimeout(() => {
        const inp = document.getElementById(`edit_val_${encodedKey2}`);
        if (inp) { inp.focus(); inp.select(); }
    }, 50);
}

function confirmEditTarget(encodedKey) {
    const key = decodeURIComponent(encodedKey);
    const encodedKey2 = btoa(encodeURIComponent(key));
    const newMonth = document.getElementById(`edit_month_${encodedKey2}`)?.value;
    const newSubj  = document.getElementById(`edit_subj_${encodedKey2}`)?.value;
    const newClass = document.getElementById(`edit_class_${encodedKey2}`)?.value;
    const newVal   = parseInt(document.getElementById(`edit_val_${encodedKey2}`)?.value);

    if (!newMonth || !newSubj || !newClass || isNaN(newVal) || newVal < 0) {
        alert('الرجاء التحقق من جميع الحقول.'); return;
    }

    // حذف المفتاح القديم وإضافة الجديد
    delete planTargets[key];
    const newKey = `${newMonth}||${newSubj}||${newClass}`;
    planTargets[newKey] = newVal;

    localStorage.setItem('cfg_plan_targets_v2', JSON.stringify(planTargets));
    renderSavedTargetsTable();
    generateMonthlyReportData();
}

async function deleteTargetItem(encodedKey) {
    if (!currentRole.canDelete) return;
    const key = decodeURIComponent(encodedKey);
    if (await showConfirm('شطب هذا الهدف؟')) {
        delete planTargets[key];
        localStorage.setItem('cfg_plan_targets_v2', JSON.stringify(planTargets));
        renderSavedTargetsTable();
        generateMonthlyReportData();
    }
}

// استيراد البيانات
function importDataViaCopyPasteEngine() {
    if (!currentRole.canEditSettings) { alert('ليس لديك صلاحية.'); return; }
    const rawText = document.getElementById('pasteZoneInput').value;
    const log = document.getElementById('pasteStatusLog');
    if (!rawText.trim()) { alert('صندوق اللصق فارغ!'); return; }

    // تطبيع النص — توحيد ألِف (ا, أ, إ) لتجنب مشاكل الأحرف
    let normalized = rawText.replace(/[أإآ]/g, 'ا');

    const rawLines = normalized.split('\n');
    let addedCount = 0;
    let processedLines = [];
    let currentLineBuffer = [];

    rawLines.forEach(line => {
        const tabCount = (line.match(/\t/g) || []).length;
        if (tabCount >= 4) {
            if (currentLineBuffer.length > 0) processedLines.push(currentLineBuffer.join(' '));
            currentLineBuffer = [line];
        } else {
            if (line.trim()) currentLineBuffer.push(line.trim());
        }
    });
    if (currentLineBuffer.length > 0) {
        const merged = currentLineBuffer.join(' ');
        if (merged.split('\t').length >= 4) processedLines.push(merged);
    }

    processedLines.forEach(line => {
        const cols = line.split('\t');
        if (cols.length >= 3) {
            const expName  = (cols[0] || '').replace(/"/g, '').trim();
            const tools    = (cols[1] || '').replace(/"/g, '').trim();
            const subj     = (cols[2] || '').replace(/"/g, '').trim();
            const clsName  = (cols[3] || '').replace(/"/g, '').trim();
            const rawMonth = (cols[4] || '').replace(/"/g, '').trim();
            const monthCode = parseArabicMonthToCode(rawMonth);

            if (expName && subj && clsName && expName !== 'اسم التجربة') {
                if (!customDatabase[subj]) customDatabase[subj] = [];
                const isExist = customDatabase[subj].some(x => x.name === expName && x.class === clsName);
                if (!isExist) {
                    customDatabase[subj].push({ name: expName, tools, month: monthCode, class: clsName });
                    addedCount++;
                }
            }
        }
    });

    localStorage.setItem('cfg_database', JSON.stringify(customDatabase));
    initSystemConfiguration();
    document.getElementById('pasteZoneInput').value = '';
    log.innerText = `🎉 تم تثبيت (${addedCount}) نشاطاً مخبرياً بنجاح!`;
    alert(`⚡ تم الإيداع التراكمي لـ ${addedCount} تجربة جديدة.`);
}

// استيراد عبر رفع ملف Excel مباشرة (SheetJS)
function importViaExcelFile() {
    if (!currentRole.canEditSettings) { alert('ليس لديك صلاحية.'); return; }
    const fileInput = document.getElementById('excelFileInput');
    const log = document.getElementById('pasteStatusLog');
    if (!fileInput.files || !fileInput.files[0]) { alert('الرجاء اختيار ملف Excel أولاً'); return; }
    if (typeof XLSX === 'undefined') { alert('⚠️ مكتبة قراءة Excel غير محملة. تحقق من اتصال الإنترنت.'); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            let addedCount = 0;
            let headerRow = true;
            json.forEach(row => {
                if (headerRow) { headerRow = false; return; } // تجاوز العنوان
                const expName = String(row[0] || '').replace(/"/g, '').trim();
                const tools   = String(row[1] || '').replace(/"/g, '').trim();
                const subj    = String(row[2] || '').replace(/"/g, '').trim();
                const clsName = String(row[3] || '').replace(/"/g, '').trim();
                const rawMonth = String(row[4] || '').replace(/"/g, '').trim();
                const monthCode = parseArabicMonthToCode(rawMonth);

                if (expName && subj && clsName && expName !== 'اسم التجربة') {
                    if (!customDatabase[subj]) customDatabase[subj] = [];
                    const isExist = customDatabase[subj].some(x => x.name === expName && x.class === clsName);
                    if (!isExist) {
                        customDatabase[subj].push({ name: expName, tools, month: monthCode, class: clsName });
                        addedCount++;
                    }
                }
            });

            localStorage.setItem('cfg_database', JSON.stringify(customDatabase));
            initSystemConfiguration();
            document.getElementById('excelFileInput').value = '';
            log.innerText = `🎉 تم استيراد (${addedCount}) نشاطاً مخبرياً بنجاح!`;
            alert(`📂 تم استيراد ${addedCount} تجربة من ملف Excel بنجاح!`);
        } catch (err) {
            log.innerText = `❌ خطأ: ${err.message}`;
            console.error(err);
        }
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

// =========================================================
// دوال مساعدة
// =========================================================

function parseArabicMonthToCode(monthStr) {
    if (!monthStr) return '10';
    let m = monthStr.trim().replace(/[أإآ]/g, 'ا'); // توحيد الألف
    // إزالة الفراغات الزائدة الناتجة عن دمج الأسطر
    m = m.replace(/\s+/g, ' ').trim();
    if (m.includes('ايلول')        || m === '9'  || m === '09') return '09';
    if (m.includes('تشرين الاول')  || m === '10')                 return '10';
    if (m.includes('تشرين الثاني') || m === '11')                 return '11';
    if (m.includes('كانون الاول')  || m === '12')                 return '12';
    if (m.includes('كانون الثاني') || m === '1'  || m === '01')  return '01';
    if (m.includes('شباط')         || m === '2'  || m === '02')  return '02';
    if (m.includes('اذار')         || m === '3'  || m === '03')  return '03';
    if (m.includes('نيسان')        || m === '4'  || m === '04')  return '04';
    if (m.includes('ايار')         || m === '5'  || m === '05')  return '05';
    if (m.includes('حزيران')       || m === '6'  || m === '06')  return '06';
    // محاولة استخراج رقم الشهر إذا كان موجوداً في النص
    const num = m.match(/\d+/);
    if (num) return num[0].padStart(2, '0');
    return '10'; // افتراضي
}

function formatArabicDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    return `${days[d.getDay()]} ${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function getMonthFromArabicDate(dateString) {
    if (!dateString || !dateString.includes('/')) return '';
    const parts = dateString.split(' ')[1];
    if (!parts) return '';
    return parts.split('/')[1];
}

