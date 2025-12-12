frappe.ui.form.on("Stock Entry", {
  refresh: function (frm) {
    if (frappe.session.user !== "Administrator") {
      frm.trigger("hide_rejected_quantity");
    }

    frm.trigger("customize_ui");
    frm.trigger("hide_fields");
    frm.trigger("set_page_title");
    frm.trigger("set_child_table_read_only");
    frm.trigger("set_warehouse");
    frm.trigger("emr_popup");
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

  set_metrial_transfer_default: function (frm) {
    // Allowed values (same as in Stock Entry Type DocType)

    const allowed_types = [
      { label: "Material Transfer", value: "Material Transfer" },
      { label: "Material Issue", value: "Material Issue" },
    ];

    // Restrict the Link field to only these values
    frm.fields_dict["stock_entry_type"].get_query = function () {
      return {
        filters: {
          name: ["in", allowed_types.map((opt) => opt.value)],
        },
      };
    };

    // Auto-select default
    if (frm.is_new()) {
      frm.set_value("stock_entry_type", "Material Transfer");
    }
  },
  set_child_table_read_only: function (frm) {
    const grid = frm.fields_dict.items && frm.fields_dict.items.grid;
    if (!grid) return;

    // disable editing for these child-table fields (works for existing & new rows)
    grid.toggle_enable("s_warehouse", false);
    grid.toggle_enable("t_warehouse", false);
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
      "custom_asset_request",
      "employee_material_request",
      // Tabs/Sections
      "supplier_info_tab",
      "accounting_dimensions_section",
      "other_info_tab",
      "tab_connections",
      // replicate or customize based on Stock Entry fields similar to Purchase Receipt
    ];

    fields_to_hide.forEach((fieldname) => {
      frm.set_df_property(fieldname, "hidden", true);

      $(`#stock-entry-${fieldname}-tab`).hide();

      console.log("Hidden field/tab:", fieldname);
    });

    //hide submit button when user is not in allowed roles
    let allowed_roles = ["Administrator", "Owner", "Branch Manager"];
    let has_role = allowed_roles.some((role) => frappe.user.has_role(role));

    if (frm.doc.__islocal) {
      // New document - show Save button for all
      frm.page.btn_primary.show();
    } else {
      // Existing document - toggle Submit button visibility based on role
      if (!has_role) {
        frm.page.btn_primary.hide(); // hide Submit button if no role
      } else {
        frm.page.btn_primary.show(); // show Submit button for allowed roles
      }
    }
  },
  hide_rejected_quantity: function (frm) {
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
      frm.set_df_property("from_warehouse", "read_only", 1);
    }, 200);
  },
  set_warehouse: function (frm) {
    if (frappe.session.user !== "Administrator") {
      if (frm.is_new()) {
        frappe.call({
          method:
            "sahayog.procurement.api.stock_entry_report.get_user_warehouse",
          callback: function (r) {
            if (r.message) {
              let warehouse = r.message.warehouse;
              console.log("Warehouse:", warehouse);

              // set value first
              frm.set_value("from_warehouse", warehouse);
            }
          },
        });
      }
    }
  },
  emr_popup: function (frm) {
    frm.set_value("employee_material_request", null);
    if (frm.doc.custom_material_request) {
      frm.set_value(
        "custom_material_request_doctype",
        "Employee Material Request"
      );

      frm.add_custom_button("View EMR Items", async () => {
        // Fetch EMMR document
        const emmr_doc = await frappe.db.get_doc(
          "Employee Material Request",
          frm.doc.custom_material_request
        );
        console.log("EMMR Doc:", emmr_doc);

        const from_warehouse = "from_warehouse";
        const to_warehouse = "to_warehouse";

        // -------------------------------
        // FETCH SOURCE WAREHOUSE STOCK
        // -------------------------------
        let source_stock_map = {};
        try {
          const stock_res = await frappe.call({
            method:
              "sahayog.procurement.api.stock_balance_ledger.get_stock_balance_data",
            args: {
              item_code: null,
              warehouse: emmr_doc.source_warehouse,
            },
          });

          if (stock_res.message && stock_res.message.data) {
            stock_res.message.data.forEach((row) => {
              source_stock_map[row.item_code] = row.bal_qty;
            });
          }
        } catch (e) {
          console.error("Failed to fetch SOURCE stock balance:", e);
        }

        // -------------------------------
        // FETCH TARGET WAREHOUSE STOCK
        // -------------------------------
        let target_stock_map = {};
        try {
          const target_res = await frappe.call({
            method:
              "sahayog.procurement.api.stock_balance_ledger.get_stock_balance_data",
            args: {
              item_code: null,
              warehouse: emmr_doc.target_warehouse,
            },
          });

          if (target_res.message && target_res.message.data) {
            target_res.message.data.forEach((row) => {
              target_stock_map[row.item_code] = row.bal_qty;
            });
          }
        } catch (e) {
          console.error("Failed to fetch TARGET stock balance:", e);
        }

        // Set warehouses in form
        frm.set_value(from_warehouse, emmr_doc.source_warehouse);
        frm.set_value(to_warehouse, emmr_doc.target_warehouse);

        // No EMR items
        if (!emmr_doc.items || emmr_doc.items.length === 0) {
          frappe.msgprint("No items found in this EMMR.");
          return;
        }

        // -------------------------------
        // BUILD POPUP TABLE HTML
        // -------------------------------
        let html = `
        <table class="table table-bordered table-striped">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Select</th>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Item Category</th>
                    <th>Target Warehouse Qty (${emmr_doc.target_warehouse})</th>
                    <th>Qty</th>
                    <th>Actual Warehouse Qty (${emmr_doc.source_warehouse})</th>
                </tr>
            </thead>
            <tbody>
        `;

        let sr_no = 1;

        emmr_doc.items.forEach((row) => {
          if (row.item_category !== "Stock Item") return;

          html += `
                <tr>
                    <td>${sr_no}</td>
                    <td>
                        <input type="checkbox" class="emmr-check"
                            data-item="${row.item_code}"
                            data-description="${row.description || ""}"
                            data-qty="${row.quantity}"
                            data-sourceqty="${
                              source_stock_map[row.item_code] || 0
                            }"
                            data-targetqty="${
                              target_stock_map[row.item_code] || 0
                            }"
                        >
                    </td>
                    <td>${row.item_code}</td>
                    <td>${row.description || ""}</td>
                    <td>${row.item_category || ""}</td>
                    <td>${target_stock_map[row.item_code] || 0}</td>
                    <td>${row.quantity}</td>
                    <td>${source_stock_map[row.item_code] || 0}</td>
                </tr>
            `;
          sr_no++;
        });

        html += "</tbody></table>";

        // -------------------------------
        // SHOW POPUP DIALOG
        // -------------------------------
        let d = new frappe.ui.Dialog({
          title: "EMR Items",
          size: "large",
          fields: [{ fieldname: "items_html", fieldtype: "HTML" }],
          primary_action_label: "Add Selected Items",
          primary_action() {
            let selected = [];

            d.$wrapper.find(".emmr-check:checked").each(function () {
              selected.push({
                item_code: $(this).data("item"),
                description: $(this).data("description"),
                qty: $(this).data("qty"),
              });
            });

            if (selected.length === 0) {
              frappe.msgprint("Please select at least one item.");
              return;
            }

            if (
              frm.doc.items &&
              frm.doc.items.length === 1 &&
              !frm.doc.items[0].item_code
            ) {
              frm.doc.items = [];
            }

            let existing_items = (frm.doc.items || []).map((i) => i.item_code);
            let duplicate_items = [];

            // Insert selected items
            selected.forEach((row) => {
              if (existing_items.includes(row.item_code)) {
                duplicate_items.push(row.item_code);
                return;
              }

              let child = frm.add_child("items");
              child.item_code = row.item_code;
              child.qty = row.qty;
              child.transfer_qty = 1;
              child.conversion_factor = 1.0;
              child.qty_as_per_stock_uom = child.qty * child.conversion_factor;

              existing_items.push(row.item_code);
            });

            frm.refresh_field("items");
            d.hide();

            if (duplicate_items.length > 0) {
              frappe.msgprint(`
                        The following items were NOT added because they already exist:<br><br>
                        <b>${duplicate_items.join(", ")}</b>
                    `);
            } else {
              frappe.show_alert("Selected items added successfully.");
            }
          },
        });

        d.fields_dict.items_html.$wrapper.html(html);
        d.show();
      });
    }
  },
});

frappe.ui.form.on("Stock Entry", {
  refresh: function (frm) {
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
      const item_codes = frm.doc.items.map((row) => row.item_code);

      frappe.call({
        method: "sahayog.procurement.api.stock_entry_report.get_available_qty",
        args: {
          warehouse: frm.doc.to_warehouse,
          item_codes: item_codes,
          // pass array of item codes
        },
        callback: function (r) {
          if (r.message) {
            show_stock_balance_dialog(r.message);
          }
        },
      });
    });
  },
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

  bins.forEach((bin) => {
    html += `<tr>
      <td>${bin.item_code}</td>
      <td>${bin.item_name || ""}</td>
      <td>${bin.warehouse}</td>
      <td>${bin.actual_qty}</td>
    </tr>`;
  });

  html += `</tbody></table>`;

  let d = new frappe.ui.Dialog({
    title: "Stock Balance Report",
    size: "large",
    fields: [{ fieldtype: "HTML", fieldname: "stock_balance_html" }],
  });

  d.fields_dict.stock_balance_html.$wrapper.html(html);
  d.show();
}
