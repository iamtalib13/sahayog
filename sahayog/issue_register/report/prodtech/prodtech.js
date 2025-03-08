// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Prodtech"] = {
  filters: [
    {
      fieldname: "from_date", // Changed fieldname
      label: "From Date",
      fieldtype: "Date",
      default: frappe.datetime.month_start(), // Default to start of the current month
    },
    {
      fieldname: "to_date", // Changed fieldname
      label: "To Date",
      fieldtype: "Date",
      default: frappe.datetime.nowdate(), // Default to today's date
    },
  ],

  formatter: function (value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);

    // Apply color formatting only to the "status" column
    if (column.fieldname === "status") {
      if (data.status === "Open") {
        value = `<span style='color:#ef233c; font-weight: bold;'>${value}</span>`; // Red for "Open"
      } else if (data.status === "Closed") {
        value = `<span style='color:#008000; font-weight: bold;'>${value}</span>`; // Green for "Closed"
      }
    }
    // Apply color formatting only to the "status" column
    if (column.fieldname === "type") {
      if (data.type === "ISSUE") {
        value = `<span style='color:#ef233c; font-weight: bold;'>${value}</span>`; // Red for "Open"
      } else if (data.type === "CR") {
        value = `<span style='color:#2d97c5; font-weight: bold;'>${value}</span>`; // Green for "Closed"
      }
    }

    return value;
  },
};
