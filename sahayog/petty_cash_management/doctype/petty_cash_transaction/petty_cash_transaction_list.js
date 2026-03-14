frappe.listview_settings['Petty Cash Transaction'] = {
    // onload: function(listview) {
        // Add Download Report button to list view
        // listview.page.add_inner_button(__('Download Report'), function() {
        //     download_filtered_report(listview);
        // });
    // },
    onload: function(listview) {
        // [NEW] Add Consolidated Download Buttons for Managers & Admin
        // if (frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager')) {
            
        //     // 1. Consolidated Excel Option
        //     listview.page.add_inner_button(__('Excel Report'), function() {
        //         window.open(
        //             frappe.request.url + 
        //             '?cmd=sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_consolidated_excel_api'
        //         );
        //     }, __('Download Files'));

        //     // 2. Consolidated TXT (TTUM) Option
        //     listview.page.add_inner_button(__('TXT File (Finacle)'), function() {
        //         window.open(
        //             frappe.request.url + 
        //             '?cmd=sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_consolidated_txt_api'
        //         );
        //     }, __('Download Files'));
        // }

        // [NEW] Add Consolidated Download Buttons for Managers & Admin
        if (frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager')) {
            
            // 1. Consolidated Excel Option
            listview.page.add_inner_button(__('Excel Report'), function() {
                download_consolidated_excel();
            }, __('Download Files'));

            // 2. Consolidated TXT (TTUM) Option
            listview.page.add_inner_button(__('TXT File (Finacle)'), function() {
                download_consolidated_txt();
            }, __('Download Files'));
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
    frappe.show_alert({ message: __('Generating consolidated Excel...'), indicator: 'blue' }, 3);
    
    frappe.call({
        method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_consolidated_excel_api',
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
    frappe.show_alert({ message: __('Generating consolidated TTUM...'), indicator: 'blue' }, 3);
    
    frappe.call({
        method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_consolidated_txt_api',
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
