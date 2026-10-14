// Aadhaar Verification page (Sahayog)
const AV_ENFORCE_CHECKSUM = true;     // mock mode testing me false karo
const AV_IDLE_MS = 2 * 60 * 1000;     // 2 min inactivity par Aadhaar number clear
const AV_HISTORY_MAX = 5;             // aaj ki recent verifications

frappe.pages["aadhar-verification"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("Aadhaar Verification"),
        single_column: true,
    });

    frappe.call({
        method: "sahayog.sahayog.page.aadhar_verification.aadhar_verification.can_access",
        callback(r) {
            if (!r.message) return av_render_denied(page);
            av_render_form(page);
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

            .av-rbody { display: grid; grid-template-columns: 1.4fr 1fr; margin-top: 4px; }
            .av-rsec { padding: 20px 0 8px; }
            .av-rsec:first-child { padding-right: 24px; }
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
        const checks = [
            [true, __("Aadhaar format valid"), AV_ENFORCE_CHECKSUM ? __("12 digits, checksum passed") : __("12 digits entered")],
            [true, __("Holder consent"), __("The Aadhaar holder's permission is noted")],
            [issued, issued ? __("Issued by UIDAI") : __("Not issued by UIDAI"), issued ? __("Aadhaar is registered and active.") : __("This Aadhaar number is not registered")],
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
                <div class="av-rsec">
                    <h6>${__("Verification Checks")}</h6>
                    <ul class="av-checks">
                        ${checks.map(([pass, t, sub]) => `
                            <li class="${pass ? "" : "fail-line"}">
                                <span class="dot ${pass ? "pass" : "fail"}">${pass ? "✓" : "!"}</span>
                                <span>${esc(t)}<small>${esc(sub)}</small></span>
                            </li>`).join("")}
                    </ul>
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
