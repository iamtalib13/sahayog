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
});
