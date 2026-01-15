frappe.ui.form.on("Purchase Receipt", {
  refresh: function (frm) {
    if (frappe.session.user !== "Administrator") {
      frm.trigger("hide_rejected_quantity_and_button");
    }
    // Apply UI customizations
    frm.trigger("customize_ui");
    frm.trigger("hide_fields");
    frm.trigger("set_page_title");
    frm.trigger("set_warehouse");
    hide_rejected_qty_column(frm);
  },

  onload: function (frm) {
    // Set title on form load
    frm.trigger("set_page_title");
    hide_rejected_qty_column(frm);
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

  hide_rejected_quantity_and_button: function (frm) {
    setTimeout(() => {
      // Hide header
      $('[data-fieldname="rejected_qty"]')
        .closest('.grid-header-row,[class^="col"]')
        .hide();
      // Hide cells
      $('[data-fieldname="rejected_qty"]').hide();

      // Hide "Get Items From" button by its data-label/text
      $('button[data-label*="Get Items From"]').hide();

      // Hide "Create" button (dropdown and single)
      $('button[data-label*="Create"]').hide();

      // Hide "Preview" button
      $('button[data-label*="Preview"]').hide();

      //hide view stock button
      $('button[data-label*="View"]').hide();

      //hide status button
      $('button[data-label*="Status"]').hide();

      // Optionally: Hide by exact button text if data-label not set
      $('button:contains("Get Items From")').hide();
      $('button:contains("Create")').hide();
      $('button:contains("Preview")').hide();
      $('button:contains("View")').hide();
      $('button:contains("Status")').hide();
      frm.set_df_property("set_warehouse", "read_only", 1);
    }, 200);
  },
  set_warehouse: function (frm) {
    if (frm.is_new()) {
      frappe.call({
        method: "sahayog.procurement.api.stock_entry_report.get_user_warehouse",
        callback: function (r) {
          if (r.message) {
            let warehouse = r.message.warehouse;
            let item_department = r.message.item_department;

            console.log("Warehouse:", warehouse);
            // set values on the form
            frm.set_value("set_warehouse", warehouse);
          }
        },
      });
    }
  },
  hide_rejected_qty_column: function (frm) {
    if (!frm.fields_dict.items) return;

    // Listen for every grid render event
    frm.fields_dict.items.grid.on("render", function () {
      // Hide the "Rejected Quantity" header cell
      frm.fields_dict["items"].$wrapper
        .find('th[data-fieldname="rejected_qty"]')
        .hide();
      // Hide all "Rejected Quantity" cells in every row
      frm.fields_dict["items"].$wrapper
        .find('td[data-fieldname="rejected_qty"]')
        .hide();
    });
  },
});
