frappe.ui.form.on("Purchase Receipt", {
  refresh: function (frm) {
    // Apply UI customizations
    frm.trigger("customize_ui");
    frm.trigger("hide_fields");
    frm.trigger("set_page_title");
  },

  onload: function (frm) {
    // Set title on form load
    frm.trigger("set_page_title");
  },

  set_page_title: function (frm) {
    // Set custom title for the form
    const custom_title = "Inward Form";

    if (frm.page && frm.page.set_title) {
      frm.page.set_title(custom_title);
    }

    // Alternative method for current page
    const cur_page = frappe.ui.get_cur_page();
    if (cur_page && cur_page.set_title) {
      cur_page.set_title(custom_title);
    }
  },

  customize_ui: function (frm) {
    // Hide sidebar elements
    frm.trigger("hide_sidebar");

    // Additional UI customizations can be added here
  },

  hide_sidebar: function (frm) {
    // Hide sidebar toggle button and sidebar section
    setTimeout(() => {
      $("span.sidebar-toggle-btn").hide();
      $(".col-lg-2.layout-side-section").hide();
    }, 100);
  },

  hide_fields: function (frm) {
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
      "raw_material_details",
    ];

    fields_to_hide.forEach((fieldname) => {
      // Hide metadata field
      frm.set_df_property(fieldname, "hidden", true);

      // Hide tab button if it's a Tab Break
      $(`#purchase-receipt-${fieldname}-tab`).hide();

      console.log("Hidden field/tab:", fieldname);
    });
  },
});
