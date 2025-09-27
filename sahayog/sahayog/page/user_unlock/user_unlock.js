
frappe.pages['user-unlock'].on_page_load = function(wrapper) {
    frappe.call({
        method: 'sahayog.api.user_unlock.check_user_access',
        callback: function(r) {
            if (r.message?.allowed) {
                loadUserUnlockPage(wrapper);
            } else {
                frappe.msgprint(__('You do not have access to this page.'));
                $(wrapper).empty();
            }
        },
        error: () => {
            frappe.msgprint(__('Error checking access permissions.'));
            $(wrapper).empty();
        }
    });

    function loadUserUnlockPage(wrapper) {
        const page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'User Account Unlock',
            single_column: true
        });

        $(page.body).html(`
            <style>
                body { background: #f4f8f9; }
                .unlock-container {
                    max-width: 560px;
                    margin: 32px auto;
                    padding: 28px 24px;
                    background: #fff;
                    border-radius: 14px;
                    box-shadow: 0 6px 24px rgba(0,0,0,0.07);
                    border: 1px solid #e2e8f0;
                }
                .unlock-header { text-align:center; margin-bottom:24px; }
                .unlock-title { font-size:22px; font-weight:700; color:#016767; margin:6px 0 0; }
                .unlock-sub { color:#6b7280; margin-top:4px; font-size:13px; }
                .input-label { font-weight:600; margin:12px 0 8px; display:block; color:#374151; font-size:14px; }
                .form-control {
                    width:100%; padding:12px 14px; border-radius:10px;
                    border:1px solid #cbd5e1; font-size:14px; transition:.2s;
                }
                .form-control:focus {
                    border-color:#016767; box-shadow:0 0 0 3px rgba(1,103,103,0.15);
                }
                .row { display:flex; gap:14px; margin-top:16px; justify-content:space-between; }
                .flex-1 { flex:1; }
                .btn-primary {
                    padding:11px 16px; border-radius:10px; border:none;
                    background:linear-gradient(135deg,#018080,#016767);
                    color:#fff; font-weight:600; cursor:pointer; min-width:150px;
                    transition:.2s; box-shadow:0 3px 10px rgba(1,103,103,0.2);
                }
                .btn-primary:hover:not(:disabled) {
                    background:linear-gradient(135deg,#016767,#014d4d);
                    transform:translateY(-1px);
                    box-shadow:0 4px 12px rgba(1,103,103,0.3);
                }
                .btn-primary:disabled { opacity:0.6; cursor:not-allowed; box-shadow:none; }
                .instructions {
                    margin-top:20px; background:#f0fdfa; padding:14px 16px;
                    border-radius:10px; font-size:13px; color:#065f46; border:1px solid #99f6e4;
                }
                .result {
                    margin-top:16px; display:none; padding:12px; border-radius:10px;
                    font-weight:600; text-align:center; font-size:14px;
                }
                .result.success { background:#dcfce7; color:#065f46; border:1px solid #bbf7d0; }
                .result.error { background:#fee2e2; color:#7f1d1d; border:1px solid #fecaca; }
            </style>

            <div class="unlock-container">
                <div class="unlock-header">
                    <img src="/assets/sahayog/images/sahayog_logo_2025.png" 
                         alt="Logo" style="width:190px;height:44px;margin-bottom:10px;
                         border-radius:12px;box-shadow:0 3px 12px rgba(0,0,0,0.1);"/>
                    <div class="unlock-title">Unlock Finacle User ID</div>
                    <div class="unlock-sub">Branch Manager / Branch Operation Manager access required</div>
                </div>

                <label class="input-label" for="user-id">Enter User ID.</label>
                <input type="text" id="user-id" class="form-control" placeholder="Type here..." maxlength="30" />

                <div class="row">
                    <div class="flex-1"><button id="check-btn" class="btn-primary">Check Lock</button></div>
                    <div><button id="unlock-btn" class="btn-primary" disabled>Unlock</button></div>
                </div>

                <div id="result" class="result"></div>

<div class="instructions">
    <strong>How to use</strong>
    <ul class="steps">
        <li><span class="step-label">Step 1:</span> Enter <b>Finacle User ID</b>.</li>
        <li><span class="step-label">Step 2:</span> Click <b>Check Lock</b> to verify status.</li>
        <li><span class="step-label">Step 3:</span> If locked, click <b>Unlock</b> to reset.</li>
    </ul>
</div>
            </div>
        `);

        // cache selectors
        const $input = $('#user-id'),
              $checkBtn = $('#check-btn'),
              $unlockBtn = $('#unlock-btn'),
              $result = $('#result');

        // helpers
        const toggleBtn = ($btn, state, text) => {
            $btn.prop('disabled', state).text(text);
        };
        const showResult = (msg, type) => {
            $result.removeClass('success error').addClass(type).text(msg).fadeIn();
            setTimeout(() => $result.fadeOut(300), 5000);
        };

        // input listener
        $input.on('input', () => $unlockBtn.prop('disabled', !$input.val().trim()));

        // check lock
        $checkBtn.on('click', () => {
            const val = $input.val().trim();
            if (!val) return showResult('Please enter Account Number or User ID', 'error');

            const args = val.includes('@') ? { user_id: val } : { account_number: val };
            toggleBtn($checkBtn, true, 'Checking...');

            frappe.call({
                method: 'sahayog.api.user_unlock.get_locked_flg',
                args,
                callback: (r) => {
                    toggleBtn($checkBtn, false, 'Check Lock');
                    if (r.message?.status === 'success') {
                        if (r.message.locked) {
                            showResult(`🔒 "${val}" is locked. You can unlock it.`, 'success');
                            $unlockBtn.prop('disabled', false);
                        } else {
                            showResult(`✅ "${val}" is not locked.`, 'success');
                            $unlockBtn.prop('disabled', true);
                        }
                    } else {
                        showResult(`❌ ${r.message?.message || 'Error checking lock'}`, 'error');
                    }
                },
                error: (xhr) => {
                    toggleBtn($checkBtn, false, 'Check Lock');
                    showResult(`❌ ${xhr?.responseJSON?._error_message || 'Network error checking lock'}`, 'error');
                }
            });
        });

        // unlock
        $unlockBtn.on('click', () => {
            const val = $input.val().trim();
            if (!val) return showResult('Please enter Account Number or User ID', 'error');

            const args = val.includes('@') ? { user_id: val } : { account_number: val };
            toggleBtn($unlockBtn, true, 'Unlocking...');

            frappe.call({
                method: 'sahayog.api.user_unlock.unlock_user',
                args,
                callback: (r) => {
                    toggleBtn($unlockBtn, false, 'Unlock');
                    if (r.message?.status === 'success') {
                        showResult(`✅ ${r.message.message}`, 'success');
                        $input.val('');
                        $unlockBtn.prop('disabled', true);
                    } else {
                        showResult(`❌ ${r.message?.message || 'Error unlocking user'}`, 'error');
                    }
                },
                error: (xhr) => {
                    toggleBtn($unlockBtn, false, 'Unlock');
                    showResult(`❌ ${xhr?.responseJSON?._error_message || 'Network error unlocking'}`, 'error');
                }
            });
        });

        // Enter key press
        $input.on('keypress', (e) => e.which === 13 && $checkBtn.click());

        // focus on load
        setTimeout(() => $input.focus(), 120);
    }
};

