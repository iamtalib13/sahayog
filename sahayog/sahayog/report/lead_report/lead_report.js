// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Report"] = {
  onload: function (report) {
    // 🚫 Inject CSS to permanently hide Frappe's default 'Actions' dropdown button and style branch capsules
    if (!$("#lead-report-custom-css").length) {
      $("<style id='lead-report-custom-css'>")
        .prop("type", "text/css")
        .html(`
          .page-actions .menu-btn-group,
          .page-actions .actions-btn-group,
          .page-actions [data-label="Actions"] {
            display: none !important;
          }
          .lead-branch-capsules-wrapper {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          }
          .capsules-header {
            margin-bottom: 6px;
          }
          .capsules-title {
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .capsules-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            max-height: 120px;
            overflow-y: auto;
            padding-right: 4px;
          }
          .lead-branch-capsule {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            font-size: 10.5px;
            font-weight: 600;
            color: #334155;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
          }
          .lead-branch-capsule:hover {
            border-color: #2563eb;
            background: #eff6ff;
            color: #1e40af;
            transform: translateY(-1px);
          }
          .lead-branch-capsule.active {
            background: #2563eb !important;
            border-color: #1d4ed8 !important;
            color: #ffffff !important;
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
          }
          .lead-branch-capsule .sol-tag {
            font-weight: 700;
            font-size: 10.5px;
            letter-spacing: 0.3px;
          }
          .lead-branch-capsule.active .sol-tag {
            color: #ffffff;
          }
          .lead-branch-capsule .count-pill {
            background: #e2e8f0;
            color: #0f172a;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 9px;
          }
          .lead-branch-capsule.active .count-pill {
            background: #ffffff;
            color: #2563eb;
          }
        `)
        .appendTo("head");
    }

    // 🔘 Add 'Clear Filters' button

    let clear_btn = report.page.add_inner_button(__("Clear Filters"), function () {
      report.set_filter_value("selected_branch", "");
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

    // 🖱️ Attach click event handlers for Branch Capsule Card filtering
    $(report.page.wrapper).off("click", ".lead-branch-capsule").on("click", ".lead-branch-capsule", function () {
      let sol = $(this).attr("data-sol");
      let branch = $(this).attr("data-branch");
      let target_val = sol || branch || "";

      if (!target_val) {
        // 'ALL' Capsule Card Clicked (Admin)
        report.set_filter_value("selected_branch", "");
      } else {
        if ($(this).hasClass("active")) {
          // Deselect active capsule card
          report.set_filter_value("selected_branch", "");
        } else {
          // Select branch capsule card
          report.set_filter_value("selected_branch", target_val);
        }
      }
      report.refresh();
    });
  },


  filters: [
    {
      fieldname: "selected_branch",
      label: "Selected Branch",
      fieldtype: "Data",
      hidden: 1,
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
