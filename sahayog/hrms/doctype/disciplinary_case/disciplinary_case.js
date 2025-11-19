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
      const allowed_roles = ["System Manager", "Share Admin"];
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
