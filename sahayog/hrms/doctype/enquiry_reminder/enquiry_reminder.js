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

            // Set field values fetched from Domestic Enquiry
            frm.set_value("domestic_enquiry", de.domestic_enquiry);
            frm.set_value("status_of_response", de.status_of_response);
            frm.set_value("date_of_enquiry", de.date_of_enquiry);
            frm.set_value("place_of_enquiry", de.place_of_enquiry);
            frm.set_value("enquiry_officer_name", de.enquiry_officer_name);

            // 💡 Force UI refresh so the value reflects immediately
            frm.refresh_field("status_of_response");
          }
        });
    }

    // ✅ Ensure button restrictions always reflect latest form value
    frappe.after_ajax(() => {
      const $caseClosureBtn = $('button[data-doctype="Case Closure"]');

      // Remove old event handlers (avoid duplicate binding)
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

      // 🔸 Case Closure Restriction based on Status of Response
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
  refresh(frm) {
    frm.trigger("show_print_button");
  },
  show_print_button: function (frm) {
    if (!frm.is_new()) {
      const allowed_roles = ["System Manager", "Share Admin"];

      if (frappe.user_roles.some((role) => allowed_roles.includes(role))) {
        frm
          .add_custom_button(__("Print"), function () {
            // Create overlay while loading
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

            // Create hidden iframe loading the print view
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = frappe.urllib.get_full_url(
              `/printview?doctype=${encodeURIComponent(frm.doc.doctype)}
            &name=${encodeURIComponent(frm.doc.name)}
            &format=${encodeURIComponent("Reminder Notice Of Enquiry")}
            &no_letterhead=1`.replace(/\s+/g, "")
            );
            document.body.appendChild(iframe);

            iframe.onload = () => {
              setTimeout(() => {
                const doc = iframe.contentWindow.document;

                // Inject print CSS including background image
                const style = doc.createElement("style");
                style.innerHTML = `
                @media print {
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    height: 100%;
                    background: url('/assets/sahayog/images/letter_head_and_footer_.png') no-repeat top center;
                    background-size: 100% auto;
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }

                  @page {
                    margin: 10mm !important;
                  }

                  .print-content {
                    position: relative;
                    padding-top: 0px;
                  }
                }
              `;
                doc.head.appendChild(style);

                // Wrap body content for styling
                const originalContent = doc.body.innerHTML;
                doc.body.innerHTML = `<div class="print-content">${originalContent}</div>`;

                // Preload the background image before printing
                const bgImg = new Image();
                bgImg.src =
                  "/assets/sahayog/images/letter_head_and_footer_.png";
                bgImg.onload = function () {
                  iframe.contentWindow.focus();
                  iframe.contentWindow.print();
                };

                // Fallback timeout to trigger print anyway
                setTimeout(() => {
                  iframe.contentWindow.focus();
                  iframe.contentWindow.print();
                }, 3000);

                let cleaned = false;
                const cleanup = () => {
                  if (cleaned) return;
                  cleaned = true;
                  overlay.remove();
                  iframe.remove();
                };

                iframe.contentWindow.addEventListener("afterprint", cleanup);
                setTimeout(cleanup, 6000);
              }, 600);
            };

            iframe.onerror = () => {
              frappe.msgprint("Error loading print preview");
              overlay.remove();
              iframe.remove();
            };
          })
          .addClass("btn-primary");
      }
    }
  },
});
