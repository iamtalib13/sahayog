// Copyright (c) 2025, Developer Team
// For license information, please see license.txt

frappe.ui.form.on("Domestic Enquiry", {
  refresh(frm) {
    // Skip logic for unsaved (new) records
    frappe.after_ajax(() => {
      // wait until all the buttons are loaded
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
  },

  // ✅ Restrict Past Dates in Date of Enquiry
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

  // ✅ Final validation before save
  validate(frm) {
    let today = frappe.datetime.now_date();
    if (frm.doc.date_of_enquiry && frm.doc.date_of_enquiry < today) {
      frappe.throw(__("Date of Enquiry cannot be in the past."));
    }
  },
});
