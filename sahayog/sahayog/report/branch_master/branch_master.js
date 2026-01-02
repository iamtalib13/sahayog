frappe.query_reports["Branch Master"] = {
    "filters": [
        {
            fieldname: "branch_search",
            label: "Branch / SOL Search",
            fieldtype: "Data",
            reqd: 1
        }
    ],
    
    onload: function(report) {
        // Simple button
        let btn = $('<button class="btn btn-primary btn-sm">Search</button>');
        $('.frappe-report-filter-wrapper').append(btn);
        
        btn.click(() => report.refresh());
    }
};
