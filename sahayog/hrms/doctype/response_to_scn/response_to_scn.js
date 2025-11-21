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
            <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin-top:6px;">
    `;

  data.timeline.forEach((stage_obj, index) => {
    html += timeline_badge(stage_obj);
    if (index < data.timeline.length - 1) {
      html += `<div style="font-size:16px; color:#9e9e9e;">→</div>`;
    }
  });

  html += `</div></div>`;
  insertion_point.before(html);
}

function timeline_badge(stage_obj) {
  let bg = "#eeeeee",
    color = "#555",
    icon = "⚪";

  switch (stage_obj.status) {
    case "submitted":
      bg = "#e8f5e9"; // Green
      color = "#1b5e20";
      icon = "🟢";
      break;
    case "saved":
      bg = "#f9f8f5ff"; // Orange
      color = "#e65100";
      icon = "🟠";
      break;

    default:
      bg = "#eeeeee";
      color = "#555";
      icon = "⚪";
  }

  return `
        <div style="
            padding:4px 8px;
            background:${bg};
            color:${color};
            border-radius:20px;
            font-weight:600;
            display:flex;
            align-items:center;
            gap:4px;
            font-size:12px;
        ">
            ${icon} ${stage_obj.stage}
        </div>
    `;
}
