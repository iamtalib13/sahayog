// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Response to SCN", {
  response_to_scn(frm) {
    // Toggle visibility of Status of Response & Domestic Enquiry
    const show_fields = frm.doc.response_to_scn === "Yes";
    frm.toggle_display("status_of_response", show_fields);
    frm.toggle_display("domestic_enquiry", show_fields);

    // If "No", clear dependent fields
    if (!show_fields) {
      frm.set_value("status_of_response", "");
      frm.set_value("domestic_enquiry", "");
    }
  },
  refresh(frm) {
    // --- SHOW SEND EMAIL BUTTON ---
    if (!frm.is_new()) {
      frm.remove_custom_button("Send Email");
      sahayog.dams.add_send_email_button(frm);
    }
    /*
    if (!frm.is_new()) {
      frm.add_custom_button("Send Email", function () {
        frappe.call({
          method:
            "sahayog.hrms.doctype.response_to_scn.response_to_scn.check_employee_email",
          args: { employee: frm.doc.employee_id },
          callback(r) {
            let email = r.message;

            if (email) {
              frappe.confirm(
                `Are you sure you want to send the SCN Response Email to:<br><b>${email}</b>?`,
                function () {
                  frappe.call({
                    method:
                      "sahayog.hrms.doctype.response_to_scn.response_to_scn.send_response_scn_email",
                    args: { docname: frm.doc.name },
                    freeze: true,
                    freeze_message: __("Sending Email..."),
                    callback() {
                      frappe.msgprint(
                        __("Response to SCN Email sent successfully!")
                      );
                    },
                  });
                }
              );
            } else {
              frappe.msgprint({
                title: __("Email Not Found"),
                indicator: "red",
                message: __(
                  "No email address is stored for this employee.<br>Please update the Employee record before sending this email."
                ),
              });
            }
          },
        });
      });
    }
    */
    // ➡️ View Case History Button
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");

      // ✅ Call timeline
      load_case_timeline(frm);
    }

    // Wait until all buttons are loaded
    frappe.after_ajax(() => {
      const $domesticBtn = $('button[data-doctype="Domestic Enquiry"]');
      const $caseClosureBtn = $('button[data-doctype="Case Closure"]');

      // Remove previous handlers to prevent duplicates
      $domesticBtn.off("mousedown.de_check");
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

      // 🔸 Domestic Enquiry Restriction
      $domesticBtn.on("mousedown.de_check", (e) => {
        if (!ensureSaved(e)) return;
        if (frm.doc.status_of_response === "Satisfactory") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Domestic Enquiry cannot be created because 'Status of Response' is 'Satisfactory'.",
            ),
            indicator: "red",
          });
        }
      });

      // 🔸 Case Closure Restriction
      $caseClosureBtn.on("mousedown.cc_check", (e) => {
        if (!ensureSaved(e)) return;
        if (frm.doc.status_of_response === "Not Satisfactory") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Case Closure cannot be created because 'Status of Response' is 'Not Satisfactory'.",
            ),
            indicator: "red",
          });
        }
      });
    });
    if (!frm.is_new()) {
      load_case_timeline(frm);
    }
  },

  // 🔄 Auto-set Domestic Enquiry based on Status of Response
  status_of_response(frm) {
    if (frm.doc.status_of_response === "Satisfactory") {
      frm.set_value("domestic_enquiry", "No");
    } else if (frm.doc.status_of_response === "Not Satisfactory") {
      frm.set_value("domestic_enquiry", "Yes");
    } else {
      frm.set_value("domestic_enquiry", "");
    }
  },

  onload(frm) {
    // Handle visibility when re-opening existing form
    const show_fields = frm.doc.response_to_scn === "Yes";
    frm.toggle_display("status_of_response", show_fields);
    frm.toggle_display("domestic_enquiry", show_fields);
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
    frm.doctype === "Reminder Of Unauthorized Absence" ||
    frm.doctype === "Ex Parte Enquiry";

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

      if (dt === "Disciplinary Case") {
        next_doctype =
          meta.suspension_required === "Yes"
            ? "Suspension Process"
            : "Response to SCN";
      } else if (dt === "Suspension Process") {
        next_doctype = "Response to SCN";
      } else if (dt === "Response to SCN") {
        const response = (meta.response_to_scn || "").toLowerCase();
        const status = (meta.status_of_response || "").toLowerCase();

        if (response === "yes" && status === "satisfactory") {
          next_doctype = "Case Closure";
        } else {
          next_doctype = "Domestic Enquiry";
        }
      } else if (dt === "Domestic Enquiry") {
        next_doctype =
          String(meta.status_of_response || "").toLowerCase() === "satisfactory"
            ? "Case Closure"
            : "Enquiry Reminder";
      } else if (dt === "Enquiry Reminder") {
        next_doctype = (String(meta.enquiry_status || "").toLowerCase() === "attended") ? "Case Closure" : "Ex Parte Enquiry";
      } else if (dt === "Ex Parte Enquiry") {
        next_doctype = "Case Closure";
      } else if (dt === "Unauthorized Absence") {
        next_doctype =
          String(meta.response_of_ua || "").toLowerCase() === "yes"
            ? "Case Closure"
            : "Reminder Of Unauthorized Absence";
      } else if (dt === "Reminder Of Unauthorized Absence") {
        next_doctype =
          String(meta.response_of_reminder || "").toLowerCase() === "no"
            ? "Ex Parte Enquiry"
            : "Case Closure";
      } else if (dt === "Ex Parte Enquiry") {
        next_doctype = "Case Closure";
      }
    }

    const has_draft = frm.doc.docstatus === 0;

    const next_stage_index = stage_defs.findIndex(
      (s) => s.doctype === next_doctype,
    );

    // 🔥 FIX: Correctly extract response/status from timeline meta OR current doc
    const timeline_meta =
      timeline.find((t) => t.doctype === "Response to SCN")?.meta || {};

    // Prioritize current document if it's the right doctype, else use timeline meta
    const doc_data = frm.doctype === "Response to SCN" ? frm.doc : {};

    const response = (
      doc_data.response_to_scn ||
      timeline_meta.response_to_scn ||
      ""
    ).toLowerCase();

    const status = (
      doc_data.status_of_response ||
      timeline_meta.status_of_response ||
      ""
    ).toLowerCase();

    return stage_defs.map((stage, index) => {
      const status_match = timeline.find(
        (item) => item.doctype === stage.doctype,
      );

      const summary_match = record_summaries.find(
        (item) => item.doctype === stage.doctype,
      );

      let is_next_step = stage.doctype === next_doctype;

      let is_already_started =
        status_match && status_match.status !== "pending";

      let is_past_or_current = index <= next_stage_index;

      let can_create =
        (is_next_step ||
          (stage.allow_multiple && is_already_started && is_past_or_current)) &&
        !has_draft;

      // safety rule
      if (status_match && !stage.allow_multiple) {
        can_create = false;
      }

      // 🔥 HARD OVERRIDE RULES (FINAL)
      if (stage.doctype === "Case Closure") {
        if (response === "yes" && status === "satisfactory" && !has_draft) {
          can_create = true;
        }
      }

      if (stage.doctype === "Domestic Enquiry") {
        if ((response === "yes" && status === "satisfactory") || has_draft) {
          can_create = false;
        }
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
    return Promise.all(
      stage_defs.map((stage) =>
        frappe.db
          .get_list(stage.doctype, {
            filters: { case_id },
            fields: ["name"],
            order_by: "creation asc",
            limit_page_length: 500,
          })
          .then((records) => ({
            doctype: stage.doctype,
            count: (records || []).length,
            names: (records || []).map((row) => row.name),
          }))
          .catch(() => ({
            doctype: stage.doctype,
            count: 0,
            names: [],
          })),
      ),
    );
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
        const timeline = timeline_res?.timeline || [];

        render_with_data(timeline, summaries || []);
      })
      .catch((error) => {
        console.warn("Timeline load failed", error);
        render_with_data([], []);
      });
  };

  if (window.sahayogCaseTimeline) {
    init();
    return;
  }

  frappe.require("/assets/sahayog/js/case_timeline.js", init);
}
