frappe.provide("sahayog.dams");

window.sahayog = window.sahayog || {};

// ============================
// 1. SEND EMAIL BUTTON
// ============================
sahayog.dams.add_send_email_button = function (frm) {
  if (frm.is_new()) return;

  let btn = frm.add_custom_button(__("Send Email"), function () {
    sahayog.dams.open_email_composer(frm);
  });
  if (btn) {
    btn.removeClass("btn-default").addClass("btn-send-email-outlook");
  }
};

// ============================
// 2. MAIN ENTRY POINT
// ============================
sahayog.dams.open_email_composer = function (frm) {
  frappe.call({
    method: "sahayog.hrms.dams_email_service.get_dams_email_defaults",
    args: {
      doctype: frm.doc.doctype,
      docname: frm.doc.name,
    },
    callback: function (r) {
      console.log("DAMS Defaults =>", r.message);

      if (!r.message) {
        frappe.msgprint("Email defaults not found");
        return;
      }

      const defaults = r.message;

      frappe.call({
        method:
          "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.check_employee_email",
        args: { employee: frm.doc.employee_id || frm.doc.employee },
        callback: function (e) {
          const recipients = e.message ? [e.message] : [];

          sahayog.dams.render_email_dialog(frm, {
            template: defaults.template,
            print_format: defaults.print_format,
            print_formats: defaults.print_formats || null,
            recipients: recipients,
            cc_setting_field: [
                "Unauthorized Absence",
                "Reminder Of Unauthorized Absence",
                "Ex Parte Enquiry"
            ].includes(frm.doc.doctype)
              ? "unauthorized_absence_cc"
              : "disciplinary_case_cc",
          });
        },
      });
    },
  });
};

// ============================
// 3. EMAIL DIALOG UI (OUTLOOK STYLE)
// ============================
sahayog.dams.render_email_dialog = function (frm, options) {
  console.log("DEBUG: Rendering dialog with options:", options);

  frappe.db
    .get_single_value("Sahayog HR Setting", options.cc_setting_field)
    .then((fixed_cc) => {
      frappe.call({
        method: "sahayog.hrms.dams_email_service.get_email_template_preview",
        args: {
          template_name: options.template,
          doctype: frm.doc.doctype,
          docname: frm.doc.name,
        },
        callback: function (r) {
          console.log("DEBUG: Template preview response:", r);
          const preview = r.message || {};
          const subject = preview.subject || "";
          const body = preview.message || "";

          console.log("DEBUG: Options print_formats:", options.print_formats);
          console.log("DEBUG: Selector condition:", options.print_formats && options.print_formats.length > 1);

          // ... (rest of the function)
          let cc_values = [];
          if (fixed_cc) {
            cc_values = fixed_cc
              .split(/[,\n]/)
              .map((email) => email.trim())
              .filter(Boolean);
          }

          const d = new frappe.ui.Dialog({
            title: " ",
            size: "extra-large",
            fields: [
              {
                fieldtype: "HTML",
                fieldname: "outlook_header",
                options: `
                  <style>
                    /* Dialog Container Reset */
                    .modal-content { border-radius: 4px !important; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.2) !important; border: 1px solid #d2d0ce !important; }
                    .modal-header { display: none !important; } 
                    .modal-body { padding: 0 !important; background: #fff !important; }
                    .modal-footer { display: none !important; } 
                    
                    /* Outlook Top Action Bar */
                    .outlook-top-bar {
                      display: flex; justify-content: space-between; align-items: center;
                      padding: 12px 16px; background-color: #fff; border-bottom: 1px solid #f3f2f1;
                    }
                    .outlook-send-btn-grp { display: flex; align-items: center; }
                    .outlook-send-main {
                      background-color: #0078d4; color: #fff; border: none;
                      padding: 7px 20px; border-radius: 4px 0 0 4px; font-weight: 600;
                      display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer;
                    }
                    .outlook-send-main:hover { background-color: #106ebe; }
                    .outlook-send-arrow {
                      background-color: #0078d4; color: #fff; border: none; border-left: 1px solid #106ebe;
                      padding: 9px 10px; border-radius: 0 4px 4px 0; font-size: 11px; cursor: pointer;
                    }
                    .outlook-send-arrow:hover { background-color: #106ebe; }
                    .outlook-top-icons { display: flex; gap: 18px; color: #605e5c; font-size: 16px; align-items: center; }
                    .outlook-top-icons i { cursor: pointer; padding: 6px; border-radius: 4px; }
                    .outlook-top-icons i:hover { background-color: #f3f2f1; }

                    /* Row Adjustments for Outlook Fields */
                    .outlook-row {
                      display: flex; align-items: flex-start; padding: 8px 16px;
                      border-bottom: 1px solid #e0e0e0 !important; min-height: 44px; width: 100%;
                      flex-wrap: wrap;
                    }
                    .outlook-btn-label {
                      width: 52px; height: 26px; background: #fff; border: 1px solid #8a8886;
                      border-radius: 4px; color: #323130; font-size: 13px; font-weight: 400;
                      display: flex; align-items: center; justify-content: center; margin-right: 12px;
                      box-shadow: 0 1px 2px rgba(0,0,0,0.04); cursor: default; flex-shrink: 0;
                      margin-top: 4px;
                    }
                    
                    .outlook-chip-container {
                      display: flex; flex-wrap: wrap; gap: 6px; align-items: center; flex: 1;
                    }

                    .outlook-chip {
                      background: #f3f2f1;
                      border: 1px solid #d2d0ce;
                      border-radius: 14px;
                      padding: 2px 10px;
                      font-size: 13px;
                      display: inline-flex;
                      align-items: center;
                      color: #323130;
                      margin: 2px 0;
                      font-family: inherit;
                    }

                    .outlook-chip .remove-chip {
                      cursor: pointer; margin-left: 6px; font-size: 10px; color: #605e5c;
                    }

                    .outlook-chip-wrapper {
                      display: flex;
                      flex-wrap: wrap;
                      align-items: center;
                      gap: 6px;
                      flex: 1;
                      min-height: 32px;
                    }

                    .outlook-email-input {
                      border: none !important;
                      outline: none !important;
                      flex: 1;
                      min-width: 150px;
                      padding: 6px 0;
                      font-size: 14px;
                      background: transparent;
                    }

                    /* Subject Field Adjustments - Full Width Fix */
                    .outlook-subject-row { 
                      padding: 10px 16px !important; border-bottom: 1px solid #e0e0e0; 
                      display: block !important; width: 100% !important; 
                    }
                    .outlook-subject-row .form-group { margin-bottom: 0 !important; width: 100% !important; }
                    .outlook-subject-row .control-label { display: none !important; }
                    .outlook-subject-row .control-input-wrapper,
                    .outlook-subject-row input { 
                      font-size: 15px !important; font-weight: 400; border: none !important; 
                      box-shadow: none !important; padding: 6px 0 !important; width: 100% !important;
                    }

                    /* Text Editor Container */
                    .outlook-body-container { padding: 8px 16px; }
                    .outlook-body-container .form-group { margin-bottom: 0 !important; }
                    .outlook-body-container .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f3f2f1 !important; background: #fff; padding: 8px 0; }
                    .outlook-body-container .ql-container.ql-snow { border: none !important; min-height: 380px; font-size: 14px; }
                    
                    /* Attachment Styling */
                    .outlook-attachment {
                      display: inline-flex; align-items: center; gap: 8px;
                      padding: 6px 12px; background: #f3f2f1; border: 1px solid #edebe9;
                      border-radius: 4px; font-size: 13px; color: #323130; margin: 12px 16px;
                    }
                  </style>

                  <div class="outlook-top-bar">
                    <div class="outlook-send-btn-grp">
                      <button class="outlook-send-main" id="outlook_btn_send">
                        <i class="fa fa-paper-plane"></i> Send
                      </button>
                      <button class="outlook-send-arrow"><i class="fa fa-chevron-down"></i></button>
                    </div>
                    <div class="outlook-top-icons">
                      <i class="fa fa-shield" title="Security"></i>
                      <i class="fa fa-chevron-down" style="font-size:11px;"></i>
                      <i class="fa fa-trash-o" title="Discard" id="outlook_btn_close"></i>
                      <i class="fa fa-external-link" title="Pop out"></i>
                    </div>
                  </div>
                `,
              },
              {
                fieldtype: "HTML",
                fieldname: "to_row",
                options: `
                  <div class="outlook-row">
                      <div class="outlook-btn-label">To</div>
                      <div class="outlook-chip-wrapper">
                          <div id="to-chips" class="outlook-chip-container"></div>
                          <input type="text" id="to-input" class="outlook-email-input" placeholder="Add recipient">
                      </div>
                  </div>
                `,
              },
              {
                fieldtype: "HTML",
                fieldname: "cc_row",
                options: `
                  <div class="outlook-row">
                      <div class="outlook-btn-label">Cc</div>
                      <div class="outlook-chip-wrapper">
                          <div id="cc-chips" class="outlook-chip-container"></div>
                          <input type="text" id="cc-input" class="outlook-email-input" placeholder="Add recipient">
                      </div>
                  </div>
                `,
              },
              {
                fieldname: "subject",
                fieldtype: "Data",
                default: subject,
                placeholder: __("Add a subject"),
                reqd: 1,
              },
              {
                fieldname: "message",
                fieldtype: "Text Editor",
                default: body,
                reqd: 1,
              },
              {
                fieldtype: "HTML",
                fieldname: "attachment_box",
                options: `
                  <div class="outlook-attachment" id="attachment_container">
                    <i class="fa fa-paperclip" style="color: #605e5c;"></i> 
                    <a id="attachment_link" href="/printview?doctype=${frm.doc.doctype}&name=${frm.doc.name}&format=${encodeURIComponent(options.print_format)}" target="_blank">
                        <span><b>${frm.doc.name}.pdf</b></span>
                    </a>
                  </div>
                `,
              },
            ],
          });

          d.show();

          // --- Helper Logic ---
          const add_outlook_chip = (container_selector, email) => {
            email = email.trim();
            if (!email || !email.includes("@")) return;

            // Avoid duplicates
            let exists = false;
            d.$wrapper
              .find(container_selector)
              .find(".outlook-chip")
              .each(function () {
                if ($(this).data("email") === email) exists = true;
              });
            if (exists) return;

            d.$wrapper.find(container_selector).append(`
              <span class="outlook-chip" data-email="${email}">
                ${email}
                <i class="fa fa-times remove-chip"></i>
              </span>
            `);
          };

          // --- DOM & Event Listeners ---
          setTimeout(() => {
            // Force set subject value after show to prevent truncation
            d.set_value("subject", subject);

            // Pre-fill chips
            const to_emails = (options.recipients || []).filter(Boolean);
            const personal_email = frm.doc.personal_email;
            if (personal_email && !to_emails.includes(personal_email)) {
              to_emails.push(personal_email);
            }

            to_emails.forEach((email) => {
              add_outlook_chip("#to-chips", email);
            });

            cc_values.forEach((email) => {
              add_outlook_chip("#cc-chips", email);
            });

            // Structure 'Subject' Row
            let $subject_field = d.get_field("subject").$wrapper;
            $subject_field.wrap(
              '<div class="outlook-row outlook-subject-row"></div>',
            );

            // Wrap & Strip Text Editor
            let $message_field = d.get_field("message").$wrapper;
            $message_field.wrap('<div class="outlook-body-container"></div>');
            $message_field.find(".control-label").remove();

            // Chip addition listeners
            d.$wrapper.on("keydown", ".outlook-email-input", function (e) {
              if (["Enter", ",", "Tab"].includes(e.key)) {
                e.preventDefault();
                let val = $(this).val().replace(",", "").trim();
                if (val) {
                  let container_id =
                    "#" +
                    $(this).siblings(".outlook-chip-container").attr("id");
                  add_outlook_chip(container_id, val);
                  $(this).val("");
                }
              }
            });

            d.$wrapper.on("blur", ".outlook-email-input", function () {
              let val = $(this).val().replace(",", "").trim();
              if (val) {
                let container_id =
                  "#" + $(this).siblings(".outlook-chip-container").attr("id");
                add_outlook_chip(container_id, val);
                $(this).val("");
              }
            });

            // Chip removal
            d.$wrapper.on("click", ".remove-chip", function () {
              $(this).parent().remove();
            });

            // Ensure click on wrapper focuses input
            d.$wrapper.on("click", ".outlook-chip-wrapper", function (e) {
              if (
                !$(e.target).hasClass("remove-chip") &&
                !$(e.target).hasClass("outlook-chip")
              ) {
                $(this).find(".outlook-email-input").focus();
              }
            });

            // Bind Custom Send Button Functionality
            d.$wrapper.find("#outlook_btn_send").on("click", function () {
              let values = d.get_values();
              let subject = values.subject;
              let message = values.message;
              let selected_format =
                  values.print_format_selector ||
                  options.print_format ||
                  "Standard";

              if (!subject || !message) {
                frappe.msgprint(__("Subject and Message are mandatory."));
                return;
              }

              let recipients = [];
              d.$wrapper.find("#to-chips .outlook-chip").each(function () {
                recipients.push($(this).data("email"));
              });

              let cc = [];
              d.$wrapper.find("#cc-chips .outlook-chip").each(function () {
                cc.push($(this).data("email"));
              });

              if (recipients.length === 0) {
                frappe.msgprint(
                  __("At least one recipient is required in 'To'."),
                );
                return;
              }

              d.$wrapper
                .find("#outlook_btn_send")
                .prop("disabled", true)
                .text("Sending...");

              frappe.call({
                method: "sahayog.hrms.dams_email_service.send_custom_email",
                args: {
                  docname: frm.doc.name,
                  doctype: frm.doc.doctype,
                  recipients: recipients.join(","),
                  cc: cc.join(","),
                  subject: subject,
                  message: message,
                  print_format: selected_format, // Send selected format
                },
                freeze: true,
                freeze_message: __("Sending Email..."),
                callback: function (r) {
                  if (r.message === "OK") {
                    frappe.show_alert({
                      message: __("Email sent successfully"),
                      indicator: "green",
                    });
                    d.hide();
                  }
                },
                error: function () {
                  d.$wrapper
                    .find("#outlook_btn_send")
                    .prop("disabled", false)
                    .html('<i class="fa fa-paper-plane"></i> Send');
                },
              });
            });

            // Bind Custom Close Icon Functionality (Scoped)
            d.$wrapper.find("#outlook_btn_close").on("click", function () {
              d.hide();
            });
          }, 100);
        },
      });
    });
};
