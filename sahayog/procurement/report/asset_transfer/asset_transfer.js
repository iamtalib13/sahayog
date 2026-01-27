// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt
frappe.query_reports["Asset Transfer"] = {
  filters: [
    {
      fieldname: "asset",
      label: "Asset",
      fieldtype: "Link",
      options: "Asset",
    },
    {
      fieldname: "from_date",
      label: "From Date",
      fieldtype: "Date",
    },
    {
      fieldname: "to_date",
      label: "To Date",
      fieldtype: "Date",
    },
  ],
};
