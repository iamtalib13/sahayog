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

    if (!frm.is_new() && frm.doc.case_id) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages",
        args: { case_id: frm.doc.case_id },
        callback: function (r) {
          if (r.message) render_timeline(frm, r.message);
        },
      });
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
