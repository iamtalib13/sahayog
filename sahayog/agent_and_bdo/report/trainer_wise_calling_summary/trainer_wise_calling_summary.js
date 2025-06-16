// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Trainer-wise Calling Summary"] = {
  filters: [
    {
      fieldname: "from_date",
      label: "From Date",
      fieldtype: "Date",
      default: frappe.datetime.month_start(),
    },
    {
      fieldname: "to_date",
      label: "To Date",
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
    },
  ],
};
