// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Ticket Department", {
  refresh(frm) {
    //add set intro on is_active on not new form
    if (frm.is_new()) {
      frm.set_intro(
        __(
          "Please fill the details carefully, as this will be used to manage ticket departments."
        ),
        "blue"
      );
    } else if (frm.doc.is_active) {
      frm.set_intro(
        __("Active department. You can manage tickets here."),
        "green"
      );
    } else {
      frm.set_intro(
        __("Inactive department. You cannot manage tickets here."),
        "red"
      );
    }
  },
});
