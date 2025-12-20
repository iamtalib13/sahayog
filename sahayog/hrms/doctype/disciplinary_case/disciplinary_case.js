// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Disciplinary Case", {
  refresh: function (frm) {
    if (!frm.is_new()) {
      frm.add_custom_button("Send Email", function () {
        frappe.call({
          method:
            "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.check_employee_email",
          args: { employee: frm.doc.employee_id },
          callback(r) {
            let email = r.message;

            // CASE 1: Email exists
            if (email) {
              frappe.confirm(
                `This employee already has an email:<br><b>${email}</b><br><br>Do you want to send the SCN email?`,
                function () {
                  // Show freeze while sending email
                  frappe.call({
                    method:
                      "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.send_scn_email",
                    args: { docname: frm.doc.name },
                    freeze: true,
                    freeze_message: __("Sending SCN email..."),
                    callback(r) {
                      frappe.msgprint(__("SCN Email sent successfully!"));
                    },
                  });
                }
              );
            }
            // CASE 2: No email
            else {
              let d = new frappe.ui.Dialog({
                title: "Enter Employee Email",
                fields: [
                  {
                    fieldtype: "HTML",
                    fieldname: "info_html",
                    options: `
          <div style="margin-bottom: 10px; color:#a00; font-weight:bold;">
            No email address is stored for this employee.
          </div>
          <div style="margin-bottom: 10px;">
            Please enter the employee's email address below. 
            This will be saved to the Employee master and used for sending future emails.
          </div>
        `,
                  },
                  {
                    label: "Email",
                    fieldname: "manual_email",
                    fieldtype: "Data",
                    reqd: true,
                  },
                ],
                primary_action_label: "Submit",

                primary_action(values) {
                  let entered_email = values.manual_email;

                  // STEP 1: Save the entered email
                  frappe.call({
                    method:
                      "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.save_employee_email",
                    args: {
                      employee: frm.doc.employee_id,
                      email: entered_email,
                    },
                    freeze: true,
                    freeze_message: __("Saving Email..."),

                    callback() {
                      // STEP 2: Send SCN email after saving
                      frappe.call({
                        method:
                          "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.send_scn_email",
                        args: { docname: frm.doc.name },
                        freeze: true,
                        freeze_message: __("Sending SCN Email..."),

                        callback() {
                          frappe.msgprint(
                            __("Email saved and SCN Email sent successfully!")
                          );
                          d.hide();
                        },
                      });
                    },
                  });
                },
              });

              d.show();
            }
          },
        });
      });
      function sendEmail(docname) {
        frappe.call({
          method:
            "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.send_scn_email",
          args: { docname },
          callback() {
            frappe.msgprint("SCN Email Sent Successfully!");
          },
        });
      }
    }
    let today = frappe.datetime.now_date();

    if (frm.fields_dict.issue_occurrence_date) {
      frm.fields_dict.issue_occurrence_date.df.max = today;
      frm.fields_dict.issue_occurrence_date.refresh();
    }

    if (frm.fields_dict.issue_report_to_hr) {
      frm.fields_dict.issue_report_to_hr.df.max = today;
      frm.fields_dict.issue_report_to_hr.refresh();
    }

    // -------------------
    // Prevent typing alphabets in Amount of Fraud field
    // -------------------
    if (
      frm.fields_dict.amount_of_fraud &&
      frm.fields_dict.amount_of_fraud.$input
    ) {
      frm.fields_dict.amount_of_fraud.$input.off("keypress.amount_check");
      frm.fields_dict.amount_of_fraud.$input.on(
        "keypress.amount_check",
        function (e) {
          const char = String.fromCharCode(e.which || e.keyCode);
          if (!/[0-9.]/.test(char)) {
            e.preventDefault();
          }
        }
      );
    }

    // -------------------
    // Conditional Mandatory + Hide for suspension_required
    // -------------------
    handle_suspension_required(frm);
    // -------------------
    // Restrict linked records with save-check
    // -------------------
    setTimeout(() => {
      const $suspension_btn = $('button[data-doctype="Suspension Process"]');
      const $response_btn = $('button[data-doctype="Response to SCN"]');
      const $unauth_abs_btn = $('button[data-doctype="Unauthorized Absence"]');

      // Remove previous handlers (avoid duplicates)
      $suspension_btn.off("mousedown.suspension_check");
      $response_btn.off("mousedown.response_check");
      $unauth_abs_btn.off("mousedown.ua_check");

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

      // 🔸 Suspension Process Restriction
      $suspension_btn.on("mousedown.suspension_check", (e) => {
        if (!ensureSaved(e)) return;

        // 🚫 Block if Case Type = Unauthorized Absence
        if (frm.doc.case_type === "Unauthorized Absence") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Suspension Process cannot be created when Case Type is 'Unauthorized Absence'."
            ),
            indicator: "red",
          });
          return;
        }

        // Normal rule based on suspension_required
        if (frm.doc.suspension_required === "No") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Suspension Process cannot be created because 'Suspension Required' is set to 'No'."
            ),
            indicator: "red",
          });
        }
      });

      // 🔸 Response to SCN Restriction
      $response_btn.on("mousedown.response_check", (e) => {
        if (!ensureSaved(e)) return;

        // 🚫 Block if Case Type = Unauthorized Absence
        if (frm.doc.case_type === "Unauthorized Absence") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Response to SCN cannot be created when Case Type is 'Unauthorized Absence'."
            ),
            indicator: "red",
          });
          return;
        }

        // Normal rule based on suspension_required
        if (frm.doc.suspension_required === "Yes") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Response to SCN cannot be created because 'Suspension Required' is set to 'Yes'."
            ),
            indicator: "red",
          });
        }
      });

      // 🔸 Unauthorized Absence Restriction (only allowed for that case type)
      $unauth_abs_btn.on("mousedown.ua_check", (e) => {
        if (!ensureSaved(e)) return;

        if (frm.doc.case_type !== "Unauthorized Absence") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Unauthorized Absence record can only be created when Case Type is 'Unauthorized Absence'."
            ),
            indicator: "red",
          });
        }
      });
    }, 1000);

    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.name,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    frm.trigger("show_print_button");

    // Timeline only for saved documents
    if (!frm.is_new()) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stages",
        args: { case_id: frm.doc.name },
        callback: function (r) {
          if (r.message) render_timeline(frm, r.message);
        },
      });
    }
    // Fetch timeline record counts (ONE TIME)
    if (!frm.is_new()) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.disciplinary_case.disciplinary_case.get_case_stage_counts",
        args: {
          case_id: frm.doc.name,
        },
        callback(r) {
          if (r.message) {
            frm._timeline_counts = r.message;
            console.debug("Timeline counts loaded:", frm._timeline_counts);
          }
        },
      });
    }
  },
  // -------------------
  // Case Type Change
  // -------------------
  case_type(frm) {
    handle_suspension_required(frm);
  },

  // -------------------
  // Field-level triggers
  // -------------------
  issue_occurrence_date: function (frm) {
    let today = frappe.datetime.now_date();
    if (
      frm.doc.issue_occurrence_date &&
      frm.doc.issue_occurrence_date > today
    ) {
      frappe.msgprint(
        "You cannot select a future date for Issue Occurrence Date."
      );
      frm.set_value("issue_occurrence_date", "");
    }
  },

  issue_report_to_hr: function (frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.issue_report_to_hr && frm.doc.issue_report_to_hr > today) {
      frappe.msgprint(
        "You cannot select a future date for Issue Reported to HR."
      );
      frm.set_value("issue_report_to_hr", "");
    }
  },

  amount_of_fraud: function (frm) {
    let value = frm.doc.amount_of_fraud;
    if (value && isNaN(value)) {
      frappe.msgprint({
        title: __("Invalid Input"),
        message: __(
          "Please enter a valid numeric amount in 'Amount of Fraud'."
        ),
        indicator: "red",
      });
      frm.set_value("amount_of_fraud", 0);
    }
  },

  validate: function (frm) {
    let today = frappe.datetime.now_date();
    if (
      frm.doc.issue_occurrence_date &&
      frm.doc.issue_occurrence_date > today
    ) {
      frappe.throw(__("Issue Occurrence Date cannot be in the future."));
    }
    if (frm.doc.issue_report_to_hr && frm.doc.issue_report_to_hr > today) {
      frappe.throw(__("Issue Reported to HR Date cannot be in the future."));
    }
    if (frm.doc.amount_of_fraud && isNaN(frm.doc.amount_of_fraud)) {
      frappe.throw(__("Amount of Fraud must be a valid number."));
    }
  },
  show_print_button: function (frm) {
    if (!frm.is_new()) {
      const allowed_roles = [
        "System Manager",
        "HR Support Executive",
        "HR Support Manager",
      ];
      if (!frappe.user_roles.some((role) => allowed_roles.includes(role)))
        return;

      frm
        .add_custom_button(__("Print"), function () {
          const overlay = document.createElement("div");
          overlay.style = `
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
              `&format=${encodeURIComponent("Disciplinary Case Notice")}`
          );
          document.body.appendChild(iframe);

          iframe.onload = () => {
            const doc = iframe.contentWindow.document;

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

            const original = doc.body.innerHTML;

            doc.body.innerHTML = `
                    <div class="print-page">
                        ${original}
                    </div>
                `;

            setTimeout(() => {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }, 500);

            const cleanup = () => {
              overlay.remove();
              iframe.remove();
            };
            iframe.contentWindow.addEventListener("afterprint", cleanup);
            setTimeout(cleanup, 5000);
          };

          iframe.onerror = () => {
            frappe.msgprint("Error loading print preview");
            overlay.remove();
            iframe.remove();
          };
        })
        .addClass("btn-primary");
    }
  },
});

// -------------------
// Helper Function
// -------------------
function handle_suspension_required(frm) {
  if (frm.doc.case_type === "Unauthorized Absence") {
    frm.set_df_property("suspension_required", "hidden", 1);
    frm.set_df_property("suspension_required", "reqd", 0);
    frm.set_value("suspension_required", ""); // clear previous value
  } else {
    frm.set_df_property("suspension_required", "hidden", 0);
    frm.set_df_property("suspension_required", "reqd", 1);
  }
}
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
// --------------------------------------------------
// Timeline Hover Tooltip (Records Count)
// --------------------------------------------------
(function () {
  let tooltip = null;

  function show_tooltip(target, html) {
    hide_tooltip();

    tooltip = $(`
      <div style="
        position:absolute;
        background:#2e2e2e;
        color:#fff;
        padding:8px 10px;
        border-radius:6px;
        font-size:11px;
        z-index:99999;
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
        max-width:260px;
      ">
        ${html}
      </div>
    `);

    $("body").append(tooltip);

    const offset = $(target).offset();
    tooltip.css({
      top: offset.top - tooltip.outerHeight() - 8,
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

      const data = frm._timeline_counts[label];

      let html = `<b>${label}</b>`;

      if (!data) {
        show_tooltip(this, html);
        return;
      }

      if (data.count === 0) {
        html += `<br>No records created yet`;
      } else {
        html += `<br>Records created: ${data.count}`;
        html += `<div style="margin-top:4px;">`;

        data.names.forEach((name) => {
          html += `<div style="opacity:0.9;">• ${name}</div>`;
        });

        html += `</div>`;
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
