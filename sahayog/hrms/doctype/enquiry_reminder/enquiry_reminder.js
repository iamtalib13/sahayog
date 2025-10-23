// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt
frappe.ui.form.on("Enquiry Reminder", {
  onload(frm) {
    if (frm.doc.__islocal && frm.doc.case_id) {
      frappe.db
        .get_list("Domestic Enquiry", {
          filters: { case_id: frm.doc.case_id },
          order_by: "creation desc",
          limit_page_length: 1,
          fields: [
            "name",
            "domestic_enquiry",
            "status_of_response",
            "date_of_enquiry",
            "place_of_enquiry",
            "enquiry_officer_name",
            "remarks",
          ],
        })
        .then((list) => {
          if (list.length) {
            const de = list[0];
            // ✅ Use the "domestic_enquiry" field (Yes/No), not the record name
            frm.set_value("domestic_enquiry", de.domestic_enquiry);
            frm.set_value("status_of_response", de.status_of_response);
            frm.set_value("date_of_enquiry", de.date_of_enquiry);
            frm.set_value("place_of_enquiry", de.place_of_enquiry);
            frm.set_value("enquiry_officer_name", de.enquiry_officer_name);
            frm.set_value("remarks", de.remarks);
          }
        });
    }
  },
});
