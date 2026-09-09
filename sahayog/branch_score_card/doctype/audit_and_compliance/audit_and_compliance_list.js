frappe.listview_settings['Audit and Compliance'] = {
    refresh: function(listview) {
        apply_excel_btn_custom_style(listview);
    },
    onload: function (listview) {

        // -----------------------------------------------------------
        // 1. Audit Score
        // -----------------------------------------------------------
        listview.page.add_inner_button(__('Audit Score'), function () {
            let d = new frappe.ui.Dialog({
                title: __('Upload Excel for Audit Score'),
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
                            <div>
                                <div>
                                    <b>Required Excel Columns for Audit Score:</b><br>
                                    <span>Branch Code, Audit Start Date, Audit Completed Date, Branch Score</span>
                                </div>
                                <button class="btn btn-xs btn-default btn-download-audit-score-template">
                                    <i class="fa fa-download"></i> Download Template
                                </button>
                            </div>
                        `
                    }
                ],
                primary_action_label: __('Process File'),
                primary_action(values) {
                    d.hide();
                    frappe.call({
                        method: 'sahayog.branch_score_card.doctype.audit_and_compliance.audit_and_compliance.process_audit_score_excel',
                        args: { file_url: values.excel_file },
                        freeze: true,
                        freeze_message: __('Processing Audit Score Excel...'),
                        callback: function (r) {
                            if (r.message && r.message.status === "success") {
                                frappe.msgprint({ title: __('Success'), indicator: 'green', message: r.message.message });
                                listview.refresh();
                            }
                        }
                    });
                }
            });

            d.show();

            d.$wrapper.find('.btn-download-audit-score-template').on('click', function (e) {
                e.preventDefault();
                window.open('/api/method/sahayog.branch_score_card.doctype.audit_and_compliance.audit_and_compliance.download_audit_score_template');
            });

        }, __('Excel Upload'));

        // -----------------------------------------------------------
        // 2. Audit Closure Delay
        // -----------------------------------------------------------
        listview.page.add_inner_button(__('Audit Closure Delay'), function () {
            let d = new frappe.ui.Dialog({
                title: __('Upload Excel for Audit Closure Delay'),
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
                            <div>
                                <div>
                                    <b>Required Excel Columns for Audit Closure Delay:</b><br>
                                    <span>Branch Code, Report Published Date, Received Date</span>
                                </div>
                                <button class="btn btn-xs btn-default btn-download-closure-template">
                                    <i class="fa fa-download"></i> Download Template
                                </button>
                            </div>
                        `
                    }
                ],
                primary_action_label: __('Process File'),
                primary_action(values) {
                    d.hide();
                    frappe.call({
                        method: 'sahayog.branch_score_card.doctype.audit_and_compliance.audit_and_compliance.process_audit_closure_excel',
                        args: { file_url: values.excel_file },
                        freeze: true,
                        freeze_message: __('Processing Audit Closure Excel...'),
                        callback: function (r) {
                            if (r.message && r.message.status === "success") {
                                frappe.msgprint({ title: __('Success'), indicator: 'green', message: r.message.message });
                                listview.refresh();
                            }
                        }
                    });
                }
            });

            d.show();

            d.$wrapper.find('.btn-download-closure-template').on('click', function (e) {
                e.preventDefault();
                window.open('/api/method/sahayog.branch_score_card.doctype.audit_and_compliance.audit_and_compliance.download_audit_closure_template');
            });

        }, __('Excel Upload'));

        // -----------------------------------------------------------
        // 3. Com Visit
        // -----------------------------------------------------------
        listview.page.add_inner_button(__('Com Visit'), function () {
            let d = new frappe.ui.Dialog({
                title: __('Upload Excel for Com Visit'),
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
                            <div>
                                <div>
                                    <b>Required Excel Columns for Com Visit:</b><br>
                                    <span>Branch Code, Date of Visit, Visit Score, Last Visit Score</span>
                                </div>
                                <button class="btn btn-xs btn-default btn-download-com-visit-template">
                                    <i class="fa fa-download"></i> Download Template
                                </button>
                            </div>
                        `
                    }
                ],
                primary_action_label: __('Process File'),
                primary_action(values) {
                    d.hide();
                    frappe.call({
                        method: 'sahayog.branch_score_card.doctype.audit_and_compliance.audit_and_compliance.process_com_visit_excel',
                        args: { file_url: values.excel_file },
                        freeze: true,
                        freeze_message: __('Processing Com Visit Excel...'),
                        callback: function (r) {
                            if (r.message && r.message.status === "success") {
                                frappe.msgprint({ title: __('Success'), indicator: 'green', message: r.message.message });
                                listview.refresh();
                            }
                        }
                    });
                }
            });

            d.show();

            d.$wrapper.find('.btn-download-com-visit-template').on('click', function (e) {
                e.preventDefault();
                window.open('/api/method/sahayog.branch_score_card.doctype.audit_and_compliance.audit_and_compliance.download_com_visit_template');
            });

        }, __('Excel Upload'));

        // -----------------------------------------------------------
        // 4. COM Visit Compliance
        // -----------------------------------------------------------
        listview.page.add_inner_button(__('COM Visit Compliance'), function () {
            let d = new frappe.ui.Dialog({
                title: __('Upload Excel for COM Visit Compliance'),
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
                            <div>
                                <div>
                                    <b>Required Excel Columns for COM Visit Compliance:</b><br>
                                    <span>Branch Code, Date of publish, Date of closure</span>
                                </div>
                                <button class="btn btn-xs btn-default btn-download-com-compliance-template">
                                    <i class="fa fa-download"></i> Download Template
                                </button>
                            </div>
                        `
                    }
                ],
                primary_action_label: __('Process File'),
                primary_action(values) {
                    d.hide();
                    frappe.call({
                        method: 'sahayog.branch_score_card.doctype.audit_and_compliance.audit_and_compliance.process_com_visit_compliance_excel',
                        args: { file_url: values.excel_file },
                        freeze: true,
                        freeze_message: __('Processing COM Visit Compliance Excel...'),
                        callback: function (r) {
                            if (r.message && r.message.status === "success") {
                                frappe.msgprint({ title: __('Success'), indicator: 'green', message: r.message.message });
                                listview.refresh();
                            }
                        }
                    });
                }
            });

            d.show();

            d.$wrapper.find('.btn-download-com-compliance-template').on('click', function (e) {
                e.preventDefault();
                window.open('/api/method/sahayog.branch_score_card.doctype.audit_and_compliance.audit_and_compliance.download_com_visit_compliance_template');
            });

        }, __('Excel Upload'));

    }
};

function apply_excel_btn_custom_style() {
    let style = `
        <style id="excel-btn-custom-style">
            /* Main Excel Upload Dropdown Button */
            .page-actions .btn-group .btn,
            .page-actions .inner-group-button .btn {
                background-color: #0d5c75 !important;
                color: #ffffff !important;
                border-color: #0d5c75 !important;
                border-radius: 6px !important;
                font-weight: 500 !important;
            }

            .page-actions .btn-group .btn:hover,
            .page-actions .inner-group-button .btn:hover {
                background-color: #084357 !important;
                border-color: #084357 !important;
            }

            .page-actions .btn-group .caret {
                border-top-color: #ffffff !important;
            }

            /* Dropdown Menu Options Styling */
            .page-actions .dropdown-menu .dropdown-item,
            .page-actions .dropdown-menu li a {
                color: #0d5c75 !important;
                font-weight: 600 !important;
            }

            .page-actions .dropdown-menu .dropdown-item:hover,
            .page-actions .dropdown-menu li a:hover {
                background-color: #e6f2f5 !important;
                color: #084357 !important;
            }

            /* Dialog Modal - Process File Primary Button */
            .modal-dialog .btn-primary,
            .modal-dialog button[data-btn-type="primary"] {
                background-color: #0d5c75 !important;
                border-color: #0d5c75 !important;
                color: #ffffff !important;
            }

            .modal-dialog .btn-primary:hover,
            .modal-dialog button[data-btn-type="primary"]:hover {
                background-color: #084357 !important;
                border-color: #084357 !important;
            }
        </style>
    `;

    if ($('#excel-btn-custom-style').length === 0) {
        $('head').append(style);
    }
}