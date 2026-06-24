// نظام النوافذ المنبثقة — يحل محل alert() و confirm()
// =========================================================

(function() {
    // إنشاء عنصر الـ Modal في DOM
    const overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.innerHTML = `
        <div class="modal-box" id="modalBox">
            <div class="modal-icon" id="modalIcon"></div>
            <div class="modal-title" id="modalTitle"></div>
            <div class="modal-msg"  id="modalMsg"></div>
            <div class="modal-actions" id="modalActions"></div>
        </div>`;
    document.body.appendChild(overlay);

    // إغلاق عند النقر خارج الصندوق
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay && window._modalResolve) {
            window._modalResolve(false);
            _closeModal();
        }
    });

    function _closeModal() {
        overlay.classList.remove('open');
        window._modalResolve = null;
    }

    // أيقونة وكلاس حسب النوع
    const TYPES = {
        error:   { icon: '❌', cls: 'type-error',   title: 'تنبيه' },
        success: { icon: '✅', cls: 'type-success',  title: 'تمّ بنجاح' },
        warning: { icon: '⚠️', cls: 'type-warning',  title: 'انتبه' },
        info:    { icon: 'ℹ️', cls: 'type-info',     title: 'معلومة' },
        confirm: { icon: '❓', cls: 'type-confirm',  title: 'تأكيد' },
    };

    function _detectType(msg) {
        if (/تم|نجاح|إيداع|استيراد|ترحيل|حفظ/.test(msg)) return 'success';
        if (/صلاحية|ليس لديك|مسح|حذف|شطب|تفريغ/.test(msg))  return 'warning';
        if (/خطأ|غير محمل|غير متصل/.test(msg))               return 'error';
        return 'info';
    }

    // showModal — الدالة الأساسية (Promise)
    window.showModal = function({ msg = '', type = null, title = null, confirmText = 'حسناً', cancelText = null }) {
        return new Promise(resolve => {
            const t = TYPES[type || _detectType(msg)];
            const box = document.getElementById('modalBox');
            // إزالة كلاسات النوع القديمة
            box.className = 'modal-box ' + t.cls;
            document.getElementById('modalIcon').textContent  = t.icon;
            document.getElementById('modalTitle').textContent = title || t.title;
            document.getElementById('modalMsg').textContent   = msg;

            const actions = document.getElementById('modalActions');
            actions.innerHTML = '';

            if (cancelText) {
                // زر إلغاء
                const btnCancel = document.createElement('button');
                btnCancel.className = 'modal-btn modal-btn-cancel';
                btnCancel.textContent = cancelText;
                btnCancel.onclick = () => { resolve(false); _closeModal(); };
                actions.appendChild(btnCancel);
            }

            // زر التأكيد
            const btnOk = document.createElement('button');
            const okCls = type === 'confirm' ? 'modal-btn-danger'
                        : type === 'success'  ? 'modal-btn-success'
                        : 'modal-btn-primary';
            btnOk.className = 'modal-btn ' + okCls;
            btnOk.textContent = confirmText;
            btnOk.onclick = () => { resolve(true); _closeModal(); };
            actions.appendChild(btnOk);

            window._modalResolve = resolve;
            overlay.classList.add('open');
            setTimeout(() => btnOk.focus(), 50);
        });
    };

    // استبدال alert() العالمية
    window.alert = function(msg) {
        showModal({ msg: String(msg) });
    };

    // استبدال confirm() بنسخة Async — تُستخدم في الكود بـ await
    // ونحتاج نُغلّف الـ confirm القديمة لأنها synchronous
    window._syncConfirm = window.confirm.bind(window);
    window.showConfirm = function(msg) {
        return showModal({
            msg: String(msg),
            type: 'confirm',
            confirmText: 'نعم، تأكيد',
            cancelText: 'إلغاء'
        });
    };

    // نافذة إدخال نص (تحل محل prompt())
    window.showInputModal = function({ title, label, defaultValue = '' } = {}) {
        return new Promise(resolve => {
            const overlay = document.getElementById('modalOverlay');
            const box = document.getElementById('modalBox');
            box.className = 'modal-box type-info';
            document.getElementById('modalIcon').textContent = '✏️';
            document.getElementById('modalTitle').textContent = title || 'إدخال';
            const msg = document.getElementById('modalMsg');
            msg.innerHTML = '';
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'modalInputField';
            input.value = defaultValue;
            input.style.cssText = 'width:100%; padding:8px 10px; border:2px solid #2980b9; border-radius:6px; font-size:14px; font-family:inherit; margin-top:8px; box-sizing:border-box';
            msg.appendChild(input);
            const actions = document.getElementById('modalActions');
            actions.innerHTML = '';
            const btnCancel = document.createElement('button');
            btnCancel.className = 'modal-btn modal-btn-cancel';
            btnCancel.textContent = 'إلغاء';
            btnCancel.onclick = () => { resolve(null); _closeModal(); };
            actions.appendChild(btnCancel);
            const btnOk = document.createElement('button');
            btnOk.className = 'modal-btn modal-btn-primary';
            btnOk.textContent = 'حفظ';
            btnOk.onclick = () => { resolve(input.value.trim()); _closeModal(); };
            actions.appendChild(btnOk);
            window._modalResolve = resolve;
            overlay.classList.add('open');
            setTimeout(() => { input.focus(); input.select(); }, 50);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') { resolve(input.value.trim()); _closeModal(); }
                if (e.key === 'Escape') { resolve(null); _closeModal(); }
            });
        });
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    // أحداث صفحة الدخول
    document.getElementById('loginPassword').addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
    });

    // حدث تعديل الأدوات
    document.getElementById('toolsDisplay').addEventListener('click', function () {
        const hidden = document.getElementById('toolsUsed');
        hidden.value = this.textContent === 'ستظهر الأدوات تلقائياً عند اختيار التجربة...' ? '' : this.textContent;
        this.style.display = 'none';
        hidden.style.display = 'block';
        hidden.focus();
        hidden.addEventListener('blur', function () {
            const display = document.getElementById('toolsDisplay');
            display.textContent = this.value || 'ستظهر الأدوات تلقائياً عند اختيار التجربة...';
            display.classList.toggle('empty', !this.value);
            display.style.display = 'block';
            this.style.display = 'none';
        }, { once: true });
    });

    // أحداث أزرار المجموعات
    document.querySelectorAll('.tab-group-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const groupId = this.getAttribute('data-group');
            if (groupId) toggleTabGroup(groupId);
        });
    });

    // تحديث تلقائي عند العودة للتبويب (من جهاز آخر)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden || !currentRole || !supabaseConnected) return;
        // حفظ حالة النموذج قبل إعادة التحميل
        const formSnapshot = {};
        ['dateInput','lessonNum','classSelect','divisionSelect','subjectSelect','teacherSelect','toolsUsed','toolsDisplay','damagedTools','expResult','notes','expNum'].forEach(id => {
            const el = document.getElementById(id);
            if (el) formSnapshot[id] = el.value || el.textContent;
        });
        const expSel = document.getElementById('expSelect');
        if (expSel) formSnapshot.expSelectIdx = expSel.selectedIndex;
        loadAllFromSupabase().then(() => {
            initSystemConfiguration();
            loadSchoolMeta();
            renderArchive();
            renderRequestsTable();
            generateMonthlyReportData();
            generateWeeklyPlan();
            if (typeof renderStoreExperiments === 'function') renderStoreExperiments();
            if (typeof renderMaterialsTable === 'function') renderMaterialsTable();
            if (typeof renderSavedTargetsTable === 'function') renderSavedTargetsTable();
            // استرجاع حالة النموذج بعد إعادة التحميل
            Object.keys(formSnapshot).forEach(id => {
                if (id === 'expSelectIdx') { if (expSel) expSel.selectedIndex = formSnapshot[id]; return; }
                const el = document.getElementById(id);
                if (!el) return;
                if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') el.value = formSnapshot[id];
                else el.textContent = formSnapshot[id];
            });
        });
    });
});

