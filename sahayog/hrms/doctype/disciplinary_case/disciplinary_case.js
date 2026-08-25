// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

function get_save_action(frm) {
  return frm && frm.doc && frm.doc.docstatus === 1 ? "Update" : "Save";
}

function prompt_save_before_linked_action(frm, on_success) {
  const d = new frappe.ui.Dialog({
    title: __("Save Disciplinary Case"),
    fields: [
      {
        fieldtype: "HTML",
        fieldname: "info_html",
        options: `
          <div style="font-size:13px; line-height:1.6; color:#344054;">
            <p style="margin:0 0 6px 0;">${__("This form has unsaved changes.")}</p>
            <p style="margin:0;">${__("Save first, then continue with the linked record action.")}</p>
          </div>
        `,
      },
    ],
    primary_action_label: __("Save & Continue"),
    secondary_action_label: __("Cancel"),
    primary_action() {
      d.get_primary_btn().prop("disabled", true);
      d.hide();

      frm
        .save(get_save_action(frm))
        .then(() => {
          if (typeof on_success === "function") on_success();
        })
        .catch((error) => {
          console.error("Failed to save Disciplinary Case", error);
          frappe.msgprint({
            title: __("Save Failed"),
            message: __("Unable to save right now. Please try again."),
            indicator: "red",
          });
        });
    },
  });

  d.show();
}

function prompt_enable_suspension_required(frm, on_success) {
  const current_value = frm.doc.suspension_required || "";
  const d = new frappe.ui.Dialog({
    title: __("Set Suspension Required"),
    fields: [
      {
        fieldtype: "HTML",
        fieldname: "info_html",
        options: `
          <div style="font-size:13px; line-height:1.6; color:#344054; margin-bottom:10px;">
            <p style="margin:0 0 6px 0;">${__("Suspension Process cannot be created while Suspension Required is set to No.")}</p>
            <p style="margin:0;">${__("Choose the value below, save the Disciplinary Case, and continue.")}</p>
          </div>
        `,
      },
      {
        fieldname: "suspension_required",
        fieldtype: "Select",
        label: __("Suspension Required"),
        options: "\nYes\nNo",
        default: current_value || "No",
        reqd: 1,
      },
    ],
    primary_action_label: __("Save"),
    secondary_action_label: __("Cancel"),
    primary_action(values) {
      const selected_value =
        values && values.suspension_required ? values.suspension_required : "";
      d.get_primary_btn().prop("disabled", true);

      frm
        .set_value("suspension_required", selected_value)
        .then(() => frm.save(get_save_action(frm)))
        .then(() => {
          d.hide();
          if (selected_value === "Yes" && typeof on_success === "function") {
            on_success();
          }
        })
        .catch((error) => {
          console.error("Failed to update suspension_required", error);
          d.get_primary_btn().prop("disabled", false);
          frappe.msgprint({
            title: __("Save Failed"),
            message: __(
              "Unable to update Suspension Required right now. Please try again.",
            ),
            indicator: "red",
          });
        });
    },
  });

  d.set_values({ suspension_required: current_value || "No" });
  d.show();
}

frappe.ui.form.on("Disciplinary Case", {
  setup(frm) {
    // Exclude higher authority employees from employee selection
    frm.set_query("employee_id", function () {
      return {
        filters: {
          status: "Active",
          cxo_level: 0,
        },
      };
    });
  },

  refresh: function (frm) {
    if (frm.page && frm.page.set_title) {
      frm.page.set_title(__("Initiate Disciplinary Process"));
    }

    if (frm.is_new()) {
      $(frm.wrapper).find(".case-timeline-box").remove();
    }

    if (!frm.is_new()) {
      const send_email_btn = frm.add_custom_button("Send Email", function () {
        // 1. Fetch CC setting from Sahayog HR Setting
        frappe.db
          .get_single_value("Sahayog HR Setting", "disciplinary_case_cc")
          .then((fixed_cc) => {
            frappe.call({
              method: "sahayog.hrms.dams_email_service.get_email_template_preview",
              args: {
                template_name: "Disciplinary - SCN",
                doctype: frm.doc.doctype,
                docname: frm.doc.name,
              },
              callback: function (r) {
                const preview = r.message || {};
                const subject = preview.subject || "";
                const body = preview.message || "";

                // CC values parsing
                let cc_values = [];
                if (fixed_cc) {
                  cc_values = fixed_cc
                    .split(/[,\n]/)
                    .map((email) => email.trim())
                    .filter(Boolean);
                }

                // Open Dialog with Custom HTML for Outlook Look
                const d = new frappe.ui.Dialog({
                  title: " ",
                  size: "extra-large",
                  class: "outlook-email-dialog",
                  fields: [
                    {
                      fieldtype: "HTML",
                      fieldname: "outlook_header",
                      options: `
                        <style>
                          /* Dialog Container Reset - scoped to outlook dialog only */
                          .outlook-email-dialog .modal-content { border-radius: 4px !important; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.2) !important; border: 1px solid #d2d0ce !important; }
                          .outlook-email-dialog .modal-header { display: none !important; } 
                          .outlook-email-dialog .modal-body { padding: 0 !important; background: #fff !important; }
                          .outlook-email-dialog .modal-footer { display: none !important; } 
                          
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

                          /* Hide placeholder if container has chips */
                          .outlook-chip-container:not(:empty) + .outlook-email-input::placeholder {
                            color: transparent;
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
                        <div class="outlook-attachment">
                          <i class="fa fa-paperclip" style="color: #605e5c;"></i> 
                          <span><b>${frm.doc.name}.pdf</b> (Disciplinary Case Notice)</span>
                        </div>
                      `,
                    },
                  ],
                });

                d.show();

                // --- Helper and DOM Logic ---
                const add_outlook_chip = (container_selector, email) => {
                  email = email.trim();
                  if (!email || !email.includes("@")) return;

                  // Avoid duplicates
                  let exists = false;
                  $(container_selector)
                    .find(".outlook-chip")
                    .each(function () {
                      if ($(this).data("email") === email) exists = true;
                    });
                  if (exists) return;

                  $(container_selector).append(`
                    <span class="outlook-chip" data-email="${email}">
                      ${email}
                      <i class="fa fa-times remove-chip"></i>
                    </span>
                  `);
                };

                // --- DOM & Event Listeners ---
                setTimeout(() => {
                  console.log("Pre-filling chips...");
                  // Force set subject value after show to prevent truncation
                  d.set_value("subject", subject);

                  console.log("Employee Email:", frm.doc.employee_email);
                  console.log("Personal Email:", frm.doc.personal_email);
                  console.log("CC Values Raw:", fixed_cc);

                  // Pre-fill chips after DOM is ready
                  const to_emails = [
                    frm.doc.employee_email,
                    frm.doc.personal_email,
                  ].filter(Boolean);

                  to_emails.forEach((email) => {
                    console.log("Adding To Chip:", email);
                    add_outlook_chip("#to-chips", email);
                  });

                  cc_values.forEach((email) => {
                    console.log("Adding CC Chip:", email);
                    add_outlook_chip("#cc-chips", email);
                  });

                  // Fallback for To chips
                  if (
                    d.$wrapper.find("#to-chips .outlook-chip").length === 0 &&
                    to_emails.length > 0
                  ) {
                    console.log("Fallback: Retrying To chips with d.$wrapper");
                    to_emails.forEach((email) => {
                      add_outlook_chip_manual(
                        d.$wrapper.find("#to-chips"),
                        email,
                      );
                    });
                  }

                  // Fallback for CC chips
                  if (
                    d.$wrapper.find("#cc-chips .outlook-chip").length === 0 &&
                    cc_values.length > 0
                  ) {
                    console.log("Fallback: Retrying CC chips with d.$wrapper");
                    cc_values.forEach((email) => {
                      add_outlook_chip_manual(
                        d.$wrapper.find("#cc-chips"),
                        email,
                      );
                    });
                  }

                  // Helper for manual fallback append
                  function add_outlook_chip_manual($container, email) {
                    let exists = false;
                    $container.find(".outlook-chip").each(function () {
                      if ($(this).data("email") === email) exists = true;
                    });
                    if (!exists && email && email.includes("@")) {
                      $container.append(`
                        <span class="outlook-chip" data-email="${email}">
                          ${email}
                          <i class="fa fa-times remove-chip"></i>
                        </span>
                      `);
                    }
                  }

                  // Structure 'Subject' Row
                  let $subject_field = d.get_field("subject").$wrapper;
                  $subject_field.wrap(
                    '<div class="outlook-row outlook-subject-row"></div>',
                  );

                  // Wrap & Strip Text Editor
                  let $message_field = d.get_field("message").$wrapper;
                  $message_field.wrap(
                    '<div class="outlook-body-container"></div>',
                  );
                  $message_field.find(".control-label").remove();

                  // Chip addition listeners
                  d.$wrapper.on(
                    "keydown",
                    ".outlook-email-input",
                    function (e) {
                      if (["Enter", ",", "Tab"].includes(e.key)) {
                        e.preventDefault();
                        let val = $(this).val().replace(",", "").trim();
                        if (val) {
                          let container_id =
                            "#" +
                            $(this)
                              .siblings(".outlook-chip-container")
                              .attr("id");
                          add_outlook_chip(container_id, val);
                          $(this).val("");
                        }
                      }
                    },
                  );

                  d.$wrapper.on("blur", ".outlook-email-input", function () {
                    let val = $(this).val().replace(",", "").trim();
                    if (val) {
                      let container_id =
                        "#" +
                        $(this).siblings(".outlook-chip-container").attr("id");
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
                    let subject = d.get_values().subject;
                    let message = d.get_values().message;

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

                    d.$wrapper.find("#outlook_btn_send")
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
                        print_format: "Disciplinary Case Notice",
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
                        d.$wrapper.find("#outlook_btn_send")
                          .prop("disabled", false)
                          .html('<i class="fa fa-paper-plane"></i> Send');
                      },
                    });
                  });

                  // Bind Custom Close Icon Functionality
                  $("#outlook_btn_close").on("click", function () {
                    d.hide();
                  });
                }, 60);
              },
            });
          });
      });
      if (send_email_btn) {
        send_email_btn.removeClass("btn-default").addClass("btn-send-email-outlook");
      }
    }
    let today = frappe.datetime.now_date();

    if (frm.fields_dict.issue_occurrence_date) {
      frm.fields_dict.issue_occurrence_date.df.max = today;
      frm.fields_dict.issue_occurrence_date.refresh();
    }

    if (frm.fields_dict.issue_report_to_hr) {
      frm.fields_dict.issue_report_to_hr.df.max = today;
      frm.fields_dict.issue_report_to_hr.refresh();
    }

    // Prevent typing alphabets in Amount of Fraud field
    if (
      frm.fields_dict.amount_of_fraud &&
      frm.fields_dict.amount_of_fraud.$input
    ) {
      frm.fields_dict.amount_of_fraud.$input.off("keypress.amount_check");
      frm.fields_dict.amount_of_fraud.$input.on(
        "keypress.amount_check",
        function (e) {
          const char = String.fromCharCode(e.which || e.keyCode);
          if (!/[0-9.]/.test(char)) {
            e.preventDefault();
          }
        },
      );
    }

    // Restrict linked records with save-check
    setTimeout(() => {
      const $suspension_btn = $('button[data-doctype="Suspension Process"]');
      const $response_btn = $('button[data-doctype="Response to SCN"]');
      const $unauth_abs_btn = $('button[data-doctype="Unauthorized Absence"]');

      $suspension_btn.off("mousedown.suspension_check");
      $response_btn.off("mousedown.response_check");
      $unauth_abs_btn.off("mousedown.ua_check");

      const ensureSaved = (e, on_saved) => {
        if (frm.is_dirty()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          prompt_save_before_linked_action(frm, on_saved);
          return false;
        }
        return true;
      };

      $suspension_btn.on("mousedown.suspension_check", (e) => {
        if (!ensureSaved(e, () => $suspension_btn.trigger("click"))) return;

        if (frm.doc.case_type === "Unauthorized Absence") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Suspension Process cannot be created when Case Type is 'Unauthorized Absence'.",
            ),
            indicator: "red",
          });
          return;
        }

        if (frm.doc.suspension_required === "No") {
          e.preventDefault();
          e.stopImmediatePropagation();
          prompt_enable_suspension_required(frm, () => {
            const button = $suspension_btn.get(0);
            if (button) {
              button.click();
            }
          });
        }
      });

      $response_btn.on("mousedown.response_check", (e) => {
        if (!ensureSaved(e, () => $response_btn.trigger("click"))) return;

        if (frm.doc.case_type === "Unauthorized Absence") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Response to SCN cannot be created when Case Type is 'Unauthorized Absence'.",
            ),
            indicator: "red",
          });
          return;
        }

        if (frm.doc.suspension_required === "Yes") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Response to SCN cannot be created because 'Suspension Required' is set to 'Yes'.",
            ),
            indicator: "red",
          });
        }
      });

      $unauth_abs_btn.on("mousedown.ua_check", (e) => {
        if (!ensureSaved(e, () => $unauth_abs_btn.trigger("click"))) return;

        if (frm.doc.case_type !== "Unauthorized Absence") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Unauthorized Absence record can only be created when Case Type is 'Unauthorized Absence'.",
            ),
            indicator: "red",
          });
        }
      });
    }, 1000);

    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.name,
        });
      });
      btn.removeClass("btn-default").addClass("btn-primary");
    }

    frm.trigger("show_print_button");

    if (!frm.is_new()) {
      setTimeout(() => load_case_timeline(frm), 0);
    }
  },

  case_type(frm) {
    // handle_suspension_required(frm);
  },

  employee_id: function (frm) {
    if (frm.doc.employee_id) {
      frappe.db.get_value(
        "Employee",
        frm.doc.employee_id,
        ["company_email", "personal_email"],
        (r) => {
          if (r) {
            if (r.company_email)
              frm.set_value("employee_email", r.company_email);
            if (r.personal_email)
              frm.set_value("personal_email", r.personal_email);
          }
        },
      );
    }
  },

  issue_occurrence_date: function (frm) {
    let today = frappe.datetime.now_date();
    if (
      frm.doc.issue_occurrence_date &&
      frm.doc.issue_occurrence_date > today
    ) {
      frappe.msgprint(
        "You cannot select a future date for Issue Occurrence Date.",
      );
      frm.set_value("issue_occurrence_date", "");
    }
  },

  issue_report_to_hr: function (frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.issue_report_to_hr && frm.doc.issue_report_to_hr > today) {
      frappe.msgprint(
        "You cannot select a future date for Issue Reported to HR.",
      );
      frm.set_value("issue_report_to_hr", "");
    }
  },

  amount_of_fraud: function (frm) {
    let value = frm.doc.amount_of_fraud;
    if (value && isNaN(value)) {
      frappe.msgprint({
        title: __("Invalid Input"),
        message: __(
          "Please enter a valid numeric amount in 'Amount of Fraud'.",
        ),
        indicator: "red",
      });
      frm.set_value("amount_of_fraud", 0);
    }
  },

  validate: function (frm) {
    let today = frappe.datetime.now_date();
    if (
      frm.doc.issue_occurrence_date &&
      frm.doc.issue_occurrence_date > today
    ) {
      frappe.throw(__("Issue Occurrence Date cannot be in the future."));
    }
    if (frm.doc.issue_report_to_hr && frm.doc.issue_report_to_hr > today) {
      frappe.throw(__("Issue Reported to HR Date cannot be in the future."));
    }
    if (frm.doc.amount_of_fraud && isNaN(frm.doc.amount_of_fraud)) {
      frappe.throw(__("Amount of Fraud must be a valid number."));
    }
  },

  show_print_button: function (frm) {
    if (!frm.is_new()) {
      const allowed_roles = [
        "System Manager",
        "HR Support Executive",
        "HR Support Manager",
      ];
      if (!frappe.user_roles.some((role) => allowed_roles.includes(role)))
        return;

      frm
        .add_custom_button(__("Print"), function () {
          const overlay = document.createElement("div");
          overlay.style = `
                position: fixed; top:0; left:0;
                width:100%; height:100%;
                background: rgba(255,255,255,0.65);
                display:flex; align-items:center; justify-content:center;
                font-size:18px; z-index:99999;
            `;
          overlay.innerHTML = "Preparing print...";
          document.body.appendChild(overlay);

          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = frappe.urllib.get_full_url(
            `/printview?doctype=${encodeURIComponent(frm.doc.doctype)}` +
              `&name=${encodeURIComponent(frm.doc.name)}` +
              `&format=${encodeURIComponent("Disciplinary Case Notice")}`,
          );
          document.body.appendChild(iframe);

          iframe.onload = () => {
            const doc = iframe.contentWindow.document;
            const style = doc.createElement("style");
            style.innerHTML = `
                    @page { size: A4; margin: 0 !important; }
                    html, body {
                        margin:0 !important; padding:0 !important;
                        width:210mm !important; height:297mm !important;
                        overflow:hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-page { position:relative; width:210mm; height:297mm; overflow:hidden; }
                    .print-body { padding: 145px 30px 40px 30px; height:100%; box-sizing:border-box; page-break-inside: avoid; }
                `;
            doc.head.appendChild(style);

            const original = doc.body.innerHTML;
            doc.body.innerHTML = `<div class="print-page">${original}</div>`;

            setTimeout(() => {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }, 500);

            const cleanup = () => {
              overlay.remove();
              iframe.remove();
            };
            iframe.contentWindow.addEventListener("afterprint", cleanup);
            setTimeout(cleanup, 5000);
          };

          iframe.onerror = () => {
            frappe.msgprint("Error loading print preview");
            overlay.remove();
            iframe.remove();
          };
        })
        .addClass("btn-primary");
    }
  },
});

function load_case_timeline(frm) {
  const case_id = frm.doc.case_id || frm.doc.name;
  if (!case_id) return;

  const standard_stages = [
    {
      doctype: "Disciplinary Case",
      label: "Disciplinary Case",
      can_create: false,
    },
    { doctype: "Suspension Process", label: "Suspension Process" },
    {
      doctype: "Response to SCN",
      label: "Response to SCN",
      allow_multiple: true,
    },
    {
      doctype: "Domestic Enquiry",
      label: "Domestic Enquiry",
      allow_multiple: true,
    },
    {
      doctype: "Enquiry Reminder",
      label: "Enquiry Reminder",
      allow_multiple: true,
    },
    {
      doctype: "Ex Parte Enquiry",
      label: "Ex Parte Enquiry",
      allow_multiple: true,
    },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const ua_stages = [
    {
      doctype: "Unauthorized Absence",
      label: "Unauthorized Absence",
      allow_multiple: true,
    },
    {
      doctype: "Reminder Of Unauthorized Absence",
      label: "Reminder Of Unauthorized Absence",
      allow_multiple: true,
    },
    {
      doctype: "Ex Parte Enquiry",
      label: "Ex Parte Enquiry",
      allow_multiple: true,
    },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const is_ua =
    String(case_id).startsWith("UA") ||
    (frm.doc.case_type || "").toLowerCase() === "unauthorized absence" ||
    frm.doctype === "Unauthorized Absence" ||
    frm.doctype === "Reminder Of Unauthorized Absence";

  const stage_defs = (is_ua ? ua_stages : standard_stages).map(
    (stage, index) => ({
      ...stage,
      key: `${stage.doctype}-${index}`,
      status: "current",
      modified: null,
      record_count: 0,
      names: [],
      can_create: stage.can_create !== false,
      allow_multiple: stage.allow_multiple || false,
      quick_entry: true,
      only_save: true,
      defaults: {
        case_id,
        ...(frm.doc.employee_id ? { employee_id: frm.doc.employee_id } : {}),
      },
    }),
  );

  const build_config = (stages) => ({
    title: __("Case Progress Timeline"),
    case_id,
    stages,
    get_defaults(stage) {
      return stage.defaults || { case_id };
    },
    before_open() {
      if (frm.doc.docstatus === 0) {
        frappe.msgprint({
          title: __("Not Allowed"),
          message: __(
            "Please <b>Submit</b> the current document before creating the next stage record.",
          ),
          indicator: "red",
        });
        return false;
      }
      if (frm.is_dirty()) {
        frappe.msgprint({
          title: __("Please Save First"),
          message: __("Save the form before creating a linked record."),
          indicator: "orange",
        });
        return false;
      }
    },
    after_insert() {
      frm.reload_doc();
    },
  });

  const merge_stage_meta = (timeline, record_summaries) => {
    let last_submitted_doctype = "";
    for (let stage of stage_defs) {
      const match = timeline.find((item) => item.doctype === stage.doctype);
      if (match && match.status === "submitted") {
        last_submitted_doctype = stage.doctype;
      }
    }

    let next_doctype = "";
    if (!last_submitted_doctype) {
      next_doctype = stage_defs[0].doctype;
    } else {
      let last_match = timeline.find(
        (t) => t.doctype === last_submitted_doctype,
      );
      let meta = last_match?.meta || {};
      let dt = last_submitted_doctype;
      if (dt === "Disciplinary Case")
        next_doctype =
          meta.suspension_required === "Yes"
            ? "Suspension Process"
            : "Response to SCN";
      else if (dt === "Suspension Process") next_doctype = "Response to SCN";
      else if (dt === "Response to SCN")
        next_doctype =
          String(meta.status_of_response).toLowerCase() === "satisfactory"
            ? "Case Closure"
            : "Domestic Enquiry";
      else if (dt === "Domestic Enquiry")
        next_doctype =
          String(meta.status_of_response).toLowerCase() === "satisfactory"
            ? "Case Closure"
            : "Enquiry Reminder";
      else if (dt === "Enquiry Reminder") next_doctype = (String(meta.enquiry_status).toLowerCase() === "attended") ? "Case Closure" : "Ex Parte Enquiry";
      else if (dt === "Unauthorized Absence")
        next_doctype =
          String(meta.response_of_ua).toLowerCase() === "yes"
            ? "Case Closure"
            : "Reminder Of Unauthorized Absence";
      else if (dt === "Reminder Of Unauthorized Absence")
        next_doctype =
          String(meta.response_of_reminder).toLowerCase() === "no"
            ? "Ex Parte Enquiry"
            : "Case Closure";
      else if (dt === "Ex Parte Enquiry") next_doctype = "Case Closure";
    }

    const has_draft = frm.doc.docstatus === 0;
    const next_stage_index = stage_defs.findIndex(
      (stage) => stage.doctype === next_doctype,
    );

    return stage_defs.map((stage, index) => {
      const status_match = timeline.find(
        (item) => item.doctype === stage.doctype,
      );
      const summary_match = record_summaries.find(
        (item) => item.doctype === stage.doctype,
      );

      let is_next_step = stage.doctype === next_doctype;
      let is_already_started =
        status_match && !["pending", "current"].includes(status_match.status);
      let is_past_or_current = index <= next_stage_index;

      // Default: Strict progression logic
      let can_create =
        (is_next_step ||
          (stage.allow_multiple && is_already_started && is_past_or_current)) &&
        !has_draft;

      // Force disable if it's already created and doesn't allow multiple
      if (
        status_match &&
        !stage.allow_multiple &&
        ["saved", "submitted"].includes(
          (status_match.status || "").toLowerCase(),
        )
      ) {
        can_create = false;
      }

      return {
        ...stage,
        status: status_match?.status || stage.status,
        record_count: summary_match?.count || 0,
        names: summary_match?.names || [],
        can_create: can_create,
      };
    });
  };

  const render_with_data = (timeline, summaries) => {
    const merged = merge_stage_meta(timeline || [], summaries || []);
    window.sahayogCaseTimeline.render(frm, build_config(merged));
  };

  const load_record_summaries = () => {
    return frappe.xcall(
      "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stage_counts",
      { case_id }
    ).then((counts) => stage_defs.map((stage) => ({
      doctype: stage.doctype,
      count: (counts[stage.doctype] || {}).count || 0,
      names: (counts[stage.doctype] || {}).names || [],
    }))).catch(() => stage_defs.map((stage) => ({
      doctype: stage.doctype,
      count: 0,
      names: [],
    })));
  };

  const load_timeline = () =>
    frappe.xcall(
      "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages",
      { case_id },
    );

  const init = () => {
    if (!window.sahayogCaseTimeline) return;
    Promise.all([load_record_summaries(), load_timeline()])
      .then(([summaries, timeline_res]) => {
        const timeline =
          timeline_res && timeline_res.timeline ? timeline_res.timeline : [];
        render_with_data(timeline, summaries || []);
      })
      .catch((error) => {
        render_with_data([], []);
      });
  };

  if (window.sahayogCaseTimeline) {
    init();
    return;
  }
  frappe.require("/assets/sahayog/js/case_timeline.js", init);
}
