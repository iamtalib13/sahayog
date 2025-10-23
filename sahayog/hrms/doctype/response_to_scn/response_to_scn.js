// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Response to SCN", {
  refresh(frm) {
    // 🚫 Restrict "+ New Domestic Enquiry" creation when Status of Response = "Satisfactory"
    setTimeout(() => {
      const $btn = $('button[data-doctype="Domestic Enquiry"]');

      // attach namespaced mousedown handler to block form creation
      $btn.off("mousedown.de_check").on("mousedown.de_check", function (e) {
        if (frm.doc.status_of_response === "Satisfactory") {
          e.stopImmediatePropagation();
          e.preventDefault(); // ✅ fully stops new form opening
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
    }, 1000);
  },
});
