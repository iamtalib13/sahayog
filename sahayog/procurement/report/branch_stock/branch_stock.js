frappe.query_reports["Branch Stock"] = {
  filters: [],

  selected_items: new Set(),

  onload: function (report) {
    report.page.add_inner_button("Create EMMR", () => {
      if (!this.selected_items.size) {
        frappe.msgprint("Please select at least one item.");
        return;
      }

      // Build dynamic fields: employee, warehouse, qty per item
      const fields = [
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
            filters: {
              custom_warehouse_category: ["like", "Store%"],
            },
          }),
        },
        { fieldtype: "Section Break" },
      ];

      // Qty field for each selected item
      Array.from(this.selected_items).forEach((item_code) => {
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

          Array.from(this.selected_items).forEach((item_code) => {
            items.push({
              item_code: item_code,
              qty: values[`qty_${item_code}`],
            });
          });

          frappe.route_options = {
            employee: values.employee,
            source_warehouse: values.warehouse,
            items: items,
          };

          frappe.set_route(
            "Form",
            "Employee Material Request",
            "new-employee-material-request-1"
          );
        },
        "Create EMMR",
        "Create"
      );
    });
  },

  formatter: function (value, row, column, data, default_formatter) {
    // 🔹 Checkbox column
    if (column.fieldname === "select_for_emmr") {
      return `
        <input type="checkbox"
          onchange="
            const r = frappe.query_reports['Branch Stock'];
            this.checked
              ? r.selected_items.add('${data.item_code}')
              : r.selected_items.delete('${data.item_code}');
          "
        />
      `;
    }

    // 🔹 Issue
    if (column.fieldname === "issue") {
      return `<a style="cursor:pointer;text-decoration:underline;font-size:12px">Issue</a>`;
    }

    // 🔹 Receive
    if (column.fieldname === "inward") {
      return `<a style="cursor:pointer;text-decoration:underline;font-size:12px">Inward</a>`;
    }

    return default_formatter(value, row, column, data);
  },

  formatter: function (value, row, column, data, default_formatter) {
    // 🔹 EMMR Checkbox
    if (column.fieldname === "select_for_emmr") {
      return `
        <input type="checkbox"
          onchange="
            const r = frappe.query_reports['Branch Stock'];
            this.checked
              ? r.selected_items.add('${data.item_code}')
              : r.selected_items.delete('${data.item_code}');
          "
        />
      `;
    }

    // 🔹 Issue → Material Issue with Qty popup
    if (column.fieldname === "issue") {
      return `
        <a style="cursor:pointer;text-decoration:underline;font-size:12px"
           onclick="
            frappe.prompt(
              [{ label:'Quantity', fieldname:'qty', fieldtype:'Float', reqd:1 }],
              function(values){
                frappe.route_options = {
                  items: [{
                    item_code: '${data.item_code}',
                    qty: values.qty,
					s_warehouse: '${data.warehouse}'                  }],
					stock_entry_type: 'Material Issue',

                };
                frappe.set_route('Form','Stock Entry','new-stock-entry-1');
              },
              'Issue Item',
              'Create'
            );
           ">
          Issue
        </a>`;
    }

    // 🔹 Receive → Purchase Receipt
    if (column.fieldname === "inward") {
      return `
        <a style="cursor:pointer;text-decoration:underline;font-size:12px"
           onclick="
             frappe.route_options = {
               items: [{ item_code: '${data.item_code}' }]
             };
             frappe.set_route('Form','Purchase Receipt','new-purchase-receipt-1');
           ">
          Inward
        </a>`;
    }

    return default_formatter(value, row, column, data);
  },
};
