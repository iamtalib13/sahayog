frappe.ui.form.on("Stock Entry", {
  refresh: function(frm) {
    // Fields & Tabs to hide for non-Admin users
    const fields_to_hide = [
      // Standard/custom fields
      "set_posting_time",
      "inspection_required",
      "bom_info_section",
      "scan_barcode",
      "additional_costs_section",
      "apply_putaway_rule",
      // Tabs/Sections
      "supplier_info_tab",
      "accounting_dimensions_section",
      "other_info_tab",
      "tab_connections"
    ];

    if (frappe.session.user !== "Administrator") {
      fields_to_hide.forEach(fieldname => {
        // Hide field/section/tab
        frm.set_df_property(fieldname, "hidden", true);

        // Hide tab button if it exists – safe for Tab Section fields
        $(`#stock-entry-${fieldname}-tab`).hide();

        // Debug log
        console.log("Hidden field/tab:", fieldname);
      });
    }
  }
});
