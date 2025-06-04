// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Meeting Summary Report"] = {
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
      default: frappe.datetime.month_end(),
    },
    {
      fieldname: "topic",
      label: "Topic",
      fieldtype: "Select",
      options: ["", "Meeting", "Induction", "Refreshment Training"],
    },
    {
      fieldname: "trainer",
      label: "Trainer",
      fieldtype: "Link",
      options: "Employee",
    },
  ],
};
