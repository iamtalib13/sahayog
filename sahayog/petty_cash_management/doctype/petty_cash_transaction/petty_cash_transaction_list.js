function get_approval_status_color(status) {
    const color_map = {
        'Draft': 'grey',
        'Pending Approval': 'orange',
        'Approved': 'blue',
        'Verified': 'green',
        'Posted': 'purple',
        'Canceled': 'red'
    };

    return color_map[status] || 'grey';
}

frappe.listview_settings['Petty Cash Transaction'] = {
    get_indicator: function(doc) {
        const status = doc.approval_status || 'Draft';
        return [__(status), get_approval_status_color(status), `approval_status,=,${status}`];
    },


    onload: function(listview) {
        listview.page.add_inner_button(__('Download Report'), function() {
            // download_filtered_report_listview(listview);
            ask_date_range_and_download();
        });

        if (
            frappe.session.user === 'Administrator' ||
            frappe.user.has_role('HO Petty Cash Manager') ||
            frappe.user.has_role('HO Petty Cash Verifier')
        ) {
            listview.page.add_inner_button(__('Excel Report'), function() {
                ask_date_and_download('excel');
            }, __('Download Files'));

            listview.page.add_inner_button(__('TXT File (Finacle)'), function() {
                ask_date_and_download('txt');
            }, __('Download Files'));
        }

        function ask_date_and_download(file_type) {
            const dialog = new frappe.ui.Dialog({
                title: __('Select Transaction Date'),
                fields: [
                    {
                        label: __('Transaction Date'),
                        fieldname: 'transaction_date',
                        fieldtype: 'Date',
                        reqd: 1,
                        default: frappe.datetime.get_today()
                    }
                ],
                primary_action_label: __('Download'),
                primary_action(values) {
                    dialog.hide();

                    if (file_type === 'excel') {
                        download_consolidated_excel(values.transaction_date);
                    } else {
                        download_consolidated_txt(values.transaction_date);
                    }
                }
            });

            dialog.show();
        }

        function download_consolidated_excel(transaction_date) {
            frappe.call({
                method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_consolidated_excel_api',
                args: {
                    transaction_date: transaction_date
                },
                freeze: true,
                freeze_message: __('Checking and Generating Excel...'),
                callback: function(r) {
                    if (r.message && r.message.status === 'success') {
                        let filedata = r.message.filecontent;
                        let filename = r.message.filename;

                        let binary = atob(filedata);
                        let array = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            array[i] = binary.charCodeAt(i);
                        }

                        let blob = new Blob(
                            [array],
                            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                        );

                        let url = window.URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);

                        frappe.show_alert({
                            message: __('Consolidated Excel downloaded successfully!'),
                            indicator: 'green'
                        }, 5);
                    } else if (r.message && r.message.status === 'no_data') {
                        frappe.msgprint({
                            title: __('No Data Available'),
                            message: r.message.message,
                            indicator: 'orange'
                        });
                    }
                },
                error: function(r) {
                    frappe.show_alert({
                        message: __('Failed to generate consolidated Excel. Please try again.'),
                        indicator: 'red'
                    }, 5);
                    console.error('Consolidated Excel error:', r);
                }
            });
        }

        function download_consolidated_txt(transaction_date) {
            frappe.call({
                method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_consolidated_txt_api',
                args: {
                    transaction_date: transaction_date
                },
                freeze: true,
                freeze_message: __('Checking and Generating TTUM...'),
                callback: function(r) {
                    if (r.message && r.message.status === 'success') {
                        let filedata = r.message.filecontent;
                        let filename = r.message.filename;

                        let blob = new Blob(
                            [filedata],
                            { type: 'text/plain;charset=utf-8' }
                        );

                        let url = window.URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);

                        frappe.show_alert({
                            message: __('Consolidated TTUM downloaded successfully!'),
                            indicator: 'green'
                        }, 5);
                    } else if (r.message && r.message.status === 'no_data') {
                        frappe.msgprint({
                            title: __('No Data Available'),
                            message: r.message.message,
                            indicator: 'orange'
                        });
                    }
                },
                error: function(r) {
                    frappe.show_alert({
                        message: __('Failed to generate consolidated TTUM. Please try again.'),
                        indicator: 'red'
                    }, 5);
                    console.error('Consolidated TTUM error:', r);
                }
            });
        }

        function download_filtered_report_listview(listview) {
            let filters = listview.get_filters_for_args();

            frappe.show_alert({
                message: __('Generating Excel report...'),
                indicator: 'blue'
            }, 5);

            frappe.call({
                method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_transaction_report',
                args: {
                    filters: filters
                },
                callback: function(r) {
                    if (r.message) {
                        let filedata = r.message.filecontent;
                        let filename = r.message.filename;
                        let recordcount = r.message.recordcount;

                        let binary = atob(filedata);
                        let array = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            array[i] = binary.charCodeAt(i);
                        }

                        let blob = new Blob(
                            [array],
                            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                        );

                        let url = window.URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);

                        frappe.show_alert({
                            message: __('Downloaded {0} records successfully!', [recordcount]),
                            indicator: 'green'
                        }, 5);
                    }
                },
                error: function(r) {
                    frappe.show_alert({
                        message: __('Failed to generate report. Please check console for errors.'),
                        indicator: 'red'
                    }, 5);
                    console.error('Download error:', r);
                }
            });
        }
    }
};

function download_filtered_report(listview) {
    // Get current filters from list view
    let filters = listview.get_filters_for_args();
    
    // Show loading indicator
    frappe.show_alert({
        message: __('Generating Excel report...'),
        indicator: 'blue'
    }, 5);
    
    // Call backend method
    frappe.call({
        method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_transaction_report',
        args: {
            filters: filters
        },
        callback: function(r) {
            if (r.message) {
                // Decode base64 and trigger download
                let file_data = r.message.filecontent;
                let filename = r.message.filename;
                let record_count = r.message.record_count;
                
                // Convert base64 to blob
                let binary = atob(file_data);
                let array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i);
                }
                let blob = new Blob([array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                
                // Create download link
                let url = window.URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                // Show success message
                frappe.show_alert({
                    message: __('Downloaded {0} records successfully!', [record_count]),
                    indicator: 'green'
                }, 5);
            }
        },
        error: function(r) {
            frappe.show_alert({
                message: __('Failed to generate report. Please check console for errors.'),
                indicator: 'red'
            }, 5);
            console.error('Download error:', r);
        }
    });
}


// ==============================================================================
// [NEW] CONSOLIDATED DOWNLOAD HANDLERS
// ==============================================================================

function download_consolidated_excel() {
    frappe.call({
        method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_consolidated_excel_api',
        freeze: true,
        freeze_message: __('Checking and Generating Excel...'),
        callback: function(r) {
            if (r.message && r.message.status === 'success') {
                // Decode base64 and trigger download
                let file_data = r.message.filecontent;
                let filename = r.message.filename;
                
                let binary = atob(file_data);
                let array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i);
                }
                let blob = new Blob([array], { type: 'text/csv' });
                let url = window.URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                frappe.show_alert({
                    message: __('Consolidated Excel downloaded successfully!'),
                    indicator: 'green'
                }, 5);
            } else if (r.message && r.message.status === 'no_data') {
                // Show friendly message when no data
                frappe.msgprint({
                    title: __('No Data Available'),
                    message: r.message.message,
                    indicator: 'orange'
                });
            }
        },
        error: function(r) {
            frappe.show_alert({ 
                message: __('Failed to generate consolidated Excel. Please try again.'), 
                indicator: 'red' 
            }, 5);
            console.error('Consolidated Excel error:', r);
        }
    });
}

function download_consolidated_txt() {
    frappe.call({
        method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_consolidated_txt_api',
        freeze: true,
        freeze_message: __('Checking and Generating TTUM...'),
        callback: function(r) {
            if (r.message && r.message.status === 'success') {
                // Trigger text file download
                let file_data = r.message.filecontent;
                let filename = r.message.filename;
                
                let blob = new Blob([file_data], { type: 'text/plain' });
                let url = window.URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                frappe.show_alert({
                    message: __('Consolidated TTUM downloaded successfully!'),
                    indicator: 'green'
                }, 5);
            } else if (r.message && r.message.status === 'no_data') {
                // Show friendly message when no data
                frappe.msgprint({
                    title: __('No Data Available'),
                    message: r.message.message,
                    indicator: 'orange'
                });
            }
        },
        error: function(r) {
            frappe.show_alert({ 
                message: __('Failed to generate consolidated TTUM. Please try again.'), 
                indicator: 'red' 
            }, 5);
            console.error('Consolidated TTUM error:', r);
        }
    });
}



function ask_date_range_and_download() {
    const dialog = new frappe.ui.Dialog({
        title: __('Select Date Range'),
        fields: [
            {
                label: __('Start Date'),
                fieldname: 'from_date',
                fieldtype: 'Date',
                reqd: 1
            },
            {
                label: __('End Date'),
                fieldname: 'to_date',
                fieldtype: 'Date',
                reqd: 1
            }
        ],
        primary_action_label: __('Download'),
        primary_action(values) {
            if (values.from_date > values.to_date) {
                frappe.msgprint({
                    title: __('Invalid Date Range'),
                    message: __('Start Date cannot be greater than End Date.'),
                    indicator: 'red'
                });
                return;
            }

            dialog.hide();
            download_detailed_report_by_date_range(values.from_date, values.to_date);
        }
    });

    dialog.show();
}

function download_detailed_report_by_date_range(from_date, to_date) {
    frappe.show_alert({
        message: __('Generating detailed report...'),
        indicator: 'blue'
    }, 5);

    frappe.call({
        method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_detailed_report_by_date_range',
        args: {
            from_date: from_date,
            to_date: to_date
        },
        freeze: true,
        freeze_message: __('Preparing detailed Excel report...'),
        callback: function(r) {
            if (r.message) {
                let filedata = r.message.filecontent;
                let filename = r.message.filename;
                let recordcount = r.message.recordcount;

                let binary = atob(filedata);
                let array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i);
                }

                let blob = new Blob(
                    [array],
                    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                );

                let url = window.URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                frappe.show_alert({
                    message: __('Downloaded {0} records successfully!', [recordcount]),
                    indicator: 'green'
                }, 5);
            }
        },
        error: function(r) {
            frappe.show_alert({
                message: __('Failed to generate detailed report.'),
                indicator: 'red'
            }, 5);
            console.error('Detailed report error:', r);
        }
    });
}