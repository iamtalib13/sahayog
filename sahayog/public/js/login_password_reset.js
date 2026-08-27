// sahayog/public/js/login_password_reset.js
// Clean 3-Step Wizard Flow for /login#forgot
// Step 1: Employee ID & Channel Selection -> "Send OTP"
// Step 2: OTP Verification -> "Verify OTP" (+ Change ID / Retry button)
// Step 3: Set New Password -> "Set New Password"
// Theme Color: #417c7d

(function () {
  const THEME_COLOR = "#417c7d";

  const SVG_SHIELD = `<svg style="width: 20px; height: 20px; color: ${THEME_COLOR};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  const SVG_EYE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const SVG_CHECK = `<svg style="width:13px;height:13px;color:#16a34a;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const SVG_CROSS = `<svg style="width:13px;height:13px;color:#94a3b8;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  async function makeDirectCall(method, data) {
    const formData = new FormData();
    formData.append("cmd", method);
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null) {
        formData.append(k, v);
      }
    }

    const csrfToken = frappe.csrf_token || (frappe.boot && frappe.boot.csrf_token) || (window.frappe && window.frappe.csrf_token) || "";

    const response = await fetch("/", {
      method: "POST",
      headers: {
        "X-Frappe-CSRF-Token": csrfToken,
        "Accept": "application/json"
      },
      body: formData
    });

    const resJson = await response.json();

    if (resJson.exc || resJson.exc_type || resJson._server_messages) {
      let errMsg = "An error occurred during verification.";
      if (resJson._server_messages) {
        try {
          const parsed = JSON.parse(resJson._server_messages);
          const obj = JSON.parse(parsed[0]);
          errMsg = obj.message || errMsg;
        } catch (e) {}
      } else if (resJson.message && typeof resJson.message === "string") {
        errMsg = resJson.message;
      }
      throw new Error(errMsg);
    }

    return resJson.message;
  }

  window.SahayogLoginPasswordReset = {
    initialized: false,
    verifiedEmpId: null,
    verifiedUser: null,
    verifiedOtp: null,
    currentStep: 1,

    init: function () {
      if (this.initialized) return;
      const targetCard = document.querySelector(".for-forgot .login-content.page-card");
      if (!targetCard) return;

      this.initialized = true;
      this.renderStepperUI(targetCard);
    },

    renderStepperUI: function (card) {
      card.innerHTML = `
        <div id="sahayog-wizard-card" style="padding: 4px 2px;">
          <!-- Wizard Header -->
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: #e2eeee; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${SVG_SHIELD}
            </div>
            <div style="flex: 1;">
              <h4 style="margin: 0; font-size: 15.5px; font-weight: 700; color: #0f172a;" id="wizard-title">Password Reset</h4>
              <p style="margin: 0; font-size: 12px; color: #64748b;" id="wizard-subtitle">Step 1: Identify your account</p>
            </div>
          </div>

          <!-- Stepper Progress Bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; position: relative;">
            <div style="position: absolute; top: 13px; left: 24px; right: 24px; height: 2px; background: #e2e8f0; z-index: 1;">
              <div id="step-progress-line" style="height: 100%; width: 0%; background: ${THEME_COLOR}; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
            
            <div id="step-badge-1" style="display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 2;">
              <div class="step-circle" style="width: 28px; height: 28px; border-radius: 50%; background: ${THEME_COLOR}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 2px solid #ffffff; box-shadow: 0 0 0 2px ${THEME_COLOR};">1</div>
              <span style="font-size: 11px; font-weight: 600; color: ${THEME_COLOR};">Account</span>
            </div>

            <div id="step-badge-2" style="display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 2;">
              <div class="step-circle" style="width: 28px; height: 28px; border-radius: 50%; background: #ffffff; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 2px solid #cbd5e1;">2</div>
              <span style="font-size: 11px; font-weight: 500; color: #94a3b8;">OTP</span>
            </div>

            <div id="step-badge-3" style="display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 2;">
              <div class="step-circle" style="width: 28px; height: 28px; border-radius: 50%; background: #ffffff; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 2px solid #cbd5e1;">3</div>
              <span style="font-size: 11px; font-weight: 500; color: #94a3b8;">Password</span>
            </div>
          </div>

          <!-- Alert Box -->
          <div id="wizard-error-box" style="display: none; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px;">
            <div style="font-size: 12.5px; color: #991b1b; line-height: 1.4;" id="wizard-error-text"></div>
          </div>

          <!-- ==================== STEP 1: Identification ==================== -->
          <div id="wizard-step-1-content">
            <div class="form-group mb-3">
              <label style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 6px; display: block;">Employee ID</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="wiz-emp-id" class="form-control" placeholder="Enter Employee ID (e.g. 1234)" style="font-size: 13.5px; border-radius: 8px;" />
                <button type="button" id="wiz-btn-verify-id" class="btn btn-sm" style="white-space: nowrap; padding: 0 16px; font-weight: 600; background: ${THEME_COLOR}; color: #ffffff; border: none; border-radius: 8px;">
                  Verify
                </button>
              </div>
            </div>

            <!-- Matched Employee Details & Channel Radio -->
            <div id="wiz-channel-box" style="display: none; background: #f4f8f8; border: 1.5px solid #d0e1e1; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
              <div style="margin-bottom: 12px; font-size: 13px; font-weight: 700; color: #1e293b; display: flex; align-items: center; justify-content: space-between;">
                <span>👤 Employee Profile</span>
                <span style="font-size: 12px; font-weight: 600; color: ${THEME_COLOR}; background: #e2eeee; padding: 2px 10px; border-radius: 12px;" id="wiz-matched-name"></span>
              </div>

              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${THEME_COLOR}; letter-spacing: 0.5px; margin-bottom: 8px;">Select OTP Channel</div>
              
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
                <!-- Mobile Option -->
                <label id="wiz-channel-mobile-row" style="display: flex; align-items: center; gap: 10px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; cursor: pointer; transition: all 0.2s;">
                  <input type="radio" name="wiz_otp_channel" value="mobile" id="wiz-radio-mobile" checked style="accent-color: ${THEME_COLOR}; width: 16px; height: 16px;" />
                  <span style="font-size: 16px;">📱</span>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; font-weight: 600; color: #334155;">SMS to Mobile</div>
                    <div style="font-size: 12.5px; font-weight: 700; color: #1e293b;" id="wiz-matched-mobile"></div>
                  </div>
                </label>

                <!-- Email Option -->
                <label id="wiz-channel-email-row" style="display: flex; align-items: center; gap: 10px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 9px 12px; cursor: pointer; transition: all 0.2s;">
                  <input type="radio" name="wiz_otp_channel" value="email" id="wiz-radio-email" style="accent-color: ${THEME_COLOR}; width: 16px; height: 16px;" />
                  <span style="font-size: 16px;">✉️</span>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; font-weight: 600; color: #334155;">Company Email</div>
                    <div style="font-size: 12.5px; font-weight: 700; color: #1e293b;" id="wiz-matched-email"></div>
                  </div>
                </label>
              </div>

              <button type="button" id="wiz-btn-send-otp" class="btn btn-sm btn-block" style="font-weight: 600; background: ${THEME_COLOR}; color: #ffffff; border: none; border-radius: 8px; height: 38px;">
                Send Verification OTP
              </button>
            </div>
          </div>

          <!-- ==================== STEP 2: OTP Verification ==================== -->
          <div id="wizard-step-2-content" style="display: none;">
            <div style="background: #f4f8f8; border: 1px solid #d0e1e1; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">OTP Sent to:</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;" id="wiz-otp-target-text"></div>
              </div>
              <button type="button" id="wiz-btn-change-id" style="background: none; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; font-size: 11.5px; font-weight: 600; color: #475569; cursor: pointer;">
                Change ID / Retry
              </button>
            </div>

            <div class="form-group mb-3">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 13px; font-weight: 600; color: #1e293b; margin: 0;">Enter 4-Digit OTP</label>
                <button type="button" id="wiz-btn-resend-otp" style="background: none; border: none; color: ${THEME_COLOR}; font-size: 12px; cursor: pointer; padding: 0; font-weight: 700;">Resend OTP</button>
              </div>
              <input type="text" id="wiz-otp-input" maxlength="4" class="form-control" placeholder="• • • •" style="letter-spacing: 6px; font-weight: 700; font-size: 18px; text-align: center; border-radius: 8px; height: 44px;" autocomplete="one-time-code" />
            </div>

            <button type="button" id="wiz-btn-verify-otp" class="btn btn-sm btn-block" disabled style="opacity: 0.6; font-weight: 600; background: ${THEME_COLOR}; color: #ffffff; border: none; border-radius: 8px; height: 38px; margin-bottom: 6px;">
              Verify OTP & Proceed
            </button>
          </div>

          <!-- ==================== STEP 3: Create New Password ==================== -->
          <div id="wizard-step-3-content" style="display: none;">
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              ${SVG_CHECK}
              <span style="font-size: 12px; font-weight: 600; color: #065f46;">Identity Verified! Create your new password below.</span>
            </div>

            <div class="form-group mb-3">
              <label style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 6px; display: block;">New Password</label>
              <div style="position: relative; display: flex; align-items: center;">
                <input type="password" id="wiz-new-pwd" class="form-control" placeholder="Create new password" style="padding-right: 38px; border-radius: 8px;" />
                <button type="button" class="wiz-toggle-eye" data-target="wiz-new-pwd" style="position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px;">${SVG_EYE}</button>
              </div>
            </div>

            <div class="form-group mb-3">
              <label style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 6px; display: block;">Confirm New Password</label>
              <div style="position: relative; display: flex; align-items: center;">
                <input type="password" id="wiz-confirm-pwd" class="form-control" placeholder="Re-enter new password" style="padding-right: 38px; border-radius: 8px;" />
                <button type="button" class="wiz-toggle-eye" data-target="wiz-confirm-pwd" style="position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px;">${SVG_EYE}</button>
              </div>
            </div>

            <!-- Password Policy Box -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px;">Password Requirements</div>
              <div id="wiz-rule-length" style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #64748b; margin-bottom: 4px;">
                <span class="rule-icon">${SVG_CROSS}</span><span>Minimum 8 characters</span>
              </div>
              <div id="wiz-rule-upper" style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #64748b; margin-bottom: 4px;">
                <span class="rule-icon">${SVG_CROSS}</span><span>At least one uppercase letter (A-Z)</span>
              </div>
              <div id="wiz-rule-lower" style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #64748b; margin-bottom: 4px;">
                <span class="rule-icon">${SVG_CROSS}</span><span>At least one lowercase letter (a-z)</span>
              </div>
              <div id="wiz-rule-number" style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #64748b; margin-bottom: 4px;">
                <span class="rule-icon">${SVG_CROSS}</span><span>At least one number (0-9)</span>
              </div>
              <div id="wiz-rule-match" style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #64748b;">
                <span class="rule-icon">${SVG_CROSS}</span><span>Passwords match</span>
              </div>
            </div>

            <button type="button" id="wiz-btn-submit-pwd" class="btn btn-sm btn-block" disabled style="opacity: 0.6; font-weight: 600; background: ${THEME_COLOR}; color: #ffffff; border: none; border-radius: 8px; height: 38px;">
              Set New Password
            </button>
          </div>

          <p class="text-center sign-up-message mt-3 mb-0">
            <a href="#login" style="font-size: 13px; color: ${THEME_COLOR}; text-decoration: none; font-weight: 600;">← Back to Login</a>
          </p>
        </div>
      `;

      this.bindEvents(card);
    },

    setStep: function (step) {
      this.currentStep = step;
      const step1 = document.getElementById("wizard-step-1-content");
      const step2 = document.getElementById("wizard-step-2-content");
      const step3 = document.getElementById("wizard-step-3-content");
      const title = document.getElementById("wizard-title");
      const subtitle = document.getElementById("wizard-subtitle");
      const progLine = document.getElementById("step-progress-line");

      const badge1 = document.querySelector("#step-badge-1 .step-circle");
      const badge2 = document.querySelector("#step-badge-2 .step-circle");
      const badge3 = document.querySelector("#step-badge-3 .step-circle");
      const label1 = document.querySelector("#step-badge-1 span");
      const label2 = document.querySelector("#step-badge-2 span");
      const label3 = document.querySelector("#step-badge-3 span");

      // Hide all step sections
      step1.style.display = "none";
      step2.style.display = "none";
      step3.style.display = "none";

      if (step === 1) {
        step1.style.display = "block";
        title.innerText = "Password Reset";
        subtitle.innerText = "Step 1: Identify your account";
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
        title.innerText = "OTP Verification";
        subtitle.innerText = "Step 2: Enter verification code";
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
        title.innerText = "Set New Password";
        subtitle.innerText = "Step 3: Create a strong password";
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
    },

    bindEvents: function (card) {
      const empInput = document.getElementById("wiz-emp-id");
      const verifyIdBtn = document.getElementById("wiz-btn-verify-id");
      const channelBox = document.getElementById("wiz-channel-box");
      const matchedName = document.getElementById("wiz-matched-name");
      const matchedMobile = document.getElementById("wiz-matched-mobile");
      const matchedEmail = document.getElementById("wiz-matched-email");
      const channelMobileRow = document.getElementById("wiz-channel-mobile-row");
      const channelEmailRow = document.getElementById("wiz-channel-email-row");
      const radioMobile = document.getElementById("wiz-radio-mobile");
      const radioEmail = document.getElementById("wiz-radio-email");
      const sendOtpBtn = document.getElementById("wiz-btn-send-otp");

      const changeIdBtn = document.getElementById("wiz-btn-change-id");
      const otpTargetText = document.getElementById("wiz-otp-target-text");
      const resendBtn = document.getElementById("wiz-btn-resend-otp");
      const otpInput = document.getElementById("wiz-otp-input");
      const verifyOtpBtn = document.getElementById("wiz-btn-verify-otp");

      const newPwdInput = document.getElementById("wiz-new-pwd");
      const confirmPwdInput = document.getElementById("wiz-confirm-pwd");
      const submitPwdBtn = document.getElementById("wiz-btn-submit-pwd");

      const errorBox = document.getElementById("wizard-error-box");
      const errorText = document.getElementById("wizard-error-text");

      const showError = (msg) => {
        errorText.innerHTML = msg;
        errorBox.style.display = "block";
      };
      const hideError = () => {
        errorText.innerHTML = "";
        errorBox.style.display = "none";
      };

      // Reset Step 1 box when user edits text
      empInput.addEventListener("input", () => {
        hideError();
        channelBox.style.display = "none";
        verifyIdBtn.disabled = false;
        verifyIdBtn.innerText = "Verify";
      });

      // Change ID / Retry Action -> Resets back to Step 1
      changeIdBtn.addEventListener("click", () => {
        hideError();
        this.verifiedOtp = null;
        otpInput.value = "";
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.style.opacity = "0.6";
        this.setStep(1);
        empInput.focus();
      });

      // Channel Radio UI toggle
      const updateRadioVisuals = () => {
        const sel = document.querySelector("input[name='wiz_otp_channel']:checked")?.value || "mobile";
        channelMobileRow.style.borderColor = sel === "mobile" ? THEME_COLOR : "#cbd5e1";
        channelMobileRow.style.background = sel === "mobile" ? "#f4f8f8" : "#ffffff";
        channelEmailRow.style.borderColor = sel === "email" ? THEME_COLOR : "#cbd5e1";
        channelEmailRow.style.background = sel === "email" ? "#f4f8f8" : "#ffffff";
      };
      radioMobile.addEventListener("change", updateRadioVisuals);
      radioEmail.addEventListener("change", updateRadioVisuals);

      // Eye toggle
      document.querySelectorAll(".wiz-toggle-eye").forEach((btn) => {
        btn.addEventListener("click", () => {
          const targetId = btn.getAttribute("data-target");
          const input = document.getElementById(targetId);
          if (input) {
            input.type = input.type === "password" ? "text" : "password";
          }
        });
      });

      // Step 1: Verify Employee ID
      const executeVerifyId = async () => {
        const empId = (empInput.value || "").trim();
        if (!empId) {
          showError("Please enter your Employee ID.");
          return;
        }

        hideError();
        verifyIdBtn.disabled = true;
        verifyIdBtn.innerText = "Checking...";

        try {
          const res = await makeDirectCall("sahayog.api.password_security.check_user_mobile_status", {
            user_identifier: empId
          });

          if (res && res.status === "success") {
            window.SahayogLoginPasswordReset.verifiedEmpId = empId;
            window.SahayogLoginPasswordReset.verifiedUser = res.user;
            matchedName.innerText = res.employee_name || "Employee";

            let hasChannel = false;
            if (res.has_mobile) {
              matchedMobile.innerText = res.masked_mobile;
              channelMobileRow.style.display = "flex";
              hasChannel = true;
            } else {
              channelMobileRow.style.display = "none";
            }

            if (res.has_email) {
              matchedEmail.innerText = res.masked_email;
              channelEmailRow.style.display = "flex";
              hasChannel = true;
            } else {
              channelEmailRow.style.display = "none";
            }

            if (!hasChannel) {
              channelBox.style.display = "none";
              verifyIdBtn.disabled = false;
              verifyIdBtn.innerText = "Verify";
              showError("No registered mobile or email found for this profile. Please contact IT support.");
              return;
            }

            if (res.default_channel === "email" || !res.has_mobile) {
              radioEmail.checked = true;
            } else {
              radioMobile.checked = true;
            }
            updateRadioVisuals();

            channelBox.style.display = "block";
            verifyIdBtn.disabled = true;
            verifyIdBtn.innerText = "Verified ✓";
          }
        } catch (err) {
          channelBox.style.display = "none";
          verifyIdBtn.disabled = false;
          verifyIdBtn.innerText = "Verify";
          showError(err.message || `No active user account found matching '${empId}'.`);
        }
      };

      verifyIdBtn.addEventListener("click", executeVerifyId);
      empInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          executeVerifyId();
        }
      });

      // Step 1 -> Send OTP (Proceeds to Step 2)
      const executeSendOtp = async () => {
        const empId = window.SahayogLoginPasswordReset.verifiedEmpId || (empInput.value || "").trim();
        const channel = document.querySelector("input[name='wiz_otp_channel']:checked")?.value || "mobile";

        hideError();
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerText = "Sending OTP...";

        try {
          const res = await makeDirectCall("sahayog.api.password_security.send_password_reset_otp", {
            user_identifier: empId,
            channel: channel
          });

          if (res && res.status === "success") {
            otpTargetText.innerText = res.masked_target || (channel === "email" ? "Company Email" : "Mobile SMS");
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerText = "Send Verification OTP";

            // Switch to Step 2
            window.SahayogLoginPasswordReset.setStep(2);
            otpInput.value = "";
            otpInput.focus();

            // Resend timer
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
        } catch (err) {
          sendOtpBtn.disabled = false;
          sendOtpBtn.innerText = "Send Verification OTP";
          showError(err.message || "Failed to dispatch OTP. Please try again.");
        }
      };

      sendOtpBtn.addEventListener("click", executeSendOtp);
      resendBtn.addEventListener("click", executeSendOtp);

      // Step 2: OTP Input Listener (Auto-enable at 6 digits)
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

      // Step 2: Verify OTP Action -> Proceeds to Step 3
      const executeVerifyOtp = async () => {
        const empId = window.SahayogLoginPasswordReset.verifiedEmpId;
        const otpVal = (otpInput.value || "").trim();

        hideError();
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.innerText = "Verifying...";

        try {
          const res = await makeDirectCall("sahayog.api.password_security.verify_otp_only", {
            user_identifier: empId,
            otp: otpVal
          });

          if (res && res.status === "success") {
            window.SahayogLoginPasswordReset.verifiedOtp = otpVal;
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerText = "Verify OTP & Proceed";

            // Switch to Step 3
            window.SahayogLoginPasswordReset.setStep(3);
            newPwdInput.value = "";
            confirmPwdInput.value = "";
            newPwdInput.focus();
          }
        } catch (err) {
          verifyOtpBtn.disabled = false;
          verifyOtpBtn.innerText = "Verify OTP & Proceed";
          showError(err.message || "Invalid or expired OTP. Please check and try again.");
        }
      };

      verifyOtpBtn.addEventListener("click", executeVerifyOtp);
      otpInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (otpInput.value || "").trim().length === 4) {
          e.preventDefault();
          executeVerifyOtp();
        }
      });

      // Step 3: Password Validation Rules
      const updateRule = (id, isValid) => {
        const el = document.getElementById(id);
        if (!el) return;
        const icon = el.querySelector(".rule-icon");
        if (isValid) {
          el.style.color = "#16a34a";
          el.style.fontWeight = "600";
          if (icon) icon.innerHTML = SVG_CHECK;
        } else {
          el.style.color = "#64748b";
          el.style.fontWeight = "normal";
          if (icon) icon.innerHTML = SVG_CROSS;
        }
      };

      const validateStep3 = () => {
        const pwd = newPwdInput.value || "";
        const confirm = confirmPwdInput.value || "";

        let allValid = true;

        const isLen = pwd.length >= 8;
        updateRule("wiz-rule-length", isLen);
        if (!isLen) allValid = false;

        const isUpper = /[A-Z]/.test(pwd);
        updateRule("wiz-rule-upper", isUpper);
        if (!isUpper) allValid = false;

        const isLower = /[a-z]/.test(pwd);
        updateRule("wiz-rule-lower", isLower);
        if (!isLower) allValid = false;

        const isNum = /[0-9]/.test(pwd);
        updateRule("wiz-rule-number", isNum);
        if (!isNum) allValid = false;

        const isMatch = pwd.length > 0 && pwd === confirm;
        updateRule("wiz-rule-match", isMatch);
        if (!isMatch) allValid = false;

        submitPwdBtn.disabled = !allValid;
        submitPwdBtn.style.opacity = allValid ? "1" : "0.6";
      };

      newPwdInput.addEventListener("input", validateStep3);
      confirmPwdInput.addEventListener("input", validateStep3);

      // Step 3: Final Password Submission
      submitPwdBtn.addEventListener("click", async () => {
        const empId = window.SahayogLoginPasswordReset.verifiedEmpId;
        const otpVal = window.SahayogLoginPasswordReset.verifiedOtp;
        const newPwd = newPwdInput.value;
        const confirmPwd = confirmPwdInput.value;

        hideError();
        submitPwdBtn.disabled = true;
        submitPwdBtn.innerText = "Updating Password...";

        try {
          const res = await makeDirectCall("sahayog.api.password_security.set_new_password_with_otp", {
            user_identifier: empId,
            otp: otpVal,
            new_password: newPwd,
            confirm_password: confirmPwd
          });

          if (res && res.status === "success") {
            card.innerHTML = `
              <div style="padding: 24px 16px; text-align: center;">
                <div style="width: 52px; height: 52px; border-radius: 50%; background: #ecfdf5; color: #16a34a; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                  <svg style="width: 28px; height: 28px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h4 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Password Reset Successful!</h4>
                <p style="font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.5;">Your account password has been updated securely. You can now log in with your new password.</p>
                <a href="#login" class="btn btn-sm btn-block" style="font-weight: 600; background: ${THEME_COLOR}; color: #ffffff; border: none; border-radius: 8px; height: 38px; display: inline-flex; align-items: center; justify-content: center;">
                  Proceed to Login
                </a>
              </div>
            `;
          }
        } catch (err) {
          submitPwdBtn.disabled = false;
          submitPwdBtn.innerText = "Set New Password";
          showError(err.message || "Failed to update password. Please try again.");
        }
      });
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.SahayogLoginPasswordReset.init();
  });
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#forgot") {
      setTimeout(() => window.SahayogLoginPasswordReset.init(), 100);
    }
  });
})();
