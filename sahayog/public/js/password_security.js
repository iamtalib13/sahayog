// sahayog/public/js/password_security.js
// Mandatory Monthly Password Reset & Password Policy Enforcer
// Clean 3-Step Wizard with Stepper Progress Bar & Retry / Change ID support
// Theme Color: #417c7d

(function () {
  if (typeof frappe === "undefined") return;

  const THEME_COLOR = "#417c7d";

  const styles = `
    .sahayog-ps-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: sahayog-ps-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes sahayog-ps-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes sahayog-ps-scale-in {
      from { opacity: 0; transform: scale(0.96) translateY(-10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .sahayog-ps-card {
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 16px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 1px 1px rgba(0, 0, 0, 0.05);
      width: 100%;
      max-width: 480px;
      margin: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: sahayog-ps-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .sahayog-ps-header {
      padding: 20px 24px 14px;
      border-bottom: 1px solid var(--border-color, #f1f5f9);
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .sahayog-ps-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #e2eeee;
      color: ${THEME_COLOR};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .sahayog-ps-icon-wrapper.warning {
      background: #fffbeb;
      color: #d97706;
    }

    .sahayog-ps-title {
      font-size: 16.5px;
      font-weight: 700;
      color: var(--text-color, #0f172a);
      margin: 0 0 2px 0;
      line-height: 1.3;
    }

    .sahayog-ps-subtitle {
      font-size: 12.5px;
      color: var(--text-muted, #64748b);
      margin: 0;
    }

    .sahayog-ps-body {
      padding: 18px 24px;
      overflow-y: auto;
      max-height: calc(85vh - 150px);
    }

    .sahayog-ps-form-group {
      margin-bottom: 14px;
    }

    .sahayog-ps-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color, #334155);
      margin-bottom: 6px;
    }

    .sahayog-ps-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .sahayog-ps-input {
      width: 100%;
      height: 40px;
      padding: 8px 38px 8px 12px;
      background: var(--control-bg, #ffffff);
      border: 1.5px solid var(--border-color, #cbd5e1);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text-color, #0f172a);
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .sahayog-ps-input:focus {
      outline: none;
      border-color: ${THEME_COLOR};
      box-shadow: 0 0 0 3px rgba(65, 124, 125, 0.15);
    }

    .sahayog-ps-toggle-eye {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sahayog-ps-policy-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 16px;
    }

    .sahayog-ps-policy-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 6px;
    }

    .sahayog-ps-rule-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .sahayog-ps-rule-item:last-child {
      margin-bottom: 0;
    }

    .sahayog-ps-rule-item.valid {
      color: #16a34a;
      font-weight: 600;
    }

    .sahayog-ps-rule-item.invalid {
      color: #64748b;
    }

    .sahayog-ps-rule-icon {
      width: 13px;
      height: 13px;
      flex-shrink: 0;
    }

    .sahayog-ps-footer {
      padding: 14px 24px 20px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid var(--border-color, #f1f5f9);
      background: var(--card-bg, #ffffff);
    }

    .sahayog-ps-btn {
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid transparent;
    }

    .sahayog-ps-btn-primary {
      background: ${THEME_COLOR};
      color: #ffffff;
    }

    .sahayog-ps-btn-primary:hover:not(:disabled) {
      background: #336364;
    }

    .sahayog-ps-btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sahayog-ps-btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border-color: #e2e8f0;
    }

    .sahayog-ps-alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12.5px;
      margin-bottom: 14px;
      display: none;
      line-height: 1.4;
    }

    .sahayog-ps-reminder-bar {
      position: sticky;
      top: 0;
      z-index: 1030;
      background: linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%);
      border-bottom: 1px solid #fde68a;
      color: #92400e;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.1);
    }

    .sahayog-ps-reminder-btn {
      padding: 4px 12px;
      background: ${THEME_COLOR};
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);

  const SVG_SHIELD = `<svg style="width:20px;height:20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  const SVG_CHECK = `<svg class="sahayog-ps-rule-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const SVG_CROSS = `<svg class="sahayog-ps-rule-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const SVG_EYE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const SVG_WARN = `<svg style="width:16px;height:16px;flex-shrink:0;color:#dc2626;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  function parseServerMessage(err, defaultMsg) {
    let msg = defaultMsg;
    if (err && err._server_messages) {
      try {
        const parsed = JSON.parse(err._server_messages);
        const obj = JSON.parse(parsed[0]);
        msg = obj.message || defaultMsg;
      } catch (e) {}
    } else if (err && err.responseJSON && err.responseJSON._server_messages) {
      try {
        const parsed = JSON.parse(err.responseJSON._server_messages);
        const obj = JSON.parse(parsed[0]);
        msg = obj.message || defaultMsg;
      } catch (e) {}
    } else if (err && err.message) {
      msg = err.message;
    }
    return msg;
  }

  window.SahayogPasswordSecurity = {
    state: null,
    verifiedOtp: null,

    init: function () {
      if (frappe.boot && frappe.boot.password_security) {
        this.processSecurityState(frappe.boot.password_security);
      } else {
        this.fetchStatus();
      }
    },

    fetchStatus: function () {
      if (!frappe.session || frappe.session.user === "Guest" || frappe.session.user === "Administrator") {
        return;
      }
      frappe.call({
        method: "sahayog.api.password_security.get_password_security_status",
        callback: (r) => {
          if (r.message) {
            this.processSecurityState(r.message);
          }
        }
      });
    },

    processSecurityState: function (data) {
      this.state = data;
      if (!data || !data.enabled) return;

      if (data.reset_required) {
        this.showPasswordResetModal(true);
        return;
      }

      if (data.show_reminder) {
        this.renderReminderBar(data.days_remaining);
      }
    },

    renderReminderBar: function (daysRemaining) {
      if (document.getElementById("sahayog-ps-reminder-bar")) return;
      if (sessionStorage.getItem("sahayog_ps_reminder_dismissed")) return;

      const reminderBar = document.createElement("div");
      reminderBar.id = "sahayog-ps-reminder-bar";
      reminderBar.className = "sahayog-ps-reminder-bar";

      const daysText = daysRemaining === 1 ? "1 day" : `${daysRemaining} days`;

      reminderBar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>⚠️ <strong>Password Expiry Notice:</strong> Your password will expire in <strong>${daysText}</strong>. Please update your password now to avoid service interruption.</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="sahayog-ps-reminder-btn" id="sahayog-ps-reminder-reset-btn">Reset Password Now</button>
          <button type="button" style="background:none; border:none; color:#b45309; cursor:pointer; font-size:16px;" id="sahayog-ps-reminder-close-btn" title="Dismiss">✕</button>
        </div>
      `;

      const deskHeader = document.querySelector(".navbar") || document.querySelector("header") || document.body;
      if (deskHeader.parentNode && deskHeader !== document.body) {
        deskHeader.parentNode.insertBefore(reminderBar, deskHeader.nextSibling);
      } else {
        document.body.prepend(reminderBar);
      }

      document.getElementById("sahayog-ps-reminder-reset-btn").addEventListener("click", () => {
        this.showPasswordResetModal(false);
      });

      document.getElementById("sahayog-ps-reminder-close-btn").addEventListener("click", () => {
        reminderBar.remove();
        sessionStorage.setItem("sahayog_ps_reminder_dismissed", "true");
      });
    },

    showPasswordResetModal: function (isMandatory = false) {
      const existing = document.getElementById("sahayog-ps-backdrop");
      if (existing) existing.remove();

      this.verifiedOtp = null;

      const policy = (this.state && this.state.policy) ? this.state.policy : {
        min_password_length: 8,
        require_uppercase: 1,
        require_lowercase: 1,
        require_number: 1,
        allow_special_characters: 0
      };

      const backdrop = document.createElement("div");
      backdrop.id = "sahayog-ps-backdrop";
      backdrop.className = "sahayog-ps-backdrop";

      backdrop.innerHTML = `
        <div class="sahayog-ps-card" role="dialog" aria-modal="true">
          <div class="sahayog-ps-header">
            <div class="sahayog-ps-icon-wrapper ${isMandatory ? 'warning' : ''}">
              ${SVG_SHIELD}
            </div>
            <div style="flex: 1;">
              <h3 class="sahayog-ps-title" id="desk-modal-title">${isMandatory ? 'Periodic Password Reset' : 'Change Password'}</h3>
              <p class="sahayog-ps-subtitle" id="desk-modal-subtitle">Step 1: Choose channel & send OTP</p>
            </div>
          </div>

          <!-- Stepper Indicator -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 24px 0 24px; position: relative;">
            <div style="position: absolute; top: 25px; left: 40px; right: 40px; height: 2px; background: #e2e8f0; z-index: 1;">
              <div id="desk-progress-line" style="height: 100%; width: 0%; background: ${THEME_COLOR}; transition: width 0.3s ease;"></div>
            </div>
            
            <div id="desk-badge-1" style="display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 2;">
              <div class="step-circle" style="width: 26px; height: 26px; border-radius: 50%; background: ${THEME_COLOR}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 2px solid #ffffff; box-shadow: 0 0 0 2px ${THEME_COLOR};">1</div>
              <span style="font-size: 10.5px; font-weight: 600; color: ${THEME_COLOR};">Channel</span>
            </div>

            <div id="desk-badge-2" style="display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 2;">
              <div class="step-circle" style="width: 26px; height: 26px; border-radius: 50%; background: #ffffff; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 2px solid #cbd5e1;">2</div>
              <span style="font-size: 10.5px; font-weight: 500; color: #94a3b8;">OTP</span>
            </div>

            <div id="desk-badge-3" style="display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 2;">
              <div class="step-circle" style="width: 26px; height: 26px; border-radius: 50%; background: #ffffff; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 2px solid #cbd5e1;">3</div>
              <span style="font-size: 10.5px; font-weight: 500; color: #94a3b8;">Password</span>
            </div>
          </div>

          <div class="sahayog-ps-body">
            <!-- Alert Box -->
            <div class="sahayog-ps-alert-error" id="desk-modal-error">
              <div style="display: flex; gap: 8px; align-items: flex-start;">
                ${SVG_WARN}
                <div id="desk-modal-error-text" style="flex: 1;"></div>
              </div>
            </div>

            <!-- STEP 1: Channel Selection -->
            <div id="desk-step-1">
              <div style="background: #f4f8f8; border: 1.5px solid #d0e1e1; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${THEME_COLOR}; letter-spacing: 0.5px; margin-bottom: 8px;">Select OTP Channel</div>
                
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                  <label id="desk-channel-mobile-row" style="display: flex; align-items: center; gap: 10px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; cursor: pointer;">
                    <input type="radio" name="desk_otp_channel" value="mobile" id="desk-channel-mobile" checked style="accent-color: ${THEME_COLOR}; width: 16px; height: 16px;" />
                    <span style="font-size: 15px;">📱</span>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 11.5px; font-weight: 600; color: #334155;">SMS to Mobile</div>
                      <div style="font-size: 12.5px; font-weight: 700; color: #1e293b;" id="desk-matched-mobile">Fetching mobile...</div>
                    </div>
                  </label>

                  <label id="desk-channel-email-row" style="display: flex; align-items: center; gap: 10px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; cursor: pointer;">
                    <input type="radio" name="desk_otp_channel" value="email" id="desk-channel-email" style="accent-color: ${THEME_COLOR}; width: 16px; height: 16px;" />
                    <span style="font-size: 15px;">✉️</span>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 11.5px; font-weight: 600; color: #334155;">Company Email</div>
                      <div style="font-size: 12.5px; font-weight: 700; color: #1e293b;" id="desk-matched-email">Fetching email...</div>
                    </div>
                  </label>
                </div>

                <button type="button" class="sahayog-ps-btn sahayog-ps-btn-primary" id="desk-btn-send-otp" style="width: 100%; height: 36px; font-size: 13px;">
                  Send Verification OTP
                </button>
              </div>
            </div>

            <!-- STEP 2: OTP Verification -->
            <div id="desk-step-2" style="display: none;">
              <div style="background: #f4f8f8; border: 1px solid #d0e1e1; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-size: 10.5px; font-weight: 600; color: #64748b; text-transform: uppercase;">Sent to:</div>
                  <div style="font-size: 12.5px; font-weight: 700; color: #0f172a;" id="desk-otp-target-desc"></div>
                </div>
                <button type="button" id="desk-btn-retry-step1" style="background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 600; color: #475569; cursor: pointer;">
                  Change Channel
                </button>
              </div>

              <div class="sahayog-ps-form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="sahayog-ps-label" style="margin: 0;" for="sahayog-ps-otp">Enter 4-Digit OTP</label>
                  <button type="button" id="desk-btn-resend-otp" style="background: none; border: none; color: ${THEME_COLOR}; font-size: 11.5px; cursor: pointer; padding: 0; font-weight: 700;">Resend OTP</button>
                </div>
                <div class="sahayog-ps-input-wrap">
                  <input type="text" id="sahayog-ps-otp" class="sahayog-ps-input" placeholder="• • • •" maxlength="4" autocomplete="one-time-code" style="letter-spacing: 6px; font-weight: bold; text-align: center; font-size: 17px;" />
                </div>
              </div>

              <button type="button" class="sahayog-ps-btn sahayog-ps-btn-primary" id="desk-btn-verify-otp" disabled style="width: 100%; height: 38px; font-size: 13.5px; opacity: 0.6;">
                Verify OTP & Proceed
              </button>
            </div>

            <!-- STEP 3: Create Password -->
            <div id="desk-step-3" style="display: none;">
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                ${SVG_CHECK}
                <span style="font-size: 12px; font-weight: 600; color: #065f46;">Identity Verified! Create your new password.</span>
              </div>

              <div class="sahayog-ps-form-group">
                <label class="sahayog-ps-label" for="sahayog-ps-new-pwd">New Password</label>
                <div class="sahayog-ps-input-wrap">
                  <input type="password" id="sahayog-ps-new-pwd" class="sahayog-ps-input" placeholder="Create new password" autocomplete="new-password" />
                  <button type="button" class="sahayog-ps-toggle-eye" data-target="sahayog-ps-new-pwd">${SVG_EYE}</button>
                </div>
              </div>

              <div class="sahayog-ps-form-group">
                <label class="sahayog-ps-label" for="sahayog-ps-confirm-pwd">Confirm New Password</label>
                <div class="sahayog-ps-input-wrap">
                  <input type="password" id="sahayog-ps-confirm-pwd" class="sahayog-ps-input" placeholder="Re-enter new password" autocomplete="new-password" />
                  <button type="button" class="sahayog-ps-toggle-eye" data-target="sahayog-ps-confirm-pwd">${SVG_EYE}</button>
                </div>
              </div>

              <div class="sahayog-ps-policy-box">
                <div class="sahayog-ps-policy-title">Password Policy Requirements</div>
                
                <div class="sahayog-ps-rule-item" id="rule-min-length">
                  <span class="icon-slot">${SVG_CROSS}</span>
                  <span>Minimum ${policy.min_password_length} characters</span>
                </div>

                ${policy.require_uppercase ? `
                  <div class="sahayog-ps-rule-item" id="rule-uppercase">
                    <span class="icon-slot">${SVG_CROSS}</span>
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                ` : ''}

                ${policy.require_lowercase ? `
                  <div class="sahayog-ps-rule-item" id="rule-lowercase">
                    <span class="icon-slot">${SVG_CROSS}</span>
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                ` : ''}

                ${policy.require_number ? `
                  <div class="sahayog-ps-rule-item" id="rule-number">
                    <span class="icon-slot">${SVG_CROSS}</span>
                    <span>At least one number (0-9)</span>
                  </div>
                ` : ''}

                ${!policy.allow_special_characters ? `
                  <div class="sahayog-ps-rule-item" id="rule-no-special">
                    <span class="icon-slot">${SVG_CROSS}</span>
                    <span>Letters and numbers only (No special characters/spaces)</span>
                  </div>
                ` : ''}

                <div class="sahayog-ps-rule-item" id="rule-match">
                  <span class="icon-slot">${SVG_CROSS}</span>
                  <span>Passwords match</span>
                </div>
              </div>

              <button type="button" class="sahayog-ps-btn sahayog-ps-btn-primary" id="sahayog-ps-btn-submit" disabled style="width: 100%; height: 38px; font-size: 13.5px; opacity: 0.6;">
                Set New Password
              </button>
            </div>
          </div>

          <div class="sahayog-ps-footer">
            ${!isMandatory ? `<button type="button" class="sahayog-ps-btn sahayog-ps-btn-secondary" id="sahayog-ps-btn-cancel">Cancel</button>` : ''}
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      const setModalStep = (step) => {
        const step1 = document.getElementById("desk-step-1");
        const step2 = document.getElementById("desk-step-2");
        const step3 = document.getElementById("desk-step-3");
        const progLine = document.getElementById("desk-progress-line");
        const subtitle = document.getElementById("desk-modal-subtitle");

        const badge1 = document.querySelector("#desk-badge-1 .step-circle");
        const badge2 = document.querySelector("#desk-badge-2 .step-circle");
        const badge3 = document.querySelector("#desk-badge-3 .step-circle");
        const label1 = document.querySelector("#desk-badge-1 span");
        const label2 = document.querySelector("#desk-badge-2 span");
        const label3 = document.querySelector("#desk-badge-3 span");

        step1.style.display = "none";
        step2.style.display = "none";
        step3.style.display = "none";

        if (step === 1) {
          step1.style.display = "block";
          subtitle.innerText = "Step 1: Choose channel & send OTP";
          progLine.style.width = "0%";

          badge1.style.background = THEME_COLOR;
          badge1.style.color = "#ffffff";
          badge1.style.boxShadow = `0 0 0 2px ${THEME_COLOR}`;
          label1.style.color = THEME_COLOR;

          badge2.style.background = "#ffffff";
          badge2.style.color = "#94a3b8";
          badge2.style.boxShadow = "none";
          label2.style.color = "#94a3b8";

          badge3.style.background = "#ffffff";
          badge3.style.color = "#94a3b8";
          badge3.style.boxShadow = "none";
          label3.style.color = "#94a3b8";
        } else if (step === 2) {
          step2.style.display = "block";
          subtitle.innerText = "Step 2: Enter verification OTP";
          progLine.style.width = "50%";

          badge1.style.background = "#16a34a";
          badge1.style.color = "#ffffff";
          badge1.style.boxShadow = "none";
          label1.style.color = "#16a34a";

          badge2.style.background = THEME_COLOR;
          badge2.style.color = "#ffffff";
          badge2.style.boxShadow = `0 0 0 2px ${THEME_COLOR}`;
          label2.style.color = THEME_COLOR;

          badge3.style.background = "#ffffff";
          badge3.style.color = "#94a3b8";
          badge3.style.boxShadow = "none";
          label3.style.color = "#94a3b8";
        } else if (step === 3) {
          step3.style.display = "block";
          subtitle.innerText = "Step 3: Create strong password";
          progLine.style.width = "100%";

          badge1.style.background = "#16a34a";
          badge1.style.color = "#ffffff";
          badge2.style.background = "#16a34a";
          badge2.style.color = "#ffffff";
          badge2.style.boxShadow = "none";
          label2.style.color = "#16a34a";

          badge3.style.background = THEME_COLOR;
          badge3.style.color = "#ffffff";
          badge3.style.boxShadow = `0 0 0 2px ${THEME_COLOR}`;
          label3.style.color = THEME_COLOR;
        }
      };

      // Eye toggle
      backdrop.querySelectorAll(".sahayog-ps-toggle-eye").forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetId = btn.getAttribute("data-target");
          const input = document.getElementById(targetId);
          if (input) {
            input.type = input.type === "password" ? "text" : "password";
          }
        });
      });

      if (!isMandatory) {
        const cancelBtn = document.getElementById("sahayog-ps-btn-cancel");
        if (cancelBtn) cancelBtn.addEventListener("click", () => backdrop.remove());
      }

      const sendOtpBtn = document.getElementById("desk-btn-send-otp");
      const resendBtn = document.getElementById("desk-btn-resend-otp");
      const retryBtn = document.getElementById("desk-btn-retry-step1");
      const otpDesc = document.getElementById("desk-otp-target-desc");
      const otpInput = document.getElementById("sahayog-ps-otp");
      const verifyOtpBtn = document.getElementById("desk-btn-verify-otp");

      const newPwdInput = document.getElementById("sahayog-ps-new-pwd");
      const confirmPwdInput = document.getElementById("sahayog-ps-confirm-pwd");
      const submitBtn = document.getElementById("sahayog-ps-btn-submit");

      const errorDiv = document.getElementById("desk-modal-error");
      const errorText = document.getElementById("desk-modal-error-text");

      const mobileInfo = document.getElementById("desk-matched-mobile");
      const emailInfo = document.getElementById("desk-matched-email");
      const mobileRow = document.getElementById("desk-channel-mobile-row");
      const emailRow = document.getElementById("desk-channel-email-row");
      const mobileRadio = document.getElementById("desk-channel-mobile");
      const emailRadio = document.getElementById("desk-channel-email");

      const showError = (msg) => {
        errorText.innerHTML = msg;
        errorDiv.style.display = "block";
      };
      const hideError = () => {
        errorText.innerHTML = "";
        errorDiv.style.display = "none";
      };

      // Fetch user contact details
      frappe.call({
        method: "sahayog.api.password_security.check_user_mobile_status",
        args: { user_identifier: frappe.session.user },
        callback: (r) => {
          if (r.message && r.message.status === "success") {
            if (r.message.has_mobile && mobileInfo) {
              mobileInfo.innerText = r.message.masked_mobile;
              mobileRow.style.display = "flex";
            } else if (mobileRow) {
              mobileRow.style.display = "none";
            }

            if (r.message.has_email && emailInfo) {
              emailInfo.innerText = r.message.masked_email;
              emailRow.style.display = "flex";
            } else if (emailRow) {
              emailRow.style.display = "none";
            }

            if (r.message.default_channel === "email" || !r.message.has_mobile) {
              if (emailRadio) emailRadio.checked = true;
            } else {
              if (mobileRadio) mobileRadio.checked = true;
            }
          }
        },
        error: (err) => {
          showError(parseServerMessage(err, "Contact details not found for your employee profile."));
        }
      });

      // Send OTP Action
      const executeDeskSendOtp = () => {
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerText = "Sending OTP...";
        hideError();

        const channel = document.querySelector("input[name='desk_otp_channel']:checked")?.value || "mobile";

        frappe.call({
          method: "sahayog.api.password_security.send_password_reset_otp",
          args: {
            user_identifier: frappe.session.user,
            channel: channel
          },
          auto_retry: false,
          error_handlers: { "*": () => {} },
          callback: (r) => {
            if (r.message && r.message.status === "success") {
              sendOtpBtn.disabled = false;
              sendOtpBtn.innerText = "Send Verification OTP";
              otpDesc.innerText = r.message.masked_target || (channel === "email" ? "Company Email" : "Mobile SMS");

              setModalStep(2);
              otpInput.value = "";
              otpInput.focus();

              let timer = 60;
              resendBtn.disabled = true;
              resendBtn.innerText = `Resend in ${timer}s`;
              const interval = setInterval(() => {
                timer--;
                if (timer <= 0) {
                  clearInterval(interval);
                  resendBtn.disabled = false;
                  resendBtn.innerText = "Resend OTP";
                } else {
                  resendBtn.innerText = `Resend in ${timer}s`;
                }
              }, 1000);
            }
          },
          error: (err) => {
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerText = "Send Verification OTP";
            showError(parseServerMessage(err, "Unable to deliver OTP right now."));
          }
        });
      };

      sendOtpBtn.addEventListener("click", executeDeskSendOtp);
      resendBtn.addEventListener("click", executeDeskSendOtp);

      // Retry Action -> Back to Step 1
      retryBtn.addEventListener("click", () => {
        hideError();
        this.verifiedOtp = null;
        otpInput.value = "";
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.style.opacity = "0.6";
        setModalStep(1);
      });

      // Step 2: Auto-enable verify button
      otpInput.addEventListener("input", () => {
        hideError();
        const val = (otpInput.value || "").trim();
        if (val.length === 4) {
          verifyOtpBtn.disabled = false;
          verifyOtpBtn.style.opacity = "1";
        } else {
          verifyOtpBtn.disabled = true;
          verifyOtpBtn.style.opacity = "0.6";
        }
      });

      // Step 2: Verify OTP -> Unlock Step 3
      verifyOtpBtn.addEventListener("click", () => {
        const otpVal = (otpInput.value || "").trim();
        hideError();
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.innerText = "Verifying...";

        frappe.call({
          method: "sahayog.api.password_security.verify_otp_only",
          args: {
            user_identifier: frappe.session.user,
            otp: otpVal
          },
          auto_retry: false,
          error_handlers: { "*": () => {} },
          callback: (r) => {
            if (r.message && r.message.status === "success") {
              window.SahayogPasswordSecurity.verifiedOtp = otpVal;
              verifyOtpBtn.disabled = false;
              verifyOtpBtn.innerText = "Verify OTP & Proceed";
              setModalStep(3);
              newPwdInput.focus();
            }
          },
          error: (err) => {
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerText = "Verify OTP & Proceed";
            showError(parseServerMessage(err, "Invalid or expired OTP. Please try again."));
          }
        });
      });

      // Step 3: Real-time password validation
      const updateRuleStatus = (elementId, isValid) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.className = `sahayog-ps-rule-item ${isValid ? "valid" : "invalid"}`;
        const slot = el.querySelector(".icon-slot");
        if (slot) slot.innerHTML = isValid ? SVG_CHECK : SVG_CROSS;
      };

      const validateForm = () => {
        const val = newPwdInput.value || "";
        const confirmVal = confirmPwdInput.value || "";

        let allValid = true;

        const isLenValid = val.length >= policy.min_password_length;
        updateRuleStatus("rule-min-length", isLenValid);
        if (!isLenValid) allValid = false;

        if (policy.require_uppercase) {
          const isUpper = /[A-Z]/.test(val);
          updateRuleStatus("rule-uppercase", isUpper);
          if (!isUpper) allValid = false;
        }

        if (policy.require_lowercase) {
          const isLower = /[a-z]/.test(val);
          updateRuleStatus("rule-lowercase", isLower);
          if (!isLower) allValid = false;
        }

        if (policy.require_number) {
          const isNum = /[0-9]/.test(val);
          updateRuleStatus("rule-number", isNum);
          if (!isNum) allValid = false;
        }

        if (!policy.allow_special_characters) {
          const isAlphaNumOnly = val.length > 0 && /^[a-zA-Z0-9]+$/.test(val);
          updateRuleStatus("rule-no-special", isAlphaNumOnly);
          if (!isAlphaNumOnly) allValid = false;
        }

        const isMatch = val.length > 0 && val === confirmVal;
        updateRuleStatus("rule-match", isMatch);
        if (!isMatch) allValid = false;

        submitBtn.disabled = !allValid;
        submitBtn.style.opacity = allValid ? "1" : "0.6";
      };

      newPwdInput.addEventListener("input", validateForm);
      confirmPwdInput.addEventListener("input", validateForm);

      // Final Password Submission
      submitBtn.addEventListener("click", () => {
        const new_pwd = newPwdInput.value;
        const confirm_pwd = confirmPwdInput.value;
        const otp_val = window.SahayogPasswordSecurity.verifiedOtp;

        hideError();
        submitBtn.disabled = true;
        submitBtn.innerText = "Setting Password...";

        frappe.call({
          method: "sahayog.api.password_security.reset_user_password",
          args: {
            new_password: new_pwd,
            confirm_password: confirm_pwd,
            otp: otp_val
          },
          auto_retry: false,
          error_handlers: { "*": () => {} },
          callback: (r) => {
            if (r.message && r.message.status === "success") {
              frappe.show_alert({
                message: __("Password reset successfully!"),
                indicator: "green",
              });
              backdrop.remove();
              const reminderBar = document.getElementById("sahayog-ps-reminder-bar");
              if (reminderBar) reminderBar.remove();

              setTimeout(() => {
                window.location.reload();
              }, 1200);
            }
          },
          error: (err) => {
            submitBtn.disabled = false;
            submitBtn.innerText = "Set New Password";
            showError(parseServerMessage(err, "Failed to reset password. Please try again."));
          },
        });
      });
    },
  };

  $(document).ready(() => {
    SahayogPasswordSecurity.init();
  });
})();
