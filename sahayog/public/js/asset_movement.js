frappe.ui.form.on("Asset Movement", {
  refresh(frm) {
    // uncollapse the Reference section every time the form loads
    // if (frm.fields_dict.reference) {
    //   frm.fields_dict.reference.collapse(false);
    // }
    frm.set_df_property("reference", "hidden", true);
    frm.set_df_property("reference", "read_only", true);

    // If connection filled the name, then set doctype
    // if (frm.doc.custom_reference_name) {
    //   frm.set_value("custom_reference_doctype", "Employee Material Request");
    frm.trigger("emr_popup");
    // }
  },
  emr_popup: function (frm) {
    if (frm.doc.custom_reference_name) {
      frm.set_value("custom_reference_doctype", "Employee Material Request");

      frm.add_custom_button("View EMR Items", async () => {
        const emmr_doc = await frappe.db.get_doc(
          "Employee Material Request",
          frm.doc.custom_reference_name
        );

        const target_warehouse = emmr_doc.target_warehouse;

        // ------------------------------------------------------------
        // FETCH ALL ASSETS AND GROUP BY ITEM CODE
        // ------------------------------------------------------------
        let asset_list = {};
        try {
          const res = await frappe.call({
            method: "sahayog.procurement.api.stock_balance_ledger.get_asset_co",
            args: {},
          });

          if (res.message?.assets) {
            res.message.assets.forEach((a) => {
              if (!asset_list[a.item_code]) {
                asset_list[a.item_code] = [];
              }
              asset_list[a.item_code].push({
                asset_code: a.name,
                asset_name: a.asset_name,
                asset_location: a.location,
              });
            });
          }
        } catch (e) {
          console.error("Asset API Failed:", e);
        }

        // ------------------------------------------------------------
        // BUILD HTML POPUP
        // ------------------------------------------------------------
        let html = `
            <table class="table table-hover table-sm" style="font-size: 13px;">
                <thead style="background:#4a6fa5;color:white;">
                    <tr>
                        <th>#</th>
                        <th>Select</th>
                        <th>Item</th>
                        <th>Asset</th>
                        <th>Qty</th>
                    </tr>
                </thead>
                <tbody>
            `;

        let sr = 1;

        emmr_doc.items.forEach((row) => {
          if (row.item_category !== "Asset") return;

          let assets = asset_list[row.item_code] || [];

          for (let i = 0; i < row.quantity; i++) {
            let asset = assets[i] || {
              asset_code: "NOT AVAILABLE",
              asset_name: "No Asset",
              asset_location: "-",
            };

            html += `
                    <tr>
                        <td>${sr}</td>

                        <td style="text-align:center;">
                            <input type="checkbox" class="emmr-check"
                                data-item="${row.item_code}"
                                data-asset-code="${asset.asset_code}"
                                data-asset-name="${asset.asset_name}"
                                data-asset-loc="${asset.asset_location}"
                                data-description="${row.description || ""}">
                        </td>

                        <td>
                            <b>${row.item_code}</b>
                            <div style="font-size:11px;color:#555">${
                              row.description || ""
                            }</div>
                        </td>

                        <td>
                            <div>${asset.asset_code}</div>
                            <div style="font-size:11px;color:#777">${
                              asset.asset_name
                            }</div>
                            <div style="font-size:11px;color:#777">Loc: ${
                              asset.asset_location
                            }</div>
                        </td>

                        <td style="text-align:center;">1</td>
                    </tr>
                    `;

            sr++;
          }
        });

        html += "</tbody></table>";

        // ------------------------------------------------------------
        // DISPLAY POPUP
        // ------------------------------------------------------------
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
                asset_code: $(this).data("asset-code"),
                asset_name: $(this).data("asset-name"),
                asset_location: $(this).data("asset-loc"),
                qty: 1,
              });
            });

            if (!selected.length) {
              frappe.msgprint("Please select items.");
              return;
            }

            // REMOVE EMPTY INITIAL ROW
            if (frm.doc.assets?.length === 1 && !frm.doc.assets[0].asset) {
              frm.doc.assets = [];
            }

            selected.forEach((r) => {
              let child = frm.add_child("assets");

              child.asset = r.asset_code;
              child.asset_name = r.asset_name;
              child.source_location = r.asset_location;
              child.target_location = target_warehouse;
            });

            frm.refresh_field("assets");
            d.hide();

            frappe.show_alert(`Added ${selected.length} asset(s)`);
          },
        });

        d.fields_dict.items_html.$wrapper.html(html);
        d.show();
      });
    }
  },
});
