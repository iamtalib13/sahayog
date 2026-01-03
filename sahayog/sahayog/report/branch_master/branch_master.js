frappe.query_reports["Branch Master"] = {
    "filters": [
        {
            fieldname: "branch_search",
            label: "Branch / SOL Search",
            fieldtype: "Link",
            options: "Sahayog Branch",
            reqd: 1,
            get_query: function() {
                return {
                    // Points to the python function defined below
                    query: "sahayog.sahayog.report.branch_master.branch_master.search_branch_sol"
                };
            }
        }
    ],

    // Runs every time data is fetched (Search or Refresh Button)
    after_datatable_render: function(datatable_wrapper) {
        const report = frappe.query_report;
        
        if (report && report.page && report.page.fields_dict.branch_search) {
            // Clear the visual input box so the user can type the next search immediately
            report.page.fields_dict.branch_search.$input.val("");
        }
    },


    onload: function(report) {
        report.set_filter_value("branch_search", "");
        // Triggers refresh when user clears the filter
        report.page.fields_dict.branch_search.$input.on('change', () => {
            if(!report.get_filter_value("branch_search")) {
                report.refresh();
            }
        });
    }
};



