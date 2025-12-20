frappe.ui.form.on("Reminder Of Unauthorized Absence", {
  // Validate Date of Reminder Letter
  date_of_reminder_letter: function (frm) {
    if (!frm.doc.date_of_reminder_letter || !frm.doc.date_of_1st_letter) return;

    // Convert strings to Date objects
    const selectedDate = frappe.datetime.str_to_obj(
      frm.doc.date_of_reminder_letter
    );
    const minDate = frappe.datetime.add_days(frm.doc.date_of_1st_letter, 3);
    const today = frappe.datetime.get_today();

    // Convert minDate and today to Date objects
    const minAllowedDateStr = minDate > today ? minDate : today;
    const minAllowedDate = frappe.datetime.str_to_obj(minAllowedDateStr);

    // Compare Date objects
    if (selectedDate < minAllowedDate) {
      frappe.msgprint({
        title: __("Invalid Date"),
        message: __(
          `Date of Reminder must be at least 3 days after Date of 1st Unauthorized Absence and cannot be a past date. Please select a valid date on or after`
        ),
        indicator: "red",
      });
      frm.set_value("date_of_reminder_letter", null);
    }
  },

  onload: function (frm) {
    // Trigger validation when user selects or types a date
    if (frm.doc.date_of_1st_letter) {
      const minDate = frappe.datetime.add_days(frm.doc.date_of_1st_letter, 3);
      const today = frappe.datetime.get_today();
      const minAllowedDateStr = minDate > today ? minDate : today;

      // Set minDate on datepicker
      setTimeout(() => {
        const field = frm.fields_dict["date_of_reminder_letter"];
        if (field && field.datepicker) {
          field.datepicker.set(
            "minDate",
            frappe.datetime.str_to_obj(minAllowedDateStr)
          );
        }
      }, 500);
    }

    if (frm.doc.case_id) {
      frappe.db
        .get_list("Unauthorized Absence", {
          filters: { case_id: frm.doc.case_id },
          order_by: "creation desc",
          limit_page_length: 1,
          fields: ["amount_of_fraud"],
        })
        .then((list) => {
          if (list.length && list[0].amount_of_fraud) {
            frm.set_value("amount_of_fraud", list[0].amount_of_fraud);
            frm.set_df_property("amount_of_fraud", "hidden", 0);
          } else {
            frm.set_value("amount_of_fraud", "");
            frm.set_df_property("amount_of_fraud", "hidden", 1);
          }
        });
    } else {
      frm.set_df_property("amount_of_fraud", "hidden", 1);
    }
  },

  refresh(frm) {
    if (!frm.is_new()) {
      frm.add_custom_button("Send Email", function () {
        frappe.call({
          method:
            "sahayog.hrms.doctype.reminder_of_unauthorized_absence.reminder_of_unauthorized_absence.check_employee_email",
          args: { employee: frm.doc.employee_id },
          callback(r) {
            let email = r.message;

            // CASE 1: Email Exists → Ask for confirmation
            if (email) {
              frappe.confirm(
                `Are you sure you want to send the Reminder Unauthorized Absence Email to:<br><b>${email}</b>?`,
                function () {
                  frappe.call({
                    method:
                      "sahayog.hrms.doctype.reminder_of_unauthorized_absence.reminder_of_unauthorized_absence.send_reminder_unauthorized_absence_email",
                    args: { docname: frm.doc.name },
                    freeze: true,
                    freeze_message: __(
                      "Sending Reminder Unauthorized Absence Email..."
                    ),
                    callback() {
                      frappe.msgprint(
                        __(
                          "Reminder Unauthorized Absence Email sent successfully!"
                        )
                      );
                    },
                  });
                }
              );
            }

            // CASE 2: Email Missing → Show error
            else {
              frappe.msgprint({
                title: __("Email Not Found"),
                indicator: "red",
                message: __(
                  "No email address is stored for this employee.<br>Please update the Employee record before sending this Reminder Unauthorized Absence Email."
                ),
              });
            }
          },
        });
      });
    }
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    // ✅ Call print button function

    frm.trigger("show_print_button");
    if (!frm.is_new() && frm.doc.case_id) {
      // STEP 1: Load timeline counts
      frappe.call({
        method:
          "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stage_counts",
        args: { case_id: frm.doc.case_id },
        callback(r) {
          frm._timeline_counts = r.message || {};

          // STEP 2: Load timeline stages AFTER counts are ready
          frappe.call({
            method:
              "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages",
            args: { case_id: frm.doc.case_id },
            callback(res) {
              if (res.message) {
                render_timeline(frm, res.message);
              }
            },
          });
        },
      });
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
              )}&format=${encodeURIComponent("Reminder Unauthorized absence")}`
            );
            document.body.appendChild(iframe);

            iframe.onload = () => {
              const doc = iframe.contentWindow.document;

              // Inject CSS with background image for print
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

              // Wrap body content
              const bodyHTML = doc.body.innerHTML;
              doc.body.innerHTML = `<div class="print-content">${bodyHTML}</div>`;

              // Preload background image
              const bgImg = new Image();
              bgImg.src = "/assets/sahayog/images/letter_head_and_footer_.png";
              bgImg.onload = function () {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
              };

              // Fallback
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
