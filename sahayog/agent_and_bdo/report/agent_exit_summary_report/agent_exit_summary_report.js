// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Agent Exit Summary Report"] = {
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
    {
      fieldname: "trainer",
      label: "Trainer",
      fieldtype: "Link",
      options: "Employee",
    },
    {
      fieldname: "branch",
      label: "Branch",
      fieldtype: "Link",
      options: "Branch",
    },
    {
      fieldname: "district",
      label: "District",
      fieldtype: "Data",
    },
  ],
};
