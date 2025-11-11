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
      fieldname: "employee",
      label: __("Employee"),
      fieldtype: "Link",
      options: "Employee",
    },
    {
      fieldname: "from_date",
      label: __("From Date"),
      fieldtype: "Date",
    },
    {
      fieldname: "to_date",
      label: __("To Date"),
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
    },
    {
      fieldname: "doctype_filter",
      label: __("Document Type"),
      fieldtype: "Select",
      options:
        "\nAll\nDisciplinary Case\nResponse to SCN\nSuspension Process\nDomestic Enquiry\nEnquiry Reminder\nCase Closure",
      default: "All",
    },
    {
      fieldname: "sort_by",
      label: __("Sort By"),
      fieldtype: "Select",
      options: "\nCreation Date\nModification Date",
      default: "Creation Date",
    },
    {
      fieldname: "show_versions",
      label: __("Show Version Count"),
      fieldtype: "Check",
      default: 1,
    },
  ],

  onload: function (report) {
    // Clear Filter button
    report.page
      .add_inner_button(__("Clear Filter"), function () {
        report.clear_filters();
        report.refresh();
      })
      .addClass("btn-secondary");

    // Export Audit Trail button
    report.page
      .add_inner_button(__("Export to Excel"), function () {
        report.export_report();
      })
      .addClass("btn-primary");

    // Refresh button
    report.page.set_secondary_action(__("Refresh"), function () {
      report.refresh();
    });
  },

  // Format cells for better visibility
  formatter: function (value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);

    // ✅ Highlight Disciplinary Case (main record) with different color
    if (data.doctype_name === "Disciplinary Case") {
      if (column.fieldname === "doctype_name") {
        value = `<span style="color: #2196f3; font-weight: bold;">🔷 ${value}</span>`;
      }
    }

    // Highlight status column
    if (column.fieldname === "status") {
      if (data.status === "Draft") {
        value = `<span style="color: #ff9800; font-weight: bold;">${value}</span>`;
      } else if (data.status === "Submitted") {
        value = `<span style="color: #4caf50; font-weight: bold;">${value}</span>`;
      } else if (data.status === "Completed") {
        value = `<span style="color: #2196f3; font-weight: bold;">${value}</span>`;
      }
    }

    // Highlight not created documents
    if (data.name === "Not Created") {
      if (column.fieldname === "doctype_name" || column.fieldname === "name") {
        value = `<span style="color: #999; font-style: italic;">${value}</span>`;
      }
    }

    // Highlight high version counts (indicating multiple edits)
    if (column.fieldname === "version_count" && data.version_count > 5) {
      value = `<span style="color: #f44336; font-weight: bold;">${value}</span>`;
    }

    return value;
  },

  // Validate filters before running
  get_datatable_options(options) {
    return Object.assign(options, {
      checkboxColumn: false,
      events: {
        onRemoveColumn: function (column) {},
      },
    });
  },
};
