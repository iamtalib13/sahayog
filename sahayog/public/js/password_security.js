// sahayog/public/js/password_security.js

(function () {
  if (typeof frappe === "undefined") return;

  // Global styles for Password Security UI & Modals
  const styles = `
    .sahayog-ps-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1050;
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
      padding: 24px 28px 16px;
      border-bottom: 1px solid var(--border-color, #f1f5f9);
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .sahayog-ps-icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #eff6ff;
      color: #2563eb;
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
      font-size: 18px;
      font-weight: 700;
      color: var(--text-color, #0f172a);
      margin: 0 0 4px 0;
      line-height: 1.3;
    }

    .sahayog-ps-subtitle {
      font-size: 13px;
      color: var(--text-muted, #64748b);
      margin: 0;
      line-height: 1.4;
    }

    .sahayog-ps-body {
      padding: 20px 28px;
      max-height: calc(85vh - 160px);
      overflow-y: auto;
    }

    .sahayog-ps-form-group {
      margin-bottom: 16px;
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
      padding: 8px 40px 8px 12px;
      border: 1.5px solid var(--border-color, #cbd5e1);
      border-radius: 8px;
      font-size: 14px;
      background: var(--control-bg, #ffffff);
      color: var(--text-color, #0f172a);
      transition: all 0.2s ease;
      outline: none;
    }

    .sahayog-ps-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .sahayog-ps-toggle-eye {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .sahayog-ps-toggle-eye:hover {
      color: var(--text-color, #475569);
    }

    .sahayog-ps-policy-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-top: 8px;
      margin-bottom: 16px;
    }

    .sahayog-ps-policy-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 8px;
    }

    .sahayog-ps-rule-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 5px;
      transition: color 0.2s ease;
    }

    .sahayog-ps-rule-item:last-child {
      margin-bottom: 0;
    }

    .sahayog-ps-rule-item.valid {
      color: #16a34a;
      font-weight: 500;
    }

    .sahayog-ps-rule-item.invalid {
      color: #dc2626;
      font-weight: 500;
    }

    .sahayog-ps-rule-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .sahayog-ps-footer {
      padding: 16px 28px 24px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid var(--border-color, #f1f5f9);
    }

    .sahayog-ps-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      outline: none;
    }

    .sahayog-ps-btn-primary {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }

    .sahayog-ps-btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
    }

    .sahayog-ps-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .sahayog-ps-btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }

    .sahayog-ps-btn-secondary:hover {
      background: #e2e8f0;
      color: #1e293b;
    }

    .sahayog-ps-alert-error {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      color: #b91c1c;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      margin-bottom: 16px;
      display: none;
    }

    /* Top Reminder Bar */
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
      animation: sahayog-ps-fade-in 0.3s ease;
    }

    .sahayog-ps-reminder-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sahayog-ps-reminder-btn {
      padding: 4px 12px;
      background: #d97706;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .sahayog-ps-reminder-btn:hover {
      background: #b45309;
    }

    .sahayog-ps-reminder-close {
      background: transparent;
      border: none;
      color: #b45309;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0 4px;
      margin-left: 8px;
    }
  `;

  // Inject styles once
  const styleEl = document.createElement("style");
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);

  // SVG Icons
  const SVG_SHIELD = `<svg class="sahayog-ps-rule-icon" style="width:24px;height:24px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  const SVG_CHECK = `<svg class="sahayog-ps-rule-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const SVG_CROSS = `<svg class="sahayog-ps-rule-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const SVG_EYE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

  window.SahayogPasswordSecurity = {
    state: null,

    init: function () {
      // Check bootinfo if available
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
      } else if (data.show_reminder) {
        this.showReminderBanner(data.days_remaining, data.next_password_reset_date);
      }
    },

    showReminderBanner: function (daysRemaining, resetDate) {
      if (document.getElementById("sahayog-ps-reminder-bar")) return;
      if (sessionStorage.getItem("sahayog_ps_reminder_dismissed")) return;

      const formattedDate = frappe.datetime.str_to_user(resetDate) || resetDate;
      const reminderBar = document.createElement("div");
      reminderBar.id = "sahayog-ps-reminder-bar";
      reminderBar.className = "sahayog-ps-reminder-bar";
      reminderBar.innerHTML = `
        <div class="sahayog-ps-reminder-content">
          <span>🔒</span>
          <span>
            <strong>Password Reset Reminder:</strong> Scheduled password reset is required by <strong>${formattedDate}</strong> (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining).
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="sahayog-ps-reminder-btn" id="sahayog-ps-reminder-reset-btn">Reset Password</button>
          <button class="sahayog-ps-reminder-close" id="sahayog-ps-reminder-close-btn" title="Dismiss">✕</button>
        </div>
      `;

      const deskHeader = document.querySelector(".navbar") || document.body;
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
      // Remove any existing modal
      const existing = document.getElementById("sahayog-ps-backdrop");
      if (existing) existing.remove();

      const policy = (this.state && this.state.policy) ? this.state.policy : {
        min_password_length: 8,
        require_uppercase: 1,
        require_lowercase: 1,
        require_number: 1,
        allow_special_characters: 0
      };

      const formattedDate = (this.state && this.state.next_password_reset_date)
        ? (frappe.datetime.str_to_user(this.state.next_password_reset_date) || this.state.next_password_reset_date)
        : "";

      const subtitle = isMandatory
        ? `Mandatory security cycle active (${formattedDate}). Please create a new password to proceed.`
        : `Update your account password adhering to the security policy.`;

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
              <h3 class="sahayog-ps-title">${isMandatory ? 'Password Reset Required' : 'Change Password'}</h3>
              <p class="sahayog-ps-subtitle">${subtitle}</p>
            </div>
          </div>

          <div class="sahayog-ps-body">
            <div class="sahayog-ps-alert-error" id="sahayog-ps-error"></div>

            <div class="sahayog-ps-form-group">
              <label class="sahayog-ps-label" for="sahayog-ps-old-pwd">Current Password</label>
              <div class="sahayog-ps-input-wrap">
                <input type="password" id="sahayog-ps-old-pwd" class="sahayog-ps-input" placeholder="Enter current password" autocomplete="current-password" />
                <button type="button" class="sahayog-ps-toggle-eye" data-target="sahayog-ps-old-pwd">${SVG_EYE}</button>
              </div>
            </div>

            <div class="sahayog-ps-form-group">
              <label class="sahayog-ps-label" for="sahayog-ps-new-pwd">New Password</label>
              <div class="sahayog-ps-input-wrap">
                <input type="password" id="sahayog-ps-new-pwd" class="sahayog-ps-input" placeholder="Enter new password" autocomplete="new-password" />
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
          </div>

          <div class="sahayog-ps-footer">
            ${!isMandatory ? `<button type="button" class="sahayog-ps-btn sahayog-ps-btn-secondary" id="sahayog-ps-btn-cancel">Cancel</button>` : ''}
            <button type="button" class="sahayog-ps-btn sahayog-ps-btn-primary" id="sahayog-ps-btn-submit" disabled>
              <span>Reset Password</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      // Disable dismissing if mandatory
      if (isMandatory) {
        backdrop.addEventListener("keydown", (e) => {
          if (e.key === "Escape") e.stopPropagation();
        });
      } else {
        const cancelBtn = document.getElementById("sahayog-ps-btn-cancel");
        if (cancelBtn) cancelBtn.addEventListener("click", () => backdrop.remove());
      }

      // Eye toggle buttons
      backdrop.querySelectorAll(".sahayog-ps-toggle-eye").forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetId = btn.getAttribute("data-target");
          const input = document.getElementById(targetId);
          if (input) {
            input.type = input.type === "password" ? "text" : "password";
          }
        });
      });

      // Real-time Policy Validation
      const oldPwdInput = document.getElementById("sahayog-ps-old-pwd");
      const newPwdInput = document.getElementById("sahayog-ps-new-pwd");
      const confirmPwdInput = document.getElementById("sahayog-ps-confirm-pwd");
      const submitBtn = document.getElementById("sahayog-ps-btn-submit");
      const errorDiv = document.getElementById("sahayog-ps-error");

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
        const oldVal = oldPwdInput.value || "";

        let allValid = true;

        // 1. Min length
        const isLenValid = val.length >= policy.min_password_length;
        updateRuleStatus("rule-min-length", isLenValid);
        if (!isLenValid) allValid = false;

        // 2. Uppercase
        if (policy.require_uppercase) {
          const isUpper = /[A-Z]/.test(val);
          updateRuleStatus("rule-uppercase", isUpper);
          if (!isUpper) allValid = false;
        }

        // 3. Lowercase
        if (policy.require_lowercase) {
          const isLower = /[a-z]/.test(val);
          updateRuleStatus("rule-lowercase", isLower);
          if (!isLower) allValid = false;
        }

        // 4. Number
        if (policy.require_number) {
          const isNum = /[0-9]/.test(val);
          updateRuleStatus("rule-number", isNum);
          if (!isNum) allValid = false;
        }

        // 5. Special character check
        if (!policy.allow_special_characters) {
          const isAlphaNumOnly = val.length > 0 && /^[a-zA-Z0-9]+$/.test(val);
          updateRuleStatus("rule-no-special", isAlphaNumOnly);
          if (!isAlphaNumOnly) allValid = false;
        }

        // 6. Match
        const isMatch = val.length > 0 && val === confirmVal;
        updateRuleStatus("rule-match", isMatch);
        if (!isMatch) allValid = false;

        // Old password check
        if (!oldVal) allValid = false;

        submitBtn.disabled = !allValid;
      };

      newPwdInput.addEventListener("input", validateForm);
      confirmPwdInput.addEventListener("input", validateForm);
      oldPwdInput.addEventListener("input", validateForm);

      // Submit handler
      submitBtn.addEventListener("click", () => {
        const old_pwd = oldPwdInput.value;
        const new_pwd = newPwdInput.value;
        const confirm_pwd = confirmPwdInput.value;

        errorDiv.style.display = "none";
        errorDiv.innerText = "";
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Resetting...</span>`;

        frappe.call({
          method: "sahayog.api.password_security.reset_user_password",
          args: {
            old_password: old_pwd,
            new_password: new_pwd,
            confirm_password: confirm_pwd,
          },
          callback: (r) => {
            if (r.message && r.message.status === "success") {
              frappe.show_alert({
                message: __("Password reset successfully!"),
                indicator: "green",
              });
              backdrop.remove();
              const reminderBar = document.getElementById("sahayog-ps-reminder-bar");
              if (reminderBar) reminderBar.remove();

              // Reload Desk after short delay to refresh session context
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            }
          },
          error: (err) => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Reset Password</span>`;
            let msg = "Failed to reset password. Please check your credentials.";
            if (err && err._server_messages) {
              try {
                const parsed = JSON.parse(err._server_messages);
                const obj = JSON.parse(parsed[0]);
                msg = obj.message;
              } catch (e) {}
            }
            errorDiv.innerText = msg;
            errorDiv.style.display = "block";
          },
        });
      });
    },
  };

  // Run on page load
  $(document).ready(() => {
    SahayogPasswordSecurity.init();
  });
})();
