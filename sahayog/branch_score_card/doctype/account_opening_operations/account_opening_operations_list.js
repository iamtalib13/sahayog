frappe.listview_settings['Account Opening Operations'] = {
    onload: function (listview) {

        // -----------------------------------------------------------
        // 1. ACTION: Upload Excel for FTR/FTNR
        // -----------------------------------------------------------
        listview.page.add_inner_button(__('Upload Excel for FTR/FTNR'), function () {
            let d = new frappe.ui.Dialog({
                title: __('Upload Account Opening Excel (FTR/FTNR)'),
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
                                    <b>Required Excel Columns for FTR/FTNR:</b><br>
                                    <span style="color: #555;">Sol ID, Date, Status</span>
                                </div>
                                <button class="btn btn-xs btn-default btn-download-ftr-template" style="margin-left: 10px; border-color: #006768; color: #006768;">
                                    <i class="fa fa-download"></i> Download Template
                                </button>
                            </div>
                        `
                    }
                ],
                primary_action_label: __('Process File'),
                primary_action(values) {
                    d.hide();

                    function process_ftr_file(file_url, is_confirmed) {
                        frappe.call({
                            method: 'sahayog.branch_score_card.doctype.account_opening_operations.account_opening_operations.process_consolidated_excel',
                            args: {
                                file_url: file_url,
                                confirm: is_confirmed
                            },
                            freeze: true,
                            freeze_message: is_confirmed ? __('Applying FTR/FTNR changes...') : __('Analyzing FTR/FTNR Excel...'),
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
                                            `<b>The following FTR/FTNR changes will be applied:</b><br><br>
                                             <div style="max-height: 250px; overflow-y: auto; background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #e2e8f0;">
                                                ${r.message.summary_html}
                                             </div><br>
                                             <b>Are you sure you want to apply these changes?</b>`,
                                            function () {
                                                process_ftr_file(file_url, true);
                                            },
                                            function () {
                                                frappe.show_alert({ message: __('Upload cancelled by user.'), indicator: 'info' });
                                            }
                                        );
                                    } else if (r.message.status === "success") {
                                        frappe.msgprint({
                                            title: __('Success'),
                                            indicator: 'green',
                                            message: __('<b>Successfully Updated Documents:</b><br>') + r.message.docs.join("<br>")
                                        });
                                        listview.refresh();
                                    }
                                }
                            }
                        });
                    }

                    process_ftr_file(values.excel_file, false);
                }
            });

            d.show();

            // Bind FTR/FTNR Template Download Event
            d.$wrapper.find('.btn-download-ftr-template').on('click', function (e) {
                e.preventDefault();
                window.open('/api/method/sahayog.branch_score_card.doctype.account_opening_operations.account_opening_operations.download_ftr_ftnr_template');
            });

        }, __('Actions'));

        // -----------------------------------------------------------
        // 2. ACTION: Upload Excel for Zero IP Funding
        // -----------------------------------------------------------
        listview.page.add_inner_button(__('Upload Excel for Zero IP Funding'), function () {
            let d = new frappe.ui.Dialog({
                title: __('Upload Zero IP Funding Excel'),
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
                                    <b>Required Excel Columns for Zero IP Funding:</b><br>
                                    <span style="color: #555;">SOL ID, A/C Opening Date, Scheme Code</span>
                                </div>
                                <button class="btn btn-xs btn-default btn-download-zero-ip-template" style="margin-left: 10px; border-color: #006768; color: #006768;">
                                    <i class="fa fa-download"></i> Download Template
                                </button>
                            </div>
                        `
                    }
                ],
                primary_action_label: __('Process File'),
                primary_action(values) {
                    d.hide();

                    function process_zero_ip_file(file_url, is_confirmed) {
                        frappe.call({
                            method: 'sahayog.branch_score_card.doctype.account_opening_operations.account_opening_operations.process_zero_ip_excel',
                            args: {
                                file_url: file_url,
                                confirm: is_confirmed
                            },
                            freeze: true,
                            freeze_message: is_confirmed ? __('Applying Zero IP Funding changes...') : __('Analyzing Zero IP Excel...'),
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
                                            `<b>The following Zero IP Funding changes will be applied:</b><br><br>
                                             <div style="max-height: 250px; overflow-y: auto; background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #e2e8f0;">
                                                ${r.message.summary_html}
                                             </div><br>
                                             <b>Are you sure you want to apply these changes?</b>`,
                                            function () {
                                                process_zero_ip_file(file_url, true);
                                            },
                                            function () {
                                                frappe.show_alert({ message: __('Upload cancelled by user.'), indicator: 'info' });
                                            }
                                        );
                                    } else if (r.message.status === "success") {
                                        frappe.msgprint({
                                            title: __('Success'),
                                            indicator: 'green',
                                            message: __('<b>Successfully Updated Documents:</b><br>') + r.message.docs.join("<br>")
                                        });
                                        listview.refresh();
                                    }
                                }
                            }
                        });
                    }

                    process_zero_ip_file(values.excel_file, false);
                }
            });

            d.show();

            // Bind Zero IP Template Download Event
            d.$wrapper.find('.btn-download-zero-ip-template').on('click', function (e) {
                e.preventDefault();
                window.open('/api/method/sahayog.branch_score_card.doctype.account_opening_operations.account_opening_operations.download_zero_ip_template');
            });

        }, __('Actions'));

    },

    refresh: function(listview) {
        setTimeout(() => {
            let actions_btn = listview.page.wrapper.find('.inner-group-button[data-label="Actions"] button, .btn-group:contains("Actions") button').first();

            if (!actions_btn.length) {
                actions_btn = listview.page.wrapper.find('button:contains("Actions")');
            }

            actions_btn.css({
                'background-color': '#006768',
                'border-color': '#006768',
                'color': '#ffffff'
            });

            actions_btn.find('*').css({
                'color': '#ffffff',
                'stroke': '#ffffff',
                'fill': '#ffffff'
            });

            let dropdown_menu = actions_btn.siblings('.dropdown-menu');
            dropdown_menu.find('.dropdown-item').css({
                'color': '#008b8c',
                'font-weight': '500'
            });
        }, 200);
    }
};