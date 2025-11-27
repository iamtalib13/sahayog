frappe.query_reports["Daily Sales Report"] = {
  filters: [
    {
      fieldname: "date",
      label: __("Date"),
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
      reqd: 1,
    },
    {
      fieldname: "sol_id",
      label: __("SOL ID"),
      fieldtype: "Link",
      options: "Sahayog Branch",
      reqd: 1,
      on_change: function (report) {
        let sol_id = report.get_values().sol_id;

        if (sol_id) {
          frappe.db.get_value("Sahayog Branch", sol_id, "branch").then((r) => {
            if (r.message) {
              report.set_filter_value("branch", r.message.branch);
            }
          });
        }
      },
    },
    {
      fieldname: "branch",
      label: __("Branch"),
      fieldtype: "Data",
      reqd: 1,
      read_only: 1,
    },
  ],

  onload: async function (report) {
    const roles = frappe.user_roles;

    // Only Branch Manager gets default locked values
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
    }
    // Admin & Sales Manager → Do nothing (no defaults)
    else {
      report.page.fields_dict.sol_id.df.read_only = 0;
      report.page.fields_dict.sol_id.refresh();
    }

    // Add Export CSV button
    report.page.add_inner_button("Export CSV", () => {
      frappe.query_reports["Daily Sales Report"].export_csv(report);
    });
  },

  export_csv(report) {
    if (!report.data || report.data.length === 0) {
      frappe.msgprint("No data to export.");
      return;
    }

    const rows = report.data.map((row) => ({
      "Employee Number": row.employee_number,
      "Employee Name": row.employee_name,
      "SOL ID": row.sol_id,
      Branch: row.branch,
      Designation: row.designation,
      "Total Leads": row.total_leads,
      "Converted Leads": row.converted_leads,
      "Followup Leads": row.followup_leads,
      "Not Interested Leads": row.not_interested_leads,
      Rating: row.dsr_rating,
      Qualification: row.dsr_qualification,
      Remark: row.existing_remark || "",
    }));

    const date = report.get_values().date || frappe.datetime.nowdate();
    const sol_id = report.get_values().sol_id || "all";

    frappe.tools.downloadify(rows, null, `dsr_${date}_${sol_id}.csv`);
  },
};
