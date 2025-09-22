frappe.ui.form.on("Shareholder", {
  refresh: function (frm) {
    // Hide naming_series field
    frm.set_df_property("naming_series", "hidden", 1);
    frm.set_df_property("title", "hidden", 1);
    frm.set_df_property("address_contacts", "hidden", 1);
    frm.set_df_property("section_break_2", "hidden", 1);
  },
});
