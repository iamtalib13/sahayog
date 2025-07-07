// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Report"] = {
  onload: function (report) {
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
          const roles = frappe.user_roles;

          if (roles.includes("Zonal Manager") && employee.custom_zone) {
            report.set_filter_value("custom_zone", employee.custom_zone);
            report.page.set_filter_read_only("custom_zone", 1);
          }

          if (roles.includes("Regional Manager") && employee.custom_region) {
            report.set_filter_value("custom_region", employee.custom_region);
            report.page.set_filter_read_only("custom_region", 1);
          }

          if (roles.includes("Branch Manager") && employee.branch) {
            report.set_filter_value("custom_branch", employee.branch);
            report.page.set_filter_read_only("custom_branch", 1);
          }
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
      fieldname: "custom_zone",
      label: "Zone",
      fieldtype: "Link",
      options: "Zone",
    },
    {
      fieldname: "custom_region",
      label: "Region",
      fieldtype: "Link",
      options: "Region",
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
