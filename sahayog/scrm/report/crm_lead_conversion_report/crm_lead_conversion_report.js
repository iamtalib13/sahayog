// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["CRM Lead Conversion Report"] = {
  filters: [],
  formatter: function (value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);

    if (column.fieldname === "conversion_rate") {
      let rate = data["conversion_rate"] || 0;
      let color = "gray";

      if (rate >= 70) {
        color = "green";
      } else if (rate >= 40) {
        color = "orange";
      } else if (rate > 0) {
        color = "red";
      }

      return `<span style="color:${color}; font-weight:bold;">${value}</span>`;
    }

    return value;
  },
};
