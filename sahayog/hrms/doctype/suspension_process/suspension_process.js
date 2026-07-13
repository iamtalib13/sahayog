// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Suspension Process", {
  refresh(frm) {
    if (!frm.is_new()) {
      sahayog.dams.add_send_email_button(frm);
    }
    /*
    if (!frm.is_new()) {
      frm.add_custom_button("Send Email", function () {
        frappe.call({
          method:
            "sahayog.hrms.doctype.suspension_process.suspension_process.check_employee_email",
          args: { employee: frm.doc.employee_id },
          callback(r) {
            let email = r.message;

            // CASE: Email exists → Only ask for confirmation
            if (email) {
              frappe.confirm(
                `Are you sure you want to send the Suspension Email to:<br><b>${email}</b>?`,
                function () {
                  frappe.call({
                    method:
                      "sahayog.hrms.doctype.suspension_process.suspension_process.send_suspension_email",
                    args: { docname: frm.doc.name },
                    freeze: true,
                    freeze_message: __("Sending Suspension Email..."),
                    callback() {
                      frappe.msgprint(
                        __("Suspension Email sent successfully!")
                      );
                    },
                  });
                }
              );
            }

            // CASE: Email does NOT exist → Show error
            else {
              frappe.msgprint({
                title: __("Email Not Found"),
                indicator: "red",
                message: __(
                  "No email address is stored for this employee.<br>Please update the Employee record before sending this Suspension Email."
                ),
              });
            }
          },
        });
      });
    }
    */

    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    frm.trigger("show_print_button");
    if (!frm.is_new()) {
      load_case_timeline(frm);
    }
  },

  // Auto calculate suspension_to_date when these change
  days_of_suspension(frm) {
    frm.trigger("calculate_suspension_to_date");
  },

  suspension_from_date(frm) {
    // Validate past date
    let today = frappe.datetime.now_date();
    if (frm.doc.suspension_from_date && frm.doc.suspension_from_date < today) {
      frappe.msgprint({
        title: __("Invalid Date"),
        message: __("You cannot select a past date for Suspension From Date."),
        indicator: "red",
      });
      frm.set_value("suspension_from_date", "");
      return;
    }

    // Auto calculate after setting valid date
    frm.trigger("calculate_suspension_to_date");
  },

  calculate_suspension_to_date(frm) {
    if (frm.doc.days_of_suspension && frm.doc.suspension_from_date) {
      let fromDate = frappe.datetime.str_to_obj(frm.doc.suspension_from_date);

      let toDate = frappe.datetime.add_days(
        fromDate,
        frm.doc.days_of_suspension
      );

      frm.set_value("suspension_to_date", frappe.datetime.obj_to_str(toDate));
    }
  },

  show_print_button: function (frm) {
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

            // Create hidden iframe
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = frappe.urllib.get_full_url(
              `/printview?doctype=${encodeURIComponent(
                frm.doc.doctype
              )}&name=${encodeURIComponent(
                frm.doc.name
              )}&format=${encodeURIComponent("Suspension Order")}`
            );
            document.body.appendChild(iframe);

            iframe.onload = () => {
              const doc = iframe.contentWindow.document;

              // Inject CSS
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

              // Wrap content
              const bodyHTML = doc.body.innerHTML;
              doc.body.innerHTML = `<div class="print-content">${bodyHTML}</div>`;

              const bgImg = new Image();
              bgImg.src = "/assets/sahayog/images/letter_head_and_footer_.png";
              bgImg.onload = function () {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
              };

              setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
              }, 3000);

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
      let is_already_started = (status_match && status_match.status !== "pending");
      let is_past_or_current = (index <= next_stage_index);
      let can_create = (is_next_step || (stage.allow_multiple && is_already_started && is_past_or_current)) && !has_draft;
      if (status_match && !stage.allow_multiple) { can_create = false; }
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
    Promise.all([load_record_summaries(), load_timeline()]).then(([summaries, timeline_res]) => { const timeline = timeline_res && timeline_res.timeline ? timeline_res.timeline : []; render_with_data(timeline, summaries || []); }).catch((error) => { console.warn("Timeline load failed", error); render_with_data([], []); });
  };

  if (window.sahayogCaseTimeline) { init(); return; }
  frappe.require("/assets/sahayog/js/case_timeline.js", init);
}
