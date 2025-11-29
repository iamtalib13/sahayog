frappe.query_reports["Case History"] = {
  filters: [
    {
      fieldname: "case_id",
      label: __("Case ID"),
      fieldtype: "Link",
      options: "Disciplinary Case",
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
    // Hide Case Details Message
    function hide_case_details() {
      $(".report-message").hide(); // hides the HTML message box
    }
    // Clear Filter button (WORKING)
    report.page
      .add_inner_button(__("Clear Filter"), function () {
        // Reset all filter fields manually
        report.set_filter_value({
          case_id: "",
          doctype_filter: "All",
          sort_by: "Creation Date",
          show_versions: 1,
        });
        hide_case_details(); // ⬅️ hide message on clear filter
        // Refresh report after resetting
        report.refresh();
      })
      .addClass("btn-secondary");

    // Export button
    report.page
      .add_inner_button(__("Export to Excel"), function () {
        report.export_report();
      })
      .addClass("btn-primary");

    // Refresh button
    report.page.set_secondary_action(__("Refresh"), function () {
      report.refresh();
    });
    // --- Hide Case Details When case_id becomes empty ---
    report.on_filter_change = function () {
      let case_id = report.get_filter_value("case_id");

      if (!case_id) {
        $(".report-message").hide(); // Hide when empty
      } else {
        $(".report-message").show(); // Show when selected
      }
    };
  },

  formatter: function (value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);

    // ✅ Highlight Disciplinary Case
    if (
      data.doctype_name === "Disciplinary Case" &&
      column.fieldname === "doctype_name"
    ) {
      value = `<span style="color: #2196f3; font-weight: bold;">🔷 ${value}</span>`;
    }
    if (column.fieldname === "status") {
      if (data.status === "Pending") {
        value = `<span style="
      color: #ff9800; 
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;
      background: #fff3e0;
    ">${value}</span>`;
      } else if (data.status === "Completed") {
        value = `<span style="
      color: #4caf50; 
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;
      background: #e8f5e9;
    ">${value}</span>`;
      }
    }

    // 🚫 Not Created rows
    if (data.name === "Not Created") {
      if (column.fieldname === "doctype_name" || column.fieldname === "name") {
        value = `<span 
          style="color: #999; background-color: #f1f1f1; font-style: italic; 
                 padding: 2px 6px; border-radius: 4px; cursor: default; 
                 pointer-events: none; user-select: none;">
          ${value}
        </span>`;
      }
      return value;
    }
    if (column.fieldname === "name" && data.name !== "Not Created") {
      value = `<span 
    class="clickable-record" 
    data-doctype="${data.doctype_name}" 
    data-name="${data.name}" 
    style="
      background: #e3f2fd;
      color: #1976d2; 
      font-weight: 600; 
      padding: 2px 8px;
      border-radius: 6px;
      cursor: pointer;
    ">
    ${value}
  </span>`;
    }

    // ⚠️ High version counts
    if (column.fieldname === "version_count" && data.version_count > 5) {
      value = `<span style="color: #f44336; font-weight: bold;">${value}</span>`;
    }

    return value;
  },

  get_datatable_options(options) {
    return Object.assign(options, {
      checkboxColumn: false,
      escape: false, // ✅ Allow HTML rendering
      events: {
        onClick: function (cell, rowIndex, colIndex, e) {
          if (!cell || !cell.row || !cell.row.doc) return;
          const data = cell.row.doc;
          const column = cell.column && cell.column.fieldname;

          // 🚫 Block clicks on Not Created rows
          if (data.name === "Not Created") {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }

          // ✅ Open valid records when clicked
          if (column === "name" && data.name && data.name !== "Not Created") {
            frappe.set_route("Form", data.doctype_name, data.name);
          }
        },
      },
    });
  },
};
