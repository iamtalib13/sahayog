frappe.query_reports["Branch Stock"] = {
  filters: [],

  // ✅ GLOBAL STATE (this is the key fix)
  selected_items: {}, // { item_code: warehouse }

  onload: function (report) {
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
        frappe.query_reports["Branch Stock"].selected_items
      );

      if (!item_codes.length) {
        frappe.msgprint("Please select at least one item.");
        return;
      }

      const fields = [];

      // EMMR header fields
      if (type === "emmr") {
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
            get_query: () => ({
              filters: { custom_warehouse_category: ["like", "Store%"] },
            }),
          },
          { fieldtype: "Section Break" }
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

          // 🔹 ROUTING (THIS MATCHES YOUR WORKING CODE STYLE)
          if (type === "issue") {
            frappe.route_options = {
              stock_entry_type: "Material Issue",
              items: items.map((i) => ({
                item_code: i.item_code,
                qty: i.qty,
                s_warehouse: i.from_warehouse, // ✅ SET PER ROW
              })),
            };
            frappe.set_route("Form", "Stock Entry", "new-stock-entry-1");
          }

          if (type === "inward") {
            frappe.route_options = { items };
            frappe.set_route(
              "Form",
              "Purchase Receipt",
              "new-purchase-receipt-1"
            );
          }

          if (type === "emmr") {
            frappe.route_options = {
              employee: values.employee,
              source_warehouse: values.warehouse,
              items: items.map((i) => ({
                item_code: i.item_code,
                qty: i.qty,
              })),
            };
            frappe.set_route(
              "Form",
              "Employee Material Request",
              "new-employee-material-request-1"
            );
          }
        },
        "Enter Details",
        "Create"
      );
    }
  },

  formatter: function (value, row, column, data, default_formatter) {
    if (column.fieldname === "select_row") {
      return `
        <input type="checkbox"
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
