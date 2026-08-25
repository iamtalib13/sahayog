frappe.ui.form.on("Branch Score Card", {
    onload_post_render(frm) {
        if (frm.is_new()) {
            const current_month = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ][new Date().getMonth()];

            const current_year = new Date().getFullYear();

            frm.doc.month = current_month;
            frm.doc.year = current_year;
            frm.refresh_field("month");
            frm.refresh_field("year");
        }
    },

    refresh(frm) {
        frm.trigger("ensure_empty_grids_visible");
        frm.trigger("apply_grid_column_styles");

        // Jab document already saved ho (New nahi ho), toh widget render karo bina form dirty kiye
        if (!frm.is_new()) {
            frm.trigger("render_widget");
        } else {
            frm.trigger("fetch_and_render_all");
        }

        if (!window.html2canvas) {
            frappe.require('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }

        let btn_label = `<i class="fa fa-download" style="margin-right: 6px;"></i> ${__('Download Scorecard')}`;
        
        let $btn = frm.add_custom_button(btn_label, function() {
            let field = frm.get_field("branch_score_widget");
            if (!field || !field.$wrapper || !field.$wrapper.find('.bsc-widget').length) {
                frappe.msgprint(__('Please wait for the Scorecard to load before downloading.'));
                return;
            }

            let original_html = $btn.html();
            $btn.html(`<i class="fa fa-spinner fa-spin" style="margin-right: 6px;"></i> ${__('Downloading...')}`);
            $btn.prop('disabled', true);

            let target_element = field.$wrapper.find('.bsc-widget')[0];

            setTimeout(() => {
                html2canvas(target_element, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    logging: false
                }).then(function(canvas) {
                    let link = document.createElement('a');
                    let filename = `Scorecard_${frm.doc.branch || 'Report'}_${frm.doc.month || ''}_${frm.doc.year || ''}.png`;
                    
                    link.download = filename;
                    link.href = canvas.toDataURL("image/png");
                    link.click();

                    $btn.html(original_html);
                    $btn.prop('disabled', false);
                }).catch(function(err) {
                    $btn.html(original_html);
                    $btn.prop('disabled', false);
                    frappe.msgprint(__('An error occurred while generating the image: ') + err);
                });
            }, 50);
        });

        $btn.css({
            "background-color": "#006768",
            "color": "#ffffff",
            "border": "none",
            "border-bottom": "3px solid #004647",
            "box-shadow": "0 3px 5px rgba(0,0,0,0.2)",
            "font-weight": "600",
            "transition": "all 0.1s ease-in-out",
            "border-radius": "6px"
        });

        $btn.on("mousedown", function() {
            $(this).css({
                "transform": "translateY(2px)",
                "box-shadow": "0 1px 2px rgba(0,0,0,0.2)",
                "border-bottom": "1px solid #004647"
            });
        }).on("mouseup mouseleave", function() {
            $(this).css({
                "transform": "translateY(0px)",
                "box-shadow": "0 3px 5px rgba(0,0,0,0.2)",
                "border-bottom": "3px solid #004647"
            });
        });
    },

    async branch(frm) {
        if (frm.doc.branch) {
            // 1. Fetch Zone & Branch Opening Date
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Sahayog Branch",
                    filters: { name: frm.doc.branch },
                    fieldname: ["zone", "branch_opening_date"]
                },
                callback: function (r) {
                    if (r.message) {
                        frm.set_value("zone", r.message.zone || "");
                        frm.set_value("branch_opening_date", r.message.branch_opening_date || "");
                    }
                }
            });

            // 2. Fetch Regional Operations Manager
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Employee",
                    filters: [
                        ["sahayog_branch", "=", frm.doc.branch],
                        ["designation", "like", "%Regional Operation Manager%"],
                        ["status", "=", "Active"]
                    ],
                    fields: ["employee_name"],
                    limit: 1
                },
                callback: function (r) {
                    let name = (r.message && r.message.length > 0) ? r.message[0].employee_name : "";
                    frm.set_value("regional_operations_manager", name);
                }
            });

            // 3. Fetch Cluster Operations Manager
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Employee",
                    filters: [
                        ["sahayog_branch", "=", frm.doc.branch],
                        ["designation", "like", "%CLUSTER OPERATION MANAGER%"],
                        ["status", "=", "Active"]
                    ],
                    fields: ["employee_name"],
                    limit: 1
                },
                callback: function (r) {
                    let name = (r.message && r.message.length > 0) ? r.message[0].employee_name : "";
                    frm.set_value("cluster_operations_manager", name);
                }
            });

            // 4. Fetch Regional / Zonal Head
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Employee",
                    filters: [
                        ["sahayog_branch", "=", frm.doc.branch],
                        ["designation", "like", "%Regional Head%"],
                        ["status", "=", "Active"]
                    ],
                    fields: ["employee_name"],
                    limit: 1
                },
                callback: function (r) {
                    let name = (r.message && r.message.length > 0) ? r.message[0].employee_name : "";
                    frm.set_value("regional__zonal_head", name);
                }
            });

            // 5. Fetch CH/DH/ADH (Priority: Cluster Head -> District Head -> Asst. District Head)
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Employee",
                    filters: [
                        ["sahayog_branch", "=", frm.doc.branch],
                        ["status", "=", "Active"],
                        ["designation", "in", [
                            "Cluster Head", 
                            "DISTRICT HEAD", 
                            "Assistant District Head", 
                            "ASST. DISTRICT HEAD"
                        ]]
                    ],
                    fields: ["employee_name", "designation"]
                },
                callback: function (r) {
                    let name = "";
                    if (r.message && r.message.length > 0) {
                        // Priority order array
                        let priorities = [
                            "Cluster Head", 
                            "DISTRICT HEAD", 
                            "Assistant District Head", 
                            "ASST. DISTRICT HEAD"
                        ];

                        // Priority ke hisab se exact match dhoondo
                        for (let p of priorities) {
                            let found = r.message.find(e => e.designation && e.designation.toLowerCase() === p.toLowerCase());
                            if (found) {
                                name = found.employee_name;
                                break;
                            }
                        }
                    }
                    frm.set_value("ch_dh_adh", name);
                }
            });

            setTimeout(() => {
                frm.trigger("fetch_and_render_all");
            }, 500);

        } else {
            frm.set_value("zone", "");
            frm.set_value("branch_opening_date", "");
            frm.set_value("cluster_operations_manager", "");
            frm.set_value("regional_operations_manager", "");
            frm.set_value("regional__zonal_head", "");
            frm.set_value("ch_dh_adh", "");
            frm.trigger("fetch_and_render_all");
        }
    },

    month(frm) {
        frm.trigger("fetch_and_render_all");
    },

    year(frm) {
        frm.trigger("fetch_and_render_all");
    },

    ensure_empty_grids_visible(frm) {
        const table_configs = [
            { fieldname: 'table_cxyy', label: 'Scorecard Items', cols: ['Function', 'Parameter', 'Weightage', 'Scoring Methodology', 'Data Source', 'Score Obtained'] }
        ];

        table_configs.forEach(config => {
            let field = frm.get_field(config.fieldname);
            if (!field || !field.$wrapper) return;

            field.$wrapper.removeClass('hide hidden').show();
            if (field.parent) $(field.parent).removeClass('hide hidden').show();

            let rows = frm.doc[config.fieldname] || [];

            field.$wrapper.find('.custom-read-only-grid').remove();

            if (field.grid) {
                field.grid.cannot_add_rows = true;
                field.grid.only_sortable = false;

                if (rows.length === 0) {
                    field.$wrapper.find('.form-grid').hide();

                    let headers_html = config.cols.map(col => `<th style="padding: 8px 12px; border: 1px solid #d1d8dd; background: #f8f9fa; color: #555; font-weight: 600;">${col}</th>`).join('');

                    let custom_empty_table = `
                        <div class="custom-read-only-grid" style="margin-bottom: 15px;">
                            <table class="table table-bordered" style="width: 100%; border-collapse: collapse; background: #fff; font-size: 12px; border: 1px solid #d1d8dd;">
                                <thead>
                                    <tr>${headers_html}</tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colspan="${config.cols.length}" style="text-align: center; padding: 18px; color: #8d99a6; background-color: #ffffff; font-weight: 500;">
                                            No Data
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    `;

                    field.$wrapper.append(custom_empty_table);
                } else {
                    field.$wrapper.find('.form-grid').show();
                }
            }
        });
    },

    apply_grid_column_styles(frm) {
        if (!document.getElementById("score-table-custom-style")) {
            const style = document.createElement("style");
            style.id = "score-table-custom-style";
            style.innerHTML = `
                div[data-fieldname="table_cxyy"] .form-grid {
                    overflow-x: auto !important;
                }
                div[data-fieldname="table_cxyy"] .grid-static-col {
                    white-space: normal !important;
                    word-break: break-word !important;
                }
                div[data-fieldname="table_cxyy"] .grid-static-col[data-fieldname="scoring_rule"] {
                    min-width: 250px !important;
                    font-size: 11px !important;
                    line-height: 1.4 !important;
                }
                div[data-fieldname="table_cxyy"] .grid-static-col[data-fieldname="function"] {
                    min-width: 180px !important;
                }
                div[data-fieldname="table_cxyy"] .grid-static-col[data-fieldname="parameter"] {
                    min-width: 180px !important;
                }
            `;
            document.head.appendChild(style);
        }
    },

    fetch_and_render_all(frm) {
        if (!frm.doc.branch || !frm.doc.month || !frm.doc.year) {
            frm.trigger("render_widget");
            frm.trigger("ensure_empty_grids_visible");
            return;
        }

        frappe.call({
            method: "sahayog.branch_score_card.doctype.branch_score_card.branch_score_card.fetch_score_card_data",
            args: {
                branch: frm.doc.branch,
                month: frm.doc.month,
                year: frm.doc.year
            },
            callback: function (r) {
                if (r.message) {
                    let temp_doc = r.message;

                    // Direct silent assignment so form doesn't become dirty / "Not Saved"
                    frm.doc.branch_name = temp_doc.branch_name;
                    frm.refresh_field("branch_name");

                    frm.doc.table_cxyy = [];
                    (temp_doc.table_cxyy || []).forEach(row => {
                        if (row.function && row.parameter) {
                            frm.doc.table_cxyy.push({
                                docstatus: 0,
                                doctype: "Branch Score Card Item",
                                function: row.function,
                                parameter: row.parameter,
                                weightage: row.weightage,
                                data_source: row.data_source,
                                scoring_rule: row.scoring_rule,
                                scoring_methodology: row.scoring_methodology,
                                score_obtain: row.score_obtain
                            });
                        }
                    });
                    frm.refresh_field("table_cxyy");

                    // Explicitly remove "Not Saved" state if existing document
                    if (!frm.is_new()) {
                        frm.dirty(false);
                    }

                    frm.trigger("render_widget");
                    frm.trigger("ensure_empty_grids_visible");
                }
            },
            error: function () {
                frm.doc.table_cxyy = [];
                frm.refresh_field("table_cxyy");
                if (!frm.is_new()) {
                    frm.dirty(false);
                }
                frm.trigger("render_widget");
                frm.trigger("ensure_empty_grids_visible");
            }
        });
    },

    render_widget(frm) {
        let field = frm.get_field("branch_score_widget");
        if (!field || !field.$wrapper) return;

        let wrapper = field.$wrapper;

        let month = frappe.utils.escape_html((frm.doc.month || "").toUpperCase());
        let year = frappe.utils.escape_html(String(frm.doc.year || ""));
        let sol_id = frappe.utils.escape_html(frm.doc.branch || "-");
        let branch_name = frappe.utils.escape_html(frm.doc.branch_name || "-");
        let zone = frappe.utils.escape_html(frm.doc.zone || "-");
        let branch_opening_date = frm.doc.branch_opening_date ? frappe.datetime.str_to_user(frm.doc.branch_opening_date) : "-";
        let reg_mgr = frappe.utils.escape_html(frm.doc.regional_operations_manager || "-");
        let cluster_mgr = frappe.utils.escape_html(frm.doc.cluster_operations_manager || "-");
        let reg_zonal_head = frappe.utils.escape_html(frm.doc.regional__zonal_head || "-");
        let ch_dh_adh = frappe.utils.escape_html(frm.doc.ch_dh_adh || "-");

        frappe.db.get_single_value("Website Settings", "favicon").then(favicon => {
            let logo_html = favicon
                ? `<img src="${favicon}" class="bsc-logo" />`
                : `<span class="bsc-logo-fallback">S</span>`;

            let items = frm.doc.table_cxyy || [];
            let rows_html = "";

            if (items.length === 0) {
                rows_html = `
                    <tr>
                        <td colspan="6" style="text-align:center; padding:15px; color:#666; background:#fff;">
                            No scorecard details are available yet. Please select a Branch, Month, and Year to load the report.
                        </td>
                    </tr>`;
            } else {
                let grouped = {};

                items.forEach(row => {
                    let fn = row.function || "General Operations";
                    if (!grouped[fn]) grouped[fn] = [];
                    grouped[fn].push(row);
                });

                for (let fn in grouped) {
                    let group_rows = grouped[fn];
                    let rowspan = group_rows.length;

                    group_rows.forEach((row, index) => {
                        let bg_class = (index % 2 === 0) ? "bsc-light-grey" : "bsc-light-blue";

                        let score_display = "";
                        let val_str = (row.score_obtain !== null && row.score_obtain !== undefined) ? String(row.score_obtain).trim() : "";
                        
                        if (val_str !== "") {
                            score_display = frappe.utils.escape_html(val_str);
                        }

                        rows_html += `<tr>`;

                        if (index === 0) {
                            rows_html += `
                                <td rowspan="${rowspan}" class="bsc-function-cell">
                                    ${frappe.utils.escape_html(fn)}
                                </td>`;
                        }

                        rows_html += `
                            <td class="${bg_class} bsc-parameter-cell">${frappe.utils.escape_html(row.parameter || "")}</td>
                            <td class="${bg_class} bsc-weightage-cell">${row.weightage || 0}</td>
                            <td class="${bg_class} bsc-methodology-cell">${frappe.utils.escape_html(row.scoring_rule || row.scoring_methodology || "")}</td>
                            <td class="${bg_class} bsc-source-cell">${frappe.utils.escape_html(row.data_source || "")}</td>
                            <td class="${bg_class} bsc-score-cell">${score_display}</td>
                        </tr>`;
                    });
                }
            }

            let html = `
                <style>
                    .bsc-widget {
                        font-family: Arial, sans-serif;
                        border-collapse: collapse;
                        width: 100%;
                        font-size: 12px;
                        margin-top: 15px;
                        color: black;
                        border: 2px solid #000;
                        table-layout: fixed;
                    }
                    .bsc-widget th, .bsc-widget td {
                        border: 2px solid #000;
                        padding: 6px 5px;
                        vertical-align: middle;
                    }
                    .bsc-header-row {
                        background-color: #016362 !important;
                        color: white !important;
                        font-weight: bold;
                        font-size: 18px;
                        text-align: center !important;
                        height: 48px;
                        padding: 5px !important;
                    }
                    .bsc-header-content {
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        gap: 12px;
                    }
                    .bsc-logo {
                        height: 35px;
                        width: 35px;
                        object-fit: contain;
                        vertical-align: middle;
                        flex-shrink: 0;
                    }
                    .bsc-logo-fallback {
                        font-size: 27px;
                        background: white;
                        color: #016362;
                        border-radius: 50%;
                        width: 35px;
                        height: 35px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-family: serif;
                        flex-shrink: 0;
                    }
                    .bsc-company-name {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        white-space: nowrap;
                    }
                    .bsc-title-row {
                        background-color: #F8B195 !important;
                        font-weight: bold;
                        font-size: 15px;
                        text-align: center !important;
                        vertical-align: middle;
                        height: 35px;
                    }
                    .bsc-yellow-cell {
                        background-color: #FFFF00 !important;
                        font-weight: bold;
                        text-align: center !important;
                        vertical-align: middle !important;
                    }
                    .bsc-white-cell {
                        background-color: #FFFFFF !important;
                        font-weight: bold;
                        text-align: center !important;
                        vertical-align: middle !important;
                    }
                    .bsc-column-headers td {
                        background-color: #F8B195 !important;
                        font-weight: bold;
                        text-align: center !important;
                        vertical-align: middle !important;
                        line-height: 1.2;
                        height: 38px;
                    }
                    .bsc-function-cell {
                        background-color: #016362 !important;
                        color: white !important;
                        font-weight: bold;
                        text-align: center !important;
                        vertical-align: middle !important;
                        line-height: 1.3;
                    }
                    .bsc-parameter-cell {
                        font-weight: bold;
                        text-align: left !important;
                        vertical-align: middle !important;
                    }
                    .bsc-weightage-cell {
                        text-align: center !important;
                        vertical-align: middle !important;
                    }
                    .bsc-methodology-cell {
                        text-align: left !important;
                        vertical-align: middle !important;
                        line-height: 1.3;
                    }
                    .bsc-source-cell {
                        text-align: center !important;
                        vertical-align: middle !important;
                    }
                    .bsc-score-cell {
                        text-align: center !important;
                        vertical-align: middle !important;
                        font-weight: bold;
                        white-space: nowrap;
                    }
                    .bsc-light-grey {
                        background-color: #EAEAEA !important;
                    }
                    .bsc-light-blue {
                        background-color: #D9E1F2 !important;
                    }
                </style>

                <table class="bsc-widget">
                    <colgroup>
                        <col style="width:15%;">
                        <col style="width:25%;">
                        <col style="width:10%;">
                        <col style="width:25%;">
                        <col style="width:12%;">
                        <col style="width:13%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <td colspan="6" class="bsc-header-row">
                                <div class="bsc-header-content">
                                    ${logo_html}
                                    <span class="bsc-company-name">
                                        SAHAYOG MULTISTATE CREDIT CO-OPERATIVE SOCIETY LTD
                                    </span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="6" class="bsc-title-row">
                                BRANCH HEALTH SCORECARD FOR THE MONTH OF ${month} ${year}
                            </td>
                        </tr>
                        <tr>
                            <td class="bsc-yellow-cell">SOL ID</td>
                            <td class="bsc-white-cell">${sol_id}</td>
                            <td class="bsc-yellow-cell">Branch Name</td>
                            <td class="bsc-white-cell" colspan="3">${branch_name}</td>
                        </tr>
                        <tr>
                            <td class="bsc-yellow-cell">Zone</td>
                            <td class="bsc-white-cell">${zone}</td>
                            <td class="bsc-yellow-cell">Branch Opening Date</td>
                            <td class="bsc-white-cell" colspan="3">${branch_opening_date}</td>
                        </tr>

                        <tr>
                            <td class="bsc-yellow-cell">Regional Operations Manager</td>
                            <td class="bsc-white-cell">${reg_mgr}</td>
                            <td class="bsc-yellow-cell">Cluster Operations Manager</td>
                            <td class="bsc-white-cell" colspan="3">${cluster_mgr}</td>
                        </tr>
                        
                        <tr>
                            <td class="bsc-yellow-cell">Regional / Zonal Head</td>
                            <td class="bsc-white-cell">${reg_zonal_head}</td>
                            <td class="bsc-yellow-cell">CH/DH/ADH</td>
                            <td class="bsc-white-cell" colspan="3">${ch_dh_adh}</td>
                        </tr>
                        
                        <tr class="bsc-column-headers">
                            <td>Functions</td>
                            <td>Parameter</td>
                            <td>Weightage</td>
                            <td>Scoring Methodology</td>
                            <td>Data Source</td>
                            <td>Score Obtained</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows_html}
                    </tbody>
                </table>
            `;

            wrapper.empty().html(html);
        });
    }
});