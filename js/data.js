// =========================================================
// بيانات النظام
// =========================================================

const defaultTeachers = [];
const defaultClasses   = [];
const defaultDivisions = [];
const defaultLabTypes  = [];

let teachers      = JSON.parse(localStorage.getItem('cfg_teachers'))          || (localStorage.setItem('cfg_teachers', JSON.stringify(defaultTeachers)), defaultTeachers);
let classes       = JSON.parse(localStorage.getItem('cfg_classes'))            || (localStorage.setItem('cfg_classes', JSON.stringify(defaultClasses)), defaultClasses);
let divisions     = JSON.parse(localStorage.getItem('cfg_divisions'))          || (localStorage.setItem('cfg_divisions', JSON.stringify(defaultDivisions)), defaultDivisions);
let labTypes      = JSON.parse(localStorage.getItem('cfg_labtypes'))           || (localStorage.setItem('cfg_labtypes', JSON.stringify(defaultLabTypes)), defaultLabTypes);
let customDatabase= JSON.parse(localStorage.getItem('cfg_database'))           || {};
let archive       = JSON.parse(localStorage.getItem('labArchive'))             || [];
let planTargets   = JSON.parse(localStorage.getItem('cfg_plan_targets_v2'))    || {};
let auditLog      = JSON.parse(localStorage.getItem('cfg_audit_log'))          || [];

function addAuditLog(action, details) {
    const entry = {
        id: Date.now(),
        time: new Date().toISOString(),
        user: (typeof currentUserName !== 'undefined' ? currentUserName : '') || (currentRole?.label || 'غير معروف'),
        action: action,
        details: details || ''
    };
    auditLog.push(entry);
    if (auditLog.length > 500) auditLog = auditLog.slice(-500);
    localStorage.setItem('cfg_audit_log', JSON.stringify(auditLog));
}

function renderAuditLog() {
    const tbody = document.getElementById('auditLogTableBody');
    if (!tbody) return;
    const entries = auditLog.length === 0
        ? '<tr><td colspan="4" style="text-align:center; color:#95a5a6; padding:30px">لا توجد عمليات مسجلة بعد</td></tr>'
        : auditLog.slice().reverse().map(e => {
            const d = e.time.split('T');
            const date = d[0] ? formatArabicDate(d[0]) : '';
            const time = d[1] ? d[1].slice(0,5) : '';
            return `<tr>
                <td style="white-space:nowrap">${date} ${time}</td>
                <td style="text-align:right; font-weight:bold">${e.user}</td>
                <td><span class="audit-action">${e.action}</span></td>
                <td style="text-align:right; font-size:12px; max-width:300px">${e.details}</td>
            </tr>`;
        }).join('');
    tbody.innerHTML = entries;
}

function printAuditLog() {
    if (auditLog.length === 0) { alert('سجل التدقيق فارغ!'); return; }
    const printArea = document.getElementById('printAuditLogArea');
    if (!printArea) return;
    const rows = auditLog.slice().reverse().map(e => {
        const d = e.time.split('T');
        const date = d[0] || '';
        const time = d[1] ? d[1].slice(0,5) : '';
        return `<tr>
            <td style="border:1px solid #000; padding:4px 8px; text-align:center">${date} ${time}</td>
            <td style="border:1px solid #000; padding:4px 8px; text-align:center; font-weight:bold">${e.user}</td>
            <td style="border:1px solid #000; padding:4px 8px; text-align:center">${e.action}</td>
            <td style="border:1px solid #000; padding:4px 8px; text-align:right">${e.details}</td>
        </tr>`;
    }).join('');
    printArea.innerHTML = `
        <div style="text-align:center; margin-bottom:15px; font-size:16px; font-weight:bold">📋 سجل التدقيق والمراجعة</div>
        <table style="width:100%; border-collapse:collapse; font-size:12px">
            <thead><tr>
                <th style="border:1px solid #000; padding:6px 8px; background:#34495e; color:white">التاريخ والوقت</th>
                <th style="border:1px solid #000; padding:6px 8px; background:#34495e; color:white">المستخدم</th>
                <th style="border:1px solid #000; padding:6px 8px; background:#34495e; color:white">العملية</th>
                <th style="border:1px solid #000; padding:6px 8px; background:#34495e; color:white">التفاصيل</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:10px; font-size:11px; color:#666">تمت الطباعة من نظام السجل المخبري</div>`;
    const prevClass = document.body.className;
    document.body.className = 'printing-audit';
    window.print();
    setTimeout(() => {
        document.body.className = prevClass;
        printArea.innerHTML = '';
    }, 1500);
}

function exportAuditLogToExcel() {
    if (auditLog.length === 0) { alert('سجل التدقيق فارغ!'); return; }
    if (typeof XLSX === 'undefined') { alert('مكتبة Excel غير محملة. تأكد من اتصالك بالإنترنت.'); return; }
    const rows = [['الوقت', 'التاريخ', 'المستخدم', 'العملية', 'التفاصيل']];
    auditLog.slice().reverse().forEach(e => {
        const d = e.time.split('T');
        rows.push([d[1] ? d[1].slice(0,5) : '', d[0] || '', e.user, e.action, e.details]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'سجل التدقيق');
    XLSX.writeFile(wb, `سجل_التدقيق_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// =========================================================
// التبويبات
// =========================================================

function switchTab(evt, tabId) {
    if (!currentRole.tabs.includes(tabId)) return;
    openGroupForTab(tabId);
    switchTabById(tabId);
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    evt.currentTarget.classList.add('active');
}

function switchTabById(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const el = document.getElementById(tabId);
    if (el) el.classList.add('active');

    document.querySelectorAll('.tab-btn').forEach(b => {
        if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
        else b.classList.remove('active');
    });

    if (tabId === 'monthlyReportTab') generateMonthlyReportData();
    if (tabId === 'archiveTab') { renderArchive(); updateExpNum(); }
    if (tabId === 'statsTab') renderStatsPreview();
    if (tabId === 'suppliesTab') { backToSuppliesList(); }
    if (tabId === 'auditTab') { renderAuditLog(); }
}

// فتح المجموعة التي تحتوي تبويب معين
function openGroupForTab(tabId) {
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (!tabBtn) return;
    const subTabs = tabBtn.closest('.tab-subtabs');
    if (!subTabs) return;
    document.querySelectorAll('.tab-subtabs').forEach(el => {
        el.classList.remove('open');
        const arrow = el.parentElement.querySelector('.group-arrow');
        if (arrow) arrow.textContent = '▼';
    });
    subTabs.classList.add('open');
    const arrow = subTabs.parentElement.querySelector('.group-arrow');
    if (arrow) arrow.textContent = '▲';
}

// تبديل فتح/غلق مجموعة
function toggleTabGroup(groupId) {
    const subTabs = document.getElementById(groupId);
    if (!subTabs) return;
    const isOpen = subTabs.classList.contains('open');
    document.querySelectorAll('.tab-subtabs').forEach(el => {
        el.classList.remove('open');
        const arrow = el.parentElement.querySelector('.group-arrow');
        if (arrow) arrow.textContent = '▼';
    });
    if (!isOpen) {
        subTabs.classList.add('open');
        const arrow = subTabs.parentElement.querySelector('.group-arrow');
        if (arrow) arrow.textContent = '▲';
        const firstTab = subTabs.querySelector('.tab-btn:not(.restricted)');
        if (firstTab) {
            const tabId = firstTab.getAttribute('data-tab');
            switchTabById(tabId);
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            firstTab.classList.add('active');
        }
    }
}

// =========================================================
// تهيئة النظام
// =========================================================

function initSystemConfiguration() {
    const clsSel = document.getElementById('classSelect');
    clsSel.innerHTML = '<option value="">-- اختر الصف --</option>';
    classes.forEach(c => clsSel.appendChild(new Option(c, c)));

    const divSel = document.getElementById('divisionSelect');
    divSel.innerHTML = '<option value="">-- اختر الشعبة --</option>';
    divisions.forEach(d => divSel.appendChild(new Option(d, d)));

    const subSel = document.getElementById('subjectSelect');
    subSel.innerHTML = '<option value="">-- اختر المبحث --</option>';
    Object.keys(customDatabase).forEach(s => subSel.appendChild(new Option(s, s)));

    const tcSel = document.getElementById('teacherSelect');
    tcSel.innerHTML = '<option value="">-- اختر المعلم --</option>';
    teachers.forEach(t => tcSel.appendChild(new Option(t, t)));

    const tgtSub = document.getElementById('tgtSubject');
    if (tgtSub) { tgtSub.innerHTML = ''; Object.keys(customDatabase).forEach(s => tgtSub.appendChild(new Option(s, s))); }

    const tgtCls = document.getElementById('tgtClass');
    if (tgtCls) { tgtCls.innerHTML = ''; classes.forEach(c => tgtCls.appendChild(new Option(c, c))); }

    renderSettingsTables();

    // تعبئة قوائم فلتر الأرشيف
    populateArchiveFilters();

    // تعبئة قوائم فلتر مخزن التجارب
    const fSubj = document.getElementById('filterStoreSubject');
    if (fSubj) {
        const cur = fSubj.value;
        fSubj.innerHTML = '<option value="">الكل</option>';
        Object.keys(customDatabase).forEach(s => fSubj.appendChild(new Option(s, s)));
        if (cur) fSubj.value = cur;
    }
    const fCls = document.getElementById('filterStoreClass');
    if (fCls) {
        const cur = fCls.value;
        fCls.innerHTML = '<option value="">الكل</option>';
        classes.forEach(c => fCls.appendChild(new Option(c, c)));
        if (cur) fCls.value = cur;
    }
    renderStoreExperiments();
    renderSavedTargetsTable();
    renderPasswordSettings();
    renderUsersTable();
    initRequestsForm();
    renderRequestsTable();
    updateRequestsCount();

    // إعادة تطبيق صلاحيات الأزرار بعد إعادة الرسم
    if (currentRole) {
        document.querySelectorAll('.btn-delete-row').forEach(b => {
            b.style.display = currentRole.canDelete ? '' : 'none';
        });
    }
}

// =========================================================
// نموذج تعبئة الحصة
// =========================================================

function updateFilteredExperiments() {
    const rawDate = document.getElementById('dateInput').value;
    const cls     = document.getElementById('classSelect').value;
    const subj    = document.getElementById('subjectSelect').value;
    const expSel  = document.getElementById('expSelect');
    const statusLabel = document.getElementById('filterStatusLabel');

    expSel.innerHTML = '<option value="">-- اختر الصف والمبحث والتاريخ أولاً --</option>';
    clearTools();

    if (!rawDate || !cls || !subj) {
        statusLabel.innerText = '(بانتظار اكتمال الاختيارات للفلترة)';
        return;
    }

    const currentMonthCode = rawDate.split('-')[1];
    const allExps = customDatabase[subj] || [];
    const filtered = allExps.filter(e => {
        const eMonth = e.month ? e.month.toString().padStart(2, '0') : '';
        return eMonth === currentMonthCode && (e.class || '') === cls;
    });

    if (filtered.length > 0) {
        statusLabel.innerText = `(🎉 ${filtered.length} أنشطة مطابقة لشهر ${currentMonthCode} وصف ${cls})`;
        filtered.forEach(exp => {
            const idx = allExps.findIndex(o => o.name === exp.name && o.class === exp.class && o.month === exp.month);
            expSel.appendChild(new Option(exp.name, idx));
        });
    } else {
        statusLabel.innerText = '(⚠️ لا توجد تجارب مستوردة، تعرض القائمة الاحتياطية)';
        allExps.forEach((exp, idx) => expSel.appendChild(new Option(exp.name, idx)));
    }
}

function onDateChanged() { updateFilteredExperiments(); }

function autoFillTools() {
    const subj    = document.getElementById('subjectSelect').value;
    const idx     = document.getElementById('expSelect').value;
    const display = document.getElementById('toolsDisplay');
    const hidden  = document.getElementById('toolsUsed');
    if (subj && idx !== '' && customDatabase[subj] && customDatabase[subj][idx]) {
        const tools = customDatabase[subj][idx].tools;
        display.textContent = tools;
        display.classList.remove('empty');
        hidden.value = tools;
    } else { clearTools(); }
}

function clearTools() {
    const display = document.getElementById('toolsDisplay');
    display.textContent = 'ستظهر الأدوات تلقائياً عند اختيار التجربة...';
    display.classList.add('empty');
    document.getElementById('toolsUsed').value = '';
}

