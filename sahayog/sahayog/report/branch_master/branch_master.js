frappe.query_reports["Branch Master"] = {
    "filters": [
        {
            "fieldname": "branch_search",
            "label": "Branch / SOL Search",
            "fieldtype": "Data",
            "reqd": 1,
            "description": "Type SOL ID or Branch Name (min 2 chars)"
        }
    ],

    onload: function(report) {
        let $input = report.page.$wrapper.find('.frappe-control[data-fieldname="branch_search"] input');
        
        $input.on("input", frappe.utils.debounce(function() {
            let text = $(this).val().trim();
            let $wrapper = $(this).closest('.frappe-control');
            
            if (text.length < 2) {
                $wrapper.find('.autocomplete-items').remove();
                return;
            }

            frappe.call({
                method: "sahayog.sahayog.report.branch_master.branch_master.get_branch_suggestions",
                args: { text },
                callback: function(r) {
                    if (!r.message || r.message.length === 0) {
                        $wrapper.find('.autocomplete-items').remove();
                        return;
                    }

                    let html = r.message.map(row => 
                        `<div class="autocomplete-item" data-value="${row.sol_id} - ${row.branch} (${row.district})">${row.sol_id} - ${row.branch} (${row.district})</div>`
                    ).join('');

                    $wrapper.find('.autocomplete-items').remove();
                    $wrapper.append(`<div class="autocomplete-items">${html}</div>`);
                }
            });
        }, 300));

        // Click to select suggestion
        $(document).on('click', '.autocomplete-item', function() {
            let value = $(this).data('value');
            let $input = $('.frappe-control[data-fieldname="branch_search"] input');
            $input.val(value);
            $(this).closest('.autocomplete-items').remove();
            report.refresh();
        });
    }
};
