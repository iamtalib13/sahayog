frappe.query_reports["Branch Stock"] = {
  filters: [
    {
      fieldname: "warehouse",
      label: __("Warehouse"),
      fieldtype: "Link",
      options: "Warehouse",
      reqd: 0,
    },
  ],

  // ✅ GLOBAL STATE
  selected_items: {}, // { item_code: warehouse }

  onload: function (report) {
    // 🔹 Permission logic for Warehouse filter
    if (frappe.session.user !== "Administrator") {
      frappe.db
        .get_value("Employee", { user_id: frappe.session.user }, [
          "designation",
          "sol_id",
        ])
        .then((r) => {
          const emp = r.message;
          if (emp) {
            const is_manager =
              emp.designation &&
              emp.designation.toLowerCase().includes("manager");

            if (emp.sol_id) {
              report.set_filter_value("warehouse", emp.sol_id);
            }

            if (!is_manager && emp.sol_id) {
              const filter = report.get_filter("warehouse");
              if (filter) {
                filter.df.get_query = () => {
                  return {
                    filters: { name: emp.sol_id },
                  };
                };
                filter.refresh();
              }
            }
          }
        });
    }

    report.page.add_inner_button("Create EMMR", () => {
      bulk_action("emmr");
    });

    report.page.add_inner_button("Issue", () => {
      bulk_action("issue");
    });

    report.page.add_inner_button("Inward", () => {
      bulk_action("inward");
    });

    function bulk_action(type) {
      const item_codes = Object.keys(
        frappe.query_reports["Branch Stock"].selected_items,
      );

      if (!item_codes.length) {
        frappe.msgprint("Please select at least one item.");
        return;
      }

      const fields = [];

      // Unified fields for dialog
      if (type === "inward") {
        fields.push(
          {
            fieldtype: "Link",
            fieldname: "supplier",
            label: "Supplier",
            options: "Supplier",
            reqd: 1,
          },
          {
            fieldtype: "Link",
            fieldname: "target_warehouse",
            label: "Target Warehouse",
            options: "Warehouse",
            reqd: 1,
            default: report.get_filter_value("warehouse"),
            get_query: () => ({
              filters: { custom_warehouse_category: ["like", "Store%"] },
            }),
          },
          { fieldtype: "Section Break" },
        );
      } else if (type === "emmr") {
        fields.push(
          {
            fieldtype: "Link",
            fieldname: "employee",
            label: "Employee",
            options: "Employee",
            reqd: 1,
          },
          {
            fieldtype: "Link",
            fieldname: "warehouse",
            label: "Warehouse",
            options: "Warehouse",
            reqd: 1,
            default: report.get_filter_value("warehouse"),
            get_query: () => ({
              filters: { custom_warehouse_category: ["like", "Store%"] },
            }),
          },
          { fieldtype: "Section Break" },
        );
      }

      // Qty per item
      item_codes.forEach((item_code) => {
        fields.push({
          fieldtype: "Float",
          fieldname: `qty_${item_code}`,
          label: `Qty for ${item_code}`,
          reqd: 1,
          default: 1,
        });
      });

      frappe.prompt(
        fields,
        (values) => {
          const items = [];

          item_codes.forEach((item_code) => {
            items.push({
              item_code: item_code,
              qty: values[`qty_${item_code}`],
              from_warehouse:
                frappe.query_reports["Branch Stock"].selected_items[item_code],
            });
          });

          // 🔹 ROUTING
          if (type === "issue") {
            frappe.route_options = {
              stock_entry_type: "Material Issue",
              items: items.map((i) => ({
                item_code: i.item_code,
                qty: i.qty,
                s_warehouse: i.from_warehouse,
              })),
            };
            frappe.set_route("Form", "Stock Entry", "new-stock-entry-1");
          }

          if (type === "inward") {
            frappe.db
              .get_list("Item", {
                filters: { name: ["in", item_codes] },
                fields: ["name", "item_name", "stock_uom"],
              })
              .then((item_list) => {
                const doc = {
                  doctype: "Purchase Receipt",
                  supplier: values.supplier,
                  posting_date: frappe.datetime.nowdate(),
                  posting_time: frappe.datetime.now_time(),
                  items: item_codes.map((item_code) => {
                    const item =
                      item_list.find((i) => i.name === item_code) || {};
                    return {
                      item_code: item_code,
                      item_name: item.item_name || item_code,
                      description: item_code,
                      qty: values[`qty_${item_code}`],
                      stock_uom: item.stock_uom || "Nos",
                      warehouse: values.target_warehouse,
                      rate: 0,
                      amount: 0,
                      cost_center: "",
                    };
                  }),
                };

                frappe.call({
                  method: "frappe.client.insert",
                  args: { doc: doc },
                  callback: (r) => {
                    if (!r.exc && r.message) {
                      let pr_name = r.message.name;

                      frappe.msgprint({
                        title: "Purchase Receipt Created!",
                        message: `PR <b>${pr_name}</b> saved successfully!<br><br>
                  <button class="btn btn-primary btn-sm" onclick="window.submit_pr('${pr_name}')">
                    <i class="fa fa-check"></i> Submit Now
                  </button>`,
                        indicator: "green",
                        wide: true,
                      });

                      frappe.query_reports["Branch Stock"].selected_items = {};
                      frappe.query_report.refresh();
                    }
                  },
                });
              });
          }

          if (type === "emmr") {
            frappe.db
              .get_list("Item", {
                filters: { name: ["in", item_codes] },
                fields: ["name", "item_name", "is_fixed_asset"],
              })
              .then((item_data) => {
                const category_map = {};

                item_data.forEach((d) => {
                  category_map[d.name] = d.is_fixed_asset
                    ? "Asset"
                    : "Stock Item";
                });

                frappe.route_options = {
                  employee: values.employee,
                  source_warehouse: values.warehouse,
                  items: items.map((i) => ({
                    item_code: i.item_code,
                    item_name: item_data.find((d) => d.name === i.item_code)
                      .item_name,
                    quantity: i.qty,
                    item_category: category_map[i.item_code],
                  })),
                };

                frappe.set_route(
                  "Form",
                  "Employee Material Request",
                  "new-employee-material-request-1",
                );
              });
          }
        },
        "Enter Details",
        "Create",
      );
    }
  },

  formatter: function (value, row, column, data, default_formatter) {
    if (column.fieldname === "select_row") {
      const is_checked = frappe.query_reports["Branch Stock"].selected_items[
        data.item_code
      ]
        ? "checked"
        : "";
      return `
        <input type="checkbox" ${is_checked}
          onchange="
            const s = frappe.query_reports['Branch Stock'].selected_items;
            this.checked
              ? s['${data.item_code}'] = '${data.warehouse}'
              : delete s['${data.item_code}'];
          "
        />
      `;
    }

    return default_formatter(value, row, column, data);
  },
};

window.submit_pr = function (pr_name) {
  frappe.call({
    method: "frappe.client.get",
    args: { doctype: "Purchase Receipt", name: pr_name },
    callback: (r) => {
      if (!r.exc) {
        frappe.call({
          method: "frappe.client.submit",
          args: { doc: r.message },
          callback: (r2) => {
            if (!r2.exc) {
              frappe.msgprint({
                title: "Submitted!",
                message: `Purchase Receipt <b>${pr_name}</b> submitted!`,
                indicator: "green",
              });
              frappe.query_report.refresh();
            }
          },
        });
      }
    },
  });
};
