frappe.ui.form.on("Stock Entry", {
  refresh: function (frm) {
    frm.trigger("customize_ui");
    frm.trigger("hide_fields");
    frm.trigger("set_page_title");
    frm.trigger("hide_rejected_quantity");
    frm.trigger("set_child_table_read_only");
    frm.trigger("set_warehouse");
     if (frappe.session.user !== "Administrator") {
      frm.set_df_property("from_warehouse", "read_only", 1);
    }

  },

  onload: function (frm) {
    frm.trigger("set_page_title");
    frm.trigger("set_metrial_transfer_default");

  },

  set_page_title: function (frm) {
    const custom_title = "Outward Form";

    if (frm.page && frm.page.set_title) {
      frm.page.set_title(custom_title);
    }

    const cur_page = frappe.ui.get_cur_page();
    if (cur_page && cur_page.set_title) {
      cur_page.set_title(custom_title);
    }
  },

  set_metrial_transfer_default: function(frm) {
    // Allowed values (same as in Stock Entry Type DocType)
    
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

  },
  set_child_table_read_only: function(frm) {
    console.log("Setting child table fields to read-only");
    const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
    if (!grid) return;

    // disable editing for these child-table fields (works for existing & new rows)
    grid.toggle_enable('s_warehouse', false);
    grid.toggle_enable('t_warehouse', false);    
  },

  customize_ui: function (frm) {
    frm.trigger("hide_sidebar");
  },

  hide_sidebar: function (frm) {
    setTimeout(() => {
      $("span.sidebar-toggle-btn").hide();
      $(".col-lg-2.layout-side-section").hide();
      // Optional: Expand main content section to avoid collapse if needed
      $(".col-md-10.layout-main-section").css("width", "100%");
    }, 100);
  },

  hide_fields: function (frm) {
    const fields_to_hide = [
      // Add fields and tabs to hide here for Stock Entry
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
      "target_warehouse_address",
      // Tabs/Sections
      "supplier_info_tab",
      "accounting_dimensions_section",
      "other_info_tab",
      "tab_connections"
      // replicate or customize based on Stock Entry fields similar to Purchase Receipt
    ];

    fields_to_hide.forEach((fieldname) => {
      frm.set_df_property(fieldname, "hidden", true);

      $(`#stock-entry-${fieldname}-tab`).hide();

      console.log("Hidden field/tab:", fieldname);
    });
  },
    hide_rejected_quantity: function(frm) {
    setTimeout(() => {

      // Hide "Get Items From" button by its data-label/text
      $('button[data-label*="Get Items From"]').hide();

      // Hide "Create" button (dropdown and single)
      $('button[data-label*="Create"]').hide();

      // Hide "Preview" button
      $('button[data-label*="Preview"]').hide();

      // Optionally: Hide by exact button text if data-label not set
      $('button:contains("Get Items From")').hide();
      $('button:contains("Create")').hide();
      $('button:contains("Preview")').hide();
      $('[data-fieldname="from_warehouse"]').prop('disabled', true);
    }, 200);
    
  },
set_warehouse: function(frm) {
  if (frm.is_new()) {
    frappe.call({
      method: "sahayog.procurement.api.stocke_entry_report.get_user_warehouse",
      callback: function(r) {
        if (r.message) {
          let warehouse = r.message.warehouse;
          console.log("Warehouse:", warehouse);

          // set value first
          frm.set_value("from_warehouse", warehouse);

          // then lock it down
          if (frappe.session.user !== "Administrator") {
            frm.set_df_property("from_warehouse", "read_only", 1);
          }
        }
      }
    });
  }
}
,

});

frappe.ui.form.on("Stock Entry", {
  refresh: function(frm) {
    // Add a custom button
    frm.add_custom_button("Show Stock Balance", () => {
      if (!frm.doc.to_warehouse) {
        frappe.msgprint("Please select a Target Warehouse (to_warehouse).");
        return;
      }

      if (!frm.doc.items || frm.doc.items.length === 0) {
        frappe.msgprint("Please add items in the table.");
        return;
      }

      // Collect all item codes from child table
      const item_codes = frm.doc.items.map(row => row.item_code);

      frappe.call({
        method: "sahayog.procurement.api.stocke_entry_report.get_available_qty"
,
        args: {
          warehouse: frm.doc.to_warehouse,
          item_codes: item_codes,
            // pass array of item codes
        },
        callback: function(r) {
          if (r.message) {
            show_stock_balance_dialog(r.message);
          }
        }
      });
    });
  }
});

function show_stock_balance_dialog(bins) {
  let html = `<table class="table table-bordered">
    <thead>
      <tr>
        <th>Item Code</th>
        <th>Item Name</th>
        <th>Warehouse</th>
        <th>Actual Qty</th>
      </tr>
    </thead>
    <tbody>`;
  
  bins.forEach(bin => {
    html += `<tr>
      <td>${bin.item_code}</td>
      <td>${bin.item_name || ''}</td>
      <td>${bin.warehouse}</td>
      <td>${bin.actual_qty}</td>
    </tr>`;
  });
  
  html += `</tbody></table>`;

  let d = new frappe.ui.Dialog({
    title: 'Stock Balance Report',
    size: 'large',
    fields: [
      {fieldtype: 'HTML', fieldname: 'stock_balance_html'},
    ]
  });

  d.fields_dict.stock_balance_html.$wrapper.html(html);
  d.show();
}
