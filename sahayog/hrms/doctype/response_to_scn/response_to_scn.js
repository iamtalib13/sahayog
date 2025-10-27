// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Response to SCN", {
  refresh(frm) {
    // Wait until all buttons are loaded
    frappe.after_ajax(() => {
      const $domesticBtn = $('button[data-doctype="Domestic Enquiry"]');
      const $caseClosureBtn = $('button[data-doctype="Case Closure"]');

      // Remove previous handlers to prevent duplicates
      $domesticBtn.off("mousedown.de_check");
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

      // 🔸 Domestic Enquiry Restriction
      $domesticBtn.on("mousedown.de_check", (e) => {
        if (!ensureSaved(e)) return;
        if (frm.doc.status_of_response === "Satisfactory") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Domestic Enquiry cannot be created because 'Status of Response' is 'Satisfactory'."
            ),
            indicator: "red",
          });
        }
      });

      // 🔸 Case Closure Restriction
      $caseClosureBtn.on("mousedown.cc_check", (e) => {
        if (!ensureSaved(e)) return;
        if (frm.doc.status_of_response === "Not Satisfactory") {
          e.preventDefault();
          e.stopImmediatePropagation();
          frappe.msgprint({
            title: __("Not Allowed"),
            message: __(
              "Case Closure cannot be created because 'Status of Response' is 'Not Satisfactory'."
            ),
            indicator: "red",
          });
        }
      });
    });
  },

  // 🔄 Auto-set Domestic Enquiry based on Status of Response
  status_of_response(frm) {
    if (frm.doc.status_of_response === "Satisfactory") {
      frm.set_value("domestic_enquiry", "No");
    } else if (frm.doc.status_of_response === "Not Satisfactory") {
      frm.set_value("domestic_enquiry", "Yes");
    } else {
      frm.set_value("domestic_enquiry", ""); // optional: clear if something else
    }
  },
});
