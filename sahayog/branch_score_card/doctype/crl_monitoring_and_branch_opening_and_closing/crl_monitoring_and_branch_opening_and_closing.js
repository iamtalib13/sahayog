frappe.ui.form.on("CRL Monitoring and Branch Opening and Closing", {
    refresh(frm) {
        setup_resync_button(frm);
        apply_custom_grid_theme(frm);
        check_and_show_sync_warning(frm);
        handle_score_fields_visibility(frm);
        highlight_delay_rows(frm);

        setTimeout(() => {
            let field_wrapper = frm.get_field('sol_id').$wrapper;
            field_wrapper.find('a').css({
                'pointer-events': 'none',
                'cursor': 'default',
                'text-decoration': 'none',
                'color': 'inherit'
            });
            field_wrapper.find('a').attr('href', 'javascript:void(0);');
        }, 300);
    },

    // Child table form render hone ya grid render hone par dynamic highlighting trigger
    table_nzzy_on_form_rendered(frm) {
        highlight_delay_rows(frm);
    },

    month(frm) {
        auto_set_month_dates(frm);
    },
    year(frm) {
        auto_set_month_dates(frm);
    },

    from_date(frm) {
        validate_date_range(frm, 'from_date');
    },
    to_date(frm) {
        validate_date_range(frm, 'to_date');
    },
    before_save(frm) {
        if (!validate_date_range(frm)) {
            frappe.validated = false;
        }
    },
    
    // Child table me row add hone par trigger
    table_nzzy_add(frm) {
        handle_score_fields_visibility(frm);
    },
    // Child table me row remove/delete hone par trigger
    table_nzzy_remove(frm) {
        handle_score_fields_visibility(frm);
    }
});

// Helper Function: Soft Red Highlight for Delay / Violation Cells
function highlight_delay_rows(frm) {
    let grid_field = Object.values(frm.fields_dict).find(f => f.df && f.df.fieldtype === 'Table');
    if (!grid_field || !grid_field.grid) return;

    let grid = grid_field.grid;
    let crl_limit = flt(frm.doc.br_cash_retention_limit_crl || 0);

    grid.grid_rows.forEach(row => {
        let d = row.doc;
        if (!d || !d.date || d.sync_status === "No Record in Finacle") return;

        let $row = $(row.row);
        let date_obj = moment(d.date);

        // Sunday Skip (0 = Sunday in Moment.js)
        if (date_obj.day() === 0) return;

        // Reset previous custom styles before re-applying
        $row.find('[data-fieldname="eod_closing_balance"], [data-fieldname="branch_opening_time"], [data-fieldname="branch_closing_time"]').css({
            "background-color": "",
            "color": "",
            "font-weight": "",
            "border-radius": ""
        });

        // 1. EOD Closing Balance > CRL Limit
        if (crl_limit > 0 && d.eod_closing_balance !== null && flt(d.eod_closing_balance) > crl_limit) {
            $row.find('[data-fieldname="eod_closing_balance"]').css({
                "background-color": "#fee2e2",
                "color": "#991b1b",
                "font-weight": "600",
                "border-radius": "4px"
            });
        }

        // 2. Opening Delay (> 10:00:00 AM)
        if (d.branch_opening_time) {
            let open_time = moment(d.branch_opening_time, ["HH:mm:ss", "HH:mm"]);
            let limit_time = moment("10:00:00", "HH:mm:ss");

            if (open_time.isAfter(limit_time)) {
                $row.find('[data-fieldname="branch_opening_time"]').css({
                    "background-color": "#fee2e2",
                    "color": "#991b1b",
                    "font-weight": "600",
                    "border-radius": "4px"
                });
            }
        }

        // 3. Closing Delay (Sat > 16:30:00, Mon-Fri > 18:00:00)
        if (d.branch_closing_time) {
            let close_time = moment(d.branch_closing_time, ["HH:mm:ss", "HH:mm"]);
            let is_saturday = date_obj.day() === 6; // Moment.js me 6 = Saturday
            let limit_time = is_saturday ? moment("16:30:00", "HH:mm:ss") : moment("18:00:00", "HH:mm:ss");

            if (close_time.isAfter(limit_time)) {
                $row.find('[data-fieldname="branch_closing_time"]').css({
                    "background-color": "#fee2e2",
                    "color": "#991b1b",
                    "font-weight": "600",
                    "border-radius": "4px"
                });
            }
        }
    });
}

// Helper Function: Score Fields Visibility & Blank Logic
function handle_score_fields_visibility(frm) {
    let score_fields = [
        'crl_monitoring_actual_value',
        'branch_opening_actual_value',
        'branch_closing_actual_value'
    ];

    // Fields ko JS level se Read-Only lock rakhein
    score_fields.forEach(field => {
        frm.set_df_property(field, 'read_only', 1);
    });

    // Dynamically check child table length
    let child_rows = frm.doc.table_nzzy || [];

    // CONDITION: Agar child table empty hai, to values ko "0" set karein (Blank / null nahi)
    if (child_rows.length === 0) {
        score_fields.forEach(field => {
            if (frm.doc[field] !== "0" && frm.doc[field] !== 0) {
                frm.set_value(field, "0");
            }
        });
    }
}

// Dynamic Sync Warning Checker (Purely Informational Alert Banner)
function check_and_show_sync_warning(frm) {
    if (frm.is_new()) return;

    // Remove existing alert banner if any
    $('#doc-sync-alert-banner').remove();

    let sync_issues = [];

    // Get child table rows dynamically
    let grid_field = Object.values(frm.fields_dict).find(f => f.df && f.df.fieldtype === 'Table');
    let child_rows = grid_field && frm.doc[grid_field.df.fieldname] ? frm.doc[grid_field.df.fieldname] : [];

    child_rows.forEach(row => {
        let status = (row.sync_status || "").trim().toLowerCase();
        let date_obj = moment(row.date);

        // Sunday Skip Condition (0 = Sunday)
        if (date_obj.day() === 0) return;

        // ALERT LOGIC: Trigger ONLY IF status is blank (Cron did not run) OR explicitly Failed
        let is_cron_missing = !status;
        let is_failed = (status === "fail" || status === "failed");

        if (is_cron_missing || is_failed) {
            let formatted_date = row.date ? frappe.datetime.str_to_user(row.date) : "N/A";
            let log_msg = is_cron_missing 
                ? "Cron Job did not run / Entry Missing" 
                : (row.sync_log || "Status: Fail");
            
            sync_issues.push({
                idx: row.idx,
                name: row.name,
                date: formatted_date,
                log: log_msg
            });
        }
    });

    // Render Clean Alert Banner
    if (sync_issues.length > 0) {
        let details_html = `<ul style="margin-top: 8px; margin-bottom: 0; padding-left: 18px; font-size: 12px; line-height: 1.6;">`;
        
        sync_issues.forEach(item => {
            details_html += `<li><b>${item.date}</b> — ${item.log}</li>`;
        });
        details_html += `</ul>`;

        let alert_html = `
            <div id="doc-sync-alert-banner" class="alert alert-danger" style="margin: 15px 0px; padding: 12px 18px; border-radius: 8px; background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 13px;">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <i class="fa fa-exclamation-triangle" style="font-size: 18px; margin-top: 2px; color: #dc2626;"></i>
                    <div style="flex-grow: 1;">
                        <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #7f1d1d;">
                            Attention: Sync Issues Detected for SOL ${frm.doc.sol_id || ''}!
                        </div>
                        <div style="line-height: 1.6;">
                            Total <b>${sync_issues.length}</b> entry(ies) found with missing cron execution or failure:
                        </div>
                        ${details_html}
                    </div>
                </div>
            </div>
        `;

        $(frm.page.wrapper).find('.page-content').prepend(alert_html);
    }
}

// Grid jab render ya refresh ho tab search bars inject honge
frappe.ui.form.on("CRL Monitoring and Branch Opening and Closing", {
    onload_post_render(frm) {
        inject_column_search_bars(frm);
    }
});

function inject_column_search_bars(frm) {
    // Dynamically find child table field
    let grid_field = Object.values(frm.fields_dict).find(f => f.df && f.df.fieldtype === 'Table');
    if (!grid_field || !grid_field.grid) return;

    let grid = grid_field.grid;
    let $wrapper = $(grid.wrapper);

    // Continuous observation until grid DOM renders
    let interval = setInterval(() => {
        let $header = $wrapper.find('.grid-heading-row');
        if ($header.length > 0) {
            clearInterval(interval);
            build_search_row(grid, $wrapper, $header);
        }
    }, 200);
}

function build_search_row(grid, $wrapper, $header) {
    if ($wrapper.find('.custom-grid-search-row').length > 0) return;

    let $search_row = $('<div class="grid-heading-row custom-grid-search-row" style="background-color: #f0f4f8; border-bottom: 2px solid #cbd5e1; display: flex;"></div>');

    $header.find('.grid-row-check, .col, .row-index').each(function () {
        let $col = $(this);
        let fieldname = $col.attr('data-fieldname');
        let width = $col.outerWidth();

        let $search_col = $(`<div style="width: ${width}px; padding: 4px 5px; box-sizing: border-box; display: flex; align-items: center;"></div>`);

        if (fieldname) {
            // OVAL & 3D STYLED SEARCH INPUT
            let $input = $(`
                <input type="text" 
                       class="form-control input-xs custom-col-filter" 
                       data-fieldname="${fieldname}" 
                       placeholder="Search..." 
                       style="
                           height: 26px; 
                           font-size: 11px; 
                           padding: 2px 10px; 
                           border: 1.5px solid #006768; 
                           border-radius: 15px; 
                           color: #006768; 
                           background: #ffffff; 
                           box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.25), 0px 2px 4px rgba(0, 103, 104, 0.2); 
                           outline: none;
                           transition: all 0.2s ease-in-out;
                       "
                       onfocus="this.style.boxShadow='inset 1px 1px 2px rgba(0,0,0,0.3), 0px 0px 6px rgba(0, 103, 104, 0.6)'; this.style.borderColor='#006768';"
                       onblur="this.style.boxShadow='inset 1px 1px 3px rgba(0, 0, 0, 0.25), 0px 2px 4px rgba(0, 103, 104, 0.2)';"
                >
            `);
            $filter_col = $search_col.append($input);
        }

        $search_row.append($search_col);
    });

    $header.after($search_row);

    // Filter Logic
    $wrapper.on('input keyup change', 'input.custom-col-filter', function () {
        let $this = $(this);
        let fieldname = $this.attr('data-fieldname');
        let val = $this.val();

        // Dynamically identify field definition from grid meta
        let df = grid.docfields ? grid.docfields.find(f => f.fieldname === fieldname) : null;
        let fieldtype = df ? df.fieldtype : '';

        // Restricted Input Rules
        let is_time_or_date = ['Date', 'Datetime', 'Time'].includes(fieldtype) || fieldname.includes('time') || fieldname.includes('date');

        if (['Int', 'Float', 'Currency', 'Percent'].includes(fieldtype)) {
            // ONLY NUMBERS & DECIMAL ALLOWED
            let clean_val = val.replace(/[^0-9.]/g, '');
            if (val !== clean_val) $this.val(clean_val);
        } else if (is_time_or_date) {
            // ONLY NUMBERS, COLONS (:), HYPHENS (-) & SLASHES (/) ALLOWED FOR DATES & TIME
            let clean_val = val.replace(/[^0-9:\-\/]/g, '');
            if (val !== clean_val) $this.val(clean_val);
        } else if (['Data', 'Select', 'Text', 'Small Text', 'Link'].includes(fieldtype) && fieldname !== 'sol_id') {
            // ONLY ALPHABETS & SPACES ALLOWED FOR TEXT FIELDS
            let clean_val = val.replace(/[^a-zA-Z\s]/g, '');
            if (val !== clean_val) $this.val(clean_val);
        }
        let filters = {};
        $wrapper.find('input.custom-col-filter').each(function () {
            let v = $(this).val().toLowerCase().trim();
            let fn = $(this).attr('data-fieldname');
            if (v) filters[fn] = v;
        });

        $wrapper.find('.grid-body .grid-row').each(function () {
            let $row = $(this);
            let doc_name = $row.attr('data-name');
            let row_doc = grid.data.find(d => d.name === doc_name);

            if (!row_doc) return;

            let show = true;
            for (let fn in filters) {
                let val = String(row_doc[fn] || '').toLowerCase();
                if (!val.includes(filters[fn])) {
                    show = false;
                    break;
                }
            }

            if (show) {
                $row.removeClass('hidden');
            } else {
                $row.addClass('hidden');
            }
        });
    });
}

// Helper Function 1: Auto Set Month Dates
function auto_set_month_dates(frm) {
    if (frm.doc.month && frm.doc.year) {
        let month_idx = moment().month(frm.doc.month).format("MM");
        let start_date = moment(`${frm.doc.year}-${month_idx}-01`, "YYYY-MM-DD").format("YYYY-MM-DD");
        
        let end_of_month = moment(start_date).endOf('month');
        let yesterday = moment().subtract(1, 'days');
        let end_date = end_of_month.isAfter(yesterday) ? yesterday.format("YYYY-MM-DD") : end_of_month.format("YYYY-MM-DD");

        frm.set_value('from_date', start_date);
        frm.set_value('to_date', end_date);
    }
}

// Helper Function 2: Re-Sync Button Handler
function setup_resync_button(frm) {
    if (frm.fields_dict.re_sync && frm.fields_dict.re_sync.$input) {
        frm.fields_dict.re_sync.$input
            .off("click")
            .on("click", function () {
                if (!frm.doc.from_date || !frm.doc.to_date) {
                    frappe.msgprint(__("Please select both From Date and To Date."));
                    return;
                }
                if (!frm.doc.sol_id) {
                    frappe.msgprint(__("SOL ID is required."));
                    return;
                }
                if (!validate_date_range(frm)) return;

                frappe.confirm(
                    __("Are you sure you want to Re-Sync Finacle data for SOL <b>{0}</b> from <b>{1}</b> to <b>{2}</b>?", [frm.doc.sol_id, frm.doc.from_date, frm.doc.to_date]),
                    function () { execute_manual_resync(frm); },
                    function () { frappe.show_alert({ message: __('Re-Sync Cancelled'), indicator: 'info' }); }
                );
            });
    }
}

function execute_manual_resync(frm) {
    frappe.call({
        method: "sahayog.branch_score_card.doctype.crl_monitoring_and_branch_opening_and_closing.crl_monitoring_and_branch_opening_and_closing.manual_resync_branch",
        args: {
            docname: frm.doc.name,
            from_date: frm.doc.from_date,
            to_date: frm.doc.to_date
        },
        freeze: true,
        freeze_message: __("Verifying & synchronizing with Finacle..."),
        callback: function (r) {
            if (r.exc) return;
            let data = r.message;
            if (!data) return;

            frappe.msgprint({
                title: __(data.status || "Sync Result"),
                message: __(data.message || "Operation completed."),
                indicator: data.indicator || "green"
            });

            frm.reload_doc();
        }
    });
}

// Helper Function 3: Date Validation
function validate_date_range(frm, triggered_field = null) {
    let doc_month = frm.doc.month;
    let doc_year = frm.doc.year;
    let today = moment().startOf('day');

    if (frm.doc.from_date) {
        let f_date = moment(frm.doc.from_date);
        if (f_date.isSameOrAfter(today)) {
            frappe.msgprint(__('<b>From Date</b> cannot be today or a future date.'));
            frm.set_value('from_date', '');
            return false;
        }
    }

    if (frm.doc.to_date) {
        let t_date = moment(frm.doc.to_date);
        if (t_date.isSameOrAfter(today)) {
            frappe.msgprint(__('<b>To Date</b> cannot be today or a future date.'));
            frm.set_value('to_date', '');
            return false;
        }
    }

    if (frm.doc.from_date && frm.doc.to_date) {
        let from_date = moment(frm.doc.from_date);
        let to_date = moment(frm.doc.to_date);

        if (to_date.isBefore(from_date)) {
            frappe.msgprint(__('<b>To Date</b> must be greater than or equal to <b>From Date</b>.'));
            frm.set_value('to_date', '');
            return false;
        }
    }
    return true;
}

function apply_custom_grid_theme(frm) {
    let style = `
        <style>
            .form-layout .control-label {
                color: #4a5568 !important;
                font-weight: 500 !important;
                font-size: 12px !important;
                letter-spacing: 0.2px !important;
            }

            .form-layout .form-control,
            .form-layout .like-disabled-input {
                border: 1px solid #d0e3e3 !important;
                border-radius: 8px !important;
                color: #2d3748 !important;
                background-color: #fcfdfe !important;
                box-shadow: none !important;
                padding: 6px 12px !important;
                font-weight: 400 !important;
                transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
            }

            .form-layout .form-control:focus,
            .form-layout .form-control:hover {
                border-color: #5ba4a4 !important;
                background-color: #ffffff !important;
                box-shadow: 0 0 0 3px rgba(91, 164, 164, 0.12) !important;
            }

            .form-layout .like-disabled-input {
                background-color: #f7fafc !important;
                border-color: #e2e8f0 !important;
            }

            .grid-heading-row {
                background-color: #3b7a7a !important;
                border-radius: 6px 6px 0 0 !important;
                --text-muted: #ffffff !important;
                --text-color: #ffffff !important;
            }

            .grid-heading-row .col,
            .grid-heading-row .col *,
            .grid-heading-row .static-area,
            .grid-heading-row .static-area *,
            .grid-heading-row .col-title,
            .grid-heading-row .row-index {
                color: #ffffff !important;
                fill: #ffffff !important;
                font-weight: 600 !important;
                opacity: 1 !important;
            }

            .custom-grid-search-row {
                background-color: #f7fafc !important;
                border-bottom: 1px solid #e2e8f0 !important;
            }

            .custom-col-filter {
                height: 26px !important;
                font-size: 11px !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 6px !important;
                background-color: #ffffff !important;
                color: #334155 !important;
                box-shadow: none !important;
            }

            .custom-col-filter:focus {
                border-color: #5ba4a4 !important;
                box-shadow: 0 0 0 2px rgba(91, 164, 164, 0.15) !important;
            }

            .grid-body .grid-row:nth-child(odd) {
                background-color: #ffffff !important;
                color: #334155 !important;
            }

            .grid-body .grid-row:nth-child(even) {
                background-color: #f8fafc !important;
                color: #334155 !important;
            }

            .grid-body .grid-row:hover {
                background-color: #f1f5f9 !important;
            }

            [data-fieldname="re_sync"] button {
                background-color: #3b7a7a !important;
                color: #ffffff !important;
                border-radius: 8px !important;
                border: none !important;
                font-weight: 500 !important;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                padding: 6px 18px !important;
            }

            [data-fieldname="re_sync"] button:hover {
                background-color: #2c5e5e !important;
            }
        </style>
    `;

    if ($('#custom-grid-theme-style').length === 0) {
        $('<div id="custom-grid-theme-style"></div>').html(style).appendTo('head');
    }
}