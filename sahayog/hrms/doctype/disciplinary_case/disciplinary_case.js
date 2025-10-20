frappe.ui.form.on("Disciplinary Case", {
  refresh(frm) {
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
    // Add Close Case Button (only if not closed)
    // -------------------
    if (frm.doc.status !== "Closed") {
      frm.add_custom_button("Close", function () {
        frappe.prompt(
          [
            {
              label: "Closing Remark",
              fieldname: "closing_remark",
              fieldtype: "Small Text",
              reqd: 1,
            },
          ],
          function (values) {
            frm.set_value("closing_remark", values.closing_remark);
            frm.set_value("status", "Closed");
            frm.save().then(() => {
              frappe.msgprint("The case has been closed successfully.");
            });
          },
          __("Close Disciplinary Case"),
          __("Close")
        );
      });
    }

    // -------------------
    // Disable future dates in date fields
    // -------------------
    let today = frappe.datetime.now_date();
    frm.set_df_property("issue_occurrence_date", "options", { max: today });
    frm.set_df_property("issue_report_to_hr", "options", { max: today });

    // -------------------
    // Prevent typing alphabets in Amount of Fraud field
    // -------------------
    if (frm.fields_dict.amount_of_fraud) {
      frm.fields_dict.amount_of_fraud.$input.on("keypress", function (e) {
        const char = String.fromCharCode(e.which);
        if (!/[0-9.]/.test(char)) {
          e.preventDefault();
        }
      });
    }
  },

  // -------------------
  // Field-level triggers (not inside refresh)
  // -------------------
  issue_occurrence_date(frm) {
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

  issue_report_to_hr(frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.issue_report_to_hr && frm.doc.issue_report_to_hr > today) {
      frappe.msgprint(
        "You cannot select a future date for Issue Reported to HR."
      );
      frm.set_value("issue_report_to_hr", "");
    }
  },

  amount_of_fraud(frm) {
    let value = frm.doc.amount_of_fraud;

    // If user entered alphabets or invalid symbols
    if (value && isNaN(value)) {
      frappe.msgprint({
        title: __("Invalid Input"),
        message: __(
          "Please enter a valid numeric amount in 'Amount of Fraud'."
        ),
        indicator: "red",
      });

      // Reset field
      frm.set_value("amount_of_fraud", 0);
    }
  },

  validate(frm) {
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

    // Validate Amount of Fraud again before saving
    if (frm.doc.amount_of_fraud && isNaN(frm.doc.amount_of_fraud)) {
      frappe.throw(__("Amount of Fraud must be a valid number."));
    }
  },
});
