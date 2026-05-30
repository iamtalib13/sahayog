frappe.ui.form.on("Case Closure", {
  onload(frm) {
    // --------------------------------------------------------------------------
    // AUTO-DETECTION VIA ROUTE (For Connection Tab Support)
    // --------------------------------------------------------------------------
    if (frm.is_new() && !frm.doc.reference_name) {
      const prev = frappe.get_prev_route();
      if (prev && prev[0] === "Form") {
        const src_dt = prev[1];
        const src_nm = prev[2];

        const ua_workflow = [
          "Unauthorized Absence",
          "Reminder Of Unauthorized Absence",
          "Ex Parte Enquiry",
        ];
        const dc_workflow = [
          "Disciplinary Case",
          "Response to SCN",
          "Domestic Enquiry",
          "Enquiry Reminder",
        ];
        if (ua_workflow.includes(src_dt) || dc_workflow.includes(src_dt)) {
          // ✅ Actual source doctype preserve karo
          frm.set_value("reference_doctype", src_dt);

          if (
            src_dt === "Disciplinary Case" ||
            src_dt === "Unauthorized Absence"
          ) {
            frm.set_value("reference_name", src_nm);
          } else {
            // Child workflow doctypes ka actual document name preserve karo
            frm.set_value("reference_name", src_nm);
          }
        }
      }
    }

    // If case_id is not present, nothing to process
    if (!frm.doc.case_id) return;

    // Trigger details fetch if reference is already set (for existing docs)
    if (frm.doc.reference_doctype && frm.doc.reference_name) {
      frm.trigger("reference_name");
    }

    /* -------------------------------------------------------------------------
    // LEGACY LOGIC (Commented out as per request)
    // -------------------------------------------------------------------------
    // List of workflow-related fields to control visibility
    const workflow_fields = [
      "status_of_response",
      "domestic_enquiry",
      "place_of_enquiry",
      "date_of_enquiry",
      "date_of_2nd_enquiry",
      "enquiry_officer_name",
    ];

    // Hide all workflow fields initially
    workflow_fields.forEach((f) => {
      if (frm.fields_dict[f]) {
        frm.set_df_property(f, "hidden", 1);
      }
    });

    // Fetch the latest linked enquiry for this case
    frappe.call({
      method: "sahayog.hrms.doctype.case_closure.case_closure.get_latest_linked_enquiry",
      args: { case_id: frm.doc.case_id },
      callback: function (r) {
        if (!r.message) return;
        const { linked_enquiry_type, linked_enquiry, data } = r.message;
        if (!linked_enquiry_type || !linked_enquiry) return;

        // Store reference silently
        frm.set_value("linked_enquiry_type", linked_enquiry_type);
        frm.set_value("linked_enquiry", linked_enquiry);

        // Define visible fields by linked doctype
        const visible_fields_by_doctype = {
          "Response to SCN": ["status_of_response", "domestic_enquiry"],
          "Domestic Enquiry": [
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_enquiry",
            "enquiry_officer_name",
          ],
          "Enquiry Reminder": [
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_enquiry",
            "enquiry_officer_name",
          ],
        };

        const fields_to_show = visible_fields_by_doctype[linked_enquiry_type] || [];
        
        // Unhide & populate relevant fields
        fields_to_show.forEach((f) => {
          if (frm.fields_dict[f]) {
            frm.set_df_property(f, "hidden", 0);
            frm.set_df_property(f, "read_only", 1);
            if (data && data[f] != null) {
               frm.set_value(f, data[f]);
            }
          }
        });
      },
    });
    ------------------------------------------------------------------------- */
  },

  // --------------------------------------------------------------------------
  // ON SUBMIT: Close linked case stages
  // --------------------------------------------------------------------------
  reference_name(frm) {
    if (frm.doc.reference_doctype && frm.doc.reference_name) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.case_closure.case_closure.get_reference_details",
        args: {
          reference_doctype: frm.doc.reference_doctype,
          reference_name: frm.doc.reference_name,
        },
        callback: function (r) {
          if (r.message) {
            frm.set_value(r.message);

            // Define list of all enquiry-related fields
            const all_enquiry_fields = [
              "status_of_response",
              "domestic_enquiry",
              "place_of_enquiry",
              "date_of_enquiry",
              "enquiry_officer_name",
            ];

            // Dynamically show fields that are present in the response
            all_enquiry_fields.forEach((f) => {
              if (r.message[f] !== undefined && r.message[f] !== null) {
                frm.set_df_property(f, "hidden", 0);
                frm.set_df_property(f, "read_only", 1);
              } else {
                frm.set_df_property(f, "hidden", 1);
              }
            });
          }
        },
      });
    }
  },

  on_submit(frm) {
    if (!frm.doc.case_id) return;
    // Fetch latest linked enquiry
    frappe.call({
      method:
        "sahayog.hrms.doctype.case_closure.case_closure.close_linked_case",
      args: { case_id: frm.doc.case_id },
    });
  },

  // --------------------------------------------------------------------------
  // AFTER SAVE: Success message after submission
  // --------------------------------------------------------------------------
  after_save(frm) {
    if (frm.doc.docstatus === 1) {
      frappe.msgprint({
        title: __("Success"),
        message: __("The case has been closed successfully."),
        indicator: "green",
      });
    }
  },
  // --------------------------------------------------------------------------
  // REFRESH: Buttons, Timeline, Reviewer actions
  // --------------------------------------------------------------------------
  refresh(frm) {
    // Remove duplicate Send Email button
    frm.remove_custom_button("Send Email");
    // ---------------- SEND EMAIL BUTTON (Only when Closed) ----------------
    if (!frm.is_new() && frm.doc.status === "Closed") {
      frm.add_custom_button("Send Email", function () {
        // Step 1: Validate employee email exists
        frappe.call({
          method:
            "sahayog.hrms.doctype.case_closure.case_closure.check_employee_email",
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

            // Step 2: Fetch active print formats
            frappe.call({
              method: "frappe.client.get_list",
              args: {
                doctype: "Print Format",
                filters: {
                  doc_type: "Case Closure",
                  disabled: 0,
                },
                fields: ["name"],
              },
              callback(res) {
                if (!res.message || !res.message.length) {
                  frappe.msgprint("No Print Formats found.");
                  return;
                }

                // Preferred print format ordering
                const preferred_order = [
                  "Warning Letter",
                  "Caution Letter",
                  "Termination due to abandonment",
                  "Office Order Termination of Services",
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

                // Print format selection dialog
                let d = new frappe.ui.Dialog({
                  title: "Send Case Closure Email",
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
                        "sahayog.hrms.doctype.case_closure.case_closure.send_case_closure_email",
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

    // ---------------- VIEW CASE HISTORY BUTTON ----------------
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }
    // ---------------- CUSTOM PRINT BUTTON ----------------
    frappe.after_ajax(() => {
      frm.trigger("show_print_button");
    });
    // Render Timeline
    if (!frm.is_new()) {
      load_case_timeline(frm);
    }

    // ---------------- CASE REVIEW BUTTON ----------------
    if (!frm.is_new()) {
      frm.add_custom_button("Case Review", () => {
        open_approver_dialog(frm);
      });
    }

    // ---------------- REVIEWER MAIL SYNC ----------------
    if (frm.__reviewer_mail_synced || frm.is_new()) return;

    frm.__reviewer_mail_synced = true;

    frappe.call({
      method:
        "sahayog.hrms.doctype.case_closure.case_closure.sync_reviewer_mail_checkbox",
      args: {
        case_closure_name: frm.doc.name,
      },
      callback() {
        frm.refresh_field("review_details");
      },
    });
  },

  show_print_button: function (frm) {
    // Do not show print options for new (unsaved) documents
    if (frm.is_new()) return;
    // Prevent duplicate print buttons if already rendered
    if ($(frm.page.wrapper).find(".print-format-highlight").length) return;
    // Only allowed HR/System roles can see print options
    const allowed_roles = [
      "System Manager",
      "HR Support Executive",
      "HR Support Manager",
    ];
    // Exit if current user does not have any allowed role
    if (!frappe.user_roles.some((r) => allowed_roles.includes(r))) return;
    // --------------------------------------------------
    // Cleanup existing default Print buttons (Frappe default)
    // --------------------------------------------------
    try {
      frm.page.remove_custom_button("Print");
    } catch (e) {}
    try {
      frm.page.remove_menu_item("Print");
    } catch (e) {}

    // Create a dropdown-style primary button
    const $btn = $(
      frm.page.add_button("Select Print Format", null, "btn-primary"),
    );
    $btn
      .removeClass("btn-default")
      .addClass("btn-primary print-format-highlight");

    // Convert button to dropdown
    $btn.addClass("dropdown-toggle");
    $btn.attr("data-toggle", "dropdown");

    // Dropdown container
    let $wrapper = $btn.parent();
    $wrapper.addClass("dropdown");

    // Add dropdown menu
    let $menu = $(`
    <ul class="dropdown-menu">
      <li><a class="print-opt" data-format="Warning Letter" href="#">Warning Letter</a></li>
      <li><a class="print-opt" data-format="Caution Letter" href="#">Caution Letter</a></li>
      <li><a class="print-opt" data-format="Termination due to abandonment" href="#">Termination due to abandonment</a></li>
     <li><a class="print-opt" data-format="Office Order Termination of Services" href="#">Office Order Termination of Services</a></li>
    </ul>
  `);

    $wrapper.append($menu);

    // Handle click on dropdown option
    $wrapper.off("click.print").on("click.print", ".print-opt", function (e) {
      e.preventDefault();
      let format = $(this).data("format");

      open_print_for_format(format);
    });

    // PRINT LOGIC
    function open_print_for_format(format) {

      const overlay = document.createElement("div");
      overlay.id = "print-overlay";
      overlay.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(255,255,255,0.6);
      z-index: 9999; display: flex;
      align-items: center; justify-content: center;
      font-size: 18px; color: #333;
    `;
      overlay.innerHTML = "Preparing print preview...";
      document.body.appendChild(overlay);

      const url = frappe.urllib.get_full_url(
        `/printview?doctype=${encodeURIComponent(
          frm.doc.doctype,
        )}&name=${encodeURIComponent(frm.doc.name)}&format=${encodeURIComponent(
          format,
        )}&no_letterhead=1`,
      );

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;
          // Disable Frappe's internal auto-print
          if (win.print) {
            win.print = function () {};
          }
          if (win.frappe && win.frappe.utils && win.frappe.utils.print) {
            win.frappe.utils.print = function () {};
          }

          // --------------------------------------------------
          // Trigger manual print after preview loads
          // --------------------------------------------------
          setTimeout(() => {
            win.focus();

            // Restore manual print
            win.print = window.print.bind(win);
            win.print();
          }, 700);
          // Cleanup after printing
          win.addEventListener("afterprint", () => {
            overlay.remove();
            iframe.remove();
          });
          // Fallback cleanup in case afterprint doesn't fire
          setTimeout(() => {
            overlay.remove();
            iframe.remove();
          }, 5000);
        } catch (err) {
          console.error(err);
          frappe.msgprint("Printing Error. Check console.");
          overlay.remove();
          iframe.remove();
        }
      };

      iframe.onerror = () => {
        frappe.msgprint("Failed to load print preview");
        overlay.remove();
        iframe.remove();
      };
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
      let is_already_started = (status_match && status_match.status !== "pending");
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
