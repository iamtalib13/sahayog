frappe.query_reports["Branch Master"] = {
    "filters": [
        {
            fieldname: "branch_search",
            label: "Branch / SOL Search",
            fieldtype: "Autocomplete",
            reqd: 1,
            options: [],
            description: "Type SOL ID or Branch Name to search"
        }
    ],

    onload: function(report) {
        const filter = report.get_filter("branch_search");
        filter.$input.on("input", frappe.utils.debounce(function () {
            let text = $(this).val();
            if (!text || text.length < 2) {
                return;
            }

            frappe.call({
                method: "sahayog.sahayog.report.branch_master.branch_master.get_branch_suggestions",
                args: { text },
                callback: function(r) {
                    if (!r.message) return;

                    // build options: "SOLID - Branch Name (District)"
                    let opts = r.message.map(row => {
                        return `${row.sol_id} - ${row.branch} (${row.district})`;
                    });

                    filter.df.options = opts.join("\n");
                    filter.refresh();
                }
            });
        }, 300));
    }
};
