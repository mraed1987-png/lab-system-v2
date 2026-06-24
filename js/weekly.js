// خطة العمل الأسبوعي
// =========================================================

const DAYS_AR   = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const LESSONS   = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة'];
const LESSON_MAP = {
    'الحصة الأولى':'الأولى','الحصة الثانية':'الثانية','الحصة الثالثة':'الثالثة',
    'الحصة الرابعة':'الرابعة','الحصة الخامسة':'الخامسة','الحصة السادسة':'السادسة','الحصة السابعة':'السابعة'
};

function renderWeeklyRecordCard(r) {
    const isRequest = r.type === 'request';
    return `
    <div class="teacher-request-card ${isRequest ? 'card-pending' : 'card-actual'}">
        ${isRequest ? '<div class="card-status-bar">🟡 طلب مسبق — بانتظار التنفيذ</div>' : '<div class="card-status-bar card-status-actual">✅ منجز فعلياً</div>'}
        <div class="card-row"><span class="card-label">اسم المعلم</span><span class="card-val">${r.teacher}</span></div>
        <div class="card-divider"></div>
        <div class="card-row"><span class="card-label">الصف</span><span class="card-val">${r.clsDiv}</span></div>
        <div class="card-row"><span class="card-label">المبحث</span><span class="card-val">${r.subj}</span></div>
        <div class="card-row"><span class="card-label">اسم التجربة</span><span class="card-val">${r.expName}</span></div>
        <div class="card-row"><span class="card-label">الأدوات والمواد</span><span class="card-val tools-val">${r.tools || '—'}</span></div>
        <div class="card-row"><span class="card-label">عدد المجموعات</span><span class="card-val">${isRequest && r.groups && r.groups !== '—' ? '( ' + r.groups + ' ) مجموعة' : '( &nbsp;&nbsp;&nbsp;&nbsp; ) مجموعة'}</span></div>
        ${isRequest ? '' : '<div class="card-sig">توقيع المعلم: ________________</div>'}
    </div>`;
}

function buildWeeklyMobileView(activeDays, grid) {
    let html = '<div class="weekly-mobile-view">';
    activeDays.forEach(d => {
        const dayLessons = LESSONS.filter(l => grid[l][d.dateStr].length > 0);
        if (dayLessons.length === 0) return;

        html += `<div class="day-block">
            <div class="day-title">${d.label} — ${d.dateStr}</div>`;

        dayLessons.forEach(lesson => {
            const records = grid[lesson][d.dateStr];
            html += `<div class="lesson-block">
                <div class="lesson-name">الحصة ${lesson}</div>
                ${records.map(r => renderWeeklyRecordCard(r)).join('')}
            </div>`;
        });

        html += '</div>';
    });
    html += '</div>';
    return html;
}

// ضبط نطاق الأسبوع الحالي تلقائياً
function setCurrentWeek() {
    const today = new Date();
    const day   = today.getDay(); // 0=أحد
    const diff  = day === 0 ? 0 : -day;
    const sun   = new Date(today); sun.setDate(today.getDate() + diff);
    const thu   = new Date(sun);   thu.setDate(sun.getDate() + 4);
    document.getElementById('weeklyFromDate').value = sun.toISOString().split('T')[0];
    document.getElementById('weeklyToDate').value   = thu.toISOString().split('T')[0];
    generateWeeklyPlan();
}

function generateWeeklyPlan() {
    const fromStr = document.getElementById('weeklyFromDate').value;
    const toStr   = document.getElementById('weeklyToDate').value;
    const preview = document.getElementById('weeklyPlanPreview');

    if (!fromStr || !toStr) {
        preview.innerHTML = '<div style="text-align:center; color:#95a5a6; font-style:italic; padding:40px">اختر نطاق التاريخ لعرض خطة الأسبوع...</div>';
        return;
    }

    const fromDate = new Date(fromStr);
    const toDate   = new Date(toStr);

    // بناء أعمدة الأيام الفعلية في النطاق (أحد→خميس فقط)
    const activeDays = [];
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay(); // 0=أحد..4=خميس
        if (dow >= 0 && dow <= 4) {
            activeDays.push({ dow, label: DAYS_AR[dow], dateStr: d.toISOString().split('T')[0] });
        }
    }

    if (activeDays.length === 0) {
        preview.innerHTML = '<div style="text-align:center; color:#e74c3c; padding:30px; font-weight:bold">النطاق المحدد لا يحتوي على أيام دراسية (أحد - خميس)</div>';
        return;
    }

    // بناء خريطة: [حصة][تاريخ] → قائمة السجلات
    const grid = {};
    LESSONS.forEach(l => { grid[l] = {}; activeDays.forEach(d => { grid[l][d.dateStr] = []; }); });

    // إضافة السجلات الفعلية من الأرشيف
    archive.forEach(item => {
        if (!item.rawDate) return;
        if (item.rawDate < fromStr || item.rawDate > toStr) return;
        const lessonKey = LESSON_MAP[item.lesson] || item.lesson;
        if (!grid[lessonKey] || !grid[lessonKey][item.rawDate]) return;
        grid[lessonKey][item.rawDate].push({ ...item, type: 'actual' });
    });

    // إضافة الطلبات المسبقة (pending فقط — المُنجزة ظهرت كأرشيف)
    requests.filter(r => r.status === 'pending').forEach(req => {
        if (req.date < fromStr || req.date > toStr) return;
        const lessonKey = LESSON_MAP[req.lesson] || req.lesson;
        if (!grid[lessonKey] || !grid[lessonKey][req.date]) return;
        grid[lessonKey][req.date].push({ ...req, type: 'request' });
    });

    // التحقق من وجود بيانات
    const hasData = LESSONS.some(l => activeDays.some(d => grid[l][d.dateStr].length > 0));

    // رسم الجدول
    const meta = JSON.parse(localStorage.getItem('cfg_school_meta')) || {};

    let html = `
    <div class="weekly-plan-wrapper">
        <div class="weekly-header">
            <div class="weekly-header-side">${meta.dir ? 'مديرية التربية والتعليم: ' + meta.dir : ''}</div>
            <div class="weekly-header-center">خطة العمل الأسبوعي</div>
            <div class="weekly-header-side" style="text-align:left">${meta.name ? 'المدرسة: ' + meta.name : ''}</div>
        </div>
        <div class="weekly-dates-bar">
            الفترة من: <strong>${fromStr}</strong> &nbsp;—&nbsp; إلى: <strong>${toStr}</strong>
        </div>
        <div class="weekly-table-scroll">
        <table class="weekly-table">
            <thead>
                <tr>
                    <th class="lesson-col">الحصة \\ اليوم</th>
                    ${activeDays.map(d => `<th class="day-col">${d.label}<br><span style="font-weight:400; font-size:11px">${d.dateStr}</span></th>`).join('')}
                </tr>
            </thead>
            <tbody>`;

    LESSONS.forEach(lesson => {
        html += `<tr><td class="lesson-label">${lesson}</td>`;
        activeDays.forEach(d => {
            const records = grid[lesson][d.dateStr];
            if (records.length === 0) {
                html += `<td class="weekly-cell empty-cell">—</td>`;
            } else {
                const cards = records.map(r => renderWeeklyRecordCard(r)).join('');
                html += `<td class="weekly-cell">${cards}</td>`;
            }
        });
        html += `</tr>`;
    });

    html += `
            </tbody>
        </table>
        </div>
        ${buildWeeklyMobileView(activeDays, grid)}
        <div class="weekly-footer">
            <span>اسم فني المختبر وتوقيعه: ${meta.tech || '................................'}</span>
            <span style="font-size:11px; color:#95a5a6">Form # QF70-2-29Rev. a</span>
        </div>
        ${!hasData ? '<div class="weekly-no-data">⚠️ لا توجد حصص مسجلة في هذا الأسبوع</div>' : ''}
    </div>`;

    preview.innerHTML = html;
}

// طباعة الخطة الأسبوعية
function printWeeklyPlan() {
    if (!currentRole.canPrint) { alert('ليس لديك صلاحية الطباعة.'); return; }
    const preview = document.getElementById('weeklyPlanPreview');
    if (!preview.querySelector('.weekly-table')) { alert('لا توجد خطة لطباعتها، اختر الأسبوع أولاً.'); return; }

    // نسخ المحتوى لمنطقة الطباعة خارج no-print
    const printArea = document.getElementById('printWeeklyArea');
    printArea.innerHTML = preview.innerHTML;

    const styleTag = document.createElement('style');
    styleTag.id = 'tempPageOrientation';
    styleTag.innerHTML = '@page { size: A4 landscape !important; margin: 0 !important; }';
    document.head.appendChild(styleTag);
    document.body.className = 'printing-weekly';
    window.print();
    setTimeout(() => {
        document.body.className = '';
        printArea.innerHTML = '';
        const tmp = document.getElementById('tempPageOrientation');
        if (tmp) tmp.remove();
    }, 1500);
}

// =========================================================
// أحداث التشغيل
// =========================================================

// =========================================================
