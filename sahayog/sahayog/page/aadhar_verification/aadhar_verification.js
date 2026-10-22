// Aadhaar Verification page (Sahayog)
const AV_ENFORCE_CHECKSUM = true;     // mock mode testing me false karo
const AV_IDLE_MS = 2 * 60 * 1000;     // 2 min inactivity par Aadhaar number clear
const AV_HISTORY_MAX = 5;             // aaj ki recent verifications

frappe.pages["aadhar-verification"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("FIN Verify"),
        single_column: true,
    });

    frappe.call({
        method: "sahayog.sahayog.page.aadhar_verification.aadhar_verification.can_access",
        callback(r) {
            if (!r.message) return av_render_denied(page);
            av_render_home(page);
        },
    });
};

/* ---------------- helpers ---------------- */

const AV_D = [
    [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
];
const AV_P = [
    [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];

function av_verhoeff(num) {
    let c = 0;
    const digits = num.split("").reverse().map(Number);
    for (let i = 0; i < digits.length; i++) c = AV_D[c][AV_P[i % 8][digits[i]]];
    return c === 0;
}

function av_format(digits) {
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function av_render_denied(page) {
    page.clear_primary_action();
    page.clear_inner_toolbar();
    page.main.html(`
        <div style="padding:48px 16px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🔒</div>
            <h4>${__("Not Permitted")}</h4>
            <p class="text-muted">${__("You are not permitted to use Aadhaar Verification.")}</p>
        </div>`);
}

const AV_SVG = (inner, s = 18, sw = 2) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const AV_ICON = {
    shield: (s) => AV_SVG('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path>', s),
    lock: (s) => AV_SVG('<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>', s),
    tick: (s) => AV_SVG('<polyline points="20 6 9 17 4 12"></polyline>', s, 3),
    cross: (s) => AV_SVG('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>', s, 3),
    info: (s) => AV_SVG('<line x1="12" y1="8" x2="12" y2="13"></line><circle cx="12" cy="17" r="0.5"></circle>', s, 3),
    eye: (s) => AV_SVG('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>', s),
    eyeoff: (s) => AV_SVG('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>', s),
};

/* ---------------- main ---------------- */

function av_render_form(page) {
    const rand = Math.random().toString(36).slice(2, 8);

    page.add_inner_button(__("Refresh"), () => reset_all());
    if (frappe.user.has_role("System Manager")) {
        page.add_inner_button(__("View Logs"), () => frappe.set_route("List", "Aadhaar Verification Log"));
    }

    page.main.html(`
    <div class="av-root">
        <style>
            .av-root {
                --fs-xs: 12px; --fs-sm: 13px; --fs-md: 14px; --fs-lg: 16px; --fs-xl: 18px;
                --av-line: var(--border-color, #e5e7eb);
                font-size: var(--fs-md); line-height: 1.5; padding-bottom: 32px;
            }

            /* top strip */
            .av-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 4px 24px 14px; border-bottom: 1px solid var(--av-line); }
            .av-steps { display: flex; align-items: center; gap: 10px; flex: 1; max-width: 560px; }
            .av-step { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: var(--fs-sm); font-weight: 500; white-space: nowrap; }
            .av-step .n { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--fs-xs); font-weight: 700; background: var(--control-bg, #f3f4f6); color: var(--text-muted); border: 1.5px solid transparent; transition: all .2s; }
            .av-step.active { color: var(--text-color); }
            .av-step.active .n { background: var(--card-bg, #fff); border-color: var(--primary-color, #171717); color: var(--text-color); }
            .av-step.done { color: var(--green-600, #16a34a); }
            .av-step.done .n { background: var(--green-500, #22c55e); color: #fff; }
            .av-step-line { flex: 1; height: 2px; background: var(--av-line); border-radius: 2px; min-width: 20px; }
            .av-step-line.done { background: var(--green-500, #22c55e); }
            .av-secure-tag { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); color: var(--text-muted); white-space: nowrap; }
            .av-secure-tag i { width: 8px; height: 8px; border-radius: 50%; background: var(--green-500, #22c55e); display: inline-block; }

            /* split */
            .av-split { display: grid; grid-template-columns: minmax(340px, 440px) minmax(0, 1fr); align-items: start; }
            .av-left { padding: 22px 28px 24px 24px; }
            .av-right { padding: 22px 24px 24px 28px; border-left: 1px solid var(--av-line); min-height: 400px; }

            .av-head { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
            .av-head-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--bg-green, #e6f4ea); color: var(--green-600, #15803d); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .av-head h4 { margin: 0; font-weight: 600; font-size: var(--fs-xl); }
            .av-head p { margin: 2px 0 0; color: var(--text-muted); font-size: var(--fs-sm); }

            /* form */
            .av-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
            .av-label { display: block; font-size: var(--fs-sm); color: var(--text-color); font-weight: 500; margin-bottom: 6px; }
            .av-req { color: var(--red-500, #ef4444); }
            .av-field { position: relative; }
            .av-input { width: 100%; height: 42px; padding: 0 42px 0 14px; border: 1.5px solid transparent; border-radius: 8px; background: var(--control-bg, #f3f4f6); color: var(--text-color); font-size: var(--fs-md); outline: none; transition: all .15s; }
            .av-input:focus { background: var(--card-bg, #fff); border-color: var(--primary-color, #171717); box-shadow: 0 0 0 3px rgba(0,0,0,.06); }
            .av-input:disabled { opacity: .7; cursor: not-allowed; }
            .av-input.is-invalid { border-color: var(--red-500, #ef4444); background: var(--bg-red, #fef2f2); }
            .av-input.is-valid { border-color: var(--green-500, #22c55e); }
            .av-aadhaar { letter-spacing: 2px; font-variant-numeric: tabular-nums; -webkit-text-security: disc; }
            .av-aadhaar.show-text { -webkit-text-security: none; }
            .av-field-icon { position: absolute; right: 12px; top: 0; height: 42px; display: flex; align-items: center; gap: 6px; color: var(--text-muted); }
            .av-eye { cursor: pointer; display: flex; align-items: center; background: none; border: 0; padding: 2px; color: inherit; }
            .av-eye:hover { color: var(--text-color); }
            .av-tick { display: none; color: var(--green-500, #22c55e); }
            .av-field.ok .av-tick { display: flex; }
            .av-meta { display: flex; justify-content: space-between; gap: 8px; margin-top: 6px; min-height: 18px; font-size: var(--fs-xs); }
            .av-help { color: var(--text-muted); }
            .av-error { color: var(--red-500, #ef4444); display: none; }
            .av-field-wrap.err .av-error { display: block; }
            .av-field-wrap.err .av-help { display: none; }
            .av-count { color: var(--text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
            .av-btn { width: 100%; height: 44px; padding: 0 24px; border: 0; border-radius: 8px; background: var(--primary-color, #171717); color: #fff; font-weight: 600; font-size: var(--fs-md); display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all .15s; white-space: nowrap; }
            .av-btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
            .av-btn:disabled { opacity: .4; cursor: not-allowed; }
            .av-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: av-spin .7s linear infinite; display: none; }
            .av-btn.loading .av-spinner { display: inline-block; }
            @keyframes av-spin { to { transform: rotate(360deg); } }

            .av-guide { margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--av-line); }
            .av-guide h6 { margin: 0 0 10px; font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: .7px; color: var(--text-muted); font-weight: 600; }
            .av-guide ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
            .av-guide li { display: flex; gap: 8px; font-size: var(--fs-sm); color: var(--text-muted); }
            .av-guide li::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--text-muted); margin-top: 8px; flex-shrink: 0; opacity: .6; }
            .av-secure { margin-top: 20px; display: flex; align-items: center; gap: 8px; font-size: var(--fs-xs); color: var(--text-muted); }

            /* right: result */
            .av-rtitle { display: flex; align-items: center; justify-content: space-between; margin: 0 0 16px; }
            .av-rtitle h5 { margin: 0; font-weight: 600; font-size: var(--fs-lg); }
            .av-live { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); color: var(--text-muted); font-weight: 500; }
            .av-live i { width: 8px; height: 8px; border-radius: 50%; background: var(--gray-400, #9ca3af); display: inline-block; }
            .av-live.busy i { background: var(--blue-500, #3b82f6); animation: av-pulse 1s ease infinite; }
            .av-live.ok i { background: var(--green-500, #22c55e); }
            .av-live.warn i { background: var(--orange-500, #f97316); }
            .av-live.bad i { background: var(--red-500, #ef4444); }
            @keyframes av-pulse { 50% { opacity: .3; } }

            .av-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; padding: 70px 12px; color: var(--text-muted); font-size: var(--fs-sm); }
            .av-empty .eico { width: 52px; height: 52px; border-radius: 50%; background: var(--control-bg, #f3f4f6); display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
            .av-empty b { color: var(--text-color); font-size: var(--fs-md); }
            .av-skel { height: 56px; border-radius: 10px; background: linear-gradient(90deg, var(--control-bg,#f3f4f6) 25%, rgba(0,0,0,.05) 37%, var(--control-bg,#f3f4f6) 63%); background-size: 400% 100%; animation: av-shimmer 1.3s ease infinite; }
            @keyframes av-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
            .av-loadtxt { display: flex; align-items: center; gap: 10px; font-size: var(--fs-sm); color: var(--text-muted); margin-bottom: 14px; }
            .av-loadtxt .av-spinner { display: inline-block; border-color: rgba(0,0,0,.15); border-top-color: var(--text-color); }

            .av-rhead { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 10px; }
            .av-rhead.ok { background: var(--bg-green, #e6f4ea); color: var(--green-700, #166534); }
            .av-rhead.warn { background: var(--bg-orange, #fff7ed); color: var(--orange-700, #9a3412); }
            .av-rhead.bad { background: var(--bg-red, #fef2f2); color: var(--red-700, #991b1b); }
            .av-rhead .ico { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
            .av-rhead.ok .ico { background: var(--green-500, #22c55e); }
            .av-rhead.warn .ico { background: var(--orange-500, #f97316); }
            .av-rhead.bad .ico { background: var(--red-500, #ef4444); }
            .av-rhead h5 { margin: 0; font-size: var(--fs-lg); font-weight: 700; }
            .av-rhead p { margin: 0; font-size: var(--fs-sm); opacity: .85; }
            .av-badge { margin-left: auto; font-size: var(--fs-xs); font-weight: 700; letter-spacing: .6px; padding: 3px 10px; border-radius: 20px; background: rgba(0,0,0,.08); white-space: nowrap; }
            .av-badge.test { background: #fef3c7; color: #92400e; }

            .av-rbody { display: grid; grid-template-columns: 1fr; margin-top: 4px; }
            .av-rsec { padding: 20px 0 8px; }
            .av-rsec:first-child { padding-right: 0; }
            .av-rsec + .av-rsec { padding-left: 24px; border-left: 1px solid var(--av-line); }
            .av-rsec h6 { margin: 0 0 14px; font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: .7px; color: var(--text-muted); font-weight: 600; }
            .av-kv { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 20px; }
            .av-kv .k { font-size: var(--fs-xs); color: var(--text-muted); margin-bottom: 2px; }
            .av-kv .v { font-size: var(--fs-md); font-weight: 600; word-break: break-word; }
            .av-mono { font-variant-numeric: tabular-nums; letter-spacing: 1px; }

            .av-checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
            .av-checks li { position: relative; display: flex; align-items: flex-start; gap: 10px; padding-bottom: 18px; font-size: var(--fs-sm); }
            .av-checks li:last-child { padding-bottom: 0; }
            .av-checks li:not(:last-child)::before { content: ''; position: absolute; left: 10px; top: 24px; bottom: 2px; width: 2px; background: var(--green-500, #22c55e); opacity: .45; border-radius: 2px; }
            .av-checks li.fail-line:not(:last-child)::before { background: var(--orange-500, #f97316); }
            .av-checks .dot { position: relative; z-index: 1; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
            .av-checks .dot.pass { background: var(--green-500, #22c55e); }
            .av-checks .dot.fail { background: var(--orange-500, #f97316); }
            .av-checks small { display: block; color: var(--text-muted); font-size: var(--fs-xs); margin-top: 1px; }

            .av-rfoot { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 20px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--av-line); font-size: var(--fs-xs); color: var(--text-muted); }
            .av-note { flex: 1 1 260px; min-width: 220px; line-height: 1.5; }
            .av-actions { margin-left: auto; display: flex; gap: 8px; }
            .av-abtn { height: 34px; padding: 0 14px; border-radius: 6px; border: 1px solid var(--border-color, #d1d5db); background: var(--card-bg, #fff); color: var(--text-color); font-size: var(--fs-sm); font-weight: 500; cursor: pointer; transition: all .15s; }
            .av-abtn:hover { background: var(--control-bg, #f3f4f6); }
            .av-abtn.primary { background: var(--primary-color, #171717); color: #fff; border-color: transparent; }
            .av-abtn.primary:hover { opacity: .88; }

            /* history */
            .av-hist-wrap { border-top: 1px solid var(--av-line); padding: 18px 24px 0; }
            .av-hist-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
            .av-hist-head h5 { margin: 0; font-weight: 600; font-size: var(--fs-lg); }
            .av-hist-head h5 span { font-weight: 400; font-size: var(--fs-xs); color: var(--text-muted); }
            .av-hist-sum { font-size: var(--fs-xs); color: var(--text-muted); display: flex; align-items: center; gap: 14px; }
            .av-hist { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
            .av-hist th { text-align: left; font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: .6px; color: var(--text-muted); font-weight: 600; padding: 0 10px 8px 0; }
            .av-hist td { padding: 9px 10px 9px 0; border-top: 1px solid var(--av-line); }
            .av-chip { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: var(--fs-xs); font-weight: 600; }
            .av-chip.ok { background: var(--bg-green, #e6f4ea); color: var(--green-700, #166534); }
            .av-chip.warn { background: var(--bg-orange, #fff7ed); color: var(--orange-700, #9a3412); }
            .av-link { background: none; border: 0; color: var(--text-muted); font-size: var(--fs-xs); cursor: pointer; }
            .av-link:hover { color: var(--text-color); text-decoration: underline; }

            @media (max-width: 1180px) {
                .av-rbody { grid-template-columns: 1fr; }
                .av-rsec:first-child { padding-right: 0; }
                .av-rsec + .av-rsec { padding-left: 0; border-left: 0; border-top: 1px solid var(--av-line); margin-top: 16px; padding-top: 20px; }
            }
            @media (max-width: 900px) {
                .av-top { flex-direction: column; align-items: flex-start; }
                .av-split { grid-template-columns: 1fr; }
                .av-left { padding: 20px 24px; }
                .av-right { border-left: 0; border-top: 1px solid var(--av-line); padding: 20px 24px; min-height: 0; }
                .av-empty { padding: 36px 12px; }
                .av-actions { margin-left: 0; width: 100%; }
                .av-abtn { flex: 1; }
                .av-step span.t { display: none; }
                .av-step.active span.t { display: inline; }
            }
        </style>

        <div class="av-top">
            <div class="av-steps">
                <div class="av-step" data-s="1"><span class="n">1</span><span class="t">${__("Enter Details")}</span></div>
                <div class="av-step-line" data-l="1"></div>
                <div class="av-step" data-s="2"><span class="n">2</span><span class="t">${__("Verify")}</span></div>
                <div class="av-step-line" data-l="2"></div>
                <div class="av-step" data-s="3"><span class="n">3</span><span class="t">${__("View Result")}</span></div>
            </div>
            <span class="av-secure-tag"><i></i>${__("Secure session")}</span>
        </div>

        <div class="av-split">
            <div class="av-left">
                <div class="av-head">
                    <div class="av-head-icon">${AV_ICON.shield(22)}</div>
                    <div>
                        <h4>${__("Aadhaar Verification")}</h4>
                        <p>${__("Verify the Aadhaar holder's details securely for KYC.")}</p>
                    </div>
                </div>

                <div class="av-grid">
                    <div class="av-field-wrap" data-wrap="name">
                        <label class="av-label">${__("Full Name")} <span class="av-req">*</span></label>
                        <div class="av-field">
                            <input type="text" class="av-input" data-f="name" name="av_${rand}_n"
                                maxlength="200" autocomplete="off" spellcheck="false"
                                placeholder="${__("As printed on Aadhaar card")}"
                                data-lpignore="true" data-1p-ignore="true" data-form-type="other">
                            <div class="av-field-icon"><span class="av-tick">${AV_ICON.tick(16)}</span></div>
                        </div>
                        <div class="av-meta" aria-live="polite">
                            <span class="av-help">${__("Enter your full name exactly as mentioned on your Aadhaar card.")}</span>
                            <span class="av-error" data-err="name"></span>
                        </div>
                    </div>

                    <div class="av-field-wrap" data-wrap="aadhaar">
                        <label class="av-label">${__("Aadhaar Number")} <span class="av-req">*</span></label>
                        <div class="av-field">
                            <input type="text" class="av-input av-aadhaar" data-f="aadhaar" name="av_${rand}_a"
                                maxlength="14" inputmode="numeric" autocomplete="off" spellcheck="false"
                                placeholder="XXXX XXXX XXXX"
                                data-lpignore="true" data-1p-ignore="true" data-form-type="other">
                            <div class="av-field-icon">
                                <span class="av-tick">${AV_ICON.tick(16)}</span>
                                <button type="button" class="av-eye" data-f="eye" title="${__("Show / Hide")}" aria-label="${__("Show / Hide")}">
                                    <span class="eye-open">${AV_ICON.eye(18)}</span>
                                    <span class="eye-closed" style="display:none;">${AV_ICON.eyeoff(18)}</span>
                                </button>
                            </div>
                        </div>
                        <div class="av-meta" aria-live="polite">
                            <span class="av-help">${__("Enter the 12-digit Aadhaar number.")}</span>
                            <span class="av-error" data-err="aadhaar"></span>
                            <span class="av-count" data-f="count">0/12</span>
                        </div>
                    </div>

                    <div>
                        <button type="button" class="av-btn" data-f="verify" disabled>
                            <span class="av-spinner"></span>
                            <span data-f="verify-text">${__("Verify Aadhaar")}</span>
                        </button>
                    </div>
                </div>
                <div class="av-secure">${AV_ICON.lock(14)}${__("Aadhaar number is never stored. Every attempt is recorded in the audit log.")}</div>
            </div>

            <div class="av-right">
                <div class="av-rtitle">
                    <h5>${__("Verification Result")}</h5>
                    <span class="av-live" data-f="live" role="status" aria-live="polite"><i></i><span data-f="live-text">${__("Ready")}</span></span>
                </div>
                <div data-f="result"></div>
            </div>
        </div>

        <div class="av-hist-wrap" data-f="hist-card" style="display:none;">
            <div class="av-hist-head">
                <h5>${__("Recent Verifications")} <span>(${__("today")})</span></h5>
                <div class="av-hist-sum">
                    <span data-f="hist-sum"></span>
                    <button type="button" class="av-link" data-f="hist-clear">${__("Clear")}</button>
                </div>
            </div>
            <div style="overflow-x:auto;" data-f="hist"></div>
        </div>
    </div>
    `);

    const $m = $(page.main);
    const $name = $m.find('[data-f="name"]');
    const $aad = $m.find('[data-f="aadhaar"]');
    const $eye = $m.find('[data-f="eye"]');
    const $btn = $m.find('[data-f="verify"]');
    const $count = $m.find('[data-f="count"]');
    const $result = $m.find('[data-f="result"]');
    const $live = $m.find('[data-f="live"]');
    const $liveText = $m.find('[data-f="live-text"]');
    const $histCard = $m.find('[data-f="hist-card"]');
    const $hist = $m.find('[data-f="hist"]');
    const $histSum = $m.find('[data-f="hist-sum"]');

    let busy = false;
    let idle_timer = null;
    let step_override = null;
    const history = [];
    const touched = { name: false, aadhaar: false };
    const esc = frappe.utils.escape_html;

    /* ---------- validation ---------- */
    const NAME_RE = /^[\p{L}][\p{L}\p{M} .'\-]{1,199}$/u;
    const get_digits = () => ($aad.val() || "").replace(/\D/g, "");
    const get_name = () => ($name.val() || "").trim().replace(/\s+/g, " ");

    function check_name() {
        const v = get_name();
        if (!v) return __("Full Name is required.");
        if (v.length < 2) return __("Name must be at least 2 characters.");
        if (!NAME_RE.test(v)) return __("Use letters, spaces, dot or hyphen only.");
        return "";
    }
    function check_aadhaar() {
        const d = get_digits();
        if (!d) return __("Aadhaar Number is required.");
        if (!/^[2-9]/.test(d)) return __("Aadhaar cannot start with 0 or 1.");
        if (d.length < 12) return __("Aadhaar must be 12 digits.");
        if (AV_ENFORCE_CHECKSUM && !av_verhoeff(d)) return __("This Aadhaar number looks invalid. Please re-check.");
        return "";
    }
    function paint(field, err) {
        const $wrap = $m.find(`[data-wrap="${field}"]`);
        const $input = field === "name" ? $name : $aad;
        const show_err = touched[field] && err;
        $wrap.toggleClass("err", !!show_err);
        $wrap.find(`[data-err="${field}"]`).text(show_err ? err : "");
        $input.toggleClass("is-invalid", !!show_err);
        $input.toggleClass("is-valid", !err);
        $wrap.find(".av-field").toggleClass("ok", !err);
    }

    /* ---------- stepper + live status ---------- */
    function set_steps(n) {
        $m.find(".av-step").each(function () {
            const i = +$(this).data("s");
            $(this).toggleClass("done", i < n).toggleClass("active", i === n);
        });
        $m.find(".av-step-line").each(function () {
            $(this).toggleClass("done", +$(this).data("l") < n);
        });
    }
    function set_live(kind, text) {
        $live.removeClass("busy ok warn bad").addClass(kind || "");
        $liveText.text(text);
    }

    function refresh() {
        const e1 = check_name(), e2 = check_aadhaar();
        paint("name", e1);
        paint("aadhaar", e2);
        $count.text(get_digits().length + "/12");
        $btn.prop("disabled", busy || !!e1 || !!e2);
        set_steps(step_override || (!e1 && !e2 ? 2 : 1));
    }

    /* ---------- result views ---------- */
    function show_empty() {
        set_live("", __("Ready"));
        $result.html(`
            <div class="av-empty">
                <div class="eico">${AV_ICON.shield(24)}</div>
                <b>${__("No verification yet")}</b>
                <div>${__("Enter the name and Aadhaar number, then click Verify Aadhaar.")}</div>
            </div>`);
    }
    function show_loading() {
        set_live("busy", __("Verifying..."));
        $result.html(`
            <div class="av-loadtxt"><span class="av-spinner"></span>${__("Please wait...")}</div>
            <div class="av-skel" style="margin-bottom:14px;"></div>
            <div class="av-skel" style="height:120px;"></div>`);
    }
    function show_error() {
        set_live("bad", __("Failed"));
        $result.html(`
            <div class="av-rhead bad">
                <div class="ico">${AV_ICON.cross(18)}</div>
                <div>
                    <h5>${__("Verification could not be completed")}</h5>
                    <p>${__("Please read the message shown on screen, correct the details if needed and try again.")}</p>
                </div>
            </div>`);
    }

    function show_result(d, ctx) {
        const nice = (v) => v ? String(v).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "";
        const ok = /^Verified/.test(d.status || "");
        const mock = /MOCK/i.test(d.status || "");
        const issued = d.is_issued === "Y";
        const masked = "XXXX XXXX " + ctx.digits.slice(-4);

        set_live(ok ? "ok" : "warn", ok ? __("Verified") : __("Not issued"));

        const rows = [
            [__("Name (as entered)"), ctx.name, false],
            [__("Aadhaar Number"), masked, true],
            [__("Gender"), nice(d.gender) || "—", false],
            [__("Age Band"), d.age_band ? d.age_band + " " + __("yrs") : "—", false],
            [__("State"), d.state || "—", false],
            [__("Mobile (Masked)"), d.mobile || "—", true],
        ];

        $result.html(`
            <div class="av-rhead ${ok ? "ok" : "warn"}">
                <div class="ico">${ok ? AV_ICON.tick(18) : AV_ICON.info(18)}</div>
                <div>
                    <h5>${ok ? __("Aadhaar Number Verified") : __("Aadhaar Not Issued")}</h5>
                    <p>${ok ? __("The Aadhaar number is valid and issued.") : __("This Aadhaar number could not be confirmed as issued. Please re-check with the holder.")}</p>
                </div>
                <span class="av-badge ${mock ? "test" : ""}">${mock ? "TEST MODE" : esc(String(d.status || "").toUpperCase())}</span>
            </div>

            <div class="av-rbody">
                <div class="av-rsec">
                    <h6>${__("Holder Details")}</h6>
                    <div class="av-kv">
                        ${rows.map(([k, v, mono]) => `<div><div class="k">${esc(k)}</div><div class="v ${mono ? "av-mono" : ""}">${esc(v)}</div></div>`).join("")}
                    </div>
                </div>
            </div>

            <div class="av-rfoot">
                <span class="av-note">${__("This is a system-generated result based on the Aadhaar verification service. Full Aadhaar number is not stored.")}</span>
                <div class="av-actions">
                    <button type="button" class="av-abtn" data-act="copy">${__("Copy Summary")}</button>
                    <button type="button" class="av-abtn primary" data-act="new">${__("New Verification")}</button>
                </div>
            </div>`);

        const summary = [
            __("Aadhaar Verification Result"),
            __("Status") + ": " + (d.status || ""),
            __("Name (as entered)") + ": " + ctx.name,
            __("Aadhaar") + ": " + masked,
            __("Gender") + ": " + (nice(d.gender) || ""),
            __("Age Band") + ": " + (d.age_band || ""),
            __("State") + ": " + (d.state || ""),
            __("Mobile") + ": " + (d.mobile || ""),
        ].join("\n");

        const $copy = $result.find('[data-act="copy"]');
        $copy.on("click", () => {
            frappe.utils.copy_to_clipboard(summary);
            $copy.text(__("Copied ✓"));
            setTimeout(() => $copy.text(__("Copy Summary")), 1500);
        });
        $result.find('[data-act="new"]').on("click", () => reset_all());
        setTimeout(() => $result.find('[data-act="new"]').trigger("focus"), 50);
    }

    /* ---------- history (aaj ki, har din auto clear, full Aadhaar kabhi nahi) ---------- */
    const AV_HIST_KEY = "av_hist_" + frappe.session.user;
    const av_today = () => new Date().toLocaleDateString("en-CA");

    function render_history() {
        $histCard.toggle(history.length > 0);
        const okc = history.filter((h) => h.ok).length;
        $histSum.text(okc + " " + __("Verified") + " · " + (history.length - okc) + " " + __("Not Issued"));
        $hist.html(`
            <table class="av-hist">
                <thead><tr><th>#</th><th>${__("Name")}</th><th>${__("Aadhaar")}</th><th>${__("Result")}</th></tr></thead>
                <tbody>
                    ${history.map((h, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${esc(h.name)}</td>
                            <td class="av-mono">XXXX XXXX ${esc(h.last4)}</td>
                            <td><span class="av-chip ${h.ok ? "ok" : "warn"}">${h.ok ? __("Verified") : __("Not Issued")}</span></td>
                        </tr>`).join("")}
                </tbody>
            </table>`);
    }
    function save_history() {
        try { localStorage.setItem(AV_HIST_KEY, JSON.stringify({ date: av_today(), items: history })); } catch (e) {}
    }
    function wipe_history() {
        history.length = 0;
        try { localStorage.removeItem(AV_HIST_KEY); } catch (e) {}
        render_history();
    }
    function load_history() {
        try {
            const raw = localStorage.getItem(AV_HIST_KEY);
            if (!raw) return;
            const o = JSON.parse(raw);
            if (o && o.date === av_today() && Array.isArray(o.items)) {
                history.push(...o.items.slice(0, AV_HISTORY_MAX));
            } else {
                localStorage.removeItem(AV_HIST_KEY);
            }
        } catch (e) {}
    }
    function check_day_rollover() {
        try {
            const raw = localStorage.getItem(AV_HIST_KEY);
            const o = raw ? JSON.parse(raw) : null;
            if (history.length && (!o || o.date !== av_today())) wipe_history();
        } catch (e) {}
    }
    function schedule_midnight_clear() {
        clearTimeout(window.__av_midnight);
        const now = new Date();
        const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
        window.__av_midnight = setTimeout(() => { wipe_history(); schedule_midnight_clear(); }, next - now);
    }
    function add_history(d, ctx) {
        history.unshift({ name: ctx.name, last4: ctx.digits.slice(-4), ok: /^Verified/.test(d.status || "") });
        if (history.length > AV_HISTORY_MAX) history.pop();
        save_history();
        render_history();
    }
    if (window.__av_vis) document.removeEventListener("visibilitychange", window.__av_vis);
    window.__av_vis = () => { if (!document.hidden) check_day_rollover(); };
    document.addEventListener("visibilitychange", window.__av_vis);

    /* ---------- actions ---------- */
    function clear_result() { if (!busy) { step_override = null; show_empty(); } }

    function reset_all() {
        $name.val("");
        $aad.val("").removeClass("show-text");
        $eye.find(".eye-open").show();
        $eye.find(".eye-closed").hide();
        touched.name = touched.aadhaar = false;
        step_override = null;
        show_empty();
        refresh();
        $name.trigger("focus");
    }

    function arm_idle_timer() {
        clearTimeout(idle_timer);
        idle_timer = setTimeout(() => {
            if (get_digits() && !busy) {
                $aad.val("").removeClass("show-text");
                $eye.find(".eye-open").show();
                $eye.find(".eye-closed").hide();
                step_override = null;
                show_empty();
                refresh();
                frappe.show_alert({ message: __("Aadhaar number cleared due to inactivity."), indicator: "orange" });
            }
        }, AV_IDLE_MS);
    }

    function set_busy(state) {
        busy = state;
        $btn.toggleClass("loading", state);
        $m.find('[data-f="verify-text"]').text(state ? __("Verifying...") : __("Verify Aadhaar"));
        $name.prop("disabled", state);
        $aad.prop("disabled", state);
        refresh();
    }

    function submit() {
        touched.name = touched.aadhaar = true;
        refresh();
        if (busy || check_name() || check_aadhaar()) return;

        const ctx = { name: get_name(), digits: get_digits() };
        step_override = 2;
        set_busy(true);
        show_loading();

        frappe.call({
            method: "sahayog.sahayog.page.aadhar_verification.aadhar_verification.verify",
            args: { user_name: ctx.name, aadhaar_number: ctx.digits, consent: 1 },
            callback(r) {
                const d = r.message;
                if (!d) { step_override = null; show_error(); return; }
                step_override = 4;
                show_result(d, ctx);
                add_history(d, ctx);
                frappe.show_alert({ message: __("Aadhaar verification completed"), indicator: "green" });
            },
            error() { step_override = null; show_error(); },
            always() { set_busy(false); arm_idle_timer(); },
        });
    }

    /* ---------- events ---------- */
    $name.on("input", function () {
        touched.name = true; clear_result(); refresh(); arm_idle_timer();
    }).on("blur", function () { touched.name = true; refresh(); });

    $aad.on("input", function () {
        const digits = this.value.replace(/\D/g, "").slice(0, 12);
        this.value = av_format(digits);
        touched.aadhaar = digits.length === 12 || touched.aadhaar;
        clear_result(); refresh(); arm_idle_timer();
    }).on("blur", function () { touched.aadhaar = true; refresh(); });

    $eye.on("click", function () {
        const show = !$aad.hasClass("show-text");
        $aad.toggleClass("show-text", show);
        $eye.find(".eye-open").toggle(!show);
        $eye.find(".eye-closed").toggle(show);
    });

    $m.find('[data-f="name"], [data-f="aadhaar"]').on("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    $btn.on("click", submit);
    $m.find('[data-f="hist-clear"]').on("click", wipe_history);

    load_history();
    render_history();
    schedule_midnight_clear();
    show_empty();
    refresh();
    setTimeout(() => $name.trigger("focus"), 100);
}


/* =====================================================================
   APPENDED: Verification home (sidebar) + Account Verification (same page)
   ===================================================================== */
const ACV_IDLE_MS = 2 * 60 * 1000;    // 2 min inactivity par account number clear
const ACV_HISTORY_MAX = 5;            // aaj ki recent verifications

function av_render_home(page) {
    page.clear_primary_action();
    page.clear_inner_toolbar();
    page.set_title(__("FIN Verify"));

    const items = [
        { key: "aadhaar", title: __("Aadhaar Verification"), sub: __("Verify Aadhaar holder details for KYC."), icon: AV_ICON.shield(20) },
        { key: "account", title: __("Account Verification"), sub: __("Verify a bank account using IFSC and account number."), icon: ACV_ICON.bank(20) },
    ];

    page.main.html(`
    <div class="avh-root">
        <style>
            .avh-root { padding-bottom: 32px; font-size: 14px; }
            .avh-split { display: grid; grid-template-columns: minmax(230px, 270px) minmax(0, 1fr); border-top: 1px solid var(--border-color, #e5e7eb); align-items: start; }
            .avh-side { padding: 20px 16px 24px 24px; display: flex; flex-direction: column; gap: 10px; }
            .avh-side h6 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .7px; color: var(--text-muted); font-weight: 600; }
            .avh-item { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 12px 14px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; background: var(--card-bg, #fff); color: var(--text-color); cursor: pointer; transition: all .15s; }
            .avh-item:hover, .avh-item:focus { border-color: var(--primary-color, #171717); outline: none; }
            .avh-item.active { border-color: var(--primary-color, #171717); background: var(--control-bg, #f3f4f6); box-shadow: 0 0 0 3px rgba(0,0,0,.05); }
            .avh-ico { width: 38px; height: 38px; border-radius: 10px; background: var(--bg-green, #e6f4ea); color: var(--green-600, #15803d); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .avh-item b { display: block; font-size: 14px; font-weight: 600; }
            .avh-item small { display: block; color: var(--text-muted); font-size: 12px; margin-top: 1px; }
            .avh-content { border-left: 1px solid var(--border-color, #e5e7eb); min-width: 0; padding-top: 14px; }

            /* forms now live in a narrower pane: keep result readable */
            .avh-content .av-split, .avh-content .acv-split { grid-template-columns: minmax(300px, 380px) minmax(0, 1fr); }
            .avh-content .av-rbody, .avh-content .acv-rbody { grid-template-columns: 1fr; }
            .avh-content .av-rsec:first-child, .avh-content .acv-rsec:first-child { padding-right: 0; }
            .avh-content .av-rsec + .av-rsec, .avh-content .acv-rsec + .acv-rsec { padding-left: 0; border-left: 0; border-top: 1px solid var(--border-color, #e5e7eb); margin-top: 16px; padding-top: 20px; }
            @media (max-width: 1100px) {
                .avh-content .av-split, .avh-content .acv-split { grid-template-columns: 1fr; }
                .avh-content .av-left, .avh-content .acv-left { padding: 20px 24px; }
                .avh-content .av-right, .avh-content .acv-right { border-left: 0; border-top: 1px solid var(--border-color, #e5e7eb); padding: 20px 24px; min-height: 0; }
            }
            @media (max-width: 900px) {
                .avh-split { grid-template-columns: 1fr; }
                .avh-content { border-left: 0; border-top: 1px solid var(--border-color, #e5e7eb); }
            }
            /* compact sidebar v6 */
            .avh-split { grid-template-columns: 200px minmax(0, 1fr); }
            .avh-side { padding: 14px 10px 14px 16px; gap: 6px; }
            .avh-side h6 { margin: 0 0 4px; font-size: 11px; }
            .avh-item { padding: 7px 10px; gap: 8px; border-radius: 8px; }
            .avh-ico { width: 26px; height: 26px; border-radius: 7px; }
            .avh-ico svg { width: 15px; height: 15px; }
            .avh-item b { font-size: 13px; }
            .avh-item small { display: none; }
            .avh-content { padding-top: 0; }
            .avh-content .av-split, .avh-content .acv-split { grid-template-columns: 300px minmax(0, 1fr); }
            .avh-content .av-left, .avh-content .acv-left { padding: 18px 20px; }
            .avh-content .av-right, .avh-content .acv-right { padding: 18px 20px; }
            .avh-content .av-top, .avh-content .acv-top { padding: 10px 20px; }
            @media (max-width: 1100px) {
                .avh-content .av-split, .avh-content .acv-split { grid-template-columns: 1fr; }
            }
            @media (max-width: 900px) {
                .avh-split { grid-template-columns: 1fr; }
            }
        </style>
        <div class="avh-split">
            <div class="avh-side">
                <h6>${__("Verification Type")}</h6>
                ${items.map((it) => `
                    <button type="button" class="avh-item" data-go="${it.key}">
                        <span class="avh-ico">${it.icon}</span>
                        <span><b>${it.title}</b><small>${it.sub}</small></span>
                    </button>`).join("")}
            </div>
            <div class="avh-content" data-f="avh-content"></div>
        </div>
    </div>`);

    const $content = page.main.find('[data-f="avh-content"]');
    // forms render into the right pane; sidebar stays visible
    const sub = { main: $content, add_inner_button: (...a) => page.add_inner_button(...a) };

    function open_item(key) {
        page.clear_inner_toolbar();
        page.main.find(".avh-item").removeClass("active");
        page.main.find('[data-go="' + key + '"]').addClass("active");
        $content.empty();
        if (key === "aadhaar") av_render_form(sub);
        else acv_render_form(sub);
    }

    page.main.find("[data-go]").on("click", function () {
        if ($(this).hasClass("active")) return;
        open_item($(this).data("go"));
    });

    open_item("aadhaar");
}

const ACV_SVG = (inner, s = 18, sw = 2) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const ACV_ICON = {
    bank: (s) => ACV_SVG('<path d="M3 21h18"></path><path d="M5 21V10"></path><path d="M9 21V10"></path><path d="M15 21V10"></path><path d="M19 21V10"></path><path d="M12 3L3 9h18L12 3z"></path>', s),
    lock: (s) => ACV_SVG('<rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>', s),
    tick: (s) => ACV_SVG('<polyline points="20 6 9 17 4 12"></polyline>', s, 3),
    cross: (s) => ACV_SVG('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>', s, 3),
    info: (s) => ACV_SVG('<line x1="12" y1="8" x2="12" y2="13"></line><circle cx="12" cy="17" r="0.5"></circle>', s, 3),
    eye: (s) => ACV_SVG('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>', s),
    eyeoff: (s) => ACV_SVG('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>', s),
};

/* ---------------- main ---------------- */

function acv_render_form(page) {
    const rand = Math.random().toString(36).slice(2, 8);

    page.add_inner_button(__("Refresh"), () => reset_all());
    if (frappe.user.has_role("System Manager")) {
        page.add_inner_button(__("View Logs"), () => frappe.set_route("List", "Account Verification Log"));
    }

    page.main.html(`
    <div class="acv-root">
        <style>
            .acv-root {
                --fs-xs: 12px; --fs-sm: 13px; --fs-md: 14px; --fs-lg: 16px; --fs-xl: 18px;
                --acv-line: var(--border-color, #e5e7eb);
                font-size: var(--fs-md); line-height: 1.5; padding-bottom: 32px;
            }
            .acv-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 4px 24px 14px; border-bottom: 1px solid var(--acv-line); }
            .acv-steps { display: flex; align-items: center; gap: 10px; flex: 1; max-width: 560px; }
            .acv-step { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: var(--fs-sm); font-weight: 500; white-space: nowrap; }
            .acv-step .n { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--fs-xs); font-weight: 700; background: var(--control-bg, #f3f4f6); color: var(--text-muted); border: 1.5px solid transparent; transition: all .2s; }
            .acv-step.active { color: var(--text-color); }
            .acv-step.active .n { background: var(--card-bg, #fff); border-color: var(--primary-color, #171717); color: var(--text-color); }
            .acv-step.done { color: var(--green-600, #16a34a); }
            .acv-step.done .n { background: var(--green-500, #22c55e); color: #fff; }
            .acv-step-line { flex: 1; height: 2px; background: var(--acv-line); border-radius: 2px; min-width: 20px; }
            .acv-step-line.done { background: var(--green-500, #22c55e); }
            .acv-secure-tag { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); color: var(--text-muted); white-space: nowrap; }
            .acv-secure-tag i { width: 8px; height: 8px; border-radius: 50%; background: var(--green-500, #22c55e); display: inline-block; }

            .acv-split { display: grid; grid-template-columns: minmax(340px, 440px) minmax(0, 1fr); align-items: start; }
            .acv-left { padding: 22px 28px 24px 24px; }
            .acv-right { padding: 22px 24px 24px 28px; border-left: 1px solid var(--acv-line); min-height: 400px; }

            .acv-head { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
            .acv-head-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--bg-green, #e6f4ea); color: var(--green-600, #15803d); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .acv-head h4 { margin: 0; font-weight: 600; font-size: var(--fs-xl); }
            .acv-head p { margin: 2px 0 0; color: var(--text-muted); font-size: var(--fs-sm); }

            .acv-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
            .acv-label { display: block; font-size: var(--fs-sm); color: var(--text-color); font-weight: 500; margin-bottom: 6px; }
            .acv-req { color: var(--red-500, #ef4444); }
            .acv-opt { color: var(--text-muted); font-weight: 400; font-size: var(--fs-xs); }
            .acv-field { position: relative; }
            .acv-input { width: 100%; height: 42px; padding: 0 42px 0 14px; border: 1.5px solid transparent; border-radius: 8px; background: var(--control-bg, #f3f4f6); color: var(--text-color); font-size: var(--fs-md); outline: none; transition: all .15s; }
            .acv-input:focus { background: var(--card-bg, #fff); border-color: var(--primary-color, #171717); box-shadow: 0 0 0 3px rgba(0,0,0,.06); }
            .acv-input:disabled { opacity: .7; cursor: not-allowed; }
            .acv-input.is-invalid { border-color: var(--red-500, #ef4444); background: var(--bg-red, #fef2f2); }
            .acv-input.is-valid { border-color: var(--green-500, #22c55e); }
            .acv-upper { text-transform: uppercase; letter-spacing: 1.5px; }
            .acv-secret { letter-spacing: 2px; font-variant-numeric: tabular-nums; -webkit-text-security: disc; }
            .acv-secret.show-text { -webkit-text-security: none; }
            .acv-field-icon { position: absolute; right: 12px; top: 0; height: 42px; display: flex; align-items: center; gap: 6px; color: var(--text-muted); }
            .acv-eye { cursor: pointer; display: flex; align-items: center; background: none; border: 0; padding: 2px; color: inherit; }
            .acv-eye:hover { color: var(--text-color); }
            .acv-tick { display: none; color: var(--green-500, #22c55e); }
            .acv-field.ok .acv-tick { display: flex; }
            .acv-meta { display: flex; justify-content: space-between; gap: 8px; margin-top: 6px; min-height: 18px; font-size: var(--fs-xs); }
            .acv-help { color: var(--text-muted); }
            .acv-error { color: var(--red-500, #ef4444); display: none; }
            .acv-field-wrap.err .acv-error { display: block; }
            .acv-field-wrap.err .acv-help { display: none; }
            .acv-count { color: var(--text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
            .acv-btn { width: 100%; height: 44px; padding: 0 24px; border: 0; border-radius: 8px; background: var(--primary-color, #171717); color: #fff; font-weight: 600; font-size: var(--fs-md); display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all .15s; white-space: nowrap; }
            .acv-btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
            .acv-btn:disabled { opacity: .4; cursor: not-allowed; }
            .acv-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: acv-spin .7s linear infinite; display: none; }
            .acv-btn.loading .acv-spinner { display: inline-block; }
            @keyframes acv-spin { to { transform: rotate(360deg); } }
            .acv-secure { margin-top: 20px; display: flex; align-items: center; gap: 8px; font-size: var(--fs-xs); color: var(--text-muted); }

            .acv-rtitle { display: flex; align-items: center; justify-content: space-between; margin: 0 0 16px; }
            .acv-rtitle h5 { margin: 0; font-weight: 600; font-size: var(--fs-lg); }
            .acv-live { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-xs); color: var(--text-muted); font-weight: 500; }
            .acv-live i { width: 8px; height: 8px; border-radius: 50%; background: var(--gray-400, #9ca3af); display: inline-block; }
            .acv-live.busy i { background: var(--blue-500, #3b82f6); animation: acv-pulse 1s ease infinite; }
            .acv-live.ok i { background: var(--green-500, #22c55e); }
            .acv-live.warn i { background: var(--orange-500, #f97316); }
            .acv-live.bad i { background: var(--red-500, #ef4444); }
            @keyframes acv-pulse { 50% { opacity: .3; } }

            .acv-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; padding: 70px 12px; color: var(--text-muted); font-size: var(--fs-sm); }
            .acv-empty .eico { width: 52px; height: 52px; border-radius: 50%; background: var(--control-bg, #f3f4f6); display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
            .acv-empty b { color: var(--text-color); font-size: var(--fs-md); }
            .acv-skel { height: 56px; border-radius: 10px; background: linear-gradient(90deg, var(--control-bg,#f3f4f6) 25%, rgba(0,0,0,.05) 37%, var(--control-bg,#f3f4f6) 63%); background-size: 400% 100%; animation: acv-shimmer 1.3s ease infinite; }
            @keyframes acv-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
            .acv-loadtxt { display: flex; align-items: center; gap: 10px; font-size: var(--fs-sm); color: var(--text-muted); margin-bottom: 14px; }
            .acv-loadtxt .acv-spinner { display: inline-block; border-color: rgba(0,0,0,.15); border-top-color: var(--text-color); }

            .acv-rhead { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 10px; }
            .acv-rhead.ok { background: var(--bg-green, #e6f4ea); color: var(--green-700, #166534); }
            .acv-rhead.warn { background: var(--bg-orange, #fff7ed); color: var(--orange-700, #9a3412); }
            .acv-rhead.bad { background: var(--bg-red, #fef2f2); color: var(--red-700, #991b1b); }
            .acv-rhead .ico { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
            .acv-rhead.ok .ico { background: var(--green-500, #22c55e); }
            .acv-rhead.warn .ico { background: var(--orange-500, #f97316); }
            .acv-rhead.bad .ico { background: var(--red-500, #ef4444); }
            .acv-rhead h5 { margin: 0; font-size: var(--fs-lg); font-weight: 700; }
            .acv-rhead p { margin: 0; font-size: var(--fs-sm); opacity: .85; }
            .acv-badge { margin-left: auto; font-size: var(--fs-xs); font-weight: 700; letter-spacing: .6px; padding: 3px 10px; border-radius: 20px; background: rgba(0,0,0,.08); white-space: nowrap; }
            .acv-badge.test { background: #fef3c7; color: #92400e; }

            .acv-rbody { display: grid; grid-template-columns: 1.4fr 1fr; margin-top: 4px; }
            .acv-rsec { padding: 20px 0 8px; }
            .acv-rsec:first-child { padding-right: 24px; }
            .acv-rsec + .acv-rsec { padding-left: 24px; border-left: 1px solid var(--acv-line); }
            .acv-rsec h6 { margin: 0 0 14px; font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: .7px; color: var(--text-muted); font-weight: 600; }
            .acv-kv { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 20px; }
            .acv-kv .k { font-size: var(--fs-xs); color: var(--text-muted); margin-bottom: 2px; }
            .acv-kv .v { font-size: var(--fs-md); font-weight: 600; word-break: break-word; }
            .acv-mono { font-variant-numeric: tabular-nums; letter-spacing: 1px; }

            .acv-checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
            .acv-checks li { position: relative; display: flex; align-items: flex-start; gap: 10px; padding-bottom: 18px; font-size: var(--fs-sm); }
            .acv-checks li:last-child { padding-bottom: 0; }
            .acv-checks li:not(:last-child)::before { content: ''; position: absolute; left: 10px; top: 24px; bottom: 2px; width: 2px; background: var(--green-500, #22c55e); opacity: .45; border-radius: 2px; }
            .acv-checks li.fail-line:not(:last-child)::before { background: var(--orange-500, #f97316); }
            .acv-checks .dot { position: relative; z-index: 1; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
            .acv-checks .dot.pass { background: var(--green-500, #22c55e); }
            .acv-checks .dot.fail { background: var(--orange-500, #f97316); }
            .acv-checks .dot.na { background: var(--gray-400, #9ca3af); }
            .acv-checks small { display: block; color: var(--text-muted); font-size: var(--fs-xs); margin-top: 1px; }

            .acv-rfoot { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 20px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--acv-line); font-size: var(--fs-xs); color: var(--text-muted); }
            .acv-note { flex: 1 1 260px; min-width: 220px; line-height: 1.5; }
            .acv-actions { margin-left: auto; display: flex; gap: 8px; }
            .acv-abtn { height: 34px; padding: 0 14px; border-radius: 6px; border: 1px solid var(--border-color, #d1d5db); background: var(--card-bg, #fff); color: var(--text-color); font-size: var(--fs-sm); font-weight: 500; cursor: pointer; transition: all .15s; }
            .acv-abtn:hover { background: var(--control-bg, #f3f4f6); }
            .acv-abtn.primary { background: var(--primary-color, #171717); color: #fff; border-color: transparent; }
            .acv-abtn.primary:hover { opacity: .88; }

            .acv-hist-wrap { border-top: 1px solid var(--acv-line); padding: 18px 24px 0; }
            .acv-hist-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
            .acv-hist-head h5 { margin: 0; font-weight: 600; font-size: var(--fs-lg); }
            .acv-hist-head h5 span { font-weight: 400; font-size: var(--fs-xs); color: var(--text-muted); }
            .acv-hist-sum { font-size: var(--fs-xs); color: var(--text-muted); display: flex; align-items: center; gap: 14px; }
            .acv-hist { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
            .acv-hist th { text-align: left; font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: .6px; color: var(--text-muted); font-weight: 600; padding: 0 10px 8px 0; }
            .acv-hist td { padding: 9px 10px 9px 0; border-top: 1px solid var(--acv-line); }
            .acv-chip { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: var(--fs-xs); font-weight: 600; }
            .acv-chip.ok { background: var(--bg-green, #e6f4ea); color: var(--green-700, #166534); }
            .acv-chip.warn { background: var(--bg-orange, #fff7ed); color: var(--orange-700, #9a3412); }
            .acv-link { background: none; border: 0; color: var(--text-muted); font-size: var(--fs-xs); cursor: pointer; }
            .acv-link:hover { color: var(--text-color); text-decoration: underline; }

            @media (max-width: 1180px) {
                .acv-rbody { grid-template-columns: 1fr; }
                .acv-rsec:first-child { padding-right: 0; }
                .acv-rsec + .acv-rsec { padding-left: 0; border-left: 0; border-top: 1px solid var(--acv-line); margin-top: 16px; padding-top: 20px; }
            }
            @media (max-width: 900px) {
                .acv-top { flex-direction: column; align-items: flex-start; }
                .acv-split { grid-template-columns: 1fr; }
                .acv-left { padding: 20px 24px; }
                .acv-right { border-left: 0; border-top: 1px solid var(--acv-line); padding: 20px 24px; min-height: 0; }
                .acv-empty { padding: 36px 12px; }
                .acv-actions { margin-left: 0; width: 100%; }
                .acv-abtn { flex: 1; }
                .acv-step span.t { display: none; }
                .acv-step.active span.t { display: inline; }
            }
                    /* thin banner v7 */
            .acv-rhead { padding: 6px 12px; gap: 10px; border-radius: 8px; }
            .acv-rhead .ico { width: 24px; height: 24px; }
            .acv-rhead .ico svg { width: 14px; height: 14px; }
            .acv-rhead h5 { font-size: 14px; line-height: 1.25; }
            .acv-rhead p { font-size: 12px; line-height: 1.25; }
            .acv-badge { padding: 2px 8px; font-size: 11px; }
</style>

        <div class="acv-top">
            <div class="acv-steps">
                <div class="acv-step" data-s="1"><span class="n">1</span><span class="t">${__("Enter Details")}</span></div>
                <div class="acv-step-line" data-l="1"></div>
                <div class="acv-step" data-s="2"><span class="n">2</span><span class="t">${__("Verify")}</span></div>
                <div class="acv-step-line" data-l="2"></div>
                <div class="acv-step" data-s="3"><span class="n">3</span><span class="t">${__("View Result")}</span></div>
            </div>
            <span class="acv-secure-tag"><i></i>${__("Secure session")}</span>
        </div>

        <div class="acv-split">
            <div class="acv-left">
                <div class="acv-head">
                    <div class="acv-head-icon">${ACV_ICON.bank(22)}</div>
                    <div>
                        <h4>${__("Account Verification")}</h4>
                        <p>${__("Verify a bank account securely for KYC.")}</p>
                    </div>
                </div>

                <div class="acv-grid">
                    <div class="acv-field-wrap" data-wrap="ifsc">
                        <label class="acv-label">${__("IFSC Code")} <span class="acv-req">*</span></label>
                        <div class="acv-field">
                            <input type="text" class="acv-input acv-upper" data-f="ifsc" name="acv_${rand}_i"
                                maxlength="11" autocomplete="off" spellcheck="false"
                                placeholder="HDFC0001234"
                                data-lpignore="true" data-1p-ignore="true" data-form-type="other">
                            <div class="acv-field-icon"><span class="acv-tick">${ACV_ICON.tick(16)}</span></div>
                        </div>
                        <div class="acv-meta" aria-live="polite">
                            <span class="acv-help">${__("11 characters. 5th character is always zero.")}</span>
                            <span class="acv-error" data-err="ifsc"></span>
                            <span class="acv-count" data-f="ifsc-count">0/11</span>
                        </div>
                    </div>

                    <div class="acv-field-wrap" data-wrap="account">
                        <label class="acv-label">${__("Account Number")} <span class="acv-req">*</span></label>
                        <div class="acv-field">
                            <input type="text" class="acv-input acv-secret" data-f="account" name="acv_${rand}_a"
                                maxlength="25" autocomplete="off" spellcheck="false"
                                placeholder="${__("Enter bank account number")}"
                                data-lpignore="true" data-1p-ignore="true" data-form-type="other">
                            <div class="acv-field-icon">
                                <span class="acv-tick">${ACV_ICON.tick(16)}</span>
                                <button type="button" class="acv-eye" data-f="eye" title="${__("Show / Hide")}" aria-label="${__("Show / Hide")}">
                                    <span class="eye-open">${ACV_ICON.eye(18)}</span>
                                    <span class="eye-closed" style="display:none;">${ACV_ICON.eyeoff(18)}</span>
                                </button>
                            </div>
                        </div>
                        <div class="acv-meta" aria-live="polite">
                            <span class="acv-help">${__("5 to 25 letters or digits.")}</span>
                            <span class="acv-error" data-err="account"></span>
                            <span class="acv-count" data-f="acc-count">0/25</span>
                        </div>
                    </div>

                    <div>
                        <button type="button" class="acv-btn" data-f="verify" disabled>
                            <span class="acv-spinner"></span>
                            <span data-f="verify-text">${__("Verify Account")}</span>
                        </button>
                    </div>
                </div>
                <div class="acv-secure">${ACV_ICON.lock(14)}${__("Account number is never stored. Every attempt is recorded in the audit log.")}</div>
            </div>

            <div class="acv-right">
                <div class="acv-rtitle">
                    <h5>${__("Verification Result")}</h5>
                    <span class="acv-live" data-f="live" role="status" aria-live="polite"><i></i><span data-f="live-text">${__("Ready")}</span></span>
                </div>
                <div data-f="result"></div>
            </div>
        </div>

        <div class="acv-hist-wrap" data-f="hist-card" style="display:none;">
            <div class="acv-hist-head">
                <h5>${__("Recent Verifications")} <span>(${__("today")})</span></h5>
                <div class="acv-hist-sum">
                    <span data-f="hist-sum"></span>
                    <button type="button" class="acv-link" data-f="hist-clear">${__("Clear")}</button>
                </div>
            </div>
            <div style="overflow-x:auto;" data-f="hist"></div>
        </div>
    </div>
    `);

    const $m = $(page.main);
    const $ifsc = $m.find('[data-f="ifsc"]');
    const $acc = $m.find('[data-f="account"]');
    const $eye = $m.find('[data-f="eye"]');
    const $btn = $m.find('[data-f="verify"]');
    const $ifscCount = $m.find('[data-f="ifsc-count"]');
    const $accCount = $m.find('[data-f="acc-count"]');
    const $result = $m.find('[data-f="result"]');
    const $live = $m.find('[data-f="live"]');
    const $liveText = $m.find('[data-f="live-text"]');
    const $histCard = $m.find('[data-f="hist-card"]');
    const $hist = $m.find('[data-f="hist"]');
    const $histSum = $m.find('[data-f="hist-sum"]');

    let busy = false;
    let idle_timer = null;
    let step_override = null;
    const history = [];
    const touched = { ifsc: false, account: false };
    const esc = frappe.utils.escape_html;
    const inputs = { ifsc: $ifsc, account: $acc };

    /* ---------- validation ---------- */
    const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const get_ifsc = () => ($ifsc.val() || "").trim().toUpperCase();
    const get_acc = () => ($acc.val() || "").replace(/\s+/g, "");
    function check_ifsc() {
        const v = get_ifsc();
        if (!v) return __("IFSC Code is required.");
        if (v.length < 11) return __("IFSC must be 11 characters.");
        if (!IFSC_RE.test(v)) return __("Invalid IFSC. 4 letters, then 0, then 6 letters or digits.");
        return "";
    }
    function check_account() {
        const v = get_acc();
        if (!v) return __("Account Number is required.");
        if (!/^[A-Za-z0-9]+$/.test(v)) return __("Use letters and digits only.");
        if (v.length < 5) return __("Account Number must be at least 5 characters.");
        return "";
    }
    function paint(field, err, filled) {
        const $wrap = $m.find(`[data-wrap="${field}"]`);
        const show_err = touched[field] && err;
        $wrap.toggleClass("err", !!show_err);
        $wrap.find(`[data-err="${field}"]`).text(show_err ? err : "");
        inputs[field].toggleClass("is-invalid", !!show_err);
        inputs[field].toggleClass("is-valid", !err && filled);
        $wrap.find(".acv-field").toggleClass("ok", !err && filled);
    }

    /* ---------- stepper + live status ---------- */
    function set_steps(n) {
        $m.find(".acv-step").each(function () {
            const i = +$(this).data("s");
            $(this).toggleClass("done", i < n).toggleClass("active", i === n);
        });
        $m.find(".acv-step-line").each(function () {
            $(this).toggleClass("done", +$(this).data("l") < n);
        });
    }
    function set_live(kind, text) {
        $live.removeClass("busy ok warn bad").addClass(kind || "");
        $liveText.text(text);
    }

    function refresh() {
        const e1 = check_ifsc(), e2 = check_account();
        paint("ifsc", e1, !!get_ifsc());
        paint("account", e2, !!get_acc());
        $ifscCount.text(get_ifsc().length + "/11");
        $accCount.text(get_acc().length + "/25");
        const bad = !!(e1 || e2);
        $btn.prop("disabled", busy || bad);
        set_steps(step_override || (!bad ? 2 : 1));
    }

    /* ---------- result views ---------- */
    function show_empty() {
        set_live("", __("Ready"));
        $result.html(`
            <div class="acv-empty">
                <div class="eico">${ACV_ICON.bank(24)}</div>
                <b>${__("No verification yet")}</b>
                <div>${__("Enter the IFSC code and account number, then click Verify Account.")}</div>
            </div>`);
    }
    function show_loading() {
        set_live("busy", __("Verifying..."));
        $result.html(`
            <div class="acv-loadtxt"><span class="acv-spinner"></span>${__("Please wait, this can take up to a minute...")}</div>
            <div class="acv-skel" style="margin-bottom:14px;"></div>
            <div class="acv-skel" style="height:120px;"></div>`);
    }
    function show_error() {
        set_live("bad", __("Failed"));
        $result.html(`
            <div class="acv-rhead bad">
                <div class="ico">${ACV_ICON.cross(18)}</div>
                <div>
                    <h5>${__("Verification could not be completed")}</h5>
                    <p>${__("Please read the message shown on screen, correct the details if needed and try again.")}</p>
                </div>
            </div>`);
    }

    function show_result(d, ctx) {
        const ok = /^Verified/.test(d.status || "");
        const mock = /MOCK/i.test(d.status || "");
        const cached = !!d.from_cache;
        const masked = "X".repeat(Math.max(ctx.acc.length - 4, 0)) + ctx.acc.slice(-4);
        const code = d.bank_status_code || "";
        const code_text = code ? code + (d.bank_status_desc ? " - " + d.bank_status_desc : "") : "—";
        const when = d.verified_on ? frappe.datetime.str_to_user(d.verified_on) : "";

        set_live(ok ? "ok" : "warn", ok ? __("Verified") : __("Not valid"));

        const rows = [
            [__("Name (as per bank)"), d.account_name || "—", false],
            [__("Account Number"), ctx.acc, true],
            [__("IFSC Code"), ctx.ifsc, true],
            [__("Status Code"), code_text, false],
            [__("Bank Response"), d.bank_response || "—", false],
            [__("Bank Ref. No."), d.bank_rrn || "—", true],
        ];
        const cache_note = cached
            ? `<div style="margin-top:12px;padding:8px 12px;border-radius:8px;background:var(--control-bg,#f3f4f6);font-size:12px;color:var(--text-muted);">${esc(__("This account was already verified on {0}. The saved result is shown; no new bank request was made.", [when]))}</div>`
            : "";

        $result.html(`
            <div class="acv-rhead ${ok ? "ok" : "warn"}">
                <div class="ico">${ok ? ACV_ICON.tick(18) : ACV_ICON.info(18)}</div>
                <div>
                    <h5>${ok ? __("Bank Account Verified") : __("Account Not Verified")}</h5>
                    <p>${ok ? __("The bank account is valid and active.") : __("This account could not be confirmed. Please re-check the details with the holder.")}</p>
                </div>
                <span class="acv-badge ${mock ? "test" : ""}">${mock ? "TEST MODE" : esc(String(d.status || "").toUpperCase())}</span>
            </div>
            ${cache_note}

            <div class="acv-rbody">
                <div class="acv-rsec">
                    <h6>${__("Account Details")}</h6>
                    <div class="acv-kv">
                        ${rows.map(([k, v, mono]) => `<div><div class="k">${esc(k)}</div><div class="v ${mono ? "acv-mono" : ""}">${esc(v)}</div></div>`).join("")}
                    </div>
                </div>
            </div>

            <div class="acv-rfoot">
                <span class="acv-note">${__("This is a system-generated result based on the bank account verification service. Full account number is not stored.")}</span>
                <div class="acv-actions">
                    <button type="button" class="acv-abtn" data-act="copy">${__("Copy Summary")}</button>
                    <button type="button" class="acv-abtn primary" data-act="new">${__("New Verification")}</button>
                </div>
            </div>`);

        const summary = [
            __("Account Verification Result"),
            __("Status") + ": " + (d.status || ""),
            __("Name (as per bank)") + ": " + (d.account_name || ""),
            __("Account") + ": " + ctx.acc,
            __("IFSC") + ": " + ctx.ifsc,
            __("Status Code") + ": " + code_text,
            __("Bank Response") + ": " + (d.bank_response || ""),
            __("Bank Ref. No.") + ": " + (d.bank_rrn || ""),
        ].concat(cached ? [__("Saved result of verification on") + ": " + when] : []).join("\n");

        const $copy = $result.find('[data-act="copy"]');
        $copy.on("click", () => {
            frappe.utils.copy_to_clipboard(summary);
            $copy.text(__("Copied ✓"));
            setTimeout(() => $copy.text(__("Copy Summary")), 1500);
        });
        $result.find('[data-act="new"]').on("click", () => reset_all());
        setTimeout(() => $result.find('[data-act="new"]').trigger("focus"), 50);
    }

    /* ---------- history (aaj ki, har din auto clear, full account number kabhi nahi) ---------- */
    const ACV_HIST_KEY = "acv_hist_" + frappe.session.user;
    const acv_today = () => new Date().toLocaleDateString("en-CA");

    function render_history() {
        $histCard.toggle(history.length > 0);
        const okc = history.filter((h) => h.ok).length;
        $histSum.text(okc + " " + __("Verified") + " · " + (history.length - okc) + " " + __("Not Valid"));
        $hist.html(`
            <table class="acv-hist">
                <thead><tr><th>#</th><th>${__("IFSC")}</th><th>${__("Account")}</th><th>${__("Result")}</th></tr></thead>
                <tbody>
                    ${history.map((h, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td class="acv-mono">${esc(h.ifsc)}</td>
                            <td class="acv-mono">${"X".repeat(8)}${esc(h.last4)}</td>
                            <td><span class="acv-chip ${h.ok ? "ok" : "warn"}">${h.ok ? __("Verified") : __("Not Valid")}</span></td>
                        </tr>`).join("")}
                </tbody>
            </table>`);
    }
    function save_history() {
        try { localStorage.setItem(ACV_HIST_KEY, JSON.stringify({ date: acv_today(), items: history })); } catch (e) {}
    }
    function wipe_history() {
        history.length = 0;
        try { localStorage.removeItem(ACV_HIST_KEY); } catch (e) {}
        render_history();
    }
    function load_history() {
        try {
            const raw = localStorage.getItem(ACV_HIST_KEY);
            if (!raw) return;
            const o = JSON.parse(raw);
            if (o && o.date === acv_today() && Array.isArray(o.items)) {
                history.push(...o.items.slice(0, ACV_HISTORY_MAX));
            } else {
                localStorage.removeItem(ACV_HIST_KEY);
            }
        } catch (e) {}
    }
    function check_day_rollover() {
        try {
            const raw = localStorage.getItem(ACV_HIST_KEY);
            const o = raw ? JSON.parse(raw) : null;
            if (history.length && (!o || o.date !== acv_today())) wipe_history();
        } catch (e) {}
    }
    function schedule_midnight_clear() {
        clearTimeout(window.__acv_midnight);
        const now = new Date();
        const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
        window.__acv_midnight = setTimeout(() => { wipe_history(); schedule_midnight_clear(); }, next - now);
    }
    function add_history(d, ctx) {
        history.unshift({ ifsc: ctx.ifsc, last4: ctx.acc.slice(-4), ok: /^Verified/.test(d.status || "") });
        if (history.length > ACV_HISTORY_MAX) history.pop();
        save_history();
        render_history();
    }
    if (window.__acv_vis) document.removeEventListener("visibilitychange", window.__acv_vis);
    window.__acv_vis = () => { if (!document.hidden) check_day_rollover(); };
    document.addEventListener("visibilitychange", window.__acv_vis);

    /* ---------- actions ---------- */
    function clear_result() { if (!busy) { step_override = null; show_empty(); } }

    function hide_account_text() {
        $acc.removeClass("show-text");
        $eye.find(".eye-open").show();
        $eye.find(".eye-closed").hide();
    }

    function reset_all() {
        $ifsc.val("");
        $acc.val("");
        hide_account_text();
        touched.ifsc = touched.account = false;
        step_override = null;
        show_empty();
        refresh();
        $ifsc.trigger("focus");
    }

    function arm_idle_timer() {
        clearTimeout(idle_timer);
        idle_timer = setTimeout(() => {
            if (get_acc() && !busy) {
                $acc.val("");
                hide_account_text();
                step_override = null;
                show_empty();
                refresh();
                frappe.show_alert({ message: __("Account number cleared due to inactivity."), indicator: "orange" });
            }
        }, ACV_IDLE_MS);
    }

    function set_busy(state) {
        busy = state;
        $btn.toggleClass("loading", state);
        $m.find('[data-f="verify-text"]').text(state ? __("Verifying...") : __("Verify Account"));
        $ifsc.prop("disabled", state);
        $acc.prop("disabled", state);
        refresh();
    }

    function submit() {
        touched.ifsc = touched.account = true;
        refresh();
        if (busy || check_ifsc() || check_account()) return;

        const ctx = { ifsc: get_ifsc(), acc: get_acc() };
        step_override = 2;
        set_busy(true);
        show_loading();

        frappe.call({
            method: "sahayog.sahayog.page.aadhar_verification.aadhar_verification.verify_account",
            args: { account_number: ctx.acc, ifsc: ctx.ifsc, consent: 1 },
            callback(r) {
                const d = r.message;
                if (!d) { step_override = null; show_error(); return; }
                step_override = 4;
                show_result(d, ctx);
                add_history(d, ctx);
                frappe.show_alert({ message: __("Account verification completed"), indicator: "green" });
            },
            error() { step_override = null; show_error(); },
            always() { set_busy(false); arm_idle_timer(); },
        });
    }

    /* ---------- events ---------- */
    $ifsc.on("input", function () {
        this.value = this.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 11);
        touched.ifsc = this.value.length === 11 || touched.ifsc;
        clear_result(); refresh(); arm_idle_timer();
    }).on("blur", function () { touched.ifsc = true; refresh(); });

    $acc.on("input", function () {
        this.value = this.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
        touched.account = this.value.length >= 5 || touched.account;
        clear_result(); refresh(); arm_idle_timer();
    }).on("blur", function () { touched.account = true; refresh(); });

    $eye.on("click", function () {
        const show = !$acc.hasClass("show-text");
        $acc.toggleClass("show-text", show);
        $eye.find(".eye-open").toggle(!show);
        $eye.find(".eye-closed").toggle(show);
    });

    $m.find('[data-f="ifsc"], [data-f="account"]').on("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    $btn.on("click", submit);
    $m.find('[data-f="hist-clear"]').on("click", wipe_history);

    load_history();
    render_history();
    schedule_midnight_clear();
    show_empty();
    refresh();
    setTimeout(() => $ifsc.trigger("focus"), 100);
}
