// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Case Closure", {
  onload(frm) {
    // Auto-fetch fields from Enquiry Reminder based on case_id
    if (frm.doc.case_id) {
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
          if (r.message) {
            const data = r.message;
            frm.set_value("domestic_enquiry", data.domestic_enquiry);
            frm.set_value("place_of_enquiry", data.place_of_enquiry);
            frm.set_value("status_of_response", data.status_of_response);
            frm.set_value("date_of_enquiry", data.date_of_enquiry);
            frm.set_value("enquiry_officer_name", data.enquiry_officer_name);
            frm.set_value("enquiry_status", data.enquiry_status);
          }
        });
    }
  },

  before_save(frm) {
    // Ensure linked doctypes' case_status are updated on server-side
    if (frm.doc.case_id) {
      frappe.call({
        method:
          "sahayog.hrms.doctype.case_closure.case_closure.close_linked_case",
        args: { case_id: frm.doc.case_id },
        async: false, // Make sure server-side updates finish before save
      });
    }
  },

  after_save(frm) {
    // Show success message only
    frappe.msgprint({
      title: __("Success"),
      message: __("The case has been closed successfully."),
      indicator: "green",
    });
  },
});
