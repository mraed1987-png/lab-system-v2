// الطباعة
// =========================================================

function printFullArchive() {
    if (!currentRole.canPrint) { alert('ليس لديك صلاحية الطباعة.'); return; }
    if (archive.length === 0) { alert('السجل فارغ!'); return; }
    const printTbody = document.getElementById('printTableBody');
    printTbody.innerHTML = archive.map(item => `<tr>
            <td>${item.date}</td><td>${item.expNum}</td><td>${item.lesson}</td>
            <td>${item.clsDiv}</td><td>${item.subj}</td><td>${item.teacher}</td>
            <td style="text-align:right">${item.expName}</td>
            <td style="text-align:right">${item.tools}</td>
            <td>${item.damaged}</td><td>${item.result}</td>
            <td style="min-height:40px"></td><td>${item.notes}</td>
        </tr>`).join('');
    const styleTag = document.createElement('style');
    styleTag.id = 'tempPageOrientation';
    styleTag.innerHTML = '@page { size: A4 landscape !important; margin: 0 !important; }';
    document.head.appendChild(styleTag);
    document.body.className = 'printing-daily';
    window.print();
    setTimeout(() => {
        document.body.className = '';
        const tmp = document.getElementById('tempPageOrientation');
        if (tmp) tmp.remove();
    }, 1500);
}

function printMonthlyReport() {
    if (!currentRole.canPrint) { alert('ليس لديك صلاحية الطباعة.'); return; }
    generateMonthlyReportData();
    const meta = JSON.parse(localStorage.getItem('cfg_school_meta')) || {};
    document.querySelectorAll('.pSchoolNameText2').forEach(el => { if (meta.name) el.textContent = meta.name; });
    document.querySelectorAll('.pSchoolDirText2').forEach(el => { if (meta.dir)  el.textContent = meta.dir; });
    document.querySelectorAll('.classLabTechText').forEach(el => { if (meta.tech) el.textContent = 'الاسم والتوقيع: ' + meta.tech; });
    document.querySelectorAll('.classPrincipalText').forEach(el => { if (meta.principal) el.textContent = meta.principal; });
    const styleTag = document.createElement('style');
    styleTag.id = 'tempPageOrientation';
    styleTag.innerHTML = '@page { size: A4 landscape !important; margin: 0 !important; }';
    document.head.appendChild(styleTag);
    document.body.className = 'printing-monthly';
    window.print();
    setTimeout(() => {
        document.body.className = '';
        const tmp = document.getElementById('tempPageOrientation');
        if (tmp) tmp.remove();
    }, 1500);
}

