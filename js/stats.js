// =========================================================
// إحصائية المختبرات — QF70-2-19Rev.a
// =========================================================

const STAT_MONTHS = [
    { code: '09', label: 'شهر 9'  },
    { code: '10', label: 'شهر 10' },
    { code: '11', label: 'شهر 11' },
    { code: '12', label: 'شهر 12' },
    { code: '02', label: 'شهر 2'  },
    { code: '03', label: 'شهر 3'  },
    { code: '04', label: 'شهر 4'  },
    { code: '05', label: 'شهر 5'  },
];

function saveStatsMeta() {
    const chk = id => document.getElementById(id)?.checked || false;
    const val = id => document.getElementById(id)?.value || '';
    const meta = {
        year: val('statsYear'), period: val('statsPeriod'), stage: val('statsStage'),
        gender: val('statsGender'), totalStudents: val('statsTotalStudents'),
        secStudents: val('statsSecStudents'), basicStudents: val('statsBasicStudents'),
        totalClasses: val('statsTotalClasses'), secClasses: val('statsSecClasses'),
        basicClasses: val('statsBasicClasses'), fromGrade: val('statsFromGrade'),
        toGrade: val('statsToGrade'), buildType: val('statsBuildType'),
        sciPeriods: val('statsSciPeriods'), sciTeachers: val('statsSciTeachers'),
        // قيم المختبر
        qual: val('statsQual'), speciality: val('statsSpeciality'),
        expYears: val('statsExpYears'), labCourse: val('statsLabCourse'),
        workType: val('statsWorkType'),
        // قاعات المختبر
        labTypeShared: chk('labTypeShared'), labTypeClass: chk('labTypeClass'),
        labTypeGen: chk('labTypeGen'), labTypePhys: chk('labTypePhys'),
        labTypeChem: chk('labTypeChem'), labTypeBio: chk('labTypeBio'),
        labTypeNone: chk('labTypeNone'),
        // الأثاث
        tblAvail: val('statsTblAvail'), tblMiss: val('statsTblMiss'),
        chairAvail: val('statsChairAvail'), chairMiss: val('statsChairMiss'),
        cabAvail: val('statsCabAvail'), cabMiss: val('statsCabMiss'),
        equip: val('statsEquip'),
    };
    localStorage.setItem('cfg_stats_meta', JSON.stringify(meta));
    renderStatsPreview();
}

function loadStatsMeta() {
    const meta = JSON.parse(localStorage.getItem('cfg_stats_meta')) || {};
    const set  = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
    const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
    set('statsYear', meta.year); set('statsPeriod', meta.period); set('statsStage', meta.stage);
    set('statsGender', meta.gender); set('statsTotalStudents', meta.totalStudents);
    set('statsSecStudents', meta.secStudents); set('statsBasicStudents', meta.basicStudents);
    set('statsTotalClasses', meta.totalClasses); set('statsSecClasses', meta.secClasses);
    set('statsBasicClasses', meta.basicClasses); set('statsFromGrade', meta.fromGrade);
    set('statsToGrade', meta.toGrade); set('statsBuildType', meta.buildType);
    set('statsSciPeriods', meta.sciPeriods); set('statsSciTeachers', meta.sciTeachers);
    set('statsQual', meta.qual); set('statsSpeciality', meta.speciality);
    set('statsExpYears', meta.expYears); set('statsLabCourse', meta.labCourse);
    set('statsWorkType', meta.workType);
    setChk('labTypeShared', meta.labTypeShared); setChk('labTypeClass', meta.labTypeClass);
    setChk('labTypeGen', meta.labTypeGen); setChk('labTypePhys', meta.labTypePhys);
    setChk('labTypeChem', meta.labTypeChem); setChk('labTypeBio', meta.labTypeBio);
    setChk('labTypeNone', meta.labTypeNone);
    set('statsTblAvail', meta.tblAvail); set('statsTblMiss', meta.tblMiss);
    set('statsChairAvail', meta.chairAvail); set('statsChairMiss', meta.chairMiss);
    set('statsCabAvail', meta.cabAvail); set('statsCabMiss', meta.cabMiss);
    set('statsEquip', meta.equip);
}

function calcMonthlyStats() {
    const counts = {};
    STAT_MONTHS.forEach(m => counts[m.code] = 0);
    archive.forEach(item => {
        const month = item.rawDate ? item.rawDate.split('-')[1] : getMonthFromArabicDate(item.date);
        if (counts.hasOwnProperty(month)) counts[month]++;
    });
    return counts;
}

function renderStatsPreview() {
    const preview = document.getElementById('statsPreview');
    if (!preview) return;
    preview.innerHTML = buildStatsHTML(false);
}

function buildStatsHTML(forPrint) {
    const school = JSON.parse(localStorage.getItem('cfg_school_meta')) || {};
    const m      = JSON.parse(localStorage.getItem('cfg_stats_meta'))  || {};
    const counts = calcMonthlyStats();
    const total  = Object.values(counts).reduce((a, b) => a + b, 0);

    const dash   = '................................';
    const f      = (v) => `<span style="border-bottom:1px solid #555; display:inline-block; min-width:100px; padding:0 4px">${v || dash}</span>`;
    const fNum   = (v) => `( ${v || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'} )`;
    const bord   = 'border:1.5px solid #000;';
    const th     = (txt, w) => `<th style="${bord} padding:7px 4px; background:#eee; text-align:center; width:${w || 'auto'}">${txt}</th>`;
    const td     = (txt, extra) => `<td style="${bord} padding:7px 4px; text-align:center; ${extra || ''}">${txt}</td>`;

    // أنواع قاعات المختبر المختارة
    const labTypes = [
        m.labTypeShared && 'غرفة مشتركة', m.labTypeClass && 'غرفة صفية',
        m.labTypeGen    && 'مختبر علوم عامة', m.labTypePhys && 'مختبر فيزياء',
        m.labTypeChem   && 'مختبر كيمياء', m.labTypeBio  && 'مختبر أحياء',
        m.labTypeNone   && 'غير متوافر',
    ].filter(Boolean).join(' ، ') || dash;

    return `
    <div style="direction:rtl; font-family:'Segoe UI',Tahoma,sans-serif; font-size:11px; line-height:1.6; color:#1a1a1a; padding:0">

        <!-- رأس الصفحة -->
        <div style="text-align:center; margin-bottom:10px; border-bottom:2px solid #1a5276; padding-bottom:8px">
            <div style="font-size:12px; font-weight:bold">بسم الله الرحمن الرحيم</div>
            <div style="font-size:11px; color:#555">وزارة التربية والتعليم — المملكة الأردنية الهاشمية</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px">
                <div style="font-size:11px; font-weight:bold">مديرية التربية والتعليم : ${f(school.dir)}</div>
                <div>
                    <div style="font-size:15px; font-weight:800; color:#1a5276">إحصائية المختبرات المدرسية</div>
                    <div style="font-size:11px">للعام الدراسي ( ${m.year || '&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;'} )</div>
                </div>
                <div style="font-size:11px; font-weight:bold">قسم / مركز مصادر التعلم</div>
            </div>
            <div style="font-size:11px; margin-top:4px">النموذج الخاص بجمع البيانات الإحصائية حول واقع المختبرات المدرسية &nbsp;—&nbsp; <strong>نموذج ( أ )</strong></div>
        </div>

        <!-- بيانات المدرسة -->
        <div style="border:1.5px solid #aaa; border-radius:4px; padding:10px; margin-bottom:8px">
            <div>- اسم المدرسة : ${f(school.name)} &nbsp;&nbsp;&nbsp; - الفترة : <strong>${m.period || dash}</strong></div>
            <div>- المرحلة : <strong>${m.stage || dash}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - الجنس : <strong>${m.gender || dash}</strong></div>
            <div>- عدد الطلبة : الكلي ${fNum(m.totalStudents)} ، ثانوي ${fNum(m.secStudents)} ، أساسي ${fNum(m.basicStudents)}</div>
            <div>- عدد الشعب : الكلي ${fNum(m.totalClasses)} ، ثانوي ${fNum(m.secClasses)} ، أساسي ${fNum(m.basicClasses)}</div>
            <div>- مستوى التعليم في المدرسة : من الصف: ${f(m.fromGrade)} إلى الصف: ${f(m.toGrade)}</div>
            <div>- نوع البناء : <strong>${m.buildType || dash}</strong></div>
            <div>- عدد حصص العلوم: ${fNum(m.sciPeriods)} حصة &nbsp;،&nbsp; عدد معلمي العلوم: ${fNum(m.sciTeachers)} معلم</div>
        </div>

        <!-- بيانات قيم المختبر -->
        <div style="border:1.5px solid #aaa; border-radius:4px; padding:10px; margin-bottom:8px">
            <div style="font-weight:bold; margin-bottom:4px">- اسم قيم المختبر : ${f(school.tech)}</div>
            <div>- المؤهل العلمي : ${f(m.qual)}</div>
            <div>- التخصص : ${f(m.speciality)}</div>
            <div>- سنوات الخبرة في المختبرات : ${f(m.expYears)}</div>
            <div>- حضور دورة المختبرات : <strong>${m.labCourse || dash}</strong></div>
            <div>- نوع العمل في المدرسة : <strong>${m.workType || dash}</strong></div>
        </div>

        <!-- قاعات المختبرات -->
        <div style="border:1.5px solid #aaa; border-radius:4px; padding:10px; margin-bottom:8px">
            <div style="font-weight:bold; margin-bottom:6px">قاعات المختبرات وتجهيزاتها :</div>
            <div>- نوع قاعة المختبر : <strong>${labTypes}</strong></div>
            <div style="margin-top:8px">- الأثاث المخبري :</div>
            <table style="width:100%; border-collapse:collapse; margin-top:4px; font-size:11px">
                <thead><tr>
                    ${th('البيان','20%')}${th('طاولات العمل المخبري')}${th('كراسي ستول')}${th('خزائن مخبرية')}
                </tr></thead>
                <tbody>
                    <tr>${td('<strong>المتوافر</strong>')}${td(m.tblAvail||'—')}${td(m.chairAvail||'—')}${td(m.cabAvail||'—')}</tr>
                    <tr>${td('<strong>النقص</strong>')}${td(m.tblMiss||'—')}${td(m.chairMiss||'—')}${td(m.cabMiss||'—')}</tr>
                </tbody>
            </table>
            <div style="margin-top:8px">- الأجهزة والأدوات المخبرية : <strong>${m.equip || dash}</strong></div>
        </div>

        <!-- جدول عدد التجارب — محسوب تلقائياً -->
        <div style="border:1.5px solid #1a5276; border-radius:4px; padding:10px; margin-bottom:8px; background:${forPrint ? 'white' : '#f8fbff'}">
            <div style="font-weight:800; font-size:13px; margin-bottom:6px; color:#1a5276">
                توظيف المختبر المدرسي — عدد التجارب التي أجريت خلال العام الدراسي :
                <span style="font-size:11px; color:#27ae60; font-weight:normal"> ✅ محسوب تلقائياً من الأرشيف</span>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center">
                <thead>
                    <tr style="background:#34495e; color:white">
                        <th style="${bord} padding:6px; width:9%">الكلي</th>
                        ${STAT_MONTHS.map(mo => `<th style="${bord} padding:6px">تجارب ${mo.label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="${bord} padding:8px; font-weight:800; font-size:15px; color:#1a5276">${total}</td>
                        ${STAT_MONTHS.map(mo => `<td style="${bord} padding:8px; font-weight:bold; color:${counts[mo.code] > 0 ? '#1a5276' : '#aaa'}">${counts[mo.code] > 0 ? counts[mo.code] : '—'}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- التواقيع -->
        <div style="display:flex; justify-content:space-between; margin-top:16px; padding-top:10px; border-top:1.5px solid #aaa; font-size:12px; font-weight:bold">
            <div style="text-align:center">
                <div>توقيع فني المختبر أو المعلم المسؤول</div>
                <div style="margin-top:8px">${f(school.tech)}</div>
                <div style="margin-top:6px">التاريخ :&nbsp;&nbsp;/&nbsp;&nbsp;/</div>
            </div>
            <div style="text-align:center">
                <div>اسم وتوقيع مدير المدرسة</div>
                <div style="margin-top:8px">${f(school.principal)}</div>
                <div style="margin-top:6px">الخاتم الرسمي</div>
            </div>
        </div>
        <div style="text-align:left; font-size:10px; font-family:monospace; margin-top:8px; color:#888">Form # QF70-2-19Rev.a</div>
    </div>`;
}

function printStatsForm() {
    if (!currentRole.canPrint) { alert('ليس لديك صلاحية الطباعة.'); return; }
    const printArea = document.getElementById('printStatsArea');
    printArea.innerHTML = buildStatsHTML(true);

    // حقن @page عمودي مؤقت يتغلب على أي قاعدة أخرى
    const styleTag = document.createElement('style');
    styleTag.id = 'tempPageStyle';
    styleTag.innerHTML = '@page { size: A4 portrait !important; margin: 0 !important; }';
    document.head.appendChild(styleTag);

    document.body.className = 'printing-stats';
    window.print();
    setTimeout(() => {
        document.body.className = '';
        printArea.innerHTML = '';
        const tmp = document.getElementById('tempPageStyle');
        if (tmp) tmp.remove();
    }, 1500);
}

// =========================================================
