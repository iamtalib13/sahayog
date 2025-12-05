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
    if (frm.doc.date_of_2nd_enquiry && frm._date_of_enquiry) {
      const firstDate = frappe.datetime.str_to_obj(frm._date_of_enquiry);
      const secondDate = frappe.datetime.str_to_obj(
        frm.doc.date_of_2nd_enquiry
      );

      // Check if selected date is same or before date_of_enquiry
      if (secondDate <= firstDate) {
        frappe.msgprint({
          title: __("Invalid Date"),
          message: __(
            "2nd Enquiry Date must be after the 1st Enquiry Date of the related Domestic Enquiry."
          ),
          indicator: "red",
        });
        frm.set_value("date_of_2nd_enquiry", null);
      }
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

    // Load print button AFTER UI is fully rendered
    frappe.after_ajax(() => {
      frm.trigger("show_print_button");
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

  show_print_button: function (frm) {
    if (frm.is_new()) return;

    // Check if button already exists (safer than boolean flag)
    if ($(frm.page.wrapper).find(".print-format-highlight").length) return;

    const allowed_roles = [
      "System Manager",
      "HR Support Executive",
      "HR Support Manager",
    ];
    if (!frappe.user_roles.some((r) => allowed_roles.includes(r))) return;

    // Remove old versions if exist
    try {
      frm.page.remove_custom_button("Print");
    } catch (e) {}
    try {
      frm.page.remove_menu_item("Print");
    } catch (e) {}

    // Create a dropdown-style primary button
    const $btn = $(
      frm.page.add_button("Select Print Format", null, "btn-primary")
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
      <li><a class="print-opt" data-format="Reminder Notice Of Enquiry" href="#">Reminder Notice Of Enquiry</a></li>
      <li><a class="print-opt" data-format="Ex Parte Enquiry" href="#">Ex Parte Enquiry</a></li>
    </ul>
  `);

    $wrapper.append($menu);

    // Handle click on dropdown option
    $wrapper.on("click", ".print-opt", function (e) {
      e.preventDefault();
      let format = $(this).data("format");

      open_print_for_format(format);
    });

    // PRINT LOGIC
    function open_print_for_format(format) {
      console.log("Selected print format:", format);

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
          frm.doc.doctype
        )}&name=${encodeURIComponent(frm.doc.name)}&format=${encodeURIComponent(
          format
        )}&no_letterhead=1`
      );

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;

          setTimeout(() => {
            win.focus();
            win.print();
          }, 700);

          win.addEventListener("afterprint", () => {
            overlay.remove();
            iframe.remove();
          });

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
    case "in progress":
    case "in_progress":
      bg = "#fff4e5";
      color = "#e65100";
      icon = "🟠";
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
