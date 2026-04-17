// // Copyright (c) 2026, Developer Team and contributors
// // For license information, please see license.txt

// frappe.ui.form.on("Bank EOD", {
// 	refresh(frm) {
//         if (frm.is_new()) {
//             frm.add_custom_button(__('Fetch Checklist Tasks'), () => {
//                 frm.trigger('fetch_tasks');
//             });
//         }

//         // Only show the download button if the EOD is Completed or Closed
//         if (frm.doc.status === 'Completed' || frm.doc.status === 'Closed') {
            
//             frm.add_custom_button(__('Download EOD Report'), function() {
                
//                 // Triggers the exact same Python PDF generator you built for the Vue app!
//                 const pdfUrl = `/api/method/sahayog.sahayog.api.eod.download_eod_report?eod_name=${encodeURIComponent(frm.doc.name)}`;
//                 window.open(pdfUrl, '_blank');
                
//             }); // Puts the button neatly under an "Actions" dropdown
            
//         }
// 	},
//     date(frm) {
//         if (frm.doc.date && frm.is_new()) {
//             frm.trigger('fetch_tasks');
//         }
//     },
//     fetch_tasks(frm) {
//         frappe.call({
//             method: "sahayog.sahayog.doctype.bank_eod.bank_eod.get_checklist_tasks",
//             callback: function(r) {
//                 if (r.message) {
//                     frm.clear_table("eod_tasks");
//                     r.message.forEach(task => {
//                         let row = frm.add_child("eod_tasks");
//                         row.team = task.team;
//                         row.task = task.task;
//                         row.status = "Pending";
//                     });
//                     frm.refresh_field("eod_tasks");
//                 }
//             }
//         });
//     }
// });
// // END



// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on('Bank EOD', {
    refresh: function(frm) {
        // Only show the download button if the EOD is Completed or Closed
        if (frm.doc.status === 'Completed' || frm.doc.status === 'Closed') {
            
            frm.add_custom_button(__('Download EOD Report'), function() {
                
                // Create a native Frappe Dialog (Modal)
                let d = new frappe.ui.Dialog({
                    title: 'Download Report',
                    fields: [
                        {
                            fieldname: 'help_text',
                            fieldtype: 'HTML',
                            options: `
                                <div style="text-align: center; padding: 10px 0 20px 0;">
                                    <div style="background: var(--text-primary, #1f272e); color: white; width: 48px; height: 48px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                    </div>
                                    <p style="font-size: 15px; margin: 0;">Would you like to include the team group chat transcript in your final EOD audit report?</p>
                                </div>
                            `
                        }
                    ]
                });

                // Add the primary button (Include Chat)
                d.set_primary_action('Yes, Include Chat (Full Report)', function() {
                    const pdfUrl = `/api/method/sahayog.sahayog.api.eod.download_eod_report?eod_name=${encodeURIComponent(frm.doc.name)}&include_chat=1`;
                    window.open(pdfUrl, '_blank');
                    d.hide();
                });

                // Add the secondary button (Checklist Only) - Note: standard secondary action in Frappe
                // We use a custom button to match your Vue.js layout better
                d.add_custom_action('No, Checklist Only', function() {
                    const pdfUrl = `/api/method/sahayog.sahayog.api.eod.download_eod_report?eod_name=${encodeURIComponent(frm.doc.name)}&include_chat=0`;
                    window.open(pdfUrl, '_blank');
                    d.hide();
                });

                // Style the buttons to look like your Vue app
                setTimeout(() => {
                    d.$wrapper.find('.btn-primary').css({
                        'width': '100%',
                        'margin-bottom': '10px'
                    });
                    
                    // Style the custom action button to look like a secondary cancel button
                    d.$wrapper.find('[data-action="No, Checklist Only"]').css({
                        'width': '100%',
                        'background-color': 'transparent',
                        'border': '1px solid var(--text-primary, #1f272e)',
                        'color': 'var(--text-primary, #1f272e)'
                    });
                    
                    // Hide the default close/cancel button as we provided custom ones
                    d.$wrapper.find('.modal-footer .btn-default.btn-sm').hide();
                }, 10);

                d.show();
                
            }); // Puts the button neatly under an "Actions" dropdown
            
        }
    },
    date(frm) {
        if (frm.doc.date && frm.is_new()) {
            frm.trigger('fetch_tasks');
        }
    },
    fetch_tasks(frm) {
        frappe.call({
            method: "sahayog.sahayog.doctype.bank_eod.bank_eod.get_checklist_tasks",
            callback: function(r) {
                if (r.message) {
                    frm.clear_table("eod_tasks");
                    r.message.forEach(task => {
                        let row = frm.add_child("eod_tasks");
                        row.team = task.team;
                        row.task = task.task;
                        row.status = "Pending";
                    });
                    frm.refresh_field("eod_tasks");
                }
            }
        });
    }
});