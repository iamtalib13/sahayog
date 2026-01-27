// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Agent Master"] = {
  filters: [
    {
      fieldname: "agent_status",
      label: __("Agent Status"),
      fieldtype: "Select",
      options: "\nUnallocated\nAllocated\nPending",
    },
    {
      fieldname: "branch",
      label: __("Sol ID"),
      fieldtype: "Link",
      options: "Sahayog Branch",
    },
    {
      fieldname: "branch_name",
      label: __("Branch Name"),
      fieldtype: "Data",
      read_only: 1,
    },
    {
      fieldname: "employee",
      label: __("Employee"),
      fieldtype: "Link",
      options: "Employee",
    },
    {
      fieldname: "auth_id",
      label: __("Auth ID"),
      fieldtype: "Data",
      placeholder: "SAH00001",
    },
  ],

  onload: function (report) {
    // When Sol ID (branch) changes, fetch Branch Name
    report.page.fields_dict.branch.df.onchange = () => {
      const sol_id = report.get_values().branch;

      if (!sol_id) {
        report.page.fields_dict.branch_name.set_value("");
        return;
      }

      frappe.db.get_value("Sahayog Branch", sol_id, "branch", (r) => {
        if (r && r.branch) {
          report.page.fields_dict.branch_name.set_value(r.branch);
        } else {
          report.page.fields_dict.branch_name.set_value("");
        }
      });
    };
  },
};
