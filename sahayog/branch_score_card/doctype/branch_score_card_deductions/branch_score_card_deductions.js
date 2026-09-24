// Copyright (c) 2026, Sahayog and contributors
// For license information, please see license.txt

frappe.ui.form.on("Branch Score Card Deductions", {
    refresh(frm) {
        // Inject Custom CSS Styles matching your application's design system (#0d5c75 theme)
        frappe.dom.set_style(`
            .form-grid {
                border: 1px solid #cbd5e1 !important;
                border-radius: 8px !important;
                overflow: hidden !important;
                box-shadow: none !important;
            }

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

            .grid-body .grid-row:nth-child(odd) {
                background-color: #ffffff !important;
            }

            .grid-body .grid-row:nth-child(even) {
                background-color: #f8fafc !important;
            }

            .grid-body .grid-row:hover {
                background-color: #f1f5f9 !important;
            }

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

            .form-control[disabled], 
            .form-control[readonly],
            .control-value {
                background-color: #f1f5f9 !important;
                border-color: #cbd5e1 !important;
                color: #475569 !important;
            }
        `);
    }
});

// -----------------------------------------------------------
// Child Table Logic for Overdue Account Opening Deviations
// -----------------------------------------------------------
frappe.ui.form.on("Overdue Account Opening Deviations", {
    date_of_deviation(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);
        if (row.date_of_deviation) {
            let parsed_date = moment(row.date_of_deviation, 'YYYY-MM-DD');
            let year_val = parsed_date.format('YYYY');
            let month_val = parsed_date.format('MMMM'); // Month ka full name (jaise August)
            
            // Auto-populate Month field in the child table row
            frappe.model.set_value(cdt, cdn, 'month', month_val);
            
            // Auto-populate parent year if empty based on entered date
            if (!frm.doc.year && year_val) {
                frm.set_value('year', year_val);
            }
        }
    }
});

// -----------------------------------------------------------
// List View Settings & Upload Dialog with Success Popup
// -----------------------------------------------------------
frappe.listview_settings['Branch Score Card Deductions'] = {
    onload(listview) {
        listview.page.add_inner_button(__("Upload Kyc Deviation"), function() {
            let d = new frappe.ui.Dialog({
                title: __('Upload KYC Deviation Excel'),
                fields: [
                    {
                        label: __('Excel File'),
                        fieldname: 'file_url',
                        fieldtype: 'Attach',
                        reqd: 1
                    },
                    {
                        fieldname: 'help_html',
                        fieldtype: 'HTML',
                        options: `<div class="text-muted small mb-2">
                            <a href="/api/method/sahayog.branch_score_card.doctype.branch_score_card_deductions.branch_score_card_deductions.download_kyc_deviation_template" target="_blank">
                                📥 Download Excel Template
                            </a>
                        </div>`
                    }
                ],
                primary_action_label: __('Upload & Process'),
                primary_action(values) {
                    d.hide();
                    frappe.call({
                        method: "sahayog.branch_score_card.doctype.branch_score_card_deductions.branch_score_card_deductions.process_kyc_deviation_excel",
                        args: {
                            file_url: values.file_url
                        },
                        freeze: true,
                        freeze_message: __("Processing Excel File..."),
                        callback: function(r) {
                            if (r.message && r.message.status === "success") {
                                // Centered success popup dialog box with created/updated record counts
                                frappe.msgprint({
                                    title: __('Success'),
                                    indicator: 'green',
                                    message: r.message.message
                                });
                                
                                // Instant List View Refresh
                                listview.refresh();
                            }
                        }
                    });
                }
            });
            d.show();
        });
    }
};