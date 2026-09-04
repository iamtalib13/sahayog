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
            justify-content: center;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
            line-height: 1.2;
          }

          /* 🔴 Red state for 0 leads */
          .lead-branch-capsule.no-leads {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
          }
          .lead-branch-capsule.no-leads:hover {
            border-color: #ef4444;
            background: #fee2e2;
            color: #7f1d1d;
            transform: translateY(-1px);
          }

          /* 🟢 Green state for > 0 leads */
          .lead-branch-capsule.has-leads {
            background: #f0fdf4;
            border: 1px solid #86efac;
            color: #166534;
          }
          .lead-branch-capsule.has-leads:hover {
            border-color: #22c55e;
            background: #dcfce7;
            color: #15803d;
            transform: translateY(-1px);
          }

          /* 🌟 Active Selected State */
          .lead-branch-capsule.active {
            background: #15803d !important;
            border-color: #166534 !important;
            color: #ffffff !important;
            box-shadow: 0 2px 5px rgba(21, 128, 61, 0.35);
          }
          .lead-branch-capsule.active .sol-tag {
            color: #ffffff !important;
          }

          .lead-branch-capsule .sol-tag {
            font-weight: 700;
            font-size: 10px;
            letter-spacing: 0.3px;
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
