// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["CRM Lead Conversion Report"] = {
  onload: function (report) {
    // Define unrestricted roles
    const unrestricted_roles = [
      "Administrator",
      "System Manager",
      "Admin",
      "Sales Manager",
    ];
    const user_roles = frappe.user_roles;

    // Skip employee lookup for unrestricted roles
    if (unrestricted_roles.some((role) => user_roles.includes(role))) {
      return;
    }

    // Only proceed with employee lookup for restricted users
    frappe.call({
      method: "frappe.client.get",
      args: {
        doctype: "Employee",
        filters: {
          user_id: frappe.session.user,
        },
      },
      callback: function (r) {
        if (r.message) {
          const employee = r.message;

          if (user_roles.includes("Zonal Manager") && employee.custom_zone) {
            report.set_filter_value("custom_zone", employee.custom_zone);
          }
          if (
            user_roles.includes("Regional Manager") &&
            employee.custom_region
          ) {
            report.set_filter_value("custom_region", employee.custom_region);
          }
          if (user_roles.includes("Branch Manager") && employee.branch) {
            report.set_filter_value("custom_branch", employee.branch);
          }
        } else {
          frappe.msgprint(__("Employee record not found for current user"));
        }
      },
    });
  },

  filters: [
    {
      fieldname: "custom_branch",
      label: "Branch",
      fieldtype: "Link",
      options: "Branch",
    },
    {
      fieldname: "custom_region",
      label: "Region",
      fieldtype: "Link",
      options: "Region",
    },
    {
      fieldname: "custom_zone",
      label: "Zone",
      fieldtype: "Link",
      options: "Zone",
    },
    {
      fieldname: "from_date",
      label: "From Date",
      fieldtype: "Date",
      default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
    },
    {
      fieldname: "to_date",
      label: "To Date",
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
    },
  ],
};
