frappe.ui.form.on('Miscellaneous', {
    refresh(frm) {

    setTimeout(() => {
    frm.get_field('sol_id')?.$wrapper.find('a')
        .removeAttr('href')
        .css({ 'pointer-events': 'none', 'cursor': 'default', 'color': 'inherit', 'text-decoration': 'none' })
        .on('click', e => e.preventDefault());
}, 300);

        // 1. ADD UPLOAD EXCEL BUTTON IN ACTIONS / FORM HEADER
        if (!frm.is_new()) {
            frm.add_custom_button(__('Upload Account Opening Error Excel'), function () {
                let type_name = 'Account Opening Error';
                let d = new frappe.ui.Dialog({
                    title: __('Upload Account Opening Error Excel'),
                    fields: [
                        {
                            label: __('Select Excel File'),
                            fieldname: 'excel_file',
                            fieldtype: 'Attach',
                            reqd: 1,
                            description: __('Note: Only .xlsx or .xls files are allowed.')
                        },
                        {
                            fieldtype: 'HTML',
                            fieldname: 'format_info',
                            options: `
                                <div style="margin-top: 5px; padding: 10px; background-color: #f4f8f8; border-left: 3px solid #006768; border-radius: 4px; font-size: 12px; color: #333; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <b>Required Excel Columns for Account Opening Error:</b><br>
                                        <span style="color: #555;">BRANCH CODE ( SOL ID ), A/C Opening Date</span>
                                    </div>
                                    <div>
                                        <button class="btn btn-xs btn-default btn-download-template" style="color: #006768; font-weight: 600; text-decoration: none;">
                                            <i class="fa fa-download"></i> Download Template
                                        </button>
                                    </div>
                                </div>
                            `
                        }
                    ],
                    primary_action_label: __('Process File'),
                    primary_action(values) {
                        d.hide();

                        function process_account_error_file(file_url, is_confirmed) {
                            frappe.call({
                                method: 'sahayog.branch_score_card.doctype.miscellaneous.miscellaneous.process_miscellaneous_excel',
                                args: {
                                    file_url: file_url,
                                    type_name: type_name,
                                    confirm: is_confirmed,
                                    docname: frm.doc.name
                                },
                                freeze: true,
                                freeze_message: is_confirmed ? __('Applying Account Opening Error changes...') : __('Analyzing Excel File...'),
                                callback: function (r) {
                                    if (r.message) {
                                        if (r.message.status === "no_change") {
                                            frappe.msgprint({
                                                title: __('No Updates Required'),
                                                indicator: 'orange',
                                                message: __(r.message.message)
                                            });
                                        } else if (r.message.status === "requires_confirmation") {
                                            frappe.confirm(
                                                `<b>The following Account Opening Error changes will be applied:</b><br><br>
                                                 <div style="max-height: 250px; overflow-y: auto; background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #e2e8f0;">
                                                    ${r.message.summary_html}
                                                 </div><br>
                                                 <b>Are you sure you want to apply these changes?</b>`,
                                                function () {
                                                    process_account_error_file(file_url, true);
                                                },
                                                function () {
                                                    frappe.show_alert({ message: __('Upload cancelled by user.'), indicator: 'info' });
                                                }
                                            );
                                        } else if (r.message.status === "success") {
                                            frappe.show_alert({ 
                                                message: __('Account Opening Error excel processed successfully!'), 
                                                indicator: 'green' 
                                            });
                                            frm.reload_doc();
                                        }
                                    }
                                }
                            });
                        }

                        process_account_error_file(values.excel_file, false);
                    }
                });

                d.show();

                // Download Template Handler
                d.$wrapper.find('.btn-download-template').on('click', function() {
                    window.location.href = `/api/method/sahayog.branch_score_card.doctype.miscellaneous.miscellaneous.download_miscellaneous_template?type_name=${encodeURIComponent(type_name)}`;
                });
            }, __('Actions'));
        }

        // 2. STYLING INJECTION FOR ALIGNMENT AND LOOK
        if (!$('#force-miscellaneous-show-style').length) {
            $('head').append(`
                <style id="force-miscellaneous-show-style">
                /* Table Wrapper Visibility Fix */
                [data-fieldname="account_opening_error"],
                [data-fieldname="bank_reconciliation_discrepancy"] {
                    display: block !important;
                    visibility: visible !important;
                }

                .form-grid {
                    border: 1px solid #cbd5e1 !important;
                    border-radius: 8px !important;
                    overflow: hidden !important;
                    box-shadow: none !important;
                }

                /* Native Header Styling (Flex Overrides Removed to Fix Gear Icon & Columns Alignment) */
                .grid-heading-row {
                    background-color: #2a7e78 !important;
                    border-bottom: 1px solid #2a7e78 !important;
                    border-top-left-radius: 7px !important;
                    border-top-right-radius: 7px !important;
                }

                .grid-heading-row .col,
                .grid-heading-row .static-area,
                .grid-heading-row .col-title {
                    color: #ffffff !important;
                    fill: #ffffff !important;
                    font-weight: 600 !important;
                    font-size: 12px !important;
                }

                .grid-heading-row .configure-columns .icon,
                .grid-heading-row .configure-columns use,
                .grid-heading-row .configure-columns svg {
                    fill: #ffffff !important;
                    color: #ffffff !important;
                }

                /* Clean Empty Row State */
                .grid-empty {
                    display: block !important;
                    text-align: center !important;
                    padding: 15px !important;
                    color: #64748b !important;
                    font-weight: 500 !important;
                    background: #ffffff !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                }

                /* Grid Row Alignment & Filtering */
                .grid-filter-row input,
                .grid-row .col input,
                .grid-heading-row .grid-row-filter input,
                .grid-row-filter input {
                    text-align: left !important;
                }

                .grid-body .grid-row {
                    border: none !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                }

                .grid-body .grid-row .col {
                    border-right: 1px solid #e2e8f0 !important;
                    border-bottom: none !important;
                    box-shadow: none !important;
                }

                .grid-body .grid-row:nth-child(odd) { background-color: #ffffff !important; }
                .grid-body .grid-row:nth-child(even) { background-color: #f8fafc !important; }
                .grid-body .grid-row:hover { background-color: #f1f5f9 !important; }

                /* Inputs and Controls */
                .form-control, 
                .input-with-feedback,
                .frappe-control input, 
                .frappe-control select, 
                .frappe-control textarea,
                .control-input .like-disabled-input {
                    background-color: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 8px !important;
                    color: #334155 !important;
                    padding: 6px 12px !important;
                    box-shadow: none !important;
                }

                .form-control:focus, 
                .frappe-control input:focus {
                    background-color: #ffffff !important;
                    border-color: #2a7e78 !important;
                    box-shadow: 0 0 0 2px rgba(42, 126, 120, 0.15) !important;
                }

                .form-control[disabled], 
                .form-control[readonly],
                .control-value {
                    background-color: #f1f5f9 !important;
                    border-color: #cbd5e1 !important;
                    color: #475569 !important;
                }
            </style>
            `);
        }

        // 3. READ-ONLY VISIBILITY FOR COUNTS
        const readonly_fields = [
            'account_opening_error_count', 
            'reconciliation_discrepancy_count'
        ];

        setTimeout(() => {
            readonly_fields.forEach(fieldname => {
                let field = frm.get_field(fieldname);
                if (field && field.$wrapper) {
                    field.$wrapper.show().removeClass('hidden');
                    field.$wrapper.find('input').attr('readonly', true).css({
                        'background-color': '#f1f5f9',
                        'cursor': 'not-allowed',
                        'pointer-events': 'none'
                    });
                }
            });
        }, 200);

        // 4. CALCULATE TOTALS
        frm.trigger('calculate_miscellaneous_totals');

        // 5. SETUP CHILD TABLES (ALLOW VISIBILITY FOR EMPTY TABLES & LOCK EDITING)
        ['account_opening_error', 'bank_reconciliation_discrepancy'].forEach(fieldname => {
            let field = frm.get_field(fieldname);
            if (field) {
                field.df.read_only = 1;
                field.df.hidden = 0;

                if (field.section && field.section.wrapper) {
                    field.section.wrapper.show().removeClass('hidden hidden-section');
                }

                if (field.$wrapper) {
                    field.$wrapper.show().removeClass('hidden');
                }

                if (field.grid) {
                    field.grid.cannot_add_rows = true;
                    field.grid.only_sortable();
                    
                    // Native empty state trigger karne ke liye static flag set karein
                    field.grid.static_rows = true;
                    field.grid.refresh();

                    if (field.grid.wrapper) {
                        field.grid.wrapper.show();
                        field.grid.wrapper.find('.grid-add-row, .grid-remove-rows, .grid-append-row, .grid-edit-row, .edit-grid-row').hide();

                        let row_count = (frm.doc[fieldname] || []).length;
                        let $grid_body = field.grid.wrapper.find('.grid-body');

                        if (row_count === 0) {
                            if ($grid_body.find('.grid-empty').length === 0) {
                                $grid_body.append(`
                                    <div class="grid-empty text-center text-muted p-3">
                                        No Data
                                    </div>
                                `);
                            }
                        } else {
                            $grid_body.find('.grid-empty').remove();
                        }

                        field.grid.wrapper.off('click dblclick', '.grid-row');
                        field.grid.wrapper.on('click dblclick', '.grid-row', function(e) {
                            if ($(e.target).is('select, option, input, textarea')) return;
                            e.stopPropagation();
                            e.preventDefault();
                            return false;
                        });
                    }
                }
            }
        });

    },

    calculate_miscellaneous_totals(frm) {
        let account_error_rows = frm.doc.account_opening_error || [];
        let total_account_errors = 0;

        account_error_rows.forEach(row => {
            total_account_errors += flt(row.error_count);
        });

        let reco_rows = frm.doc.bank_reconciliation_discrepancy || [];
        let total_reco_errors = 0;

        reco_rows.forEach(row => {
            total_reco_errors += flt(row.error_count);
        });

        frm.set_value('account_opening_error_count', total_account_errors, null, true);
        frm.set_value('reconciliation_discrepancy_count', total_reco_errors, null, true);
    }
});

// NATIVE KEYBOARD CAPTURE FOR ALPHABET RESTRICTION ON GRID FILTERS
document.addEventListener('keydown', function (e) {
    let target = e.target;
    if (target && target.tagName === 'INPUT' && 
       (target.closest('.grid-filter-row') || target.closest('.grid-row-filter') || target.closest('.grid-heading-row'))) {
        
        let key = e.key;
        if (['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(key) || 
            e.ctrlKey || e.metaKey || e.altKey) {
            return true;
        }

        if (!/^[0-9\-\/]$/.test(key)) {
            e.stopImmediatePropagation();
            e.preventDefault();
            return false;
        }
    }
}, true);

document.addEventListener('input', function (e) {
    let target = e.target;
    if (target && target.tagName === 'INPUT' && 
       (target.closest('.grid-filter-row') || target.closest('.grid-row-filter') || target.closest('.grid-heading-row'))) {
        
        target.style.textAlign = 'left';
        let val = target.value;
        let clean = val.replace(/[^0-9\-\/]/g, '');
        if (val !== clean) {
            target.value = clean;
            target.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}, true);

// CHILD TABLE HANDLERS
frappe.ui.form.on('Account Opening Error Item', {
    error_count(frm) { 
        frm.trigger('calculate_miscellaneous_totals'); 
    },
    account_opening_error_add(frm) {
        frm.trigger('calculate_miscellaneous_totals');
        frm.save();
    },
    account_opening_error_remove(frm) {
        frm.trigger('calculate_miscellaneous_totals');
        frm.save();
    }
});

frappe.ui.form.on('Bank Reconciliation Item', {
    error_count(frm) { 
        frm.trigger('calculate_miscellaneous_totals'); 
    },
    bank_reconciliation_discrepancy_add(frm) {
        frm.trigger('calculate_miscellaneous_totals');
        frm.save();
    },
    bank_reconciliation_discrepancy_remove(frm) {
        frm.trigger('calculate_miscellaneous_totals');
        frm.save();
    }
});