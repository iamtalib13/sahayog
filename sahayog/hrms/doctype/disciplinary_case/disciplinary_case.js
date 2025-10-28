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
    frm.add_custom_button("Print", function () {
      const url = frappe.urllib.get_full_url(
        `/api/method/frappe.utils.weasyprint.download_pdf?doctype=Disciplinary+Case&name=${encodeURIComponent(
          frm.doc.name
        )}&print_format=Show+Cause+Notice&letterhead=Disciplinary+Case`
      );
      window.open(url, "_blank");
    });

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
});
