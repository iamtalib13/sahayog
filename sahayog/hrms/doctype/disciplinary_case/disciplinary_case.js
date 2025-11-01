// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Disciplinary Case", {
  refresh: function (frm) {
    // -------------------
    // Hide unwanted ERPNext default icon buttons (commented for now)
    // -------------------
    // $(".button.text-muted.btn.btn-default.icon-btn")
    //   .has("svg.icon.icon-sm")
    //   .hide();
    // $("button:has(svg.icon.icon-sm)").hide();

    // -------------------
    // Add Print Button
    // -------------------
    // -------------------
    // Disable future dates in date fields (set df.max and refresh)
    // -------------------
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
    // Restrict linked records with save-check
    // -------------------
    setTimeout(() => {
      const $suspension_btn = $('button[data-doctype="Suspension Process"]');
      const $response_btn = $('button[data-doctype="Response to SCN"]');

      // Remove previous handlers
      $suspension_btn.off("mousedown.suspension_check");
      $response_btn.off("mousedown.response_check");

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
    }, 1000);
    frm.trigger("show_print_button");
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
              )}&format=${encodeURIComponent("Show Cause Notice")}`
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
                                    padding-top: 160px; /* Push text below header image */
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
