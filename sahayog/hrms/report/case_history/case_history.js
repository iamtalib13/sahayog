frappe.query_reports["Case History"] = {
  filters: [
    {
      fieldname: "case_id",
      label: __("Case ID"),
      fieldtype: "Link",
      options: "Disciplinary Case",
      reqd: 1,
    },
    {
      fieldname: "sort_by",
      label: __("Sort By"),
      fieldtype: "Select",
      options: "\nCreation Date\nModification Date",
      default: "Creation Date",
    },
  ],

  onload: function (report) {
    report.page
      .add_inner_button(__("Clear Filter"), function () {
        report.filters.forEach((f) => f.set_value(""));
        report.refresh();
      })
      .addClass("btn-secondary");
  },

  // This runs after the report is loaded/refreshed
};
