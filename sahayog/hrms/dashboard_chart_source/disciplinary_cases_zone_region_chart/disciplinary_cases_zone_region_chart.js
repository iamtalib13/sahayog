// Copyright (c) 2025, Sahayog
// License: MIT

frappe.dashboards.chart_sources["Disciplinary Cases Zone Region Chart"] = {
  method:
    "sahayog.hrms.dashboard_chart_source.disciplinary_cases_zone_region_chart.disciplinary_cases_zone_region_chart.get_data",
  filters: [
    {
      fieldname: "from_date",
      label: __("From Date"),
      fieldtype: "Date",
      default: frappe.datetime.add_months(frappe.datetime.get_today(), -6),
    },
    {
      fieldname: "to_date",
      label: __("To Date"),
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
    },
  ],
};
