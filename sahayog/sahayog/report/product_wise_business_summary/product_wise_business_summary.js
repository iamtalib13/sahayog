// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Product Wise Business Summary"] = {
  filters: [
    {
      fieldname: "from_date",
      label: "From Date",
      fieldtype: "Date",
      reqd: 0,
      description: "Start Date",
    },
    {
      fieldname: "to_date",
      label: "End Date",
      fieldtype: "Date",
      reqd: 0,
      description: "End Date",
    },
    {
      fieldname: "status",
      label: "Lead Status",
      fieldtype: "Select",
      options: "\nConverted\nLead\nFollow Up\nNot Interested",
      default: "Converted",
      reqd: 0,
    },
    {
      fieldname: "zone",
      label: "Zone",
      fieldtype: "Link",
      options: "Zone", // Adjust this to match your actual Zone doctype name
      reqd: 0,
      description: "Filter by Zone",
    },
    {
      fieldname: "region",
      label: "Region",
      fieldtype: "Link",
      options: "Region", // Adjust this to match your actual Region doctype name
      reqd: 0,
      description: "Filter by Region",
    },
    {
      fieldname: "branch",
      label: "Branch",
      fieldtype: "Link",
      options: "Branch", // Adjust this to match your actual Branch doctype name
      reqd: 0,
      description: "Filter by Branch",
    },
  ],
};
