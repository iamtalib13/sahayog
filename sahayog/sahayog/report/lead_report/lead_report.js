// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Report"] = {
  onload: function (report) {
    // Nothing extra needed here; filtering is handled in Python
  },

  filters: [
    {
      fieldname: "custom_branch",
      label: "Branch",
      fieldtype: "Link",
      options: "Branch",
    },
    {
      fieldname: "sol_id",
      label: "SOL ID",
      fieldtype: "Data",
    },
    {
      fieldname: "custom_employee_id",
      label: "Employee ID",
      fieldtype: "Link",
      options: "Employee",
    },
    {
      fieldname: "custom_employee_name",
      label: "Employee Name",
      fieldtype: "Data",
    },
  ],
};


