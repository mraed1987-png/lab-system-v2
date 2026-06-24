// =========================================================
// حفظ الحصة في الأرشيف
// =========================================================

function saveToArchive() {
    if (!currentRole.canSaveRecord) { alert('ليس لديك صلاحية الحفظ.'); return; }

    const rawDate  = document.getElementById('dateInput').value;
    const expNum   = document.getElementById('expNum').value;
    const lesson   = document.getElementById('lessonNum').value;
    const cls      = document.getElementById('classSelect').value;
    const div      = document.getElementById('divisionSelect').value;
    const subj     = document.getElementById('subjectSelect').value;
    const teacher  = document.getElementById('teacherSelect').value;
    const expSel   = document.getElementById('expSelect');
    const expName  = expSel.options[expSel.selectedIndex]?.text || '';
    const tools    = document.getElementById('toolsUsed').value || document.getElementById('toolsDisplay').textContent;

    if (!rawDate || !expNum || !lesson || !cls || !div || !subj || !expName || !teacher || expName.startsWith('--')) {
        alert('الرجاء تعبئة كافة الحقول الملحوقة بنجمة (*).'); return;
    }

    archive.push({
        date: formatArabicDate(rawDate), rawDate, expNum, lesson, cls, div,
        clsDiv: `${cls} / ${div}`, subj, teacher, expName,
        tools: (tools === 'ستظهر الأدوات تلقائياً عند اختيار التجربة...') ? '' : tools,
        damaged: document.getElementById('damagedTools').value || 'لا يوجد',
        result:  document.getElementById('expResult').value   || 'تمت بنجاح',
        notes:   document.getElementById('notes').value        || '-',
        savedBy: currentUserName || currentRole.label
    });

    localStorage.setItem('labArchive', JSON.stringify(archive));
    archivePage = Math.ceil(archive.length / ARCHIVE_PAGE_SIZE);
    renderArchive();
    updateExpNum();
    addAuditLog('📥 حفظ سجل', `${expName} - ${cls}/${div} - ${teacher}`);
    alert('📥 تم الحفظ بنجاح!');

    // إعادة ضبط النموذج
    ['dateInput','lessonNum','classSelect','divisionSelect','subjectSelect','teacherSelect','damagedTools','expResult','notes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('expSelect').innerHTML = '<option value="">-- اختر المبحث أولاً --</option>';
    document.getElementById('expNum').value = parseInt(expNum) + 1;
    clearTools();
    updateFilteredExperiments();
}

// =========================================================
// الأرشيف
// =========================================================

let archivePage = 1;
const ARCHIVE_PAGE_SIZE = 50;

function renderArchive() {
    const tbody = document.getElementById('archiveTableBody');
    document.getElementById('tabCount').innerText = archive.length;

    const fTeacher = document.getElementById('filterArchiveTeacher')?.value || '';
    const fSubject = document.getElementById('filterArchiveSubject')?.value || '';
    const fFrom    = document.getElementById('filterArchiveDateFrom')?.value || '';
    const fTo      = document.getElementById('filterArchiveDateTo')?.value || '';

    let filtered = archive.filter(item =>
        (!fTeacher || item.teacher === fTeacher) &&
        (!fSubject || item.subj === fSubject) &&
        (!fFrom    || item.rawDate >= fFrom) &&
        (!fTo      || item.rawDate <= fTo)
    );

    const hasFilter = fTeacher || fSubject || fFrom || fTo;
    const statusEl = document.getElementById('archiveFilterStatus');
    if (statusEl) {
        statusEl.innerText = hasFilter
            ? `🔍 عرض ${filtered.length} من أصل ${archive.length} سجل`
            : '';
    }

    // pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / ARCHIVE_PAGE_SIZE));
    if (archivePage > totalPages) archivePage = totalPages;
    const startIdx = (archivePage - 1) * ARCHIVE_PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + ARCHIVE_PAGE_SIZE);
    const paginationEl = document.getElementById('archivePagination');
    if (paginationEl) {
        if (totalPages <= 1) { paginationEl.style.display = 'none'; }
        else {
            paginationEl.style.display = 'flex';
            document.getElementById('archivePageInfo').textContent = `الصفحة ${archivePage} من ${totalPages}`;
            document.getElementById('archivePrevBtn').style.visibility = archivePage <= 1 ? 'hidden' : 'visible';
            document.getElementById('archiveNextBtn').style.visibility = archivePage >= totalPages ? 'hidden' : 'visible';
            document.getElementById('archiveTotalInfo').textContent = `(${filtered.length} سجل)`;
        }
    }

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr class="table-empty-row"><td colspan="9" style="text-align:center; color:#7f8c8d; padding:20px">${archive.length === 0 ? 'السجل فارغ' : 'لا توجد نتائج تطابق الفلتر'}</td></tr>`;
        if (paginationEl) paginationEl.style.display = 'none';
        return;
    }
    if (paginationEl) paginationEl.style.display = totalPages > 1 ? 'flex' : 'none';

    let selectedIds = new Set((document.getElementById('deleteSelectedBtn').dataset.selectedIds || '').split(',').filter(Boolean));
    tbody.innerHTML = pageItems.map(item => {
        const originalIndex = archive.indexOf(item);
        const checked = selectedIds.has(String(originalIndex)) ? 'checked' : '';
        const deleteBtn = currentRole && currentRole.canDelete
            ? `<button class="btn-delete-row" onclick="deleteRow(${originalIndex})">❌</button>`
            : '<span style="color:#bdc3c7">—</span>';
        return `<tr>
                <td data-label="تحديد" style="width:32px; text-align:center"><input type="checkbox" class="archive-checkbox" value="${originalIndex}" ${checked} onchange="updateSelectedCount()"></td>
                <td data-label="التاريخ">${item.date}</td>
                <td data-label="الحصة">${item.lesson}</td>
                <td data-label="المعلم" style="font-weight:bold; text-align:right">${item.teacher}</td>
                <td data-label="الصف والشعبة">${item.clsDiv}</td>
                <td data-label="المبحث">${item.subj}</td>
                <td data-label="التجربة" style="text-align:right">${item.expName}</td>
                <td data-label="الأدوات المستخدمة" style="text-align:right; font-size:11px">${item.tools}</td>
                <td data-label="حذف">${deleteBtn}</td>
            </tr>`;
    }).join('');
    updateSelectedCount();
}

async function deleteRow(index) {
    if (!currentRole.canDelete) { alert('ليس لديك صلاحية الحذف.'); return; }
    if (await showConfirm('هل تريد حذف هذا السجل؟')) {
        const item = archive[index];
        archive.splice(index, 1);
        localStorage.setItem('labArchive', JSON.stringify(archive));
        renderArchive();
        updateExpNum();
        if (item) addAuditLog('🗑️ حذف سجل', `${item.expName} - ${item.teacher}`);
    }
}

async function clearFullArchive() {
    if (!currentRole.canDelete) { alert('ليس لديك صلاحية.'); return; }
    if (await showConfirm('مسح السجل بالكامل؟')) {
        const count = archive.length;
        archive = []; archivePage = 1;
        localStorage.removeItem('labArchive');
        renderArchive();
        updateExpNum();
        addAuditLog('🧹 مسح السجل بالكامل', `تم حذف ${count} سجل`);
    }
}

function toggleSelectAll(checked) {
    document.querySelectorAll('.archive-checkbox').forEach(cb => cb.checked = checked);
    updateSelectedCount();
}

function updateSelectedCount() {
    const checked = document.querySelectorAll('.archive-checkbox:checked');
    const btn = document.getElementById('deleteSelectedBtn');
    const count = document.getElementById('selectedCount');
    const ids = Array.from(checked).map(cb => cb.value).join(',');
    if (checked.length === 0) {
        btn.style.display = 'none';
    } else {
        btn.style.display = 'inline-flex';
        count.textContent = checked.length;
    }
    btn.dataset.selectedIds = ids;
    const selectAll = document.getElementById('selectAllCheckbox');
    if (selectAll) selectAll.checked = checked.length > 0 && checked.length === document.querySelectorAll('.archive-checkbox').length;
}

async function deleteSelectedArchive() {
    if (!currentRole.canDelete) { alert('ليس لديك صلاحية الحذف.'); return; }
    const ids = (document.getElementById('deleteSelectedBtn').dataset.selectedIds || '').split(',').filter(Boolean).map(Number);
    if (ids.length === 0) return;
    if (!await showConfirm(`تأكيد حذف ${ids.length} سجل؟`)) return;
    ids.sort((a, b) => b - a).forEach(i => archive.splice(i, 1));
    localStorage.setItem('labArchive', JSON.stringify(archive));
    document.getElementById('deleteSelectedBtn').dataset.selectedIds = '';
    renderArchive();
    updateExpNum();
    addAuditLog('🗑️ حذف متعدد', `تم حذف ${ids.length} سجل`);
}

function updateExpNum() {
    const maxNum = archive.reduce((max, r) => { const n = parseInt(r.expNum); return n > max ? n : max; }, 0);
    const inp = document.getElementById('expNum');
    if (inp) inp.value = maxNum + 1;
}

function changeArchivePage(delta) {
    const totalPages = Math.max(1, Math.ceil(archive.length / ARCHIVE_PAGE_SIZE));
    archivePage = Math.max(1, Math.min(archivePage + delta, totalPages));
    renderArchive();
}

function clearArchiveFilters() {
    archivePage = 1;
    ['filterArchiveTeacher','filterArchiveSubject','filterArchiveDateFrom','filterArchiveDateTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderArchive();
}

// =========================================================
// التقرير الشهري
// =========================================================

function generateMonthlyReportData() {
    const selectedMonth = document.getElementById('monthlyReportFilter').value;
    const screenTbody  = document.getElementById('monthlyReportTableBody');
    const printTbody   = document.getElementById('printMonthlyTableBody2');
    screenTbody.innerHTML = '';
    if (printTbody) printTbody.innerHTML = '';

    let countChem = 0, countPhys = 0, countBio = 0, countEarth = 0, countGen = 0, totalDone = 0;
    const aggregatedMap = {};

    archive.forEach(item => {
        const recordMonth = item.rawDate ? item.rawDate.split('-')[1] : getMonthFromArabicDate(item.date);
        if (recordMonth !== selectedMonth) return;
        totalDone++;
        const subj = item.subj ? item.subj.trim() : '';
        if (subj.includes('كيمياء')) countChem++;
        else if (subj.includes('فيزياء')) countPhys++;
        else if (subj.includes('أحياء') || subj.includes('احياء')) countBio++;
        else if (subj.includes('أرض') || subj.includes('ارض') || subj.includes('الجيولوجيا')) countEarth++;
        else countGen++;

        const key = `${item.teacher}||${item.subj}||${item.cls}`;
        if (!aggregatedMap[key]) {
            aggregatedMap[key] = { teacher: item.teacher, subject: item.subj, className: item.cls, divisionsList: [], actualDoneCount: 0 };
        }
        aggregatedMap[key].actualDoneCount++;
        if (item.div && !aggregatedMap[key].divisionsList.includes(item.div)) aggregatedMap[key].divisionsList.push(item.div);
    });

    const rows = Object.values(aggregatedMap).map((row, i) => {
        const targetKey  = `${selectedMonth}||${row.subject}||${row.className}`;
        const required   = planTargets[targetKey] || 0;
        const pct        = required > 0 ? Math.round((row.actualDoneCount / required) * 100) : 0;
        const divDisplay = row.className + ' / ' + (row.divisionsList.length > 0 ? row.divisionsList.sort().join(' + ') : '---');
        return `<tr>
            <td>${i + 1}</td>
            <td style="font-weight:bold; text-align:right">${row.teacher}</td>
            <td>${row.subject}</td>
            <td style="font-weight:600">${divDisplay}</td>
            <td style="color:#2980b9; font-weight:bold">${required > 0 ? required : 'لم يحدد'}</td>
            <td style="color:#27ae60; font-weight:bold">${row.actualDoneCount}</td>
            <td style="font-weight:bold; color:${pct >= 100 ? '#27ae60' : '#e67e22'}">${required > 0 ? pct + '%' : '0%'}</td>
        </tr>`;
    });
    screenTbody.innerHTML = rows.join('');

    if (printTbody) {
        printTbody.innerHTML = Object.values(aggregatedMap).map((row, i) => {
            const targetKey  = `${selectedMonth}||${row.subject}||${row.className}`;
            const required   = planTargets[targetKey] || 0;
            const pct        = required > 0 ? Math.round((row.actualDoneCount / required) * 100) : 0;
            const divDisplay = row.className + ' / ' + (row.divisionsList.length > 0 ? row.divisionsList.sort().join(' + ') : '---');
            return `<tr>
                <td>${i + 1}</td>
                <td style="text-align:right">${row.teacher}</td>
                <td>${row.subject}</td>
                <td>${divDisplay}</td>
                <td>${required > 0 ? required : 'لم يحدد'}</td>
                <td>${row.actualDoneCount}</td>
                <td>${required > 0 ? pct + '%' : '-'}</td>
                <td></td><td></td>
            </tr>`;
        }).join('');
    }

    if (Object.keys(aggregatedMap).length === 0) {
        screenTbody.innerHTML = `<tr><td colspan="7" style="color:#7f8c8d; font-style:italic; padding:20px">لا يوجد حصص مخبرية مسجلة لهذا الشهر.</td></tr>`;
        if (printTbody) printTbody.innerHTML = `<tr><td colspan="9" style="font-style:italic; padding:20px">لا يوجد حصص مسجلة.</td></tr>`;
    }

    // تحديث الإحصاءات
    if (document.getElementById('pMonthlyTotalFooter')) document.getElementById('pMonthlyTotalFooter').innerText = totalDone;
    document.getElementById('monthlyTotalCountLabel').innerText = `مجموع التجارب الكلي التي أجريت خلال الشهر: ${totalDone}`;
    document.getElementById('lblSumChem').innerText  = `مجموع تجارب الكيمياء = ${countChem}`;
    document.getElementById('lblSumPhys').innerText  = `مجموع تجارب الفيزياء = ${countPhys}`;
    document.getElementById('lblSumBio').innerText   = `مجموع تجارب الأحياء = ${countBio}`;
    document.getElementById('lblSumEarth').innerText = `مجموع تجارب علوم الأرض = ${countEarth}`;
    document.getElementById('lblSumGen').innerText   = `مجموع تجارب العلوم العامة = ${countGen}`;

    ['pSumChem2','pSumPhys2','pSumBio2','pSumEarth2','pSumGen2'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.innerText = [countChem, countPhys, countBio, countEarth, countGen][i];
    });

    const monthText = document.getElementById('monthlyReportFilter').options[document.getElementById('monthlyReportFilter').selectedIndex].text;
    const monthEl = document.getElementById('pReportMonthName2');
    if (monthEl) monthEl.innerText = `التقرير الشهري للنشاط المخبري / شهر : ${monthText}`;
}

function populateArchiveFilters() {
    const teacherSel = document.getElementById('filterArchiveTeacher');
    if (teacherSel) {
        const cur = teacherSel.value;
        teacherSel.innerHTML = '<option value="">الكل</option>';
        teachers.forEach(t => teacherSel.appendChild(new Option(t, t)));
        if (cur) teacherSel.value = cur;
    }
    const subjSel = document.getElementById('filterArchiveSubject');
    if (subjSel) {
        const cur = subjSel.value;
        subjSel.innerHTML = '<option value="">الكل</option>';
        Object.keys(customDatabase).forEach(s => subjSel.appendChild(new Option(s, s)));
        if (cur) subjSel.value = cur;
    }
}

// =========================================================
