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
        // === 1. SECURITY ===
        if (!frappe.user.has_role("Administrator")) {
            report.page.wrapper.find('.standard-actions').hide();
        }

        // === 2. INIT ===
        report.set_filter_value("branch_search", "");

        report.page.fields_dict.branch_search.$input.on('change', () => {
             if(!report.get_filter_value("branch_search")) {
                report.refresh();
            }
        });

        // === 3. MODERN CLEAN CSS ===
        const css = `
            .frappe-report .result {
                background-color: #fff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                border-radius: 8px;
            }
            
            /* --- HEADER STYLING --- */
            .dt-header .dt-cell__content {
                font-size: 14px !important;
                font-weight: 700 !important;
                color: #495057 !important;      /* Dark gray, professional */
                background-color: #fff !important; /* Very light gray */
                text-transform: uppercase;
                letter-spacing: 0.5px;
                vertical-align: middle;
            }

            /* --- ROW STYLING --- */
            .dt-cell__content {
                padding: 10px 12px;  /* Tighter padding */
                font-size: 13px;
                color: #212529;
                border-right: 1px solid #f1f3f5; /* Subtle column dividers */
            }

            /* Hover Effect */
            .dt-row:hover .dt-cell {
                background-color: #f8f9fa !important;
            }

            /* Sticky Header Fix (Optional visual tweak) */
            .dt-header {
                box-shadow: 0 2px 5px rgba(0,0,0,0.02);
            }

            /* Empty State */
            .custom-empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 400px;
                color: #868e96;
                text-align: center;
            }
            .custom-empty-state .icon-box {
                font-size: 42px;
                margin-bottom: 15px;
                opacity: 0.8;
                filter: grayscale(100%);
            }
            .custom-empty-state h3 {
                font-weight: 600;
                color: #343a40;
                margin-bottom: 5px;
            }
        `;
        $("<style>").prop("type", "text/css").html(css).appendTo("head");
    },

    formatter: function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        
        // Modern Pill Badge for SOL ID
        if (column.fieldname === "branch_sol_id") {
            if (!value || value == 0 || value === "0") return "";
            return `<span style="
                background-color: #e7f5ff; 
                color: #1170e4; 
                border-radius: 4px; 
                font-weight: 600; 
                font-size: 11px;
                letter-spacing: 0.3px;
            ">${value}</span>`;
        }

        return value;
    },

    // after_datatable_render: function(datatable_wrapper) {
    //     const report = frappe.query_report;
    //     const search_val = report.get_filter_value("branch_search");

    //     if (report.page.fields_dict.branch_search) {
    //         report.page.fields_dict.branch_search.$input.val("");
    //     }

    //     const result_wrapper = $(datatable_wrapper).closest('.result');
        
    //     if (!search_val) {
    //         $(datatable_wrapper).hide();
    //         result_wrapper.find('.custom-empty-state').remove();
    //         result_wrapper.append(`
    //             <div class="custom-empty-state">
    //                 <div class="icon-box">📊</div>
    //                 <h3>Branch Master Report</h3>
    //                 <p>Please select a Branch or SOL ID to load details.</p>
    //             </div>
    //         `);
    //     } else {
    //         $(datatable_wrapper).show();
    //         result_wrapper.find('.custom-empty-state').remove();
    //     }
    // }


    // === 3. MODERN CLEAN CSS WITH NO RESIZABLE ===
    after_datatable_render: function(datatable_wrapper) {
    const report = frappe.query_report;

    // === MAKE ALL COLUMNS NON‑RESIZABLE / NON‑REORDERABLE ===
    if (report.datatable) {
        // Disable resize / drag handles
        report.datatable.options.disableReorderColumn = true;

        // Also lock each column’s resizable flag for safety
        if (report.datatable.options.columns) {
            report.datatable.options.columns.forEach(col => {
                col.resizable = false;
            });
        }

        // Rebuild with updated options
        report.datatable.refresh(report.datatable.options.data);
    }

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
                <div class="icon-box">📊</div>
                <h3>Branch Master Report</h3>
                <p>Please select a Branch or SOL ID to load details.</p>
            </div>
        `);
    } else {
        $(datatable_wrapper).show();
        result_wrapper.find('.custom-empty-state').remove();
    }
}

};
