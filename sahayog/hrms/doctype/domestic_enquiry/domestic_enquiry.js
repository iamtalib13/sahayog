// Copyright (c) 2025, Developer Team
// For license information, please see license.txt

frappe.ui.form.on("Domestic Enquiry", {
  refresh(frm) {
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

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
      console.log("Domestic Enquiry refresh fired");
      console.log("show_print_button called", frm.doc.name);

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
  },
});
