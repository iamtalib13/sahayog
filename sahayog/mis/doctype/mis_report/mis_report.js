// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("MIS Report", {
  refresh(frm) {},

  // Runs every time the doc is saved (new or update)
  after_save(frm) {
    // Redirect the user to the MIS Admin workspace
    frappe.set_route("/app/mis-admin");
  },
});
