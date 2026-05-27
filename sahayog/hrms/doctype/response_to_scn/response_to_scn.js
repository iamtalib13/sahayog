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
    // ➡️ View Case History Button
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
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
              "Domestic Enquiry cannot be created because 'Status of Response' is 'Satisfactory'."
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
              "Case Closure cannot be created because 'Status of Response' is 'Not Satisfactory'."
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

function render_timeline(frm, data) {
  // debug: show incoming timeline payload in console
  console.debug(
    "render_timeline payload:",
    data && data.timeline ? data.timeline : data
  );

  const wrap = $(frm.wrapper).find(".case-timeline-box");
  if (wrap.length) wrap.remove();

  const insertion_point = $(".form-dashboard");

  let html = `
    <div class="case-timeline-box" style="
        background:#ffffff;
        border:1px solid #e0e0e0;
        padding:10px;
        margin-bottom:10px;
        border-radius:8px;
        box-shadow:0 1px 2px rgba(0,0,0,0.05);
        font-size:13px;
    ">
        <h4 style="margin-top:0; color:#1a73e8; font-weight:600; font-size:14px;">
            Case Progress Timeline
        </h4>

        <!-- TIMELINE BADGES -->
        <div style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-top:6px;">
  `;

  // guard: if no timeline array, do nothing
  const timeline_arr =
    data && data.timeline ? data.timeline : Array.isArray(data) ? data : [];
  if (!timeline_arr.length) {
    html += `<div style="color:#777; font-size:14px;">No timeline data available.</div>`;
  } else {
    timeline_arr.forEach((stage_obj, index) => {
      html += timeline_badge(stage_obj);
      if (index < timeline_arr.length - 1) {
        html += `<div style="font-size:20px; color:#9e9e9e; margin-top:15px;">→</div>`;
      }
    });
  }

  html += `
        </div>

        <!-- LEGEND OUTSIDE / BELOW -->
        <div style="
            margin-top:10px;
            padding-top:6px;
            border-top:1px solid #e0e0e0;
            font-size:11px;
            color:#777;
            display:flex;
            gap:14px;
            justify-content:right;
        ">
            <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:14px;">🟢</span><span>Completed</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:14px;">🟠</span><span>In Progress</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:14px;">⚪</span><span>Not Created</span>
            </div>
        </div>

    </div>
  `;

  insertion_point.before(html);
}
function timeline_badge(stage_obj) {
  let bg = "#eeeeee",
    color = "#555",
    icon = "⚪";

  switch ((stage_obj.status || "").toLowerCase()) {
    case "submitted":
      bg = "#e8f5e9";
      color = "#1b5e20";
      icon = "🟢";
      break;
    case "saved":
      bg = "#fff4e5";
      color = "#e65100";
      icon = "🟠";
      break;
    case "cancelled":
      bg = "#f0f0f0"; // light gray
      color = "#999";
      icon = "⚪";
      break;
    default:
      bg = "#eeeeee";
      color = "#555";
      icon = "⚪";
  }

  // Get modified timestamp
  let ts =
    stage_obj.modified ||
    stage_obj.modified_on ||
    stage_obj.modified_at ||
    stage_obj.modified_date ||
    stage_obj.timestamp ||
    null;

  // Format timestamp in hh:mm AM/PM, dd MMM yyyy
  let formatted = "-";
  if (ts) {
    try {
      let d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const optsTime = { hour: "2-digit", minute: "2-digit", hour12: true };
        const optsDate = { day: "2-digit", month: "short", year: "numeric" };
        formatted = `${d.toLocaleTimeString(
          [],
          optsTime
        )}, ${d.toLocaleDateString([], optsDate)}`;
      }
    } catch (e) {
      console.warn("Failed to format timestamp", e);
      formatted = String(ts);
    }
  }

  const stage_label =
    stage_obj.stage || stage_obj.doctype || stage_obj.title || "";

  return `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center;">
      <!-- TIMESTAMP (small, above badge) -->
      <div style="font-size:10px; color:#777; margin-bottom:3px;">
        ${formatted}
      </div>

      <!-- EXISTING BADGE -->
      <div style="
          padding:3px 6px;
          background:${bg};
          color:${color};
          border-radius:14px;
          font-weight:600;
          display:flex;
          align-items:center;
          gap:4px;
          font-size:11px;
      ">
        ${icon} ${stage_label}
      </div>
    </div>
  `;
}
// ===============================
// DAMS Timeline Hover Tooltip
// ===============================
(function () {
  let tooltip = null;

  function show_tooltip(target, html) {
    hide_tooltip();

    tooltip = $(`
      <div style="
        position:absolute;
        background:#2e2e2e;
        color:#fff;
        padding:6px 8px;
        border-radius:6px;
        font-size:11px;
        z-index:99999;
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
        max-width:220px;
      ">
        ${html}
      </div>
    `);

    $("body").append(tooltip);

    const offset = $(target).offset();
    tooltip.css({
      top: offset.top - tooltip.outerHeight() - 6,
      left: offset.left + $(target).outerWidth() / 2 - tooltip.outerWidth() / 2,
    });
  }

  function hide_tooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  $(document).on(
    "mouseenter",
    ".case-timeline-box div[style*='border-radius:14px']",
    function () {
      const frm = cur_frm;
      if (!frm || !frm._timeline_counts) return;

      const label = $(this)
        .text()
        .replace(/^[^\w]+/, "")
        .trim();

      const info = frm._timeline_counts[label];

      let html = `<b>${label}</b>`;

      if (!info || info.count === 0) {
        html += `<br>No records created yet`;
      } else {
        html += `<br>Records created: ${info.count}`;
        html += `<br><span style="opacity:.8;">${info.names.join(
          "<br>"
        )}</span>`;
      }

      show_tooltip(this, html);
    }
  );

  $(document).on(
    "mouseleave",
    ".case-timeline-box div[style*='border-radius:14px']",
    hide_tooltip
  );
})();

function load_case_timeline(frm) {
  const case_id = frm.doc.case_id || frm.doc.name;
  if (!case_id) return;

  const standard_stages = [
    { doctype: "Disciplinary Case", label: "Disciplinary Case", can_create: false },
    { doctype: "Suspension Process", label: "Suspension Process" },
    { doctype: "Response to SCN", label: "Response to SCN" },
    { doctype: "Domestic Enquiry", label: "Domestic Enquiry" },
    { doctype: "Enquiry Reminder", label: "Enquiry Reminder" },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const ua_stages = [
    { doctype: "Unauthorized Absence", label: "Unauthorized Absence" },
    { doctype: "Reminder Of Unauthorized Absence", label: "Reminder Of Unauthorized Absence" },
    { doctype: "Ex Parte Enquiry", label: "Ex Parte Enquiry" },
    { doctype: "Case Closure", label: "Case Closure" },
  ];

  const is_ua =
    String(case_id).startsWith("UA") ||
    (frm.doc.case_type || "").toLowerCase() === "unauthorized absence" ||
    frm.doctype === "Unauthorized Absence" ||
    frm.doctype === "Reminder Of Unauthorized Absence" ||
    frm.doctype === "Ex Parte Enquiry";

  const stage_defs = (is_ua ? ua_stages : standard_stages).map((stage, index) => ({
    ...stage,
    key: `${stage.doctype}-${index}`,
    status: "current",
    modified: null,
    record_count: 0,
    names: [],
    can_create: stage.can_create !== false,
    allow_multiple: false,
    quick_entry: true,
    defaults: {
      case_id,
      ...(frm.doc.employee_id ? { employee_id: frm.doc.employee_id } : {}),
    },
  }));

  const build_config = (stages) => ({
    title: __("Case Progress Timeline"),
    case_id,
    stages,
    get_defaults(stage) {
      return stage.defaults || { case_id };
    },
    before_open() {
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
    return stage_defs.map((stage) => {
      const status_match = timeline.find(
        (item) => item.doctype === stage.doctype || item.stage === stage.doctype,
      );
      const summary_match = record_summaries.find((item) => item.doctype === stage.doctype) || {};
      return {
        ...stage,
        status: status_match?.status || stage.status,
        modified: status_match?.modified || stage.modified,
        record_count: summary_match.count || 0,
        names: summary_match.names || [],
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
          .catch(() => ({ doctype: stage.doctype, count: 0, names: [] })),
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
        const timeline = timeline_res && timeline_res.timeline ? timeline_res.timeline : [];
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
