frappe.query_reports["Employee Lead Performance"] = {
  filters: [
    {
      fieldname: "zone",
      label: __("Zone"),
      fieldtype: "Data",
    },
    {
      fieldname: "region",
      label: __("Region"),
      fieldtype: "Data",
    },
    {
      fieldname: "branch",
      label: __("Branch"),
      fieldtype: "Data",
    },
    {
      fieldname: "status",
      label: __("Status"),
      fieldtype: "Select",
      options: ["", "Active", "Non-Active"],
    },
  ],
};
