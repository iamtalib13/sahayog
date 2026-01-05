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

        // === 3. CSS WITH NON-RESIZABLE COLUMNS ===
        const css = `
            .frappe-report .result {
        background-color: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        border-radius: 8px;
    }
    
    /* HEADER STYLING - ALL CENTERED */
    .dt-header .dt-cell__content {
        font-size: 14px !important;
        font-weight: 700 !important;
        color: #495057 !important;
        background-color: #fff !important;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        vertical-align: middle;
        text-align: center !important;  /* ← CENTERED HEADERS */
    }

    /* ROW STYLING */
    .dt-cell__content {
        padding: 10px 12px;
        font-size: 13px;
        color: #212529;
        border-right: 1px solid #f1f3f5;
    }

    /* HOVER EFFECT */
    .dt-row:hover .dt-cell {
        background-color: #f8f9fa !important;
    }

    /* STICKY HEADER */
    .dt-header {
        box-shadow: 0 2px 5px rgba(0,0,0,0.02);
    }

    /* EMPTY STATE */
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

    /* DISABLE COLUMN RESIZE */
    .datatable .dt-cell--resize-handle {
        display: none !important;
    }
    .datatable .dt-cell__resize-handle {
        display: none !important;
    }
    .datatable .dt-header .dt-cell {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
    }
    .datatable .dt-cell {
        resize: none !important;
    }
            
            .datatable .dt-scrollable{
                min-height: 148px !important;
            }
        `;
        $("<style>").prop("type", "text/css").html(css).appendTo("head");
    },

    formatter: function(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        
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

    after_datatable_render: function(datatable_wrapper) {
        const report = frappe.query_report;
        const search_val = report.get_filter_value("branch_search");

        // if (report.page.fields_dict.branch_search) {
        //     report.page.fields_dict.branch_search.$input.val("");
        // }

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
