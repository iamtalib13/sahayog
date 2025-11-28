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

    // SOL ID change handler - auto fetch branch
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
          } else {
            report.set_filter_value("branch", "");
          }
        },
      });
    };

    // Export CSV button
    report.page.add_inner_button("Export CSV", () =>
      frappe.query_reports["Daily Sales Report"].export_csv(report)
    );

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
};
