frappe.ui.form.on("Reminder Of Unauthorized Absence", {
  onload: function (frm) {
    if (frm.doc.__islocal && frm.doc.case_id) {
      frappe.db
        .get_list("Unauthorized Absence", {
          filters: { case_id: frm.doc.case_id },
          order_by: "creation desc",
          limit_page_length: 1,
          fields: ["date_of_1st_letter"],
        })
        .then((list) => {
          if (list.length) {
            const firstLetterDate = list[0].date_of_1st_letter; // YYYY-MM-DD
            const formattedDate = frappe.datetime.str_to_user(firstLetterDate); // DD-MM-YYYY

            // Show formatted date in field
            frm.set_value("date_of_1st_letter", formattedDate);

            // Convert to JS Date object
            const firstDateObj = frappe.datetime.str_to_obj(firstLetterDate);

            // Restrict date picker (only dates after this)
            setTimeout(() => {
              const picker =
                frm.fields_dict["date_of_reminder_letter"].datepicker;
              if (picker) {
                // Add +1 day to allow only after the first letter date
                const minAllowed = frappe.datetime.add_days(firstLetterDate, 1);
                picker.update({
                  minDate: frappe.datetime.str_to_obj(minAllowed),
                });
              }
            }, 500);

            // Validation backup — ensures user can’t type invalid date manually
            frm.fields_dict.date_of_reminder_letter.df.onchange = function () {
              if (frm.doc.date_of_reminder_letter) {
                const reminderDateObj = frappe.datetime.str_to_obj(
                  frm.doc.date_of_reminder_letter
                );
                if (reminderDateObj <= firstDateObj) {
                  frappe.msgprint({
                    title: __("Invalid Date"),
                    message: __(
                      "Date of Reminder Unauthorized Absence must be **after** the Date of 1st Unauthorized Absence."
                    ),
                    indicator: "red",
                  });
                  frm.set_value("date_of_reminder_letter", null);
                }
              }
            };
          }
        });
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
    // ✅ Call print button function

    frm.trigger("show_print_button");

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
    // ✅ Only allow for saved documents
    if (!frm.is_new()) {
      // Temporary: Remove role check to ensure button appears
      // const allowed_roles = ["System Manager", "Share Admin", "Administrator"];
      // if (!frappe.user_roles.some((role) => allowed_roles.includes(role))) return;

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

            <!-- TIMELINE BADGES -->
            <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin-top:6px;">
    `;

  // Timeline badges
  data.timeline.forEach((stage_obj, index) => {
    html += timeline_badge(stage_obj);
    if (index < data.timeline.length - 1) {
      html += `<div style="font-size:16px; color:#9e9e9e;">→</div>`;
    }
  });

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
                    <span style="font-size:12px;">🟢</span><span>Completed</span>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:12px;">🟠</span><span>In Progress</span>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:12px;">⚪</span><span>Not Created</span>
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

  switch (stage_obj.status) {
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

    default:
      bg = "#eeeeee";
      color = "#555";
      icon = "⚪";
  }

  return `
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
            ${icon} ${stage_obj.stage}
        </div>
    `;
}
