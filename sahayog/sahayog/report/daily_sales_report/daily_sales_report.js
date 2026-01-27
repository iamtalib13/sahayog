frappe.query_reports["Daily Sales Report"] = {
  filters: [
    {
      fieldname: "date",
      label: "Date",
      fieldtype: "Date",
      reqd: 1,
      default: frappe.datetime.get_today(),
    },
    {
      fieldname: "sol_id",
      label: "SOL ID",
      fieldtype: "Link",
      options: "Sahayog Branch",
      get_query: function () {
        if (
          frappe.user.has_role("Administrator") ||
          frappe.user.has_role("Sales Manager")
        ) {
          return {}; // no restrictions
        }
        return {
          filters: {
            sol_id: window.user_sol_id,
          },
        };
      },
    },
    {
      fieldname: "branch",
      label: "Branch",
      fieldtype: "Data",
      read_only: 1,
    },
  ],

  onload: async function (report) {
    const roles = frappe.user_roles;

    // Branch Manager default SOL/Branch
    if (roles.includes("Branch Manager")) {
      let user_branch = await frappe.call({
        method:
          "sahayog.scrm.doctype.dsr_remark.dsr_remark.get_user_branch_sol",
      });

      if (user_branch.message) {
        const { sol_id, branch } = user_branch.message;
        report.set_filter_value("sol_id", sol_id);
        report.set_filter_value("branch", branch);

        report.page.fields_dict.sol_id.df.read_only = 1;
        report.page.fields_dict.sol_id.refresh();
      }
    } else {
      report.page.fields_dict.sol_id.df.read_only = 0;
      report.page.fields_dict.sol_id.refresh();
    }

    // Admin & Sales Manager always get editable SOL ID
    if (
      frappe.user.has_role("Administrator") ||
      frappe.user.has_role("Sales Manager")
    ) {
      report.page.fields_dict.sol_id.df.read_only = 0;
      report.page.fields_dict.sol_id.refresh();
    }

    // ---------- FILTER UI ENHANCEMENT ----------

    // Add a light background + border around filter area
    const $form_area = report.page.wrapper.find(".page-form");
    $form_area.css({
      padding: "8px 10px",
      borderRadius: "6px",
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      marginBottom: "6px",
    });

    // Date field highlight on change
    const date_field = report.page.fields_dict.date;
    if (date_field && !date_field.__dsr_bound) {
      date_field.df.onchange = function () {
        let date_val = report.get_values().date;
        if (date_val) {
          frappe.show_alert(
            {
              message: __("Date changed to {0}", [date_val]),
              indicator: "blue",
            },
            3
          );
        }
        report.refresh();
      };
      date_field.__dsr_bound = true;
    }

    // SOL ID change handler - auto fetch branch + small alert
    report.page.fields_dict.sol_id.df.onchange = function () {
      let sol_id = report.get_values().sol_id;
      if (!sol_id) {
        report.set_filter_value("branch", "");
        return;
      }

      frappe.call({
        method: "frappe.client.get_value",
        args: {
          doctype: "Sahayog Branch",
          filters: { name: sol_id },
          fieldname: "branch",
        },
        callback: function (r) {
          if (r.message && r.message.branch) {
            report.set_filter_value("branch", r.message.branch);
            frappe.show_alert(
              {
                message: __("Branch set to {0} for SOL {1}", [
                  r.message.branch,
                  sol_id,
                ]),
                indicator: "green",
              },
              3
            );
          } else {
            report.set_filter_value("branch", "");
          }
        },
      });
    };

    // Remark button click binding
    $(document).off("click", ".remark-btn");
    $(document).on("click", ".remark-btn", function () {
      let emp_no = $(this).data("emp");
      let row = frappe.query_report.data.find(
        (r) => r.employee_number == emp_no
      );

      if (!row) {
        frappe.msgprint("Employee row not found.");
        return;
      }

      frappe.query_reports["Daily Sales Report"].open_employee_dialog(
        report,
        row
      );
    });

    // Hover style for remark button (add only once)
    if (!window.__dsr_hover_style__) {
      const style = document.createElement("style");
      style.innerHTML = `
        .remark-btn:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
      `;
      document.head.appendChild(style);
      window.__dsr_hover_style__ = true;
    }

    // Export CSV button
    let export_btn = report.page.add_inner_button("Export CSV", () =>
      frappe.query_reports["Daily Sales Report"].export_csv(report)
    );

    export_btn
      .removeClass("btn-default btn-secondary")
      .addClass("btn-primary")
      .css({
        background: "rgb(22, 163, 74)",
        color: "#ffffff",
        border: "none",
      });
  },

  // Export CSV
  export_csv(report) {
    let data = frappe.query_report.data;

    if (!data || data.length === 0) {
      frappe.msgprint("No data available to export");
      return;
    }

    let csv_header = [
      "Employee Number",
      "Employee Name",
      "SOL ID",
      "Branch",
      "Designation",
      "Total Leads",
      "Converted Leads",
      "Followup Leads",
      "Not Interested Leads",
      "DSR Rating",
      "DSR Qualification",
      "Remark",
    ];

    let csv_rows = data.map((row) => [
      row.employee_number || "",
      row.employee_name || "",
      row.sol_id || "",
      row.branch || "",
      row.designation || "",
      row.total_leads || 0,
      row.converted_leads || 0,
      row.followup_leads || 0,
      row.not_interested_leads || 0,
      row.dsr_rating || "",
      row.dsr_qualification || "",
      row.existing_remark || "",
    ]);

    let csv_content =
      csv_header.join(",") + "\n" + csv_rows.map((e) => e.join(",")).join("\n");

    let blob = new Blob([csv_content], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);

    let selected_date = report.get_values().date;
    let sol_id = report.get_values().sol_id || "all";
    let safe_date = selected_date.replace(/[^0-9\-]/g, "");
    let filename = `dsr_${safe_date}_${sol_id}.csv`;

    let link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    frappe.show_alert(`✔ CSV exported successfully as ${filename}`);
  },

  // Remark Dialog
  open_employee_dialog(report, row) {
    let dialog = new frappe.ui.Dialog({
      title: `Remark - ${row.employee_name} (${row.employee_number})`,
      fields: [
        {
          fieldname: "remark",
          label: "Remark",
          fieldtype: "Small Text",
          reqd: 1,
          default: row.existing_remark || "",
        },
      ],
      primary_action_label: "Save",
      primary_action(values) {
        frappe.call({
          method:
            "sahayog.scrm.doctype.dsr_remark.dsr_remark.create_or_update_dsr_remark",
          args: {
            date: report.get_values().date,
            employee: row.employee_number,
            employee_name: row.employee_name,
            sol_id: row.sol_id,
            branch: row.branch,
            designation: row.designation,
            total_leads: row.total_leads,
            converted_leads: row.converted_leads,
            followup_leads: row.followup_leads,
            not_interested_leads: row.not_interested_leads,
            dsr_rating: row.dsr_rating,
            dsr_qualification: row.dsr_qualification,
            remark: values.remark,
          },
          callback() {
            frappe.msgprint("✔ Remark Saved!");
            dialog.hide();
            report.refresh();
          },
        });
      },
    });

    dialog.show();
  },

  // Column formatter for badges
  formatter: function (value, row, column, data, default_formatter) {
    value = default_formatter(value, row, column, data);
    if (!data) return value;

    if (column.fieldname === "dsr_rating") {
      let color = data.dsr_rating_color || "gray";
      return `<span class="indicator ${color}">${frappe.utils.escape_html(
        data.dsr_rating || ""
      )}</span>`;
    }

    if (column.fieldname === "dsr_qualification") {
      let color = data.dsr_qualification_color || "gray";
      let cls = color === "green" ? "success" : "danger";
      return `<span class="badge badge-${cls}">${frappe.utils.escape_html(
        data.dsr_qualification || ""
      )}</span>`;
    }

    return value;
  },
};
