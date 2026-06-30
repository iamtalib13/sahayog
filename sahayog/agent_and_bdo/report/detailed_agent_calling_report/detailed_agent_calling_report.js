// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Detailed Agent Calling Report"] = {
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
      options: "User",
    },
    {
      fieldname: "agent",
      label: "Agent",
      fieldtype: "Link",
      options: "Agent",
    },
    {
      fieldname: "connected_status",
      label: "Connected Status",
      fieldtype: "Select",
      options: "\nYes\nNo",
    },
    {
      fieldname: "reply_type",
      label: "Reply Type",
      fieldtype: "Select",
      options: "\nPositive\nNegative\nNot Reachable\nFollow-up Required",
    },
  ],
};
