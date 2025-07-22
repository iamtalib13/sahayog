// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt
frappe.query_reports["CRM Lead Conversion Report"] = {
  onload: function (report) {},

  filters: [
    {
      fieldname: "from_date",
      label: "From Date",
      fieldtype: "Date",
      default: frappe.datetime.month_start(frappe.datetime.get_today()), // ✅ 1st of current month
    },
    {
      fieldname: "to_date",
      label: "To Date",
      fieldtype: "Date",
      default: frappe.datetime.get_today(), // ✅ Today
    },
  ],
};
