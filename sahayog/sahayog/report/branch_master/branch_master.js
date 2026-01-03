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
    
     // This runs every time the report finishes loading data
    // after_datatable_render: function(report) {
    //     // Clear the text input visually so it is ready for the next search
    //     if(report.page.fields_dict.branch_search) {
    //         report.page.fields_dict.branch_search.$input.val("");
    //     }
    // },

    // refresh: function(report) {
    //     // Clear the text input visually so it is ready for the next search
    //     console.log("Branch is: ", report.page.fields_dict.branch_search);
    //     if(report.page.fields_dict.branch_search) {
    //         report.page.fields_dict.branch_search.$input.val("");
    //     }
    // },

    onload: function(report) {
        // Triggers refresh when user clears the filter
        report.page.fields_dict.branch_search.$input.on('change', () => {
            if(!report.get_filter_value("branch_search")) {
                report.refresh();
            }
        });
    }
};



