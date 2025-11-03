// Copyright (c) 2025, Developer Team
// For license information, please see license.txt

frappe.ui.form.on("Domestic Enquiry", {
  refresh(frm) {
    // Skip logic for unsaved (new) records
    frappe.after_ajax(() => {
      const $enquiryReminderBtn = $(`button[data-doctype="Enquiry Reminder"]`);
      const $caseClosureBtn = $(`button[data-doctype="Case Closure"]`);

      // Remove any previously attached handlers
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
        if (frm.doc.status_of_response !== "Not Submitted") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Enquiry Reminder can only be created when 'Status of Response' is <b>Not Submitted</b>."
            ),
            indicator: "red",
          });
        }
      });

      // 🔸 Case Closure Restriction
      $caseClosureBtn.on("mousedown.cc_check", (e) => {
        if (!ensureSaved(e)) return;
        if (frm.doc.status_of_response === "Not Submitted") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Case Closure cannot be created until 'Status of Response' is submitted (either <b>Satisfactory</b> or <b>Not Satisfactory</b>)."
            ),
            indicator: "orange",
          });
        }
      });
    });
    frm.trigger("show_print_button");
  },
  show_print_button: function (frm) {
    if (!frm.is_new()) {
      const allowed_roles = ["System Manager", "Share Admin"];

      if (frappe.user_roles.some((role) => allowed_roles.includes(role))) {
        frm
          .add_custom_button(__("Print"), function () {
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
              setTimeout(() => {
                const doc = iframe.contentWindow.document;

                // Inject CSS to set background image
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

                // Wrap content inside container so it prints above background
                const bodyHTML = doc.body.innerHTML;
                doc.body.innerHTML = `<div class="print-content">${bodyHTML}</div>`;

                iframe.contentWindow.focus();
                iframe.contentWindow.print();

                let done = false;
                const cleanup = () => {
                  if (done) return;
                  done = true;
                  overlay.remove();
                  iframe.remove();
                };

                iframe.contentWindow.addEventListener("afterprint", cleanup);
                setTimeout(cleanup, 3000);
              }, 800);
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
