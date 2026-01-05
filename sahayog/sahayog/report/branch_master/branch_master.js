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

        // === 2. INIT & CSS ===
        report.set_filter_value("branch_search", "");

        // Inject CSS immediately
        const css = `
            .frappe-report .result { background-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 8px; }
            .dt-header .dt-cell__content { font-size: 14px; font-weight: 700 !important; color: #495057; text-align: center; background-color: #fff; text-transform: uppercase; }
            .dt-cell__content { padding: 10px 12px; font-size: 13px; color: #212529; border-right: 1px solid #f1f3f5; }
            .dt-row:hover .dt-cell { background-color: #f8f9fa !important; }
            .datatable .dt-cell--resize-handle, .datatable .dt-cell__resize-handle { display: none !important; }
            .datatable .dt-header .dt-cell { user-select: none; }
            .datatable .dt-cell { resize: none; }
            .datatable .dt-scrollable { min-height: 148px; }

            /* WELCOME SCREEN STYLING */
            .custom-empty-state {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                min-height: 60vh; background-color: #f8f9fa; border: 2px dashed #e9ecef;
                border-radius: 12px; margin: 20px; text-align: center;
            }
            .custom-empty-state .icon-box {
                font-size: 64px; margin-bottom: 20px; display: inline-block;
                background: #e7f5ff; width: 100px; height: 100px; line-height: 100px; border-radius: 50%;
            }
            .custom-empty-state h3 { font-weight: 700; color: #495057; margin-bottom: 10px; }
            .custom-empty-state p { color: #868e96; font-size: 14px; margin-bottom: 25px; }
        `;
        $("<style>").prop("type", "text/css").html(css).appendTo("head");

        // === 3. AUTO-SET BRANCH OR SHOW WELCOME ===
        let auto_set = false;
        
        frappe.db.get_value("Employee", {user_id: frappe.session.user}, "sahayog_branch")
        .then(r => {
            if (r && r.message && r.message.sahayog_branch) {
                // User has branch -> Load it
                frappe.db.get_value("Sahayog Branch", {sol_id: r.message.sahayog_branch}, "name")
                .then(branch_r => {
                    if(branch_r && branch_r.message) {
                        report.set_filter_value("branch_search", branch_r.message.name);
                        report.refresh();
                        auto_set = true;
                    }
                });
            } 
            
            // If no branch found after 500ms, force the welcome screen manually
            // This handles the "Blank Page" on load issue
            setTimeout(() => {
                if (!auto_set && !report.get_filter_value("branch_search")) {
                   // Force render the welcome screen if grid is missing
                   const $result = report.page.wrapper.find('.result');
                   if ($result.find('.datatable').length === 0 || $result.find('.datatable').is(':hidden')) {
                       show_welcome_screen(report);
                   }
                }
            }, 800);
        });
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
        
        if (!search_val) {
             if (datatable_wrapper) $(datatable_wrapper).hide();
             show_welcome_screen(report);
        } else {
             if (datatable_wrapper) $(datatable_wrapper).show();
             report.page.wrapper.find('.custom-empty-state').remove();
        }
    }
};

// Helper function to ensure consistency
function show_welcome_screen(report) {
    const $result_wrapper = report.page.wrapper.find('.result');
    
    // Ensure wrapper is visible (Frappe sometimes hides it if empty)
    $result_wrapper.show(); 
    
    // Only append if not already there
    if ($result_wrapper.find('.custom-empty-state').length === 0) {
        $result_wrapper.append(`
            <div class="custom-empty-state">
                <div class="empty-content">
                    <div class="icon-box">🏢</div>
                    <h3>Welcome to Branch Master</h3>
                    <p>Select a <b>Branch</b> or <b>SOL ID</b> above to view the staff roster.</p>
                    <button class="btn btn-primary btn-sm btn-select-branch">Select Branch</button>
                </div>
            </div>
        `);
        
        $result_wrapper.find('.btn-select-branch').off('click').on('click', function() {
            report.page.fields_dict.branch_search.$input.focus();
        });
    }


};
