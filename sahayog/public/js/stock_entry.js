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

          if (stock_res.message?.data) {
            stock_res.message.data.forEach((row) => {
              source_stock_map[row.item_code] = row.bal_qty;
            });
          }
        } catch (e) {
          console.error("Failed to fetch source stock:", e);
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

          if (target_res.message?.data) {
            target_res.message.data.forEach((row) => {
              target_stock_map[row.item_code] = row.bal_qty;
            });
          }
        } catch (e) {
          console.error("Failed to fetch target stock:", e);
        }

        // Set warehouses in form
        frm.set_value(from_warehouse, emmr_doc.source_warehouse);
        frm.set_value(to_warehouse, emmr_doc.target_warehouse);
        frm.dashboard.clear_headline();



    (function () {
    const style_id = 'stock-entry-intro-override';
    if (document.getElementById(style_id)) return;

    const style = document.createElement('style');
    style.id = style_id;
    style.innerHTML = `
        body[data-route^="Form/Stock Entry"] .form-message-container .form-message.blue {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }

        body[data-route^="Form/Stock Entry"] .form-message-container {
            padding: 0 !important;
            margin: 0 !important;
        }
    `;
    document.head.appendChild(style);
})();

// Set dashboard headline form EMR
frm.dashboard.set_headline(`
  <div style="
    background: transparent;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid rgba(222, 226, 230, 0.9);
    margin: 10px 0;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    position: relative;
    overflow: hidden;
  ">
    <div style="
      position:absolute;
      inset:0;
      background:transparent;
      pointer-events:none;
      opacity:0.9;
    "></div>

    <div style="
      position: relative;
      text-align:center; 
      font-weight:600; 
      margin-bottom:8px; 
      color:#343a40;
      letter-spacing:0.03em;
      text-transform:uppercase;
      font-size:11px;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:8px;
    ">
      <span style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:20px;
        height:20px;
        border-radius:999px;
        background:linear-gradient(135deg,#f97316,#facc15);
        color:white;
        font-size:11px;
        box-shadow:0 4px 10px rgba(249,115,22,0.35);
      ">⇄</span>
      <span>Transfer Direction</span>
    </div>

    <div style="
      position: relative;
      display:flex; 
      justify-content:center; 
      gap:46px;
      align-items:center;
      padding: 4px 4px 2px;
    ">

      <div style="
        text-align:center;
      ">
        <div style="
          background: linear-gradient(135deg,#dc3545,#ff6b6b);
          color:white;
          padding:7px 14px;
          border-radius:999px;
          font-size:11px;
          font-weight:600;
          min-width:150px;
          box-shadow: 0 4px 12px rgba(220,53,69,0.35);
          border:1px solid rgba(255,255,255,0.28);
          display:flex;
          flex-direction:column;
          gap:2px;
        ">
          <span style="letter-spacing:0.04em; text-transform:uppercase;">From</span>
          <div style="
            font-size:11px; 
            margin-top:2px;
            white-space:nowrap;
            text-overflow:ellipsis;
            overflow:hidden;
            opacity:0.95;
          ">
            ${emmr_doc.source_warehouse}
          </div>
        </div>
      </div>

      <div style="
        font-size:22px; 
        color:#6c757d;
        display:flex;
        align-items:center;
        justify-content:center;
        position:relative;
      ">
        <span style="
          display:inline-block;
        ">
          ➜
        </span>
      </div>

      <div style="
        text-align:center;
      ">
        <div style="
          background: linear-gradient(135deg,#198754,#4ade80);
          color:white;
          padding:7px 14px;
          border-radius:999px;
          font-size:11px;
          font-weight:600;
          min-width:150px;
          box-shadow: 0 4px 12px rgba(25,135,84,0.32);
          border:1px solid rgba(255,255,255,0.28);
          display:flex;
          flex-direction:column;
          gap:2px;
        ">
          <span style="letter-spacing:0.04em; text-transform:uppercase;">To</span>
          <div style="
            font-size:11px; 
            margin-top:2px;
            white-space:nowrap;
            text-overflow:ellipsis;
            overflow:hidden;
            opacity:0.95;
          ">
            ${emmr_doc.target_warehouse}
          </div>
        </div>
      </div>

    </div>
  </div>
`);




        if (!emmr_doc.items?.length) {
          frappe.msgprint("No items found in this EMMR.");
          return;
        }

        // -------------------------------
        // BUILD POPUP HTML
        // -------------------------------
        let html = `
<!-- Transfer Direction Section -->
<div style="margin-bottom: 20px;">
  <div style="
    background: transparent;
    padding: 06px 16px;
    border-radius: 12px;
    border: 1px solid rgba(222, 226, 230, 0.9);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    position: relative;
    overflow: hidden;
  ">

    <div style="
      position:absolute;
      inset:0;
      background:transparent;
      pointer-events:none;
      opacity:0.9;
    "></div>

    <div style="
      position: relative;
      text-align:center; 
      font-weight:600; 
      margin-bottom:8px; 
      color:#343a40;
      letter-spacing:0.03em;
      text-transform:uppercase;
      font-size:11px;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:8px;
    ">
      <span style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:20px;
        height:20px;
        border-radius:999px;
        background:linear-gradient(135deg,#f97316,#facc15);
        color:white;
        font-size:11px;
        box-shadow:0 4px 10px rgba(249,115,22,0.35);
      ">⇄</span>
      <span>Transfer Direction</span>
    </div>

    <div style="
      position: relative;
      display:flex; 
      align-items:center; 
      justify-content:center; 
      gap:40px;
      padding: 4px 4px 10px;
    ">

      <div style="text-align:center; width: 200px;">
        <div style="
          background: linear-gradient(135deg,#dc3545,#ff6b6b);
          color: white;
          padding: 7px 14px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 12px;
          box-shadow: 0 4px 12px rgba(220,53,69,0.35);
          border: 1px solid rgba(255,255,255,0.28);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        ">
          From (${emmr_doc.source_warehouse})
        </div>
      </div>

      <div style="
        font-size:22px; 
        color:#6c757d;
        display:flex;
        align-items:center;
        justify-content:center;
        position:relative;
      ">
        <span style="display:inline-block;">➜</span>
      </div>

      <div style="text-align:center; width: 200px;">
        <div style="
          background: linear-gradient(135deg,#198754,#4ade80);
          color: white;
          padding: 7px 14px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 12px;
          box-shadow: 0 4px 12px rgba(25,135,84,0.32);
          border: 1px solid rgba(255,255,255,0.28);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        ">
          To (${emmr_doc.target_warehouse})
        </div>
      </div>

    </div>

  </div>
</div>

<!-- ITEMS TABLE -->
<table class="table table-hover table-sm" style="font-size: 13px;">
  <thead style="background: #4a6fa5; color: white;">
    <tr>
      <th style="width: 40px;">#</th>
      <th style="width: 50px; text-align: center;">
        <i class="fa fa-check"></i>
      </th>
      <th>Item</th>
      <th style="width: 100px;">Stock Type</th>
      <th style="width: 120px;">Source Stock</th>
      <th style="width: 100px;">Transfer Qty</th>
      <th style="width: 120px;">Target Stock</th>
    </tr>
  </thead>
  <tbody>
`;

        let sr_no = 1;
        let stockItemCount = 0;

        emmr_doc.items.forEach((row) => {
          if (row.item_category !== "Stock Item") return;
          stockItemCount++;

          const sourceQty = source_stock_map[row.item_code] || 0;
          const targetQty = target_stock_map[row.item_code] || 0;
          const hasStock = sourceQty >= row.quantity;

          html += `
<tr>
  <td>${sr_no}</td>
  <td style="text-align: center;">
    <input type="checkbox" class="emmr-check"
      data-item="${row.item_code}"
      data-description="${row.description || ""}"
      style="cursor: pointer;"
    >
  </td>

  <td>
    <div style="font-weight: 500;">${row.item_code}</div>
    ${
      row.description
        ? `<div style="font-size: 12px; color: #7f8c8d;">${row.description}</div>`
        : ""
    }
  </td>

  <td>
    <span style="padding: 3px 8px; background: #e3f2fd; 
      color: #1565c0; border-radius: 12px; font-size: 12px;">
      ${row.item_category}
    </span>
  </td>

  <!-- SOURCE STOCK -->
  <td>
    <div style="display: flex; align-items: center;">
      <div style="width: 8px; height: 8px; background: ${
        hasStock ? "#28a745" : "#dc3545"
      }; border-radius: 50%; margin-right: 8px;"></div>
      <div>
        <div style="font-weight: 600; color: ${
          hasStock ? "#28a745" : "#dc3545"
        };">${sourceQty}</div>
        <div style="font-size: 11px; color: #6c757d;">Available</div>
      </div>
    </div>
  </td>

  <!-- EDITABLE TRANSFER QTY -->
  <td style="text-align: center;">
    <input 
      type="number"
      class="transfer-qty-input"
      data-item="${row.item_code}"
      value="${row.quantity}"
      min="1"
      style="
        width: 70px;
        padding: 3px 5px;
        text-align: center;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 12px;
      "
    >
    ${
      !hasStock
        ? '<div style="font-size: 11px; color: #dc3545;">Insufficient</div>'
        : ""
    }
  </td>

  <!-- TARGET STOCK -->
  <td>
    <div style="font-weight: 600; color: #28a745;">${targetQty}</div>
    <div style="font-size: 11px; color: #6c757d;">Current stock</div>
  </td>

</tr>
`;
          sr_no++;
        });

        html += `
</tbody>
</table>

<div style="margin-top: 15px; font-size: 12px; color: #6c757d;">
  <i class="fa fa-info-circle"></i>
  Select items to transfer.
</div>
`;

        // -------------------------------
        // SHOW DIALOG
        // -------------------------------
        let d = new frappe.ui.Dialog({
          title: `EMR Items`,
          size: "large",
          fields: [{ fieldname: "items_html", fieldtype: "HTML" }],
          primary_action_label: "Add Selected Items",
          primary_action() {
            let selected = [];

            d.$wrapper.find(".emmr-check:checked").each(function () {
              selected.push({
                item_code: $(this).data("item"),
                description: $(this).data("description"),

                // NEW: GET EDITED TRANSFER QTY
                qty: d.$wrapper
                  .find(
                    `.transfer-qty-input[data-item="${$(this).data("item")}"]`
                  )
                  .val(),
              });
            });

            if (selected.length === 0) {
              frappe.msgprint("Please select at least one item.");
              return;
            }

            // Remove empty first row if exists
            if (
              frm.doc.items &&
              frm.doc.items.length === 1 &&
              !frm.doc.items[0].item_code
            ) {
              frm.doc.items = [];
            }

            let existing_items = (frm.doc.items || []).map((i) => i.item_code);
            let duplicate_items = [];

            selected.forEach((row) => {
              row.qty = Number(row.qty);

              if (!row.qty || row.qty <= 0) {
                frappe.msgprint("Transfer Qty must be greater than 0.");
                return;
              }

              if (existing_items.includes(row.item_code)) {
                duplicate_items.push(row.item_code);
                return;
              }

              let child = frm.add_child("items");
              child.item_code = row.item_code;
              child.qty = row.qty;
              child.transfer_qty = row.qty;
              child.conversion_factor = 1.0;
              child.qty_as_per_stock_uom = row.qty;

              existing_items.push(row.item_code);
            });

            frm.refresh_field("items");
            d.hide();

            if (duplicate_items.length) {
              frappe.msgprint(
                `<b>Already Added:</b> ${duplicate_items.join(", ")}`
              );
            }

            frappe.show_alert(`Added ${selected.length} item(s)`);
          },
        });

        d.fields_dict.items_html.$wrapper.html(html);
        d.show();
      });
    }
  },
});

// frappe.ui.form.on("Stock Entry", {
//   refresh: function (frm) {
//     // Add a custom button
//     frm.add_custom_button("Show Stock Balance", () => {
//       if (!frm.doc.to_warehouse) {
//         frappe.msgprint("Please select a Target Warehouse (to_warehouse).");
//         return;
//       }

//       if (!frm.doc.items || frm.doc.items.length === 0) {
//         frappe.msgprint("Please add items in the table.");
//         return;
//       }

//       // Collect all item codes from child table
//       const item_codes = frm.doc.items.map((row) => row.item_code);

//       frappe.call({
//         method: "sahayog.procurement.api.stock_entry_report.get_available_qty",
//         args: {
//           warehouse: frm.doc.to_warehouse,
//           item_codes: item_codes,
//           // pass array of item codes
//         },
//         callback: function (r) {
//           if (r.message) {
//             show_stock_balance_dialog(r.message);
//           }
//         },
//       });
//     });
//   },
// });

// function show_stock_balance_dialog(bins) {
//   let html = `<table class="table table-bordered">
//     <thead>
//       <tr>
//         <th>Item Code</th>
//         <th>Item Name</th>
//         <th>Warehouse</th>
//         <th>Actual Qty</th>
//       </tr>
//     </thead>
//     <tbody>`;

//   bins.forEach((bin) => {
//     html += `<tr>
//       <td>${bin.item_code}</td>
//       <td>${bin.item_name || ""}</td>
//       <td>${bin.warehouse}</td>
//       <td>${bin.actual_qty}</td>
//     </tr>`;
//   });

//   html += `</tbody></table>`;

//   let d = new frappe.ui.Dialog({
//     title: "Stock Balance Report",
//     size: "large",
//     fields: [{ fieldtype: "HTML", fieldname: "stock_balance_html" }],
//   });

//   d.fields_dict.stock_balance_html.$wrapper.html(html);
//   d.show();
// }
