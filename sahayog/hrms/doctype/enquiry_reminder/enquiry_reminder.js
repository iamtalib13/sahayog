// Copyright (c) 2025, Developer Team
// For license information, please see license.txt

frappe.ui.form.on("Enquiry Reminder", {
  onload(frm) {
    // Fetch latest Domestic Enquiry details for the same case_id (only for new record)
    if (frm.doc.__islocal && frm.doc.case_id) {
      frappe.db
        .get_list("Domestic Enquiry", {
          filters: { case_id: frm.doc.case_id },
          order_by: "creation desc",
          limit_page_length: 1,
          fields: [
            "name",
            "domestic_enquiry",
            "status_of_response",
            "date_of_enquiry",
            "place_of_enquiry",
            "enquiry_conduct",
            "enquiry_officer_name",
          ],
        })
        .then((list) => {
          if (list.length) {
            const de = list[0];

            // Store date_of_enquiry for later validation
            frm._date_of_enquiry = de.date_of_enquiry;

            // Set field values fetched from Domestic Enquiry
            frm.set_value("domestic_enquiry", de.domestic_enquiry);
            frm.set_value("status_of_response", de.status_of_response);
            frm.set_value("date_of_enquiry", de.date_of_enquiry);
            frm.set_value("place_of_enquiry", de.place_of_enquiry);
            frm.set_value("enquiry_conduct", de.enquiry_conduct);
            frm.set_value("enquiry_officer_name", de.enquiry_officer_name);

            // 💡 Force UI refresh so the value reflects immediately
            frm.refresh_field("status_of_response");

            // Optional: restrict date picker for date_of_2nd_enquiry
            frm.set_df_property("date_of_2nd_enquiry", "options", {
              min: de.date_of_enquiry,
            });
          }
        });
    }

    // Ensure button restrictions always reflect latest form value
    frappe.after_ajax(() => {
      const $caseClosureBtn = $('button[data-doctype="Case Closure"]');

      // Remove old event handlers (avoid duplicate binding)
      $caseClosureBtn.off("mousedown.cc_check");

      // Common Save Check
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

      // Case Closure Restriction based on Status of Response
      $caseClosureBtn.on("mousedown.cc_check", (e) => {
        if (!ensureSaved(e)) return;
        const current_status = frm.doc.status_of_response;

        if (current_status === "Not Submitted") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Case Closure cannot be created until 'Status of Response' is submitted (either <b>Satisfactory</b> or <b>Not Satisfactory</b>)."
            ),
            indicator: "red",
          });
        }
      });
    });
  },
  // Validation for date_of_2nd_enquiry
  date_of_2nd_enquiry: function (frm) {
    if (frm.doc.date_of_2nd_enquiry && frm.doc.date_of_enquiry) {
      const firstDate = frappe.datetime.str_to_obj(frm.doc.date_of_enquiry);
      const secondDate = frappe.datetime.str_to_obj(
        frm.doc.date_of_2nd_enquiry
      );

      // Format 1st enquiry date for user display
      const formattedFirstDate = frappe.datetime.obj_to_user(firstDate);

      if (secondDate <= firstDate) {
        frappe.msgprint({
          title: __("Invalid Date"),
          message:
            "2nd Enquiry Date must be after the 1st Enquiry Date (" +
            formattedFirstDate +
            ") of the related Domestic Enquiry.",
          indicator: "red",
        });

        frm.set_value("date_of_2nd_enquiry", null);
      }
    }
  },

  refresh(frm) {
    if (frm.page && frm.page.set_title) {
      frm.page.set_title(__("Reminder Notice of Enquiry"));
    }
    // Send Email Button - show after submit (or when saved)
    frm.remove_custom_button("Send Email");

    if (!frm.is_new()) {
      sahayog.dams.add_send_email_button(frm);
    }
    /*
    if (!frm.is_new() && frm.doc.status === "Under Process") {
      frm.add_custom_button("Send Email", function () {
        // Step 1: Check employee email
        frappe.call({
          method:
            "sahayog.hrms.doctype.enquiry_reminder.enquiry_reminder.check_employee_email",
          args: { employee: frm.doc.employee_id },
          callback(r) {
            if (!r.message) {
              frappe.msgprint({
                title: __("Email Not Found"),
                indicator: "red",
                message: __("No email is stored for this employee."),
              });
              return;
            }

            // Step 2: Fetch Print Formats
            frappe.call({
              method: "frappe.client.get_list",
              args: {
                doctype: "Print Format",
                filters: {
                  doc_type: "Enquiry Reminder",
                  disabled: 0,
                },
                fields: ["name"],
              },
              callback(res) {
                if (!res.message || !res.message.length) {
                  frappe.msgprint("No Print Formats found.");
                  return;
                }

                // 🔥 REQUIRED ORDER
                const preferred_order = [
                  "Reminder Notice Of Enquiry",
                  "Ex Parte Enquiry",
                ];

                let fetched_formats = res.message.map((p) => p.name);

                // Arrange formats in preferred order
                let ordered_formats = [];

                preferred_order.forEach((name) => {
                  if (fetched_formats.includes(name)) {
                    ordered_formats.push(name);
                  }
                });

                // Add remaining formats (if any)
                fetched_formats.forEach((name) => {
                  if (!ordered_formats.includes(name)) {
                    ordered_formats.push(name);
                  }
                });

                let options = ordered_formats.join("\n");

                // Step 3: Dialog
                let d = new frappe.ui.Dialog({
                  title: "Send Enquiry Reminder Email",
                  fields: [
                    {
                      fieldtype: "Select",
                      fieldname: "print_format",
                      label: "Select Print Format",
                      options: options,
                      reqd: 1,
                    },
                  ],
                  primary_action_label: "Send Email",
                  primary_action(values) {
                    frappe.call({
                      method:
                        "sahayog.hrms.doctype.enquiry_reminder.enquiry_reminder.send_reminder_enquiry_email",
                      args: {
                        docname: frm.doc.name,
                        print_format: values.print_format,
                      },
                      freeze: true,
                      freeze_message: __("Sending Email..."),
                      callback() {
                        frappe.msgprint(__("Email sent successfully!"));
                        d.hide();
                      },
                    });
                  },
                });

                d.show();
              },
            });
          },
        });
      });
    }
    */
    // View Case History Button
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    // Load print button AFTER UI is fully rendered
    frappe.after_ajax(() => {
      frm.trigger("show_print_button");
    });
    if (!frm.is_new()) {
      setTimeout(() => load_case_timeline(frm), 0);
    }
  },

  show_print_button: function (frm) {
    if (frm.is_new()) return;

    // Avoid duplicate button
    if ($(frm.page.wrapper).find(".print-format-highlight").length) return;

    const allowed_roles = [
      "System Manager",
      "HR Support Executive",
      "HR Support Manager",
    ];
    if (!frappe.user_roles.some((r) => allowed_roles.includes(r))) return;

    // ✅ FIXED API
    try {
      frm.remove_custom_button("Print");
    } catch (e) {}

    try {
      frm.page.remove_menu_item("Print");
    } catch (e) {}

    frm
      .add_custom_button(__("Print"), function () {
        const overlay = document.createElement("div");
        overlay.style.cssText = `
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
            `&format=${encodeURIComponent("Reminder Notice Of Enquiry")}`
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
          frappe.msgprint("Error loading print preview");
          overlay.remove();
          iframe.remove();
        };
      })
      .addClass("btn-primary print-format-highlight");
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
