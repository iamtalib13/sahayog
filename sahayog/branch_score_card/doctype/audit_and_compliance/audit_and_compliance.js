frappe.ui.form.on("Audit and Compliance", {
    onload(frm) {
        // Grid cell Custom Formatter to visually override 'delay_in_closure' display
        if (frm.fields_dict['audit_closure_table']?.grid) {
            frm.fields_dict['audit_closure_table'].grid.add_custom_formatter('delay_in_closure', function(value, doc) {
                if (!doc.recived_date && (!value || value === "0" || value === 0)) {
                    return `<span style="color: #6c757d;">Awaiting Receipt Date</span>`;
                }
                return value;
            });
        }

        // Grid cell Custom Formatter for COM Visit Compliance
        if (frm.fields_dict['com_visit_compliance']?.grid) {
            frm.fields_dict['com_visit_compliance'].grid.add_custom_formatter('turnaround_time_days', function(value, doc) {
                if (!doc.date_of_closure && (!value || value === "0" || value === 0)) {
                    return `<span style="color: #6c757d;">Awaiting date of closure</span>`;
                }
                return value;
            });
        }
    },

    refresh(frm) {
        // Inject Custom CSS Styles
        frappe.dom.set_style(`
            /* Outer Grid Container with Curved Boundary */
            .form-grid {
                border: 1px solid #cbd5e1 !important;
                border-radius: 8px !important;
                overflow: hidden !important;
                box-shadow: none !important;
            }

            /* Table Header Styling with Dark Teal Theme (#0d5c75) */
            .grid-heading-row {
                background-color: #0d5c75 !important;
                border-bottom: 1px solid #0d5c75 !important;
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
            }

            /* Disabled / Read-Only Fields Soft Look */
            .form-control[disabled], 
            .form-control[readonly],
            .control-value {
                background-color: #f1f5f9 !important;
                border-color: #cbd5e1 !important;
                color: #475569 !important;
            }
        `);

        // 1. Audit Closure Table - Set default for blank rows
        (frm.doc.audit_closure_table || []).forEach(row => {
            if (!row.recived_date && (!row.delay_in_closure || row.delay_in_closure === "0" || row.delay_in_closure === 0)) {
                frappe.model.set_value(row.doctype, row.name, "delay_in_closure", "Awaiting Receipt Date");
            }
        });

        // 2. COM Visit Compliance Table - Set default for blank rows
        (frm.doc.com_visit_compliance || []).forEach(row => {
            if (!row.date_of_closure && (!row.turnaround_time_days || row.turnaround_time_days === "0" || row.turnaround_time_days === 0)) {
                frappe.model.set_value(row.doctype, row.name, "turnaround_time_days", "Awaiting date of closure");
                frappe.model.set_value(row.doctype, row.name, "status", "Pending");
            }
        });

        // Refresh Grids
        if (frm.fields_dict['audit_closure_table']?.grid) {
            frm.fields_dict['audit_closure_table'].grid.refresh();
        }
        if (frm.fields_dict['com_visit_compliance']?.grid) {
            frm.fields_dict['com_visit_compliance'].grid.refresh();
        }

        highlight_status_rows(frm);
    },

    audit_score_table_on_form_rendered: frm => highlight_status_rows(frm),
    audit_closure_table_on_form_rendered: frm => highlight_status_rows(frm),
    com_visit_compliance_on_form_rendered: frm => highlight_status_rows(frm)
});

// -----------------------------------------------------------
// 1. Audit Score Item Validations & Logic
// -----------------------------------------------------------
frappe.ui.form.on("Audit Score Item", {
    audit_completed_date(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);

        if (row.audit_start_date && row.audit_completed_date) {
            if (frappe.datetime.get_diff(row.audit_completed_date, row.audit_start_date) < 0) {
                frappe.msgprint(__('<b>Audit Completed Date</b> cannot be earlier than <b>Audit Start Date</b>. Please enter a valid date.'));
                frappe.model.set_value(cdt, cdn, 'audit_completed_date', '');
                frappe.model.set_value(cdt, cdn, 'audit_status', 'Pending');
                highlight_status_rows(frm);
                return;
            }
        }

        frappe.model.set_value(cdt, cdn, "audit_status", row.audit_completed_date ? "Completed" : "Pending");
        highlight_status_rows(frm);
    }
});

// -----------------------------------------------------------
// 2. Audit Closure Delay Item Validations & Logic
// -----------------------------------------------------------
frappe.ui.form.on("Audit Closure Delay Item", {
    form_render(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);
        if (!row.recived_date) {
            frappe.model.set_value(cdt, cdn, "delay_in_closure", "Awaiting Receipt Date");
            frm.refresh_field("audit_closure_table");
        }
    },

    audit_closure_table_add(frm, cdt, cdn) {
        frappe.model.set_value(cdt, cdn, "delay_in_closure", "Awaiting Receipt Date");
        frm.refresh_field("audit_closure_table");
    },

    recived_date(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);

        if (row.report_published_date && row.recived_date) {
            if (frappe.datetime.get_diff(row.recived_date, row.report_published_date) < 0) {
                frappe.msgprint(__('<b>Received Date</b> cannot be earlier than <b>Report Published Date</b>. Please enter a valid date.'));
                
                frappe.model.set_value(cdt, cdn, 'recived_date', '');
                frappe.model.set_value(cdt, cdn, 'compliance_report', 'Pending');
                frappe.model.set_value(cdt, cdn, 'delay_in_closure', 'Awaiting Receipt Date');
                
                frm.fields_dict['audit_closure_table']?.grid.refresh();
                highlight_status_rows(frm);
                return;
            }
        }

        let hasDate = !!row.recived_date;
        frappe.model.set_value(cdt, cdn, "compliance_report", hasDate ? "Received" : "Pending");
        
        let delay_val = (hasDate && row.report_published_date) 
            ? String(frappe.datetime.get_diff(row.recived_date, row.report_published_date)) 
            : "Awaiting Receipt Date";

        frappe.model.set_value(cdt, cdn, "delay_in_closure", delay_val);
        frm.fields_dict['audit_closure_table']?.grid.refresh();

        highlight_status_rows(frm);
    },

    report_published_date(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);
        if (row.recived_date) {
            frappe.ui.form.trigger("Audit Closure Delay Item", "recived_date", frm, cdt, cdn);
        } else {
            frappe.model.set_value(cdt, cdn, "delay_in_closure", "Awaiting Receipt Date");
            frm.fields_dict['audit_closure_table']?.grid.refresh();
        }
    }
});

// -----------------------------------------------------------
// COM Visit Compliance Item Validations & Logic
// -----------------------------------------------------------
frappe.ui.form.on("COM Visit Compliance Item", {
    form_render(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);
        if (!row.date_of_closure) {
            frappe.model.set_value(cdt, cdn, "turnaround_time_days", "Awaiting date of closure");
            frappe.model.set_value(cdt, cdn, "status", "Pending");
            frm.refresh_field("com_visit_compliance");
        }
    },

    com_visit_compliance_add(frm, cdt, cdn) {
        frappe.model.set_value(cdt, cdn, "turnaround_time_days", "Awaiting date of closure");
        frappe.model.set_value(cdt, cdn, "status", "Pending");
        frm.refresh_field("com_visit_compliance");
    },

    date_of_closure(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);

        // Date of closure removed/cleared
        if (!row.date_of_closure) {
            frappe.model.set_value(cdt, cdn, "status", "Pending");
            frappe.model.set_value(cdt, cdn, "turnaround_time_days", "Awaiting date of closure");
            frm.fields_dict['com_visit_compliance']?.grid.refresh();
            highlight_status_rows(frm);
            return;
        }

        // Validation: Date of closure < Date of publish
        if (row.date_of_publish && row.date_of_closure) {
            if (frappe.datetime.get_diff(row.date_of_closure, row.date_of_publish) < 0) {
                frappe.msgprint(__('<b>Date of Closure</b> cannot be earlier than <b>Date of Publish</b>. Please enter a valid date.'));
                
                frappe.model.set_value(cdt, cdn, 'date_of_closure', '');
                frappe.model.set_value(cdt, cdn, 'status', 'Pending');
                frappe.model.set_value(cdt, cdn, 'turnaround_time_days', 'Awaiting date of closure');
                
                frm.fields_dict['com_visit_compliance']?.grid.refresh();
                highlight_status_rows(frm);
                return;
            }
        }

        let hasDate = !!row.date_of_closure;
        frappe.model.set_value(cdt, cdn, "status", hasDate ? "Completed" : "Pending");
        
        let tat_val = (hasDate && row.date_of_publish) 
            ? String(frappe.datetime.get_diff(row.date_of_closure, row.date_of_publish)) 
            : "Awaiting date of closure";

        frappe.model.set_value(cdt, cdn, "turnaround_time_days", tat_val);
        frm.fields_dict['com_visit_compliance']?.grid.refresh();

        highlight_status_rows(frm);
    },

    date_of_publish(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);
        if (row.date_of_closure) {
            frappe.ui.form.trigger("COM Visit Compliance Item", "date_of_closure", frm, cdt, cdn);
        } else {
            frappe.model.set_value(cdt, cdn, "turnaround_time_days", "Awaiting date of closure");
            frappe.model.set_value(cdt, cdn, "status", "Pending");
            frm.fields_dict['com_visit_compliance']?.grid.refresh();
        }
    }
});

// -----------------------------------------------------------
// 3. UI Status Highlighting Function
// -----------------------------------------------------------
function highlight_status_rows(frm) {
    const config = [
        { field: 'audit_score_table', target: 'audit_status', successVal: 'Completed' },
        { field: 'audit_closure_table', target: 'compliance_report', successVal: 'Received' },
        { field: 'com_visit_compliance', target: 'status', successVal: 'Completed' }
    ];

    config.forEach(({ field, target, successVal }) => {
        const grid = frm.fields_dict[field]?.grid;
        if (!grid) return;

        grid.grid_rows.forEach(row => {
            if (!row.doc) return;
            const value = row.doc[target];
            const $cell = $(row.row).find(`[data-fieldname="${target}"]`);

            const isSuccess = value === successVal;
            const isPending = value === "Pending";

            $cell.css({
                "background-color": isSuccess ? "#e6f4ea" : isPending ? "#fce8e6" : "",
                "color": isSuccess ? "#137333" : isPending ? "#c5221f" : "",
                "font-weight": (isSuccess || isPending) ? "600" : "",
                "border-radius": (isSuccess || isPending) ? "4px" : ""
            });
        });
    });
}