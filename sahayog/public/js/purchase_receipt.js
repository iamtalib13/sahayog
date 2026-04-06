frappe.ui.form.on("Purchase Receipt", {
  refresh: function (frm) {
    if (frappe.session.user !== "Administrator") {
      frm.trigger("hide_rejected_quantity_and_button");
    }
    frm.trigger("customize_ui");
    frm.trigger("hide_fields");
    frm.trigger("set_page_title");
    frm.trigger("set_warehouse");
    frm.trigger("hide_rejected_qty_column");
  },

  onload: function (frm) {
    frm.trigger("set_page_title");
    frm.trigger("set_warehouse");
  },

  set_page_title: function (frm) {
    if (frm.page && frm.page.set_title) {
      frm.page.set_title("Inward Form");
    }
  },

  customize_ui: function (frm) {
    frm.trigger("hide_sidebar");
  },

  hide_sidebar: function (frm) {
    setTimeout(() => {
      $("span.sidebar-toggle-btn").hide();
      $(".col-lg-2.layout-side-section").hide();
    }, 100);
  },

  hide_fields: function (frm) {
    const fields_to_hide = [
      "address_and_contact_tab",
      "terms_tab",
      "more_info_tab",
      "connections_tab",
      "custom_store_incharge",
      "supplier_delivery_note",
      "apply_putaway_rule",
      "is_return",
      "set_posting_time",
      "cost_center",
      "project",
      "currency_and_price_list",
      "scan_barcode",
      "rejected_warehouse",
      "is_subcontracted",
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
      frm.set_df_property(fieldname, "hidden", true);
      $(`#purchase-receipt-${fieldname}-tab`).hide();
    });
  },

  hide_rejected_quantity_and_button: function (frm) {
    setTimeout(() => {
      $('[data-fieldname="rejected_qty"]')
        .closest('.grid-header-row,[class^="col"]')
        .hide();
      $('[data-fieldname="rejected_qty"]').hide();
      $('button[data-label*="Get Items From"]').hide();
      $('button[data-label*="Create"]').hide();
      $('button[data-label*="Preview"]').hide();
      $('button[data-label*="View"]').hide();
      $('button[data-label*="Status"]').hide();
      $('button:contains("Get Items From")').hide();
      $('button:contains("Create")').hide();
      $('button:contains("Preview")').hide();
      $('button:contains("View")').hide();
      $('button:contains("Status")').hide();
      if (frm.doc.set_warehouse) {
        frm.set_df_property("set_warehouse", "read_only", 1);
      }
    }, 200);
  },

  set_warehouse: function (frm) {
    if (frm.doc.__islocal && !frm.doc.set_warehouse && !frm._warehouse_fetched) {
      frm._warehouse_fetched = true;
      frappe.call({
        method: "sahayog.procurement.api.stock_entry_report.get_user_warehouse",
        callback: function (r) {
          if (r.message && r.message.warehouse) {
            frm.set_df_property("set_warehouse", "hidden", false);
            frm.set_value("set_warehouse", r.message.warehouse);
            frm.set_df_property("set_warehouse", "read_only", 1);
          }
        },
        error: function (err) {
          console.error("Failed to fetch warehouse:", err);
          frm._warehouse_fetched = false;
        },
      });
    }
  },

  hide_rejected_qty_column: function (frm) {
    if (!frm.fields_dict.items) return;

    setTimeout(() => {
      frm.fields_dict["items"].$wrapper
        .find('th[data-fieldname="rejected_qty"]')
        .hide();
      frm.fields_dict["items"].$wrapper
        .find('td[data-fieldname="rejected_qty"]')
        .hide();
    }, 100);
  },
});
