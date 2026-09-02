// Copyright (c) 2025, Developer Team
// For license information, please see license.txt

frappe.ui.form.on("Domestic Enquiry", {
  refresh(frm) {
    if (frm.page && frm.page.set_title) {
      frm.page.set_title(__("Domestic Enquiry Process"));
    }
    // send email button
    if (!frm.is_new()) {
      sahayog.dams.add_send_email_button(frm);
    }
    /*
    if (!frm.is_new()) {
      frm.add_custom_button("Send Email", function () {
        frappe.call({
          method:
            "sahayog.hrms.doctype.domestic_enquiry.domestic_enquiry.check_employee_email",
          args: { employee: frm.doc.employee_id },
          callback(r) {
            let email = r.message;

            // CASE: Email exists
            if (email) {
              frappe.confirm(
                `Employee email found:<br><b>${email}</b><br><br>Do you want to send the Domestic Enquiry Notice email?`,
                function () {
                  frappe.call({
                    method:
                      "sahayog.hrms.doctype.domestic_enquiry.domestic_enquiry.send_domestic_enquiry_email",
                    args: { docname: frm.doc.name },
                    freeze: true,
                    freeze_message: __(
                      "Sending Domestic Enquiry Notice Email..."
                    ),
                    callback() {
                      frappe.msgprint(
                        __("Domestic Enquiry Notice Email sent successfully!")
                      );
                    },
                  });
                }
              );
            }

            // CASE: No email found
            else {
              frappe.msgprint({
                title: __("Email Not Found"),
                indicator: "red",
                message: __(
                  "No email is stored for this employee.<br>Please update the Employee record before sending the email."
                ),
              });
            }
          },
        });
      });
    }
    */
    // view case history button
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    // debug: log refresh event

    // ✅ Call print button function
    frm.trigger("show_print_button");

    // Skip logic for unsaved (new) records
    frappe.after_ajax(() => {
      const $enquiryReminderBtn = $(`button[data-doctype="Enquiry Reminder"]`);
      const $caseClosureBtn = $(`button[data-doctype="Case Closure"]`);

      // Remove any previously attached handlers (preventing duplicate handlers)
      $enquiryReminderBtn.off("mousedown.er_check");
      $caseClosureBtn.off("mousedown.cc_check");

      // 🧩 Common Save Check
      const ensureSaved = (e) => {
        if (frm.is_dirty()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Please Save First"),
            message: __("Save the form before creating a linked record."),
            indicator: "orange",
          });
          return false;
        }
        return true;
      };

      // 🔸 Enquiry Reminder Restriction
      $enquiryReminderBtn.on("mousedown.er_check", (e) => {
        if (!ensureSaved(e)) return;

        if (frm.doc.status_of_response === "Satisfactory") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Enquiry Reminder cannot be created when 'Status of Response' is <b>Satisfactory</b>."
            ),
            indicator: "red",
          });
        }
      });

      // 🔸 Case Closure Restriction
      $caseClosureBtn.on("mousedown.cc_check", (e) => {
        if (!ensureSaved(e)) return;

        if (frm.doc.status_of_response !== "Satisfactory") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Case Closure can only be created when 'Status of Response' is <b>Satisfactory</b>."
            ),
            indicator: "orange",
          });
        }
      });
    });
    if (!frm.is_new()) {
      setTimeout(() => load_case_timeline(frm), 0);
    }
  },

  date_of_enquiry(frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.date_of_enquiry && frm.doc.date_of_enquiry < today) {
      frappe.msgprint({
        title: __("Invalid Date"),
        message: __("You cannot select a past date for Date of Enquiry."),
        indicator: "red",
      });
      frm.set_value("date_of_enquiry", "");
    }
  },

  validate(frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.date_of_enquiry && frm.doc.date_of_enquiry < today) {
      frappe.throw(__("Date of Enquiry cannot be in the past."));
    }
  },

  show_print_button: function (frm) {

    // ✅ Only allow for saved documents
    if (!frm.is_new()) {
      const allowed_roles = [
        "System Manager",
        "HR Support Executive",
        "HR Support Manager",
      ];
      if (frappe.user_roles.some((role) => allowed_roles.includes(role))) {
        frm
          .add_custom_button(__("Print"), function () {
            // Create overlay
            const overlay = document.createElement("div");
            overlay.id = "print-overlay";
            overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255,255,255,0.6);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #333;
      `;
            overlay.innerHTML = "Preparing print preview...";
            document.body.appendChild(overlay);

            // Create hidden iframe for print preview
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = frappe.urllib.get_full_url(
              `/printview?doctype=${encodeURIComponent(
                frm.doc.doctype
              )}&name=${encodeURIComponent(
                frm.doc.name
              )}&format=${encodeURIComponent("Domestic Enquiry")}`
            );
            document.body.appendChild(iframe);

            iframe.onload = () => {
              setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
              }, 2000);

              let done = false;
              const cleanup = () => {
                if (done) return;
                done = true;
                overlay.remove();
                iframe.remove();
              };

              iframe.contentWindow.addEventListener("afterprint", cleanup);
              setTimeout(cleanup, 6000);
            };

            iframe.onerror = () => {
              frappe.msgprint(__("Error loading print preview"));
              overlay.remove();
              iframe.remove();
            };
          })
          .addClass("btn-primary");
      }
    }
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
    { doctype: "Ex Parte Enquiry", label: "Ex Parte Enquiry", allow_multiple: true },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const ua_stages = [
    { doctype: "Unauthorized Absence", label: "Unauthorized Absence", allow_multiple: true },
    { doctype: "Reminder Of Unauthorized Absence", label: "Reminder Of Unauthorized Absence", allow_multiple: true },
    { doctype: "Ex Parte Enquiry", label: "Ex Parte Enquiry", allow_multiple: true },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const is_ua = String(case_id).startsWith("UA") || (frm.doc.case_type || "").toLowerCase() === "unauthorized absence" || frm.doctype === "Unauthorized Absence" || frm.doctype === "Reminder Of Unauthorized Absence";

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
        else if (dt === "Enquiry Reminder") next_doctype = (String(meta.enquiry_status).toLowerCase() === "attended") ? "Case Closure" : "Ex Parte Enquiry";
        else if (dt === "Ex Parte Enquiry") next_doctype = "Case Closure";
        else if (dt === "Unauthorized Absence") next_doctype = (String(meta.response_of_ua).toLowerCase() === "yes") ? "Case Closure" : "Reminder Of Unauthorized Absence";
        else if (dt === "Reminder Of Unauthorized Absence") next_doctype = (String(meta.response_of_reminder).toLowerCase() === "no") ? "Ex Parte Enquiry" : "Case Closure";
        else if (dt === "Ex Parte Enquiry") next_doctype = "Case Closure";
    }

    const has_draft = (frm.doc.docstatus === 0);
    const next_stage_index = stage_defs.findIndex(s => s.doctype === next_doctype);

    return stage_defs.map((stage, index) => {
      const status_match = timeline.find(item => item.doctype === stage.doctype);
      const summary_match = record_summaries.find(item => item.doctype === stage.doctype);
      
      let is_next_step = (stage.doctype === next_doctype);
      let is_already_started = (status_match && !["pending", "current"].includes(status_match.status));
      let is_past_or_current = (index <= next_stage_index);
      
      let can_create = (is_next_step || (stage.allow_multiple && is_already_started && is_past_or_current)) && !has_draft;

      // Force disable if it's already created and doesn't allow multiple
      if (status_match && status_match.status !== "current" && !stage.allow_multiple) {
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
    return frappe.xcall("sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stage_counts", { case_id }).then((counts) => stage_defs.map((stage) => ({ doctype: stage.doctype, count: (counts[stage.doctype] || {}).count || 0, names: (counts[stage.doctype] || {}).names || [] }))).catch(() => stage_defs.map((stage) => ({ doctype: stage.doctype, count: 0, names: [] })));
  };

  const load_timeline = () => frappe.xcall("sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages", { case_id });

  const init = () => {
    if (!window.sahayogCaseTimeline) return;
    Promise.all([load_record_summaries(), load_timeline()]).then(([summaries, timeline_res]) => { const timeline = timeline_res && timeline_res.timeline ? timeline_res.timeline : []; render_with_data(timeline, summaries || []); }).catch((error) => { render_with_data([], []); });
  };

  if (window.sahayogCaseTimeline) { init(); return; }
  frappe.require("/assets/sahayog/js/case_timeline.js", init);
}
