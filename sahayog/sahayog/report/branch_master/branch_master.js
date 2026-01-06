// ==========================================
// 1. JAVASCRIPT
// ==========================================
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
        // === SECURITY ===
        if (!frappe.user.has_role("Administrator")) {
            report.page.wrapper.find('.standard-actions').hide();
        }

        // === INIT ===
        report.set_filter_value("branch_search", "");

        // === CSS ===
        const css = `
            /* Interactive Table */
            .dt-cell { cursor: pointer !important; }
            .dt-cell:hover { background-color: #f1f3f5 !important; }
            
            /* Report Container */
            .frappe-report .result { background-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 8px; }
            
            /* Empty State */
            .custom-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; background-color: #f8f9fa; border: 2px dashed #e9ecef; border-radius: 12px; margin: 20px; text-align: center; }
            .custom-empty-state .icon-box { font-size: 64px; margin-bottom: 20px; display: inline-block; background: #e7f5ff; width: 100px; height: 100px; line-height: 100px; border-radius: 50%; }

            /* Modal Styling */
            .branch-modal-wrapper { padding: 5px; }
            .branch-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e9ecef; }
            .info-item label { display: block; font-size: 11px; text-transform: uppercase; color: #6c757d; font-weight: 600; margin-bottom: 2px; }
            .info-item span { font-size: 14px; font-weight: 500; color: #212529; }
            
            /* Staff Table in Modal */
            .staff-table-wrapper { border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
            .staff-table { width: 100%; border-collapse: collapse; }
            .staff-table th { background-color: #f1f3f5; color: #495057; font-weight: 600; font-size: 12px; text-transform: uppercase; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; }
            .staff-table td { padding: 12px; font-size: 13px; color: #343a40; border-bottom: 1px solid #e9ecef; vertical-align: middle; }
            .staff-table tr:last-child td { border-bottom: none; }
            .staff-role-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
            
            /* Role Colors */
            .role-bm { background-color: #e3f2fd; color: #0d47a1; }
            .role-bom { background-color: #e0f7fa; color: #006064; }
            .role-com { background-color: #f3e5f5; color: #4a148c; }
            .role-rom { background-color: #fff3e0; color: #e65100; }
            .role-adh { background-color: #fce4ec; color: #880e4f; }
            .role-rm { background-color: #e8f5e9; color: #1b5e20; }
            .role-zm { background-color: #fff8e1; color: #ff6f00; }
        `;
        $("<style>").prop("type", "text/css").html(css).appendTo("head");

        // === EVENT LISTENER (THE FIX) ===
        // We attach to 'report.page.wrapper' which is permanent.
        // It listens for clicks on '.dt-cell' which are the table cells.
        report.page.wrapper.on('click', '.dt-cell', function(e) {
            // Prevent if user is selecting text
            if (window.getSelection().toString()) return;
            
            // Trigger Modal with Current Report Data
            if (frappe.query_report.data && frappe.query_report.data.length > 0) {
                // We pass the first row because all rows contain the same branch info
                show_branch_modal(frappe.query_report.data[0]);
            }
        });

        // === AUTO-SET BRANCH ===
        let auto_set = false;
        frappe.db.get_value("Employee", {user_id: frappe.session.user}, "sahayog_branch")
        .then(r => {
            if (r && r.message && r.message.sahayog_branch) {
                frappe.db.get_value("Sahayog Branch", {sol_id: r.message.sahayog_branch}, "name")
                .then(branch_r => {
                    if(branch_r && branch_r.message) {
                        report.set_filter_value("branch_search", branch_r.message.name);
                        report.refresh();
                        auto_set = true;
                    }
                });
            } 
            setTimeout(() => {
                if (!auto_set && !report.get_filter_value("branch_search")) {
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
            if (!value || value == 0) return "";
            return `<span style="background-color: #e7f5ff; color: #1170e4; border-radius: 4px; font-weight: 600; font-size: 11px;">${value}</span>`;
        }
        return value;
    },

    after_datatable_render: function(datatable_wrapper) {
        const report = frappe.query_report;
        if (!report.get_filter_value("branch_search")) {
             if (datatable_wrapper) $(datatable_wrapper).hide();
             show_welcome_screen(report);
        } else {
             if (datatable_wrapper) $(datatable_wrapper).show();
             report.page.wrapper.find('.custom-empty-state').remove();
        }
    }
};

// === WELCOME SCREEN HELPER ===
function show_welcome_screen(report) {
    const $result_wrapper = report.page.wrapper.find('.result');
    $result_wrapper.show(); 
    if ($result_wrapper.find('.custom-empty-state').length === 0) {
        $result_wrapper.append(`
            <div class="custom-empty-state">
                <div class="icon-box">🏢</div>
                <h3>Welcome to Branch Master</h3>
                <p>Select a <b>Branch</b> to view the roster.</p>
                <button class="btn btn-primary btn-sm btn-select-branch">Select Branch</button>
            </div>
        `);
        $result_wrapper.find('.btn-select-branch').off('click').on('click', function() {
            report.page.fields_dict.branch_search.$input.focus();
        });
    }
};

// === PROFESSIONAL MODAL LOGIC ===
function show_branch_modal(clicked_row_data) {
    // 1. Get ALL rows from the report to combine data
    const all_rows = frappe.query_report.data;

    if (!all_rows || all_rows.length === 0) return;

    // 2. Extract Branch Info (using the passed row)
    const branch_info = {
        name: clicked_row_data.branch_name,
        sol: clicked_row_data.branch_sol_id,
        state: clicked_row_data.state,
        district: clicked_row_data.district,
        zone: clicked_row_data.zone,
        region: clicked_row_data.region,
        address: clicked_row_data.branch_address,
        open_date: clicked_row_data.branch_opening_date,
        email: clicked_row_data.email
    };

    // 3. Aggregate Employees from ALL rows
    let staff_list = [];
    
    // Helper to add if exists
    const add_staff = (role_code, role_name, name, contact) => {
        if (name && name.trim() !== "") {
            // Check for duplicates
            const exists = staff_list.some(s => s.role_code === role_code && s.name === name);
            if (!exists) {
                staff_list.push({ role_code, role_name, name, contact });
            }
        }
    };

    all_rows.forEach(row => {
        add_staff("bm", "Branch Manager", row.bm_name, row.bm_contact);
        add_staff("bom", "Branch Ops Manager", row.bom_name, row.bom_contact);
        add_staff("com", "Cluster Ops Manager", row.com_name, row.com_contact);
        add_staff("adh", "Asst. District Head", row.adh_name, row.adh_contact);
        add_staff("rom", "Regional Ops Manager", row.rom_name, row.rom_contact);
        add_staff("rm", "Regional Manager", row.rm_name, row.rm_contact);
        add_staff("zm", "Zonal Manager", row.zm_name, row.zm_contact);
    });

    // Sort by hierarchy priority
    const role_priority = { "bm": 1, "bom": 2, "com": 3, "adh": 4, "rom": 5, "rm": 6, "zm": 7 };
    staff_list.sort((a, b) => role_priority[a.role_code] - role_priority[b.role_code]);

    // 4. Build HTML Table Rows
    let staff_rows_html = "";
    if (staff_list.length > 0) {
        staff_list.forEach(staff => {
            staff_rows_html += `
                <tr>
                    <td><span class="staff-role-badge role-${staff.role_code}">${staff.role_name}</span></td>
                    <td><b>${staff.name}</b></td>
                    <td>${staff.contact || '<span class="text-muted">-</span>'}</td>
                    <td>
                        <a href="tel:${staff.contact}" class="btn btn-xs btn-default"><i class="fa fa-phone"></i></a>
                    </td>
                </tr>
            `;
        });
    } else {
        staff_rows_html = `<tr><td colspan="4" class="text-center text-muted">No staff details found for this branch.</td></tr>`;
    }

    // 5. Create Dialog
    const d = new frappe.ui.Dialog({
        title: `Branch Details: ${branch_info.name}`,
        size: 'large', 
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'details_html',
                options: `
                    <div class="branch-modal-wrapper">
                        <!-- Header Section -->
                        <div class="branch-info-grid">
                            <div class="info-item"><label>SOL ID</label><span>${branch_info.sol}</span></div>
                            <div class="info-item"><label>Region</label><span>${branch_info.region}</span></div>
                            <div class="info-item"><label>Zone</label><span>${branch_info.zone}</span></div>
                            <div class="info-item"><label>State</label><span>${branch_info.state}</span></div>
                            <div class="info-item"><label>District</label><span>${branch_info.district}</span></div>
                            <div class="info-item"><label>Opening Date</label><span>${branch_info.open_date || '-'}</span></div>
                        </div>
                        
                         <div class="info-item" style="margin-bottom: 20px; padding: 0 5px;">
                            <label>Address</label>
                            <span style="display:block; margin-top:4px; font-size:13px;">${branch_info.address || '-'}</span>
                        </div>

                        <!-- Staff Table -->
                        <h5 style="margin-bottom: 15px; font-weight: 700; color: #495057;">Staff Hierarchy & Roster</h5>
                        <div class="staff-table-wrapper">
                            <table class="staff-table">
                                <thead>
                                    <tr>
                                        <th style="width: 25%">Designation</th>
                                        <th style="width: 35%">Employee Name</th>
                                        <th style="width: 25%">Contact</th>
                                        <th style="width: 15%">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${staff_rows_html}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `
            }
        ]
    });

    // Custom styling for the dialog header
    d.$wrapper.find('.modal-header').css({
        'background': 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
        'color': 'white'
    });
    d.$wrapper.find('.modal-title').css('color', 'white');
    d.$wrapper.find('.close').css('color', 'white');

    d.show();
}
