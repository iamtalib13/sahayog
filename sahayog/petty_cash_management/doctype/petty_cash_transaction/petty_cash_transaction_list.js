frappe.listview_settings['Petty Cash Transaction'] = {
    onload: function(listview) {
        // Add Download Report button to list view
        listview.page.add_inner_button(__('Download Report'), function() {
            download_filtered_report(listview);
        });
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
