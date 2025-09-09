frappe.ui.form.on("Purchase Receipt", {
  refresh: function(frm) {
    // Fields & Tabs to hide for non-Admin users
    const fields_to_hide = [
      // Tabs
      "address_and_contact_tab",
      "terms_tab",
      "more_info_tab",
      "connections_tab",

      // Custom fields
      "custom_store_incharge",
      "supplier_delivery_note",
      "apply_putaway_rule",
      "is_return",
      "set_posting_time",

      // Standard fields
      "cost_center",
      "project",
      "currency_and_price_list",
      "scan_barcode",
      "rejected_warehouse",
      "is_subcontracted",

      // Sections
      "taxes_charges_section",
      "taxes_section",
      "totals",
      "section_break_46",
      "section_break_42",
      "sec_tax_breakup",
      "pricing_rule_details",
      "raw_material_details"
    ];

    if (frappe.session.user !== "Administrator") {
      fields_to_hide.forEach(fieldname => {
        // Hide metadata field
        frm.set_df_property(fieldname, "hidden", true);

        // Hide tab button if it's a Tab Break
        $(`#purchase-receipt-${fieldname}-tab`).hide();

        console.log("Hidden field/tab:", fieldname);
      });
    }
  }
});
