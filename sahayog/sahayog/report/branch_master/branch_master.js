frappe.query_reports["Branch Master"] = {
    "filters": [
        {
            fieldname: "branch_search",
            label: "Branch / SOL Search",
            fieldtype: "Link",
            options: "Sahayog Branch",
            reqd: 0,
            get_query: function() {
                return {
                    query: "sahayog.sahayog.report.branch_master.branch_master.search_branch_sol"
                };
            }
        }
    ],

    onload: function(report) {
        // === 1. SECURITY: HIDE MENU FOR NON-ADMINS ===
        // We check if "Administrator" is NOT in the user's roles
        if (!frappe.user.has_role("Administrator")) {
            // Hide the standard actions div (Reload, Menu, Actions)
            report.page.wrapper.find('.standard-actions').hide();
        }

        // === 2. STANDARD LOGIC (Previous Code) ===
        report.set_filter_value("branch_search", "");

        report.page.fields_dict.branch_search.$input.on('change', () => {
             if(!report.get_filter_value("branch_search")) {
                report.refresh();
            }
        });

        const css = `
            .frappe-report .result {
                min-height: 600px;
                background-color: #fff;
            }
            .dt-header .dt-cell__content {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 700;
                color: #6c757d;
                background-color: #f8f9fa;
                border-bottom: 2px solid #e9ecef;
            }
            .dt-cell__content {
                padding: 12px 14px;
                font-size: 13px;
                color: #333;
            }
            .dt-row:hover .dt-cell {
                background-color: #f1f8ff !important;
                transition: background-color 0.2s ease;
            }
            .custom-empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 400px;
                color: #8d99a6;
                text-align: center;
                animation: fadeIn 0.5s ease-in-out;
            }
            .custom-empty-state .icon-box {
                font-size: 48px;
                margin-bottom: 15px;
                opacity: 0.7;
            }
            .custom-empty-state h3 {
                font-weight: 600;
                color: #333;
                margin-bottom: 8px;
            }

            .datatable .dt-scrollable {
                min-height: 160px;
            }
            
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        $("<style>").prop("type", "text/css").html(css).appendTo("head");
    },

    formatter: function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        
        if (column.fieldname === "branch_sol_id") {
            if (!value || value == 0 || value === "0") return "";
            return `<span style="background-color: #E8F0FE; color: #1967D2; border-radius: 12px; font-weight: 600; font-size: 12px;">${value}</span>`;
        }

        return value;
    },

    after_datatable_render: function(datatable_wrapper) {
        const report = frappe.query_report;
        const search_val = report.get_filter_value("branch_search");

        if (report.page.fields_dict.branch_search) {
            report.page.fields_dict.branch_search.$input.val("");
        }

        const result_wrapper = $(datatable_wrapper).closest('.result');
        
        if (!search_val) {
            $(datatable_wrapper).hide();
            result_wrapper.find('.custom-empty-state').remove();

            result_wrapper.append(`
                <div class="custom-empty-state">
                    <div class="icon-box">👋</div>
                    <h3>Welcome to Branch Master</h3>
                    <p>Select a Branch or SOL ID from the filter above<br>to view employee designation details.</p>
                </div>
            `);
        } else {
            $(datatable_wrapper).show();
            result_wrapper.find('.custom-empty-state').remove();
        }
    }
};
