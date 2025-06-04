// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Attendee Participation Report"] = {
  filters: [
    {
      fieldname: "from_date",
      label: "From Date",
      fieldtype: "Date",
      default: frappe.datetime.add_days(frappe.datetime.get_today(), -30),
      reqd: 1,
    },
    {
      fieldname: "to_date",
      label: "To Date",
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
      reqd: 1,
    },
    {
      fieldname: "type",
      label: "Type",
      fieldtype: "Select",
      options: ["", "Employee", "Agent"],
    },
    {
      fieldname: "participant_id",
      label: "Employee / Agent ID",
      fieldtype: "Data",
    },
    {
      fieldname: "trainer",
      label: "Trainer",
      fieldtype: "Link",
      options: "Employee",
    },
  ],
};
