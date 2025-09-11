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
      "posting_date",
      "posting_time",
      "naming_series",
      "add_to_transit",
      "source_warehouse_address",
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
    if (frm.is_new()) {
      frappe.call({
        method: "sahayog.api.stationery_api.get_user_warehouse", // your API path
        callback: function (r) {
          if (r.message) {
            let warehouse = r.message.warehouse;
            let item_department = r.message.item_department;

            console.log("Warehouse:", warehouse);
            console.log("Department:", item_department);

            // set values on the form
            frm.set_value("from_warehouse", warehouse);
            frm.set_value("custom_department", item_department);
            
          }
        }
      });
    }   
    if (frappe.session.user !== "Administrator") {
    frm.set_df_property("from_warehouse", "read_only", 1);
    }
    // Apply filter to item_code in the "items" child table
    frm.fields_dict["items"].grid.get_field("item_code").get_query = function(doc, cdt, cdn) {
      let row = locals[cdt][cdn]; // current row if needed
      return {
        filters: [
          ["Item", "custom_item_department", "=", frm.doc.custom_department]
        ]
      };
    };    
  },
    onload: function(frm) {
    // Allowed values (same as in Stock Entry Type DocType)
    if (frappe.session.user !== "Administrator") {
    
    const allowed_types = [
      { label: "Material Transfer", value: "Material Transfer" },
      { label: "Material Issue", value: "Material Issue" }
    ];

    // Restrict the Link field to only these values
    frm.fields_dict["stock_entry_type"].get_query = function() {
      return {
        filters: {
          name: ["in", allowed_types.map(opt => opt.value)]
        }
      };
    };

    // Auto-select default
    if (frm.is_new()) {
      frm.set_value("stock_entry_type", "Material Transfer");
    }
  }  
}
});
