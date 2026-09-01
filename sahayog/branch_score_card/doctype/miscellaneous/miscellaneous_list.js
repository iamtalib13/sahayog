frappe.listview_settings['Miscellaneous'] = {
    onload: function (listview) {

        // -----------------------------------------------------------
        // 1. ACTION: Upload Excel for Account Opening Error
        // -----------------------------------------------------------
        listview.page.add_inner_button(__('Upload Excel for Account Opening Error'), function () {
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
                                confirm: is_confirmed
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

                    process_account_error_file(values.excel_file, false);
                }
            });

            d.show();

            // Bind Template Download Event
            d.$wrapper.find('.btn-download-template').on('click', function() {
                window.location.href = `/api/method/sahayog.branch_score_card.doctype.miscellaneous.miscellaneous.download_miscellaneous_template?type_name=${encodeURIComponent(type_name)}`;
            });

        }, __('Actions'));

        // -----------------------------------------------------------
        // 2. ACTION: Upload Excel for Bank Reconciliation Discrepancy
        // -----------------------------------------------------------
        listview.page.add_inner_button(__('Upload Excel for Bank Reconciliation'), function () {
            let type_name = 'Bank Reconciliation Discrepancy';
            let d = new frappe.ui.Dialog({
                title: __('Upload Bank Reconciliation Excel'),
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
                                    <b>Required Excel Columns for Bank Reconciliation:</b><br>
                                    <span style="color: #555;">Sol Id, Error Date</span>
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

                    function process_reco_file(file_url, is_confirmed) {
                        frappe.call({
                            method: 'sahayog.branch_score_card.doctype.miscellaneous.miscellaneous.process_miscellaneous_excel',
                            args: {
                                file_url: file_url,
                                type_name: type_name,
                                confirm: is_confirmed
                            },
                            freeze: true,
                            freeze_message: is_confirmed ? __('Applying Bank Reconciliation changes...') : __('Analyzing Excel File...'),
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
                                            `<b>The following Bank Reconciliation changes will be applied:</b><br><br>
                                             <div style="max-height: 250px; overflow-y: auto; background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #e2e8f0;">
                                                ${r.message.summary_html}
                                             </div><br>
                                             <b>Are you sure you want to apply these changes?</b>`,
                                            function () {
                                                process_reco_file(file_url, true);
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

                    process_reco_file(values.excel_file, false);
                }
            });

            d.show();

            // Bind Template Download Event
            d.$wrapper.find('.btn-download-template').on('click', function() {
                window.location.href = `/api/method/sahayog.branch_score_card.doctype.miscellaneous.miscellaneous.download_miscellaneous_template?type_name=${encodeURIComponent(type_name)}`;
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