frappe.ui.form.on('Account Opening Operations', {
    refresh(frm) {

        // Save button ko completely hide/disable karne ke liye
        frm.disable_save();
        frm.set_read_only();

        setTimeout(() => {
            let sol_field = frm.get_field('sol_id');
            if (sol_field && sol_field.$wrapper) {
                // Link tag ke click behavior aur redirection href ko disable karein
                sol_field.$wrapper.find('a').removeAttr('href').css({
                    'pointer-events': 'none',
                    'cursor': 'default',
                    'text-decoration': 'none',
                    'color': 'inherit'
                });

                // Extra safety: Click event kill karne ke liye
                sol_field.$wrapper.off('click', 'a').on('click', 'a', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });
            }
        }, 300);

        // 1. CLEAN & RIGID CSS INJECTION FOR FIXED ALIGNMENT
        if (!$('#force-table-show-style').length) {
            $('head').append(`
                <style id="force-table-show-style">
                    [data-fieldname="section_break_hgdr"],
                    [data-fieldname="table_zero_ip_funding"],
                    [data-fieldname="section_break_iwri"],
                    [data-fieldname="table_dllf"] {
                        display: block !important;
                        visibility: visible !important;
                    }

                    /* Outer Grid Container with Proper Curved Boundary */
                    .form-grid {
                        border: 1px solid #cbd5e1 !important;
                        border-radius: 8px !important;
                        overflow: hidden !important;
                        box-shadow: none !important;
                    }

                    /* Table Header Styling with Curved Top Corners */
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

                    /* Search Bar Wrapper */
                    .custom-search-filter-bar {
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        justify-content: flex-start !important;
                        background-color: #ffffff !important;
                        padding: 4px 0 !important;
                        border-bottom: 1px solid #e2e8f0 !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                    }

                    .custom-search-filter-bar .search-cell-wrap {
                        display: flex !important;
                        justify-content: center !important;
                        align-items: center !important;
                        padding: 0 4px !important;
                        box-sizing: border-box !important;
                    }

                    /* Flat Search Inputs */
                    .custom-grid-search {
                        width: 100% !important;
                        height: 24px !important;
                        padding: 2px 8px !important;
                        font-size: 11px !important;
                        border-radius: 12px !important;
                        border: 1px solid #cbd5e1 !important;
                        background-color: #ffffff !important;
                        color: #334155 !important;
                        outline: none !important;
                        box-shadow: none !important;
                        text-align: left !important;
                    }

                    .custom-grid-search:focus {
                        border-color: #2a7e78 !important;
                        box-shadow: none !important;
                    }

                    .custom-grid-search::placeholder {
                        color: #a0aec0 !important;
                        text-align: left !important;
                    }

                    /* Rows Structure */
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

                    /* Alternate Row Background Colors */
                    .grid-body .grid-row:nth-child(odd) {
                        background-color: #ffffff !important;
                    }

                    .grid-body .grid-row:nth-child(even) {
                        background-color: #f8fafc !important;
                    }

                    .grid-body .grid-row:hover {
                        background-color: #f1f5f9 !important;
                    }

                    .grid-body:empty + .grid-empty,
                    .grid-body:empty ~ .grid-footer .grid-empty { display: block !important; }

                    /* Form Fields Soft Styling */
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
                        transition: all 0.2s ease-in-out !important;
                    }

                    /* Focus State */
                    .form-control:focus, 
                    .frappe-control input:focus {
                        background-color: #ffffff !important;
                        border-color: #2a7e78 !important;
                        box-shadow: 0 0 0 2px rgba(42, 126, 120, 0.15) !important;
                    }

                    /* Disabled / Read-Only Fields Soft Look */
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
        
        // READ-ONLY VISIBILITY FIX
        const readonly_fields = [
            'total_ftr', 
            'total_ftnr', 
            'grand_total', 
            'ftr_percentage', 
            'ftnr_percentage', 
            'zero_ip_funding_count'
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

        // Calculations
        frm.trigger('calculate_ftr_ftnr_totals');
        frm.trigger('calculate_zero_ip_total');

        // Setup Tables
        ['table_dllf', 'table_zero_ip_funding'].forEach(fieldname => {
            let field = frm.get_field(fieldname);
            if (field) {
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
                    field.grid.refresh();
                    
                    if (field.grid.wrapper) {
                        field.grid.wrapper.show();
                        field.grid.wrapper.find('.grid-add-row, .grid-remove-rows, .grid-append-row, .grid-edit-row, .edit-grid-row').hide();

                        let row_count = (frm.doc[fieldname] || []).length;
                        if (row_count > 0) {
                            field.grid.wrapper.find('.grid-empty, .no-data').hide();
                        } else {
                            field.grid.wrapper.find('.grid-empty, .no-data').show();
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

        frm.trigger('render_table_search_inputs');
        frm.trigger('bind_zero_ip_grid_render');
        frm.trigger('render_scheme_dropdowns');
    },

    render_table_search_inputs(frm) {
        ['table_dllf', 'table_zero_ip_funding'].forEach(fieldname => {
            let field = frm.get_field(fieldname);
            if (!field || !field.grid || !field.grid.wrapper) return;

            let header_row = field.grid.wrapper.find('.grid-heading-row');
            if (!header_row.length) return;

            field.grid.wrapper.find('.custom-search-filter-bar').remove();

            let search_row = $('<div class="custom-search-filter-bar"></div>');

            header_row.find('.grid-row .col, .grid-heading-row > .col').each(function() {
                let col = $(this);
                let col_fieldname = col.attr('data-fieldname');
                let col_width = col.outerWidth() || col.width();

                let search_cell = $(`<div class="search-cell-wrap" style="width: ${col_width}px; flex-shrink: 0; text-align: left;"></div>`);

                if (col_fieldname && col_fieldname !== 'idx' && !col.hasClass('col-0')) {
                    search_cell.append(`
                        <input type="text" 
                               class="custom-grid-search" 
                               placeholder="Search..." 
                               data-filter-field="${col_fieldname}">
                    `);
                }

                search_row.append(search_cell);
            });

            header_row.after(search_row);

            field.grid.wrapper.off('input keyup change', '.custom-grid-search');
            field.grid.wrapper.on('input keyup change', '.custom-grid-search', function() {
                let val = $(this).val();
                let clean_val = val.replace(/[^0-9\-\/]/g, '');
                if (val !== clean_val) {
                    $(this).val(clean_val);
                }

                let active_filters = [];
                field.grid.wrapper.find('.custom-grid-search').each(function() {
                    let search_val = $(this).val().trim().toLowerCase();
                    let fname = $(this).attr('data-filter-field');
                    if (search_val && fname) {
                        active_filters.push({ fieldname: fname, value: search_val });
                    }
                });

                let visible_count = 0;

                field.grid.wrapper.find('.grid-body .grid-row').each(function() {
                    let row = $(this);
                    let docname = row.attr('data-name');
                    let row_doc = (frm.doc[fieldname] || []).find(d => d.name === docname);
                    let match = true;

                    active_filters.forEach(filter => {
                        let cell_text = "";
                        
                        let cell = row.find(`[data-fieldname="${filter.fieldname}"]`);
                        if (cell.length) {
                            cell_text = cell.text().trim();
                        }

                        let doc_val = String((row_doc && row_doc[filter.fieldname]) || '').trim();
                        if (/^\d{4}-\d{2}-\d{2}$/.test(doc_val)) {
                            let parts = doc_val.split('-');
                            doc_val = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }

                        let combined_text = (cell_text + " " + doc_val).toLowerCase();

                        if (!combined_text.includes(filter.value)) {
                            match = false;
                        }
                    });

                    if (match) {
                        row.removeClass('hidden').css('display', '');
                        visible_count++;
                    } else {
                        row.addClass('hidden').css('display', 'none');
                    }
                });

                if (visible_count === 0 && active_filters.length > 0) {
                    field.grid.wrapper.find('.grid-empty, .no-data').show();
                } else if ((frm.doc[fieldname] || []).length > 0) {
                    field.grid.wrapper.find('.grid-empty, .no-data').hide();
                }
            });
        });
    },

    onload_post_render(frm) {
        frm.trigger('render_scheme_dropdowns');
        frm.trigger('render_table_search_inputs');
    },

    bind_zero_ip_grid_render(frm) {
        let field = frm.get_field('table_zero_ip_funding');
        if (!field || !field.grid) return;

        if (field.grid.wrapper) {
            field.grid.wrapper.off('grid-render');
            field.grid.wrapper.on('grid-render', function() {
                frm.trigger('render_scheme_dropdowns');
                frm.trigger('render_table_search_inputs');
            });
        }
    },

    render_scheme_dropdowns(frm) {
        let field = frm.get_field('table_zero_ip_funding');
        if (!field || !field.grid) return;

        setTimeout(() => {
            field.grid.wrapper.find('.grid-body .grid-row').each(function() {
                let row = $(this);
                let docname = row.attr('data-name');
                let row_doc = (frm.doc.table_zero_ip_funding || []).find(d => d.name === docname);

                if (row_doc) {
                    let options_list = [];
                    if (row_doc.scheme_code_options) {
                        try {
                            options_list = JSON.parse(row_doc.scheme_code_options);
                        } catch (e) {
                            options_list = String(row_doc.scheme_code_options)
                                .split(/[\n|]/)
                                .map(opt => opt.trim())
                                .filter(opt => opt.length > 0);
                        }
                    }

                    if (options_list.length === 0 && row_doc.scheme_code) {
                        options_list = [row_doc.scheme_code];
                    }

                    if (options_list.length > 0) {
                        let select_html = `<select class="form-control input-sm custom-scheme-dropdown" data-docname="${docname}" style="height: 26px; padding: 2px 4px; font-size: 12px; border-radius: 4px; background-color: #ffffff; border: 1px solid #d1d8dd; color: #111; width: 100%;">`;
                        
                        options_list.forEach((opt, idx) => {
                            let is_selected = (row_doc.scheme_code && row_doc.scheme_code === opt) || (!row_doc.scheme_code && idx === 0);
                            let selected = is_selected ? 'selected' : '';
                            select_html += `<option value="${frappe.utils.escape_html(opt)}" ${selected}>${frappe.utils.escape_html(opt)}</option>`;
                        });
                        select_html += `</select>`;

                        let cell = row.find('.grid-static-col[data-fieldname="scheme_code"]');
                        if (cell.length) {
                            cell.empty().html(select_html);
                        }
                    }
                }
            });

            field.grid.wrapper.off('change', '.custom-scheme-dropdown');
            field.grid.wrapper.on('change', '.custom-scheme-dropdown', function(e) {
                let selected_val = $(this).val();
                let docname = $(this).attr('data-docname');
                let row_doc = (frm.doc.table_zero_ip_funding || []).find(d => d.name === docname);

                if (row_doc && row_doc.scheme_code !== selected_val) {
                    row_doc.scheme_code = selected_val;
                }
            });

        }, 150);
    },

    calculate_ftr_ftnr_totals(frm) {
        let ftnr_rows = frm.doc.table_dllf || [];
        let total_ftr = 0;
        let total_ftnr = 0;

        ftnr_rows.forEach(row => {
            total_ftr += flt(row.ftr);
            total_ftnr += flt(row.ftnr);
        });

        let grand_total = total_ftr + total_ftnr;
        let ftr_perc = grand_total > 0 ? flt((total_ftr / grand_total) * 100, 2) : 0;
        let ftnr_perc = grand_total > 0 ? flt((total_ftnr / grand_total) * 100, 2) : 0;

        frm.set_value('total_ftr', total_ftr, null, true);
        frm.set_value('total_ftnr', total_ftnr, null, true);
        frm.set_value('grand_total', grand_total, null, true);
        frm.set_value('ftr_percentage', ftr_perc, null, true);
        frm.set_value('ftnr_percentage', ftnr_perc, null, true);
    },

    calculate_zero_ip_total(frm) {
        let zero_ip_rows = frm.doc.table_zero_ip_funding || [];
        let total = 0;
        
        zero_ip_rows.forEach(row => {
            total += flt(row.zero_ip_funding);
        });

        frm.set_value('zero_ip_funding_count', total, null, true);
    }
});

// 1. CHILD TABLE HANDLER: Account Opening FTNR Item
frappe.ui.form.on('Account Opening FTNR Item', {
    ftr(frm) { 
        frm.trigger('calculate_ftr_ftnr_totals'); 
    },
    ftnr(frm) { 
        frm.trigger('calculate_ftr_ftnr_totals'); 
    },
    table_dllf_add(frm) {
        frm.trigger('calculate_ftr_ftnr_totals');
        frm.save(); // Auto-save on row addition
    },
    table_dllf_remove(frm) {
        frm.trigger('calculate_ftr_ftnr_totals');
        frm.save(); // Auto-save on row removal
    }
});

// 2. CHILD TABLE HANDLER: Zero IP Funding Tracker
frappe.ui.form.on('Zero IP Funding Tracker', {
    zero_ip_funding(frm) { 
        frm.trigger('calculate_zero_ip_total'); 
    },
    table_zero_ip_funding_add(frm) { 
        frm.trigger('calculate_zero_ip_total'); 
        frm.save(); // Auto-save on row addition
    },
    table_zero_ip_funding_remove(frm) { 
        frm.trigger('calculate_zero_ip_total'); 
        frm.save(); // Auto-save on row removal
    }
});