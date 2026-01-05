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

    // onload: function(report) {
    //     // === 1. SECURITY ===
    //     if (!frappe.user.has_role("Administrator")) {
    //         report.page.wrapper.find('.standard-actions').hide();
    //     }

    //     // === 2. INIT ===
    //     report.set_filter_value("branch_search", "");

    //     report.page.fields_dict.branch_search.$input.on('change', () => {
    //          if(!report.get_filter_value("branch_search")) {
    //             report.refresh();
    //         }
    //     });

    //     // === AUTO-SET BRANCH FOR LOGGED IN USER ===
    //     // Only if filter is empty
    //     if(!report.get_filter_value("branch_search")) {
    //          frappe.db.get_value("Employee", {user_id: frappe.session.user}, "sahayog_branch")
    //          .then(r => {
    //              if (r && r.message && r.message.sahayog_branch) {
    //                  // Get the Branch Name from the ID if needed, or if ID is the link field
    //                  // Assuming 'sahayog_branch' is the Link to 'Sahayog Branch'
    //                  frappe.db.get_value("Sahayog Branch", {sol_id: r.message.sahayog_branch}, "name")
    //                  .then(branch_r => {
    //                      if(branch_r && branch_r.message) {
    //                          report.set_filter_value("branch_search", branch_r.message.name);
    //                          report.refresh();
    //                      }
    //                  });
    //              } else {
    //                  // No branch found? Focus the input so they know to type
    //                  setTimeout(() => {
    //                     report.page.fields_dict.branch_search.$input.focus();
    //                  }, 500);
    //              }
    //          });
    //     }

    //     // === 3. CSS WITH NON-RESIZABLE COLUMNS ===
    //     const css = `
    //         .frappe-report .result {
    //     background-color: #fff;
    //     box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    //     border-radius: 8px;
    // }
    
    // /* HEADER STYLING - ALL CENTERED */
    // .dt-header .dt-cell__content {
    //     font-size: 14px !important;
    //     font-weight: 700 !important;
    //     color: #495057 !important;
    //     background-color: #fff !important;
    //     text-transform: uppercase;
    //     letter-spacing: 0.5px;
    //     vertical-align: middle;
    //     text-align: center !important;  /* ← CENTERED HEADERS */
    // }

    // /* ROW STYLING */
    // .dt-cell__content {
    //     padding: 10px 12px;
    //     font-size: 13px;
    //     color: #212529;
    //     border-right: 1px solid #f1f3f5;
    // }

    // /* HOVER EFFECT */
    // .dt-row:hover .dt-cell {
    //     background-color: #f8f9fa !important;
    // }

    // /* STICKY HEADER */
    // .dt-header {
    //     box-shadow: 0 2px 5px rgba(0,0,0,0.02);
    // }

    
    // .custom-empty-state .icon-box {
    //     font-size: 42px;
    //     margin-bottom: 15px;
    //     opacity: 0.8;
    //     filter: grayscale(100%);
    // }
    // .custom-empty-state h3 {
    //     font-weight: 600;
    //     color: #343a40;
    //     margin-bottom: 5px;
    // }

    // /* DISABLE COLUMN RESIZE */
    // .datatable .dt-cell--resize-handle {
    //     display: none !important;
    // }
    // .datatable .dt-cell__resize-handle {
    //     display: none !important;
    // }
    // .datatable .dt-header .dt-cell {
    //     user-select: none !important;
    //     -webkit-user-select: none !important;
    //     -moz-user-select: none !important;
    // }
    // .datatable .dt-cell {
    //     resize: none !important;
    // }
            
    //         .datatable .dt-scrollable{
    //             min-height: 148px !important;
    //         }

    
    // /* FIXED EMPTY STATE STYLING */
    //         .custom-empty-state {
    //             display: flex;
    //             align-items: center;
    //             justify-content: center;
    //             min-height: 60vh; /* Takes up 60% of screen height */
    //             background-color: #f8f9fa;
    //             border: 2px dashed #e9ecef;
    //             border-radius: 12px;
    //             margin: 20px;
    //             text-align: center;
    //         }
            
    //         .custom-empty-state .empty-content {
    //             max-width: 400px;
    //         }

    //         .custom-empty-state .icon-box {
    //             font-size: 64px;
    //             margin-bottom: 20px;
    //             display: inline-block;
    //             background: #e7f5ff;
    //             width: 100px;
    //             height: 100px;
    //             line-height: 100px;
    //             border-radius: 50%;
    //         }

    //         .custom-empty-state h3 {
    //             font-weight: 700;
    //             color: #495057;
    //             margin-bottom: 10px;
    //         }
            
    //         .custom-empty-state p {
    //             color: #868e96;
    //             font-size: 14px;
    //             margin-bottom: 25px;
    //         }
    //     `;
    //     $("<style>").prop("type", "text/css").html(css).appendTo("head");
    // },


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
            .dt-header .dt-cell__content { font-size: 14px; font-weight: 700; color: #495057; text-align: center; background-color: #fff; text-transform: uppercase; }
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

    // after_datatable_render: function(datatable_wrapper) {
    //     const report = frappe.query_report;
    //     const search_val = report.get_filter_value("branch_search");

    //     // === 1. RESET SEARCH INPUT ===
    //     // if (report.page.fields_dict.branch_search) {
    //     //     report.page.fields_dict.branch_search.$input.val("");
    //     // }

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


    //        after_datatable_render: function(datatable_wrapper) {
    //     const report = frappe.query_report;
    //     const search_val = report.get_filter_value("branch_search");
        
    //     console.log("Report Rendered. Filter Value:", search_val); // <--- CHECK CONSOLE FOR THIS

    //     // 1. FIND WRAPPER SAFEGUARD
    //     // We use the datatable_wrapper itself to find its parent '.result' container
    //     const $result_wrapper = $(datatable_wrapper).closest('.result');

    //     // 2. HANDLE EMPTY STATE
    //     if (!search_val) {
    //         console.log("No filter detected. Hiding grid, showing Welcome.");

    //         // Hide the grid
    //         if (datatable_wrapper) $(datatable_wrapper).hide();
            
    //         // Clean up old state to prevent duplicates
    //         $result_wrapper.find('.custom-empty-state').remove();

    //         // Inject Welcome Screen
    //         // Note: We use .append() on the wrapper, not the grid
    //         $result_wrapper.append(`
    //             <div class="custom-empty-state">
    //                 <div class="empty-content">
    //                     <div class="icon-box">🏢</div>
    //                     <h3>Welcome to Branch Master</h3>
    //                     <p>Select a <b>Branch</b> or <b>SOL ID</b> above to view the staff roster.</p>
    //                     <button class="btn btn-primary btn-sm btn-select-branch">Select Branch</button>
    //                 </div>
    //             </div>
    //         `);

    //         // Activate Button
    //         $result_wrapper.find('.btn-select-branch').on('click', function() {
    //             report.page.fields_dict.branch_search.$input.focus();
    //         });

    //     } else {
    //         console.log("Filter active. Showing grid.");
    //         // Filter is active: Show grid, remove empty state
    //         if (datatable_wrapper) $(datatable_wrapper).show();
    //         $result_wrapper.find('.custom-empty-state').remove();
    //     }
    // } 


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
