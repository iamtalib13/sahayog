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
        // 1. Clear filter on load
        report.set_filter_value("branch_search", "");

        // 2. Auto-refresh on clear
        report.page.fields_dict.branch_search.$input.on('change', () => {
             if(!report.get_filter_value("branch_search")) {
                report.refresh();
            }
        });

        // 3. UI/UX: Modern Table Styling
        const css = `
            /* Container Min Height */
            .frappe-report .result {
                min-height: 600px;
                background-color: #fff;
            }

            /* Header Styling */
            .dt-header .dt-cell__content {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 700;
                color: #6c757d;
                background-color: #f8f9fa;
                border-bottom: 2px solid #e9ecef;
            }

            /* Cell Spacing & Text */
            .dt-cell__content {
                padding: 12px 14px;
                font-size: 13px;
                color: #333;
            }

            /* Row Hover Effect */
            .dt-row:hover .dt-cell {
                background-color: #f1f8ff !important;
                transition: background-color 0.2s ease;
            }

            /* Custom Empty State Container */
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
                min-height: 160px;}
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        $("<style>").prop("type", "text/css").html(css).appendTo("head");
    },

    formatter: function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        
        // UX: SOL ID Badge
        if (column.fieldname === "branch_sol_id") {
            if (!value || value == 0 || value === "0") return "";
            return `<span style="background-color: #E8F0FE; color: #1967D2; border-radius: 12px; font-weight: 600; font-size: 12px;">${value}</span>`;
        }

        return value;
    },

    after_datatable_render: function(datatable_wrapper) {
        const report = frappe.query_report;
        const search_val = report.get_filter_value("branch_search");

        // UI UX: CLEAR SEARCH FIELD
        if (report.page.fields_dict.branch_search) {
            report.page.fields_dict.branch_search.$input.val("");
        }

        // UI UX: HANDLE EMPTY STATE
        // If there is no search value, we hide the grid and show our custom message
        const result_wrapper = $(datatable_wrapper).closest('.result');
        
        if (!search_val) {
            // Hide the actual table grid
            $(datatable_wrapper).hide();
            
            // Remove any existing empty state to prevent duplicates
            result_wrapper.find('.custom-empty-state').remove();

            // Inject "Start Searching" Message
            result_wrapper.append(`
                <div class="custom-empty-state">
                    <div class="icon-box">👋</div>
                    <h3>Welcome to Branch Master</h3>
                    <p>Select a Branch or SOL ID from the filter above<br>to view employee designation details.</p>
                </div>
            `);
        } else {
            // If data exists, show the table and remove the message
            $(datatable_wrapper).show();
            result_wrapper.find('.custom-empty-state').remove();
        }
    }
};
