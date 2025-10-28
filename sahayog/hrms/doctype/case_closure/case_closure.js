// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Case Closure", {
  onload(frm) {
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
});
