// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["System License Key"] = {
  filters: [
    {
      fieldname: "asset",
      label: "Asset",
      fieldtype: "Link",
      options: "Asset",
      reqd: 0,
    },
    {
      fieldname: "key_type",
      label: "Key Type",
      fieldtype: "Select",
      options: "\nWindows\nOffice",
      reqd: 0,
    },
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
  ],
};
