// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Case Closure", {
  onload(frm) {
    if (!frm.doc.case_id) return;

    // 1️⃣ Try fetching from Domestic Enquiry
    frappe.db
      .get_value("Domestic Enquiry", { case_id: frm.doc.case_id }, [
        "domestic_enquiry",
        "place_of_enquiry",
        "status_of_response",
        "date_of_enquiry",
        "enquiry_officer_name",
      ])
      .then((de_res) => {
        console.log("🟡 Domestic Enquiry fetched data:", de_res.message);
        if (de_res.message && Object.keys(de_res.message).length > 0) {
          const de = de_res.message;
          frm.set_value("domestic_enquiry", de.domestic_enquiry);
          frm.set_value("place_of_enquiry", de.place_of_enquiry);
          frm.set_value("status_of_response", de.status_of_response);
          frm.set_value("date_of_enquiry", de.date_of_enquiry);
          frm.set_value("enquiry_officer_name", de.enquiry_officer_name);
        } else {
          // 2️⃣ If no Domestic Enquiry found, fetch from Enquiry Reminder
          frappe.db
            .get_value("Enquiry Reminder", { case_id: frm.doc.case_id }, [
              "domestic_enquiry",
              "place_of_enquiry",
              "status_of_response",
              "date_of_enquiry",
              "enquiry_officer_name",
              "enquiry_status",
            ])
            .then((r) => {
              console.log("🔍 Enquiry Reminder fetched data:", r.message);
              if (r.message) {
                const data = r.message;
                frm.set_value("domestic_enquiry", data.domestic_enquiry);
                frm.set_value("place_of_enquiry", data.place_of_enquiry);
                frm.set_value("status_of_response", data.status_of_response);
                frm.set_value("date_of_enquiry", data.date_of_enquiry);
                frm.set_value(
                  "enquiry_officer_name",
                  data.enquiry_officer_name
                );
                frm.set_value("enquiry_status", data.enquiry_status);
              }
            });
        }
      });
  },

  before_save(frm) {
    if (frm.doc.case_id) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.case_closure.case_closure.close_linked_case",
        args: { case_id: frm.doc.case_id },
        async: false,
      });
    }
  },

  after_save(frm) {
    frappe.msgprint({
      title: __("Success"),
      message: __("The case has been closed successfully."),
      indicator: "green",
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
              )}&format=${encodeURIComponent(
                "Case Closure Reports"
              )}&no_letterhead=0&letterhead=${encodeURIComponent("")}`
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
