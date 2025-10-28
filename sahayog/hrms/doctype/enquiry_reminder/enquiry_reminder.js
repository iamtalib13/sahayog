// Copyright (c) 2025, Developer Team
// For license information, please see license.txt

frappe.ui.form.on("Enquiry Reminder", {
  onload(frm) {
    // Fetch latest Domestic Enquiry details for the same case_id (only for new record)
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
          ],
        })
        .then((list) => {
          if (list.length) {
            const de = list[0];

            // Set field values fetched from Domestic Enquiry
            frm.set_value("domestic_enquiry", de.domestic_enquiry);
            frm.set_value("status_of_response", de.status_of_response);
            frm.set_value("date_of_enquiry", de.date_of_enquiry);
            frm.set_value("place_of_enquiry", de.place_of_enquiry);
            frm.set_value("enquiry_officer_name", de.enquiry_officer_name);

            // 💡 Force UI refresh so the value reflects immediately
            frm.refresh_field("status_of_response");
          }
        });
    }

    // ✅ Ensure button restrictions always reflect latest form value
    frappe.after_ajax(() => {
      const $caseClosureBtn = $('button[data-doctype="Case Closure"]');

      // Remove old event handlers (avoid duplicate binding)
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

      // 🔸 Case Closure Restriction based on Status of Response
      $caseClosureBtn.on("mousedown.cc_check", (e) => {
        if (!ensureSaved(e)) return;
        const current_status = frm.doc.status_of_response;

        if (current_status === "Not Submitted") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Case Closure cannot be created until 'Status of Response' is submitted (either <b>Satisfactory</b> or <b>Not Satisfactory</b>)."
            ),
            indicator: "red",
          });
        }
      });
    });
  },
});
