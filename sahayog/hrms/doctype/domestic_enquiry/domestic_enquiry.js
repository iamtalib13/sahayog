// Copyright (c) 2025, Developer Team
// For license information, please see license.txt

frappe.ui.form.on("Domestic Enquiry", {
  refresh(frm) {
    // send email button
     if (!frm.is_new()) {
            frm.add_custom_button("Send Email", function () {
                frappe.call({
                    method: "sahayog.hrms.doctype.domestic_enquiry.domestic_enquiry.check_employee_email",
                    args: { employee: frm.doc.employee_id },
                    callback(r) {
                        let email = r.message;

                        // CASE: Email exists
                        if (email) {
                            frappe.confirm(
                                `Employee email found:<br><b>${email}</b><br><br>Do you want to send the Domestic Enquiry Notice email?`,
                                function () {
                                    frappe.call({
                                        method: "sahayog.hrms.doctype.domestic_enquiry.domestic_enquiry.send_domestic_enquiry_email",
                                        args: { docname: frm.doc.name },
                                        freeze: true,
                                        freeze_message: __("Sending Domestic Enquiry Notice Email..."),
                                        callback() {
                                            frappe.msgprint(__("Domestic Enquiry Notice Email sent successfully!"));
                                        }
                                    });
                                }
                            );
                        }

                        // CASE: No email found
                        else {
                            frappe.msgprint({
                                title: __("Email Not Found"),
                                indicator: "red",
                                message: __(
                                    "No email is stored for this employee.<br>Please update the Employee record before sending the email."
                                )
                            });
                        }
                    }
                });
            });
        }
    // view case history button
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

    // debug: log refresh event
    console.log("Domestic Enquiry refresh fired");
    
    // ✅ Call print button function
    frm.trigger("show_print_button");

    // Skip logic for unsaved (new) records
    frappe.after_ajax(() => {
      const $enquiryReminderBtn = $(`button[data-doctype="Enquiry Reminder"]`);
      const $caseClosureBtn = $(`button[data-doctype="Case Closure"]`);

      // Remove any previously attached handlers (preventing duplicate handlers)
      $enquiryReminderBtn.off("mousedown.er_check");
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

      // 🔸 Enquiry Reminder Restriction
      $enquiryReminderBtn.on("mousedown.er_check", (e) => {
        if (!ensureSaved(e)) return;

        if (frm.doc.status_of_response === "Satisfactory") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Enquiry Reminder cannot be created when 'Status of Response' is <b>Satisfactory</b>."
            ),
            indicator: "red",
          });
        }
      });

      // 🔸 Case Closure Restriction
      $caseClosureBtn.on("mousedown.cc_check", (e) => {
        if (!ensureSaved(e)) return;

        if (frm.doc.status_of_response !== "Satisfactory") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Case Closure can only be created when 'Status of Response' is <b>Satisfactory</b>."
            ),
            indicator: "orange",
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

  date_of_enquiry(frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.date_of_enquiry && frm.doc.date_of_enquiry < today) {
      frappe.msgprint({
        title: __("Invalid Date"),
        message: __("You cannot select a past date for Date of Enquiry."),
        indicator: "red",
      });
      frm.set_value("date_of_enquiry", "");
    }
  },

  validate(frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.date_of_enquiry && frm.doc.date_of_enquiry < today) {
      frappe.throw(__("Date of Enquiry cannot be in the past."));
    }
  },

  show_print_button: function (frm) {
    console.log("show_print_button called", frm.doc.name);
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
              )}&format=${encodeURIComponent("Domestic Enquiry")}`
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
