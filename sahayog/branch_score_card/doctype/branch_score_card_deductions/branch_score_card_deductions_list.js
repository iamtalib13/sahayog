// -----------------------------------------------------------
// List View Settings & Upload Dialog with Success Popup
// -----------------------------------------------------------
frappe.listview_settings['Branch Score Card Deductions'] = {
    onload: function (listview) {

        // -----------------------------------------------------------
        // ACTION: Direct Upload Kyc Deviation Button
        // -----------------------------------------------------------
        listview.page.add_inner_button(__('Upload Kyc Deviation'), function () {
            let d = new frappe.ui.Dialog({
                title: __('Upload KYC Deviation Excel'),
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
                            <div style="margin-top: 5px; padding: 10px; background-color: #f4f8f8; border-left: 3px solid #0d5c75; border-radius: 4px; font-size: 12px; color: #333; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <b>Required Excel Columns for KYC Deviation:</b><br>
                                    <span style="color: #555;">Sol ID, Date of Deviation, Deviation Days</span>
                                </div>
                                <button class="btn btn-xs btn-default btn-download-kyc-template" style="margin-left: 10px; border-color: #0d5c75; color: #0d5c75;">
                                    <i class="fa fa-download"></i> Download Template
                                </button>
                            </div>
                        `
                    }
                ],
                primary_action_label: __('Process File'),
                primary_action(values) {
                    d.hide();

                    function process_kyc_file(file_url, is_confirmed) {
                        frappe.call({
                            method: 'sahayog.branch_score_card.doctype.branch_score_card_deductions.branch_score_card_deductions.process_kyc_deviation_excel',
                            args: {
                                file_url: file_url,
                                confirm: is_confirmed
                            },
                            freeze: true,
                            freeze_message: is_confirmed ? __('Applying KYC Deviation changes...') : __('Analyzing KYC Deviation Excel...'),
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
                                            `<b>The following KYC Deviation changes will be applied:</b><br><br>
                                             <div style="max-height: 250px; overflow-y: auto; background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #e2e8f0;">
                                                ${r.message.summary_html}
                                             </div><br>
                                             <b>Are you sure you want to apply these changes?</b>`,
                                            function () {
                                                process_kyc_file(file_url, true);
                                            },
                                            function () {
                                                frappe.show_alert({ message: __('Upload cancelled by user.'), indicator: 'info' });
                                            }
                                        );
                                    } else if (r.message.status === "success") {
                                        // Yahan 'frapp' ki jagah 'frappe' kar diya hai
                                        frappe.msgprint({
                                            title: __('Success'),
                                            indicator: 'green',
                                            message: r.message.message || (__('<b>Successfully Updated Documents:</b><br>') + (r.message.docs ? r.message.docs.join("<br>") : ""))
                                        });
                                        listview.refresh();
                                    }
                                }
                            }
                        });
                    }

                    process_kyc_file(values.excel_file, false);
                }
            });

            d.show();

            // Bind Template Download Event
            d.$wrapper.find('.btn-download-kyc-template').on('click', function (e) {
                e.preventDefault();
                window.open('/api/method/sahayog.branch_score_card.doctype.branch_score_card_deductions.branch_score_card_deductions.download_kyc_deviation_template');
            });

        });

    },

    refresh: function(listview) {
        setTimeout(() => {
            let direct_btn = listview.page.wrapper.find('button:contains("Upload Kyc Deviation")').first();

            if (direct_btn.length) {
                direct_btn.css({
                    'background-color': '#0d5c75',
                    'border-color': '#0d5c75',
                    'color': '#ffffff',
                    'font-weight': '500'
                });

                direct_btn.find('*').css({
                    'color': '#ffffff',
                    'stroke': '#ffffff',
                    'fill': '#ffffff'
                });
            }
        }, 200);
    }
};