// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Report"] = {
  onload: function (report) {
    // 🔘 Add 'Clear Filters' button
    let clear_btn = report.page.add_inner_button(__("Clear Filters"), function () {
      report.set_filter_value("custom_branch", "");
      report.set_filter_value("sol_id", "");
      report.set_filter_value("custom_employee_id", "");
      report.set_filter_value("custom_employee_name", "");
      report.refresh();
    });

    // 📥 Add 'Download Report' button
    let download_btn = report.page.add_inner_button(__("Download Report"), function () {
      // Triggers Frappe's native query report exporter
      report.export_report();

      // Automatically hide 'Include filters' checkbox from export dialog modal
      setTimeout(function () {
        $('.modal-dialog [data-fieldname="include_filters"]').closest(".frappe-control").hide();
      }, 150);
    });

    // 🎨 Apply Hover Effects & Styling to Download button
    if (download_btn) {
      download_btn.addClass("btn-primary btn-sm");
      download_btn.css({
        "background-color": "#17a2b8",
        "color": "#ffffff",
        "border-color": "#17a2b8",
        "transition": "all 0.3s ease",
        "font-weight": "500",
      });
      download_btn.hover(
        function () {
          $(this).css({
            "background-color": "#000303",
            "border-color": "#04171a",
            "transform": "translateY(-1px)",
            "box-shadow": "0 4px 6px rgba(0, 0, 0, 0.15)",
          });
        },
        function () {
          $(this).css({
            "background-color": "#17a2b8",
            "border-color": "#17a2b8",
            "transform": "translateY(0)",
            "box-shadow": "none",
          });
        }
      );
    }

    // 🎨 Apply Hover Effects & Styling to Clear button
    if (clear_btn) {
      clear_btn.addClass("btn-primary btn-sm");
      clear_btn.css({
        "background-color": "#038129",
        "color": "#ffffff",
        "border-color": "#026821",
        "transition": "all 0.3s ease",
        "font-weight": "500",
      });
      clear_btn.hover(
        function () {
          $(this).css({
            "background-color": "#000303",
            "border-color": "#04171a",
            "transform": "translateY(-1px)",
            "box-shadow": "0 4px 6px rgba(0, 0, 0, 0.15)",
          });
        },
        function () {
          $(this).css({
            "background-color": "#048a26",
            "border-color": "#0c8808",
            "transform": "translateY(0)",
            "box-shadow": "none",
          });
        }
      );
    }

    // 📉 Make report summary count cards compact & small
    setTimeout(function () {
      $(".report-summary").css({
        "padding": "4px 8px",
        "margin-bottom": "8px"
      });
      $(".report-summary .summary-item").css({
        "padding": "4px 10px",
        "margin-right": "8px"
      });
      $(".report-summary .summary-value").css({
        "font-size": "15px",
        "font-weight": "600"
      });
      $(".report-summary .summary-label").css({
        "font-size": "11px"
      });
    }, 300);
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
