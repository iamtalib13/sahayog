frappe.ui.form.on("Purchase Receipt", {
  refresh: function (frm) {
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
      "posting_date",
      "posting_time",
      "naming_series",

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

    // Call your API only when creating a new Purchase Receipt
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
            frm.set_value("set_warehouse", warehouse);
            frm.set_value("custom_department", item_department);
          }
        }
      });
    }
    frm.page.set_title("Inward");
    setTimeout(function() {
  $(".breadcrumb-item:contains('Purchase Receipt')").text("Inward");
}, 500);
    // Keep trying to rename breadcrumb until success or timeout after ~3 seconds
    let tries = 0;
    let max_tries = 30; // 30 tries * 100ms = 3 seconds max
    let interval = setInterval(() => {
      let breadcrumb = $(".breadcrumb-item:contains('Purchase Receipt')");
      if (breadcrumb.length) {
        breadcrumb.text("Inward");
        clearInterval(interval);
      } else if (++tries > max_tries) {
        clearInterval(interval);
      }
    }, 100);
  


    // Change breadcrumb label (left corner)
    $(".breadcrumb-item:contains('Purchase Receipt')").text("Inward");

   // Apply filter to item_code in the "items" child table
    frm.fields_dict["items"].grid.get_field("item_code").get_query = function(doc, cdt, cdn) {
      let row = locals[cdt][cdn]; // current row if needed
      return {
        filters: [
          ["Item", "custom_item_department", "=", frm.doc.custom_department]
        ]
      };
    };
  }
});
