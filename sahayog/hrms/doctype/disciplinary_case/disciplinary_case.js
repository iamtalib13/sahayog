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
      // remove any previous handler first to avoid duplicate bindings
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
    setTimeout(() => {
      const $btn = $('button[data-doctype="Suspension Process"]');

      // Remove any previous handler and attach new one
      $btn
        .off("click.suspension_check")
        .on("mousedown.suspension_check", function (e) {
          if (frm.doc.suspension_required === "No") {
            e.stopImmediatePropagation();
            e.preventDefault(); // ✅ stops form opening
            frappe.msgprint({
              title: __("Not Allowed"),
              message: __(
                "Suspension Process cannot be created because 'Suspension Required' is set to 'No'."
              ),
              indicator: "red",
            });
            return false;
          }
        });
    }, 1000);
  },

  // -------------------
  // Field-level triggers (not inside refresh)
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
