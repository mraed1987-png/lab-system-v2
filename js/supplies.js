// سجل اللوازم المخبرية
// =========================================================

let materials    = JSON.parse(localStorage.getItem('labMaterials'))     || [];
let transactions = JSON.parse(localStorage.getItem('labTransactions'))  || {};
let currentMatId = null;

// ---- قائمة المواد ----

function showAddMaterialForm(matId) {
    const form = document.getElementById('materialFormCard');
    const title = document.getElementById('materialFormTitle');
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });

    if (matId) {
        const mat = materials.find(m => m.id === matId);
        if (!mat) return;
        title.innerText = '✏️ تعديل بيانات المادة';
        document.getElementById('matCode').value     = mat.code;
        document.getElementById('matName').value     = mat.name;
        document.getElementById('matUnit').value     = mat.unit;
        document.getElementById('matPrice').value    = mat.price || '';
        document.getElementById('matMaxLimit').value = mat.maxLimit || '';
        document.getElementById('matMinLimit').value = mat.minLimit || '';
        form.dataset.editId = matId;
    } else {
        title.innerText = '➕ إضافة مادة جديدة';
        ['matCode','matName','matUnit','matPrice','matMaxLimit','matMinLimit']
            .forEach(id => { document.getElementById(id).value = ''; });
        delete form.dataset.editId;
    }
}

function hideMaterialForm() {
    document.getElementById('materialFormCard').style.display = 'none';
}

function saveMaterial() {
    const code     = document.getElementById('matCode').value.trim();
    const name     = document.getElementById('matName').value.trim();
    const unit     = document.getElementById('matUnit').value.trim();
    const price    = parseFloat(document.getElementById('matPrice').value)    || 0;
    const maxLimit = parseFloat(document.getElementById('matMaxLimit').value) || 0;
    const minLimit = parseFloat(document.getElementById('matMinLimit').value) || 0;

    if (!code || !name || !unit) { alert('الرجاء تعبئة الرقم الرمزي واسم المادة والوحدة.'); return; }

    const form   = document.getElementById('materialFormCard');
    const editId = form.dataset.editId;

    if (editId) {
        const mat = materials.find(m => m.id === editId);
        if (mat) { mat.code = code; mat.name = name; mat.unit = unit; mat.price = price; mat.maxLimit = maxLimit; mat.minLimit = minLimit; }
    } else {
        materials.push({ id: Date.now().toString(), code, name, unit, price, maxLimit, minLimit });
    }

    localStorage.setItem('labMaterials', JSON.stringify(materials));
    hideMaterialForm();
    renderMaterialsTable();
}

async function deleteMaterial(matId) {
    if (!await showConfirm('هل تريد حذف هذه المادة وكل حركاتها؟')) return;
    materials = materials.filter(m => m.id !== matId);
    delete transactions[matId];
    localStorage.setItem('labMaterials',    JSON.stringify(materials));
    localStorage.setItem('labTransactions', JSON.stringify(transactions));
    renderMaterialsTable();
}

function getBalance(matId) {
    const txns = transactions[matId] || [];
    return txns.reduce((sum, t) => t.type === 'in' ? sum + t.qty : sum - t.qty, 0);
}

function renderMaterialsTable() {
    const tbody = document.getElementById('materialsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (materials.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="color:#7f8c8d; font-style:italic; padding:20px">لا توجد مواد مسجلة بعد. اضغط "إضافة مادة جديدة".</td></tr>`;
        return;
    }

    tbody.innerHTML = materials.map(mat => {
        const balance = getBalance(mat.id);
        const isLow   = mat.minLimit > 0 && balance <= mat.minLimit;
        const isHigh  = mat.maxLimit > 0 && balance >= mat.maxLimit;
        const statusBadge = isLow
            ? `<span style="background:#fdecea; color:#c0392b; padding:3px 8px; border-radius:10px; font-size:11px; font-weight:bold">⚠️ رصيد منخفض</span>`
            : isHigh
            ? `<span style="background:#eaf9ea; color:#27ae60; padding:3px 8px; border-radius:10px; font-size:11px; font-weight:bold">✅ رصيد مرتفع</span>`
            : `<span style="background:#eaf4fb; color:#2980b9; padding:3px 8px; border-radius:10px; font-size:11px; font-weight:bold">🔵 طبيعي</span>`;

        return `<tr style="${isLow ? 'background:#fff5f5' : ''}">
                <td style="font-weight:bold; color:#1a5276">${mat.code}</td>
                <td style="text-align:right; font-weight:bold">${mat.name}</td>
                <td>${mat.unit}</td>
                <td>${mat.price > 0 ? mat.price.toFixed(3) : '—'}</td>
                <td style="font-weight:800; font-size:15px; color:${isLow ? '#e74c3c' : '#1a5276'}">${balance}</td>
                <td>${mat.maxLimit || '—'}</td>
                <td>${mat.minLimit || '—'}</td>
                <td>${statusBadge}</td>
                <td style="white-space:nowrap">
                    <button class="btn-convert" onclick="openMaterialDetail('${mat.id}')" title="فتح صفحة المادة">📋 فتح</button>
                    &nbsp;
                    <button class="btn-edit-row" onclick="showAddMaterialForm('${mat.id}')" title="تعديل">✏️</button>
                    &nbsp;
                    <button class="btn-delete-row" onclick="deleteMaterial('${mat.id}')" title="حذف">❌</button>
                </td>
            </tr>`;
    }).join('');
    });
}

// ---- صفحة المادة المستقلة ----

function openMaterialDetail(matId) {
    currentMatId = matId;
    const mat    = materials.find(m => m.id === matId);
    if (!mat) return;

    document.getElementById('suppliesListView').style.display    = 'none';
    document.getElementById('materialDetailView').style.display  = 'block';

    document.getElementById('detailMatName').innerText  = mat.name;
    document.getElementById('detailMatCode').innerText  = 'الرقم الرمزي: ' + mat.code;
    document.getElementById('detailMatUnit').innerText  = mat.unit;
    document.getElementById('detailMatPrice').innerText = mat.price > 0 ? mat.price.toFixed(3) + ' د.أ' : '—';
    document.getElementById('detailMatMax').innerText   = mat.maxLimit || '—';
    document.getElementById('detailMatMin').innerText   = mat.minLimit || '—';

    // تاريخ اليوم افتراضياً
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('txnDate').value = today;

    renderTransactionsTable(matId);
    updateDetailBalance(matId);
}

function backToSuppliesList() {
    currentMatId = null;
    document.getElementById('suppliesListView').style.display   = 'block';
    document.getElementById('materialDetailView').style.display = 'none';
    renderMaterialsTable();
}

function toggleTxnFields() {
    const type  = document.getElementById('txnType').value;
    const label = document.getElementById('txnPartyLabel');
    label.innerText = type === 'in' ? 'الجهة المسلِمة' : 'الجهة المستلِمة';
}

function saveTransaction() {
    const date  = document.getElementById('txnDate').value;
    const type  = document.getElementById('txnType').value;
    const qty   = parseFloat(document.getElementById('txnQty').value);
    const party = document.getElementById('txnParty').value.trim();
    const doc   = document.getElementById('txnDoc').value.trim();
    const notes = document.getElementById('txnNotes').value.trim();

    if (!date || !qty || qty <= 0) { alert('الرجاء إدخال التاريخ والكمية.'); return; }

    // التحقق من الرصيد عند الصرف
    if (type === 'out') {
        const bal = getBalance(currentMatId);
        if (qty > bal) { alert(`⚠️ الكمية المصروفة (${qty}) أكبر من الرصيد الحالي (${bal})`); return; }
    }

    if (!transactions[currentMatId]) transactions[currentMatId] = [];
    transactions[currentMatId].push({ id: Date.now().toString(), date, type, qty, party, doc, notes });

    // ترتيب بالتاريخ
    transactions[currentMatId].sort((a, b) => a.date.localeCompare(b.date));

    localStorage.setItem('labTransactions', JSON.stringify(transactions));
    renderTransactionsTable(currentMatId);
    updateDetailBalance(currentMatId);

    // تصفير الحقول
    ['txnQty','txnParty','txnDoc','txnNotes'].forEach(id => { document.getElementById(id).value = ''; });
}

async function deleteTransaction(matId, txnId) {
    if (!await showConfirm('حذف هذه الحركة؟')) return;
    transactions[matId] = (transactions[matId] || []).filter(t => t.id !== txnId);
    localStorage.setItem('labTransactions', JSON.stringify(transactions));
    renderTransactionsTable(matId);
    updateDetailBalance(matId);
}

function updateDetailBalance(matId) {
    const bal = getBalance(matId);
    const mat = materials.find(m => m.id === matId);
    const el  = document.getElementById('detailMatBalance');
    if (!el) return;
    const isLow = mat && mat.minLimit > 0 && bal <= mat.minLimit;
    el.innerText = bal;
    el.style.color = isLow ? '#e74c3c' : '#1a5276';
}

function renderTransactionsTable(matId) {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    const txns = transactions[matId] || [];
    tbody.innerHTML = '';

    if (txns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:#7f8c8d; font-style:italic; padding:20px">لا توجد حركات مسجلة لهذه المادة.</td></tr>`;
        return;
    }

    let runningBalance = 0;
    txns.forEach(t => {
        runningBalance += t.type === 'in' ? t.qty : -t.qty;
        const isIn = t.type === 'in';
        tbody.innerHTML += `
            <tr>
                <td>${t.date}</td>
                <td>${t.doc || '—'}</td>
                <td style="text-align:right">${t.party || '—'}</td>
                <td style="color:#27ae60; font-weight:bold">${isIn  ? t.qty : '—'}</td>
                <td style="color:#e74c3c; font-weight:bold">${!isIn ? t.qty : '—'}</td>
                <td style="font-weight:800; color:#1a5276">${runningBalance}</td>
                <td style="font-size:11px">${t.notes || '—'}</td>
                <td><button class="btn-delete-row" onclick="deleteTransaction('${matId}','${t.id}')">❌</button></td>
            </tr>`;
    });

    // صف الرصيد الأخير
    tbody.innerHTML += `
        <tr style="background:#eaf4fb; font-weight:bold">
            <td colspan="5" style="text-align:center; font-weight:bold">الرصيد</td>
            <td style="font-weight:800; font-size:16px; color:#1a5276">${runningBalance}</td>
            <td colspan="2"></td>
        </tr>`;
}

// ---- طباعة صفحة المادة ----

function printMaterialPage() {
    const mat   = materials.find(m => m.id === currentMatId);
    if (!mat) return;
    const txns  = transactions[currentMatId] || [];
    const school = JSON.parse(localStorage.getItem('cfg_school_meta')) || {};

    let runBal = 0;
    const rows = txns.map(t => {
        runBal += t.type === 'in' ? t.qty : -t.qty;
        return `<tr>
            <td>${t.date}</td>
            <td>${t.doc || ''}</td>
            <td>${t.party || ''}</td>
            <td>${t.type === 'in'  ? t.qty : ''}</td>
            <td>${t.type === 'out' ? t.qty : ''}</td>
            <td><strong>${runBal}</strong></td>
        </tr>`;
    }).join('');

    // إضافة صفوف فارغة لملء الصفحة
    const emptyRows = Math.max(0, 25 - txns.length);
    const blankRows = Array(emptyRows).fill('<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>').join('');

    const html = `
    <div dir="rtl" style="direction:rtl; font-family:'Segoe UI',Tahoma,sans-serif; font-size:12px; padding:0.5cm">
        <!-- رأس الصفحة -->
        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px">
            <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <div>
                    <table dir="rtl" style="border-collapse:collapse">
                        <tr><td style="border:1px solid #000; padding:3px 8px; text-align:right">الحد الأعلى</td><td style="border:1px solid #000; padding:3px 12px">${mat.maxLimit || ''}</td></tr>
                        <tr><td style="border:1px solid #000; padding:3px 8px; text-align:right">الحد الأدنى</td><td style="border:1px solid #000; padding:3px 12px">${mat.minLimit || ''}</td></tr>
                    </table>
                </div>
                <div style="text-align:center">
                    <div style="font-size:22px; font-weight:800; margin-bottom:6px">سجـــل اللـوازم</div>
                    <div style="font-size:11px">${school.name || ''}</div>
                </div>
                <div style="font-size:11px; text-align:right">س م (٤٧)</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px">
                <div>الرقم الرمزي : ${mat.code}</div>
                <div>السعر : ${mat.price > 0 ? mat.price.toFixed(3) : '............'}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px">
                <div>اسم الماده ومواصفاتها : ${mat.name}</div>
                <div>الوحده : ${mat.unit}</div>
            </div>
        </div>

        <!-- الجدول -->
        <table dir="rtl" style="width:100%; border-collapse:collapse; font-size:11px; text-align:center">
            <thead>
                <tr>
                    <th rowspan="2" style="border:1.5px solid #000; padding:6px; width:12%">التاريخ</th>
                    <th rowspan="2" style="border:1.5px solid #000; padding:6px; width:14%">رقم مستند<br>الادخالات<br>او<br>الاخراجات</th>
                    <th rowspan="2" style="border:1.5px solid #000; padding:6px; width:25%">الجهة المسلمه<br>او<br>الجهة المستلمه</th>
                    <th colspan="3" style="border:1.5px solid #000; padding:6px">الكميات</th>
                </tr>
                <tr>
                    <th style="border:1.5px solid #000; padding:5px; width:16%">المستلمه</th>
                    <th style="border:1.5px solid #000; padding:5px; width:16%">المصروفة</th>
                    <th style="border:1.5px solid #000; padding:5px; width:17%">الرصيد</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
                ${blankRows}
                <tr style="font-weight:bold">
                    <td colspan="3" style="border:1.5px solid #000; padding:6px; text-align:center">الرصيد</td>
                    <td style="border:1.5px solid #000; padding:6px"></td>
                    <td style="border:1.5px solid #000; padding:6px"></td>
                    <td style="border:1.5px solid #000; padding:6px; font-weight:800">${runBal}</td>
                </tr>
            </tbody>
        </table>
    </div>`;

    const printArea = document.getElementById('printMaterialArea');
    printArea.innerHTML = html;

    const styleTag = document.createElement('style');
    styleTag.id = 'tempPageStyle';
    styleTag.innerHTML = '@page { size: A4 portrait !important; margin: 0 !important; }';
    document.head.appendChild(styleTag);

    document.body.className = 'printing-material';
    window.print();
    setTimeout(() => {
        document.body.className = '';
        printArea.innerHTML = '';
        const tmp = document.getElementById('tempPageStyle');
        if (tmp) tmp.remove();
    }, 1500);
}

// =========================================================
