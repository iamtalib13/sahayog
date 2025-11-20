// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Response to SCN", {
  response_to_scn(frm) {
    // Toggle visibility of Status of Response & Domestic Enquiry
    const show_fields = frm.doc.response_to_scn === "Yes";
    frm.toggle_display("status_of_response", show_fields);
    frm.toggle_display("domestic_enquiry", show_fields);

    // If "No", clear dependent fields
    if (!show_fields) {
      frm.set_value("status_of_response", "");
      frm.set_value("domestic_enquiry", "");
    }
  },
  refresh(frm) {
    if (!frm.is_new()) {
      const btn = frm.add_custom_button("View Case History", function () {
        frappe.set_route("query-report", "Case History", {
          case_id: frm.doc.case_id,
        });
      });

      btn.removeClass("btn-default").addClass("btn-primary");
    }

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
      frm.set_value("domestic_enquiry", "");
    }
  },

  onload(frm) {
    // Handle visibility when re-opening existing form
    const show_fields = frm.doc.response_to_scn === "Yes";
    frm.toggle_display("status_of_response", show_fields);
    frm.toggle_display("domestic_enquiry", show_fields);
  },
});
