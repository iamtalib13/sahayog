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

            /* Modal Styling (Wide & Compact Height) */
            .branch-modal-wrapper { padding: 0px; }
            /* 3 Columns to save vertical space */
            .branch-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e9ecef; }
            .info-item label { display: block; font-size: 10px; text-transform: uppercase; color: #6c757d; font-weight: 600; margin-bottom: 1px; }
            .info-item span { font-size: 13px; font-weight: 500; color: #212529; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            
            /* Staff Table in Modal */
            .staff-table-wrapper { border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
            .staff-table { width: 100%; border-collapse: collapse; }
            .staff-table th { background-color: #f1f3f5; color: #495057; font-weight: 600; font-size: 11px; text-transform: uppercase; padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6; }
            .staff-table td { padding: 6px 8px; font-size: 12px; color: #343a40; border-bottom: 1px solid #e9ecef; vertical-align: middle; }
            .staff-table tr:last-child td { border-bottom: none; }
            .staff-role-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
            
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

        // === EVENT LISTENER ===
        report.page.wrapper.on('click', '.dt-cell', function(e) {
            if (window.getSelection().toString()) return;
            if (frappe.query_report.data && frappe.query_report.data.length > 0) {
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
    const all_rows = frappe.query_report.data;
    if (!all_rows || all_rows.length === 0) return;

    // Extract Info
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

    // Aggregate Staff
    let staff_list = [];
    const add_staff = (role_code, role_name, name, contact) => {
        if (name && name.trim() !== "") {
            const exists = staff_list.some(s => s.role_code === role_code && s.name === name);
            if (!exists) staff_list.push({ role_code, role_name, name, contact });
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

    const role_priority = { "bm": 1, "bom": 2, "com": 3, "adh": 4, "rom": 5, "rm": 6, "zm": 7 };
    staff_list.sort((a, b) => role_priority[a.role_code] - role_priority[b.role_code]);

    // Build Rows
    let staff_rows_html = "";
    if (staff_list.length > 0) {
        staff_list.forEach(staff => {
            staff_rows_html += `
                <tr>
                    <td><span class="staff-role-badge role-${staff.role_code}">${staff.role_name}</span></td>
                    <td><b>${staff.name}</b></td>
                    <td>${staff.contact || '-'}</td>
                    <td>
                        <a href="tel:${staff.contact}" class="btn btn-xs btn-default"><i class="fa fa-phone"></i></a>
                    </td>
                </tr>
            `;
        });
    } else {
        staff_rows_html = `<tr><td colspan="4" class="text-center text-muted" style="font-size:11px;">No staff details found.</td></tr>`;
    }

    // Create Dialog - ADDED size: 'large' back for width
    const d = new frappe.ui.Dialog({
        title: `Branch Details: ${branch_info.name}`,
        size: 'large', 
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'details_html',
                options: `
                    <div class="branch-modal-wrapper">
                        <!-- 3-Column Grid for Lower Height -->
                        <div class="branch-info-grid">
                            <div class="info-item"><label>SOL ID</label><span>${branch_info.sol}</span></div>
                            <div class="info-item"><label>District</label><span>${branch_info.district}</span></div>
                            <div class="info-item"><label>Open Date</label><span>${branch_info.open_date || '-'}</span></div>
                            <div class="info-item"><label>Region</label><span>${branch_info.region}</span></div>
                            <div class="info-item"><label>Zone</label><span>${branch_info.zone}</span></div>
                            <div class="info-item"><label>State</label><span>${branch_info.state}</span></div>
                        </div>
                        
                         <div class="info-item" style="margin-bottom: 12px; padding: 0 5px;">
                            <label>Address</label>
                            <span style="display:block; margin-top:2px; font-size:12px; line-height:1.4;">${branch_info.address || '-'}</span>
                        </div>

                        <!-- Staff Table -->
                        <h6 style="margin-bottom: 8px; font-weight: 700; color: #495057; font-size:13px;">Staff Hierarchy & Roster</h6>
                        <div class="staff-table-wrapper">
                            <table class="staff-table">
                                <thead>
                                    <tr>
                                        <th style="width: 30%">Role</th>
                                        <th style="width: 35%">Name</th>
                                        <th style="width: 20%">Contact</th>
                                        <th style="width: 15%">Call</th>
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
    
    // Styles for Modal Header and Close Button
    d.$wrapper.find('.modal-header').css({
        'background': 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
        'color': 'white',
        'padding': '10px 15px'
    });
    d.$wrapper.find('.modal-title').css({'color': 'white', 'font-size': '15px'});
    
    // FORCE CLOSE BUTTON WHITE
    d.$wrapper.find('.modal-header .close, .modal-header .btn-close').css({
        'color': '#ffffff',
        'opacity': '1',
        'text-shadow': 'none',
        'outline': 'none',
        'box-shadow': 'none'
    });

    d.show();

d.$wrapper.on('shown.bs.modal', function () {
    const $btn = d.$wrapper.find('.btn-modal-close');

    // Force white color
    $btn.css('color', '#ffffff');
    $btn.html('<i class="fa fa-times" style="color:#fff"></i>');


    // OVERRIDE internal SVG opacity (THIS IS THE MISSING PIECE)
    $btn.find('svg, svg *').css({
        opacity: 1,
        fill: 'currentColor',
        stroke: 'currentColor'
    });
});
}
