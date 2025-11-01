// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Suspension Process", {
  refresh(frm) {
    frm.trigger("show_print_button");
  },

  // Auto calculate suspension_to_date based on days_of_suspension and suspension_from_date
  days_of_suspension: function (frm) {
    frm.trigger("calculate_suspension_to_date");
  },
  suspension_from_date: function (frm) {
    frm.trigger("calculate_suspension_to_date");
  },
  calculate_suspension_to_date: function (frm) {
    if (frm.doc.days_of_suspension && frm.doc.suspension_from_date) {
      // Convert date to JS Date object
      let fromDate = frappe.datetime.str_to_obj(frm.doc.suspension_from_date);

      // Add days
      let toDate = frappe.datetime.add_days(
        fromDate,
        frm.doc.days_of_suspension
      );

      // Set auto to_date
      frm.set_value("suspension_to_date", frappe.datetime.obj_to_str(toDate));
    }
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
              )}&format=${encodeURIComponent("Suspension Order")}`
            );
            document.body.appendChild(iframe);

            iframe.onload = () => {
              setTimeout(() => {
                const doc = iframe.contentWindow.document;

                // Inject CSS to set background image
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
                                    padding-top: 0px; /* Push text below header image */
                                }
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
