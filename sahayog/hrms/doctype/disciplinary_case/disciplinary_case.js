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

      frm.save(get_save_action(frm))
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
      const selected_value = values && values.suspension_required ? values.suspension_required : "";
      d.get_primary_btn().prop("disabled", true);

      frm.set_value("suspension_required", selected_value)
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
            message: __("Unable to update Suspension Required right now. Please try again."),
            indicator: "red",
          });
        });
    },
  });

  d.set_values({ suspension_required: current_value || "No" });
  d.show();
}

frappe.ui.form.on("Disciplinary Case", {
  refresh: function (frm) {
    if (frm.page && frm.page.set_title) {
      frm.page.set_title(__("Initiate Disciplinary Process"));
    }

    if (frm.is_new()) {
      $(frm.wrapper).find(".case-timeline-box").remove();
    }

    if (!frm.is_new()) {
      frm.add_custom_button("Send Email", function () {
        frappe.call({
          method:
            "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.check_employee_email",
          args: { employee: frm.doc.employee_id },
          callback(r) {
            let email = r.message;

            // CASE 1: Email exists
            if (email) {
              frappe.confirm(
                `This employee already has an email:<br><b>${email}</b><br><br>Do you want to send the SCN email?`,
                function () {
                  // Show freeze while sending email
                  frappe.call({
                    method:
                      "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.send_scn_email",
                    args: { docname: frm.doc.name },
                    freeze: true,
                    freeze_message: __("Sending SCN email..."),
                    callback(r) {
                      frappe.msgprint(__("SCN Email sent successfully!"));
                    },
                  });
                },
              );
            }
            // CASE 2: No email
            else {
              let d = new frappe.ui.Dialog({
                title: "Enter Employee Email",
                fields: [
                  {
                    fieldtype: "HTML",
                    fieldname: "info_html",
                    options: `
          <div style="margin-bottom: 10px; color:#a00; font-weight:bold;">
            No email address is stored for this employee.
          </div>
          <div style="margin-bottom: 10px;">
            Please enter the employee's email address below. 
            This will be saved to the Employee master and used for sending future emails.
          </div>
        `,
                  },
                  {
                    label: "Email",
                    fieldname: "manual_email",
                    fieldtype: "Data",
                    reqd: true,
                  },
                ],
                primary_action_label: "Submit",

                primary_action(values) {
                  let entered_email = values.manual_email;

                  // STEP 1: Save the entered email
                  frappe.call({
                    method:
                      "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.save_employee_email",
                    args: {
                      employee: frm.doc.employee_id,
                      email: entered_email,
                    },
                    freeze: true,
                    freeze_message: __("Saving Email..."),

                    callback() {
                      // STEP 2: Send SCN email after saving
                      frappe.call({
                        method:
                          "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.send_scn_email",
                        args: { docname: frm.doc.name },
                        freeze: true,
                        freeze_message: __("Sending SCN Email..."),

                        callback() {
                          frappe.msgprint(
                            __("Email saved and SCN Email sent successfully!"),
                          );
                          d.hide();
                        },
                      });
                    },
                  });
                },
              });

              d.show();
            }
          },
        });
      });
      function sendEmail(docname) {
        frappe.call({
          method:
            "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.send_scn_email",
          args: { docname },
          callback() {
            frappe.msgprint("SCN Email Sent Successfully!");
          },
        });
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

    // -------------------
    // Prevent typing alphabets in Amount of Fraud field
    // -------------------
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

    // -------------------
    // Conditional Mandatory + Hide for suspension_required
    // -------------------
    // handle_suspension_required(frm);
    // -------------------
    // Restrict linked records with save-check
    // -------------------
    setTimeout(() => {
      const $suspension_btn = $('button[data-doctype="Suspension Process"]');
      const $response_btn = $('button[data-doctype="Response to SCN"]');
      const $unauth_abs_btn = $('button[data-doctype="Unauthorized Absence"]');

      // Remove previous handlers (avoid duplicates)
      $suspension_btn.off("mousedown.suspension_check");
      $response_btn.off("mousedown.response_check");
      $unauth_abs_btn.off("mousedown.ua_check");

      // 🧩 Common Save Check
      const ensureSaved = (e, on_saved) => {
        if (frm.is_dirty()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          prompt_save_before_linked_action(frm, on_saved);
          return false;
        }
        return true;
      };

      // 🔸 Suspension Process Restriction
      $suspension_btn.on("mousedown.suspension_check", (e) => {
        if (!ensureSaved(e, () => $suspension_btn.trigger("click"))) return;

        // 🚫 Block if Case Type = Unauthorized Absence
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

        // If suspension is not required, offer to enable it and continue.
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

      // 🔸 Response to SCN Restriction
      $response_btn.on("mousedown.response_check", (e) => {
        if (!ensureSaved(e, () => $response_btn.trigger("click"))) return;

        // 🚫 Block if Case Type = Unauthorized Absence
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

        // Normal rule based on suspension_required
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

      // 🔸 Unauthorized Absence Restriction (only allowed for that case type)
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
      load_case_timeline(frm);
    }
  },
  // -------------------
  // Case Type Change
  // -------------------
  case_type(frm) {
    // handle_suspension_required(frm);
  },

  // -------------------
  // Field-level triggers
  // -------------------
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
                    @page {
                        size: A4;
                        margin: 0 !important;
                    }

                    html, body {
                        margin:0 !important;
                        padding:0 !important;
                        width:210mm !important;
                        height:297mm !important;
                        overflow:hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .print-page {
                        position:relative;
                        width:210mm; height:297mm;
                        overflow:hidden;
                    }

                    .print-body {
                        padding: 145px 30px 40px 30px;
                        height:100%;
                        box-sizing:border-box;
                        page-break-inside: avoid;
                    }
                `;
            doc.head.appendChild(style);

            const original = doc.body.innerHTML;

            doc.body.innerHTML = `
                    <div class="print-page">
                        ${original}
                    </div>
                `;

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
  // -------------------
  // excluded higher authority employees from employee selection
  // -------------------
  setup(frm) {
    frm.set_query("employee_id", function () {
      return {
        filters: {
          status: "Active",
          cxo_level: 0,
        },
      };
    });
  },
});

function load_case_timeline(frm) {
  const case_id = frm.doc.case_id || frm.doc.name;
  if (!case_id) return;

  const standard_stages = [
    { doctype: "Disciplinary Case", label: "Disciplinary Case", can_create: false },
    { doctype: "Suspension Process", label: "Suspension Process" },
    { doctype: "Response to SCN", label: "Response to SCN", allow_multiple: true },
    { doctype: "Domestic Enquiry", label: "Domestic Enquiry", allow_multiple: true },
    { doctype: "Enquiry Reminder", label: "Enquiry Reminder", allow_multiple: true },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const ua_stages = [
    { doctype: "Unauthorized Absence", label: "Unauthorized Absence", allow_multiple: true },
    { doctype: "Reminder Of Unauthorized Absence", label: "Reminder Of Unauthorized Absence", allow_multiple: true },
    { doctype: "Ex Parte Enquiry", label: "Ex Parte Enquiry", allow_multiple: true },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const is_ua = String(case_id).startsWith("UA") || (frm.doc.case_type || "").toLowerCase() === "unauthorized absence" || frm.doctype === "Unauthorized Absence" || frm.doctype === "Reminder Of Unauthorized Absence" || frm.doctype === "Ex Parte Enquiry";

  const stage_defs = (is_ua ? ua_stages : standard_stages).map((stage, index) => ({
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
  }));

  const build_config = (stages) => ({
    title: __("Case Progress Timeline"),
    case_id,
    stages,
    get_defaults(stage) { return stage.defaults || { case_id }; },
    before_open() {
      if (frm.doc.docstatus === 0) {
        frappe.msgprint({ title: __("Not Allowed"), message: __("Please <b>Submit</b> the current document before creating the next stage record."), indicator: "red" });
        return false;
      }
      if (frm.is_dirty()) {
        frappe.msgprint({ title: __("Please Save First"), message: __("Save the form before creating a linked record."), indicator: "orange" });
        return false;
      }
    },
    after_insert() { frm.reload_doc(); },
  });

  const merge_stage_meta = (timeline, record_summaries) => {
    let last_submitted_doctype = "";
    for (let stage of stage_defs) {
        const match = timeline.find(item => item.doctype === stage.doctype);
        if (match && match.status === "submitted") { last_submitted_doctype = stage.doctype; }
    }

    let next_doctype = "";
    if (!last_submitted_doctype) {
        next_doctype = stage_defs[0].doctype;
    } else {
        let last_match = timeline.find(t => t.doctype === last_submitted_doctype);
        let meta = last_match?.meta || {};
        let dt = last_submitted_doctype;
        if (dt === "Disciplinary Case") next_doctype = (meta.suspension_required === "Yes") ? "Suspension Process" : "Response to SCN";
        else if (dt === "Suspension Process") next_doctype = "Response to SCN";
        else if (dt === "Response to SCN") next_doctype = (String(meta.status_of_response).toLowerCase() === "satisfactory") ? "Case Closure" : "Domestic Enquiry";
        else if (dt === "Domestic Enquiry") next_doctype = (String(meta.status_of_response).toLowerCase() === "satisfactory") ? "Case Closure" : "Enquiry Reminder";
        else if (dt === "Enquiry Reminder") next_doctype = "Case Closure";
        else if (dt === "Unauthorized Absence") next_doctype = (String(meta.response_of_ua).toLowerCase() === "yes") ? "Case Closure" : "Reminder Of Unauthorized Absence";
        else if (dt === "Reminder Of Unauthorized Absence") next_doctype = (String(meta.response_of_reminder).toLowerCase() === "no") ? "Ex Parte Enquiry" : "Case Closure";
        else if (dt === "Ex Parte Enquiry") next_doctype = "Case Closure";
    }

    const has_draft = (frm.doc.docstatus === 0);
    const next_stage_index = stage_defs.findIndex(stage => stage.doctype === next_doctype);

    return stage_defs.map((stage, index) => {
      const status_match = timeline.find(item => item.doctype === stage.doctype);
      const summary_match = record_summaries.find(item => item.doctype === stage.doctype);
      
      let is_next_step = (stage.doctype === next_doctype);
      let is_already_started = (status_match && !["pending", "current"].includes(status_match.status));
      let is_past_or_current = (index <= next_stage_index);
      
      // Default: Strict progression logic
      let can_create = (is_next_step || (stage.allow_multiple && is_already_started && is_past_or_current)) && !has_draft;

      // Force disable if it's already created and doesn't allow multiple
      if (status_match && !stage.allow_multiple && ["saved", "submitted"].includes((status_match.status || "").toLowerCase())) {
          can_create = false;
      }
      
      return { ...stage, status: status_match?.status || stage.status, record_count: summary_match?.count || 0, names: summary_match?.names || [], can_create: can_create };
    });
  };

  const render_with_data = (timeline, summaries) => {
    const merged = merge_stage_meta(timeline || [], summaries || []);
    window.sahayogCaseTimeline.render(frm, build_config(merged));
  };

  const load_record_summaries = () => {
    return Promise.all(stage_defs.map((stage) => frappe.db.get_list(stage.doctype, { filters: { case_id }, fields: ["name"], order_by: "creation asc", limit_page_length: 500 }).then((records) => ({ doctype: stage.doctype, count: (records || []).length, names: (records || []).map((row) => row.name) })).catch(() => ({ doctype: stage.doctype, count: 0, names: [] }))));
  };

  const load_timeline = () => frappe.xcall("sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages", { case_id });

  const init = () => {
    if (!window.sahayogCaseTimeline) return;
    Promise.all([load_record_summaries(), load_timeline()]).then(([summaries, timeline_res]) => { const timeline = timeline_res && timeline_res.timeline ? timeline_res.timeline : []; render_with_data(timeline, summaries || []); }).catch((error) => { render_with_data([], []); });
  };

  if (window.sahayogCaseTimeline) { init(); return; }
  frappe.require("/assets/sahayog/js/case_timeline.js", init);
}
