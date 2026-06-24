// نموذج طلبات المعلمين
// =========================================================

let requests = JSON.parse(localStorage.getItem('labRequests')) || [];

function initRequestsForm() {
    const reqTeacher  = document.getElementById('reqTeacher');
    const reqClass    = document.getElementById('reqClass');
    const reqDivision = document.getElementById('reqDivision');
    const reqSubject  = document.getElementById('reqSubject');
    const reqLabType  = document.getElementById('reqLabType');
    if (!reqTeacher) return;

    reqTeacher.innerHTML  = '<option value="">-- اختر المعلم --</option>';
    reqClass.innerHTML    = '<option value="">-- اختر الصف --</option>';
    reqDivision.innerHTML = '<option value="">-- اختر الشعبة --</option>';
    reqSubject.innerHTML  = '<option value="">-- اختر المبحث --</option>';
    reqLabType.innerHTML  = '<option value="">-- اختر نوع المختبر --</option>';

    teachers.forEach(t  => reqTeacher.appendChild(new Option(t, t)));
    classes.forEach(c   => reqClass.appendChild(new Option(c, c)));
    divisions.forEach(d => reqDivision.appendChild(new Option(d, d)));
    Object.keys(customDatabase).forEach(s => reqSubject.appendChild(new Option(s, s)));
    labTypes.forEach(lt => reqLabType.appendChild(new Option(lt, lt)));
}

function filterReqExperiments() {
    const date    = document.getElementById('reqDate').value;
    const cls     = document.getElementById('reqClass').value;
    const subj    = document.getElementById('reqSubject').value;
    const expSel  = document.getElementById('reqExpName');
    const status  = document.getElementById('reqFilterStatus');

    expSel.innerHTML = '<option value="">-- اختر التجربة --</option>';
    document.getElementById('reqTools').value = '';

    if (!date || !cls || !subj) {
        if (status) status.innerText = '(اختر التاريخ والصف والمبحث أولاً)';
        return;
    }

    const monthCode = date.split('-')[1];
    const allExps   = customDatabase[subj] || [];
    const filtered  = allExps.filter(e =>
        (e.month || '').toString().padStart(2,'0') === monthCode && (e.class || '') === cls
    );

    if (filtered.length > 0) {
        if (status) status.innerText = `(🎉 ${filtered.length} أنشطة مطابقة)`;
        filtered.forEach(exp => {
            const idx = allExps.findIndex(o => o.name === exp.name && o.class === exp.class && o.month === exp.month);
            expSel.appendChild(new Option(exp.name, idx));
        });
    } else {
        if (status) status.innerText = '(⚠️ لا توجد تجارب مستوردة، القائمة الاحتياطية)';
        allExps.forEach((exp, idx) => expSel.appendChild(new Option(exp.name, idx)));
    }
}

function autoFillReqTools() {
    const subj   = document.getElementById('reqSubject').value;
    const idx    = document.getElementById('reqExpName').value;
    const tools  = document.getElementById('reqTools');
    if (subj && idx !== '' && customDatabase[subj] && customDatabase[subj][idx]) {
        tools.value = customDatabase[subj][idx].tools || '';
    } else {
        tools.value = '';
    }
}

async function saveRequest() {
    const date     = document.getElementById('reqDate').value;
    const lesson   = document.getElementById('reqLesson').value;
    const teacher  = document.getElementById('reqTeacher').value;
    const cls      = document.getElementById('reqClass').value;
    const div      = document.getElementById('reqDivision').value;
    const subj     = document.getElementById('reqSubject').value;
    const labType  = document.getElementById('reqLabType').value;
    const expSel   = document.getElementById('reqExpName');
    const expName  = expSel.options[expSel.selectedIndex]?.text || '';
    const groups   = document.getElementById('reqGroups').value;
    const tools    = document.getElementById('reqTools').value.trim();

    if (!date || !lesson || !teacher || !cls || !div || !subj || !expName || expName.startsWith('--')) {
        alert('الرجاء تعبئة كافة الحقول الملحوقة بنجمة (*).'); return;
    }

    // التحقق من تعارض الحجز
    const conflict = requests.find(r =>
        r.status === 'pending' && r.date === date && r.lesson === lesson
    );
    if (conflict) {
        if (!await showConfirm(`⚠️ يوجد طلب مسبق في نفس التاريخ والحصة\n(${conflict.teacher} - ${conflict.expName})\nهل تريد الإضافة رغم ذلك؟`)) return;
    }

    requests.push({
        id:      Date.now(),
        date, lesson, teacher, cls, div,
        clsDiv:  `${cls} / ${div}`,
        subj, labType, expName,
        groups:  groups || '—',
        tools,
        status:  'pending',
        savedBy: currentUserName || currentRole.label
    });

    localStorage.setItem('labRequests', JSON.stringify(requests));
    renderRequestsTable();
    updateRequestsCount();
    generateWeeklyPlan();
    addAuditLog('📝 تقديم طلب', `${expName} - ${cls}/${div} - ${teacher}`);
    showToast('📥 تم حفظ الطلب — في انتظار التجهيز', 'success');

    ['reqDate','reqLesson','reqTeacher','reqClass','reqDivision','reqSubject','reqGroups','reqTools']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    expSel.innerHTML = '<option value="">-- اختر الصف والمبحث والتاريخ أولاً --</option>';
    if (document.getElementById('reqFilterStatus')) document.getElementById('reqFilterStatus').innerText = '';
}

function renderRequestsTable() {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const sorted = [...requests].sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr class="table-empty-row"><td colspan="9">لا توجد طلبات مسجلة بعد.</td></tr>`;
        return;
    }

    tbody.innerHTML = sorted.map(req => {
        const isPending = req.status === 'pending';
        const statusBadge = isPending
            ? `<span class="req-badge pending">🟡 بانتظار التنفيذ</span>`
            : `<span class="req-badge done">✅ مُنجز</span>`;

        const isTech = currentRole && currentRole.badge === 'tech';
        const actionBtn = isPending && isTech
            ? `<button class="btn-convert" onclick="convertToArchive(${req.id})" title="تحويل لسجل فعلي">📋 تحويل للأرشيف</button>`
            : isPending ? '<span style="color:#95a5a6; font-size:12px">—</span>'
            : `<span style="color:#27ae60; font-size:12px">تم التحويل</span>`;

        const deleteBtn = isTech
            ? `<button class="btn-delete-row" onclick="deleteRequest(${req.id})" title="حذف">❌</button>`
            : '';

        return `<tr style="${!isPending ? 'opacity:0.6; background:#f9f9f9' : ''}">
                <td data-label="التاريخ" style="font-weight:bold">${req.date}</td>
                <td data-label="الحصة">${req.lesson}</td>
                <td data-label="المعلم" style="font-weight:bold; text-align:right">${req.teacher}</td>
                <td data-label="الصف والشعبة">${req.clsDiv}</td>
                <td data-label="المبحث">${req.subj}</td>
                <td data-label="التجربة" style="text-align:right">${req.expName}</td>
                <td data-label="المجموعات">${req.groups}</td>
                <td data-label="الحالة">${statusBadge}</td>
                <td data-label="إجراء" class="table-actions-cell">${actionBtn} ${deleteBtn}</td>
            </tr>`;
    }).join('');
}

async function convertToArchive(id) {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    if (!await showConfirm(`تحويل طلب "${req.expName}" للسجل الفعلي؟\nسيظهر في الأرشيف وخطة العمل الأسبوعي كحصة منجزة.`)) return;

    // إضافة للأرشيف
    archive.push({
        date:     formatArabicDate(req.date),
        rawDate:  req.date,
        expNum:   archive.length + 1,
        lesson:   req.lesson,
        cls:      req.cls,
        div:      req.div,
        clsDiv:   req.clsDiv,
        subj:     req.subj,
        teacher:  req.teacher,
        expName:  req.expName,
        tools:    req.tools || '',
        damaged:  'لا يوجد',
        result:   'تمت بنجاح',
        notes:    '-',
        savedBy:  currentUserName || currentRole.label,
        fromRequest: true
    });

    // تحديث حالة الطلب
    req.status = 'done';

    localStorage.setItem('labArchive',   JSON.stringify(archive));
    localStorage.setItem('labRequests',  JSON.stringify(requests));

    renderRequestsTable();
    renderArchive();
    updateRequestsCount();
    generateWeeklyPlan();
    addAuditLog('📋 تحويل طلب للأرشيف', `${req.expName} - ${req.teacher}`);
    showToast('✅ تم تحويل الطلب للأرشيف', 'success');
}

async function deleteRequest(id) {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    if (!await showConfirm('هل تريد حذف هذا الطلب؟')) return;
    requests = requests.filter(r => r.id !== id);
    localStorage.setItem('labRequests', JSON.stringify(requests));
    renderRequestsTable();
    updateRequestsCount();
    addAuditLog('🗑️ حذف طلب', `${req.expName} - ${req.teacher}`);
    showToast('🗑️ تم حذف الطلب', 'warning');

    // تعبئة حقول Supabase
    const urlField = document.getElementById('cfgSupabaseUrl');
    const keyField = document.getElementById('cfgSupabaseKey');
    if (urlField && SUPABASE_URL) urlField.value = SUPABASE_URL;
    if (keyField && SUPABASE_ANON_KEY) keyField.value = SUPABASE_ANON_KEY;
    updateSupabaseStatus();
}

function updateRequestsCount() {
    const el = document.getElementById('requestsCount');
    if (!el) return;
    const count = requests.filter(r => r.status === 'pending').length;
    el.innerHTML = count > 0 ? `<span class="badge-pending">${count}</span>` : '0';

    const alertEl = document.getElementById('pendingAlert');
    const alertText = document.getElementById('pendingAlertText');
    if (alertEl && alertText && currentRole) {
        if (count > 0 && currentRole.badge === 'tech') {
            alertEl.style.display = 'block';
            alertText.innerText = `🔔 لديك ${count} طلب${count > 1 ? 'ات' : ''} معلق${count > 1 ? 'ة' : ''} — اضغط للعرض`;
        } else {
            alertEl.style.display = 'none';
        }
    }
}

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'warning' ? ' toast-warning' : type === 'success' ? ' toast-success' : '');
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.remove(); }, 3000);
}

// =========================================================
