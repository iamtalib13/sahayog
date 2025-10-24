// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Response to SCN", {
  refresh(frm) {
    // 🚫 Restrict "+ New Domestic Enquiry" and "+ New Case Closure" based on Status of Response
    setTimeout(() => {
      // -----------------------------
      // Domestic Enquiry restriction
      // -----------------------------
      const $domesticBtn = $('button[data-doctype="Domestic Enquiry"]');
      $domesticBtn
        .off("mousedown.de_check")
        .on("mousedown.de_check", function (e) {
          if (frm.doc.status_of_response === "Satisfactory") {
            e.stopImmediatePropagation();
            e.preventDefault();
            frappe.msgprint({
              title: __("Not Allowed"),
              message: __(
                "Domestic Enquiry cannot be created because 'Status of Response' is 'Satisfactory'."
              ),
              indicator: "red",
            });
            return false;
          }
        });

      // -----------------------------
      // Case Closure restriction
      // -----------------------------
      const $caseClosureBtn = $('button[data-doctype="Case Closure"]');
      $caseClosureBtn
        .off("mousedown.cc_check")
        .on("mousedown.cc_check", function (e) {
          if (frm.doc.status_of_response === "Not Satisfactory") {
            e.stopImmediatePropagation();
            e.preventDefault();
            frappe.msgprint({
              title: __("Not Allowed"),
              message: __(
                "Case Closure cannot be created because 'Status of Response' is 'Not Satisfactory'."
              ),
              indicator: "red",
            });
            return false;
          }
        });
    }, 1000);
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
