// --- 1. HIDE PRIVATE / OPTIMIZE CONTROLS GLOBALLY FOR THIS FORM ---
// frappe.dom.set_style(`
//     body.pct-active-form [data-action="toggle_private"],
//     body.pct-active-form [data-action="make_private"],
//     body.pct-active-form .btn-private,
//     body.pct-active-form .btn-public,
//     body.pct-active-form .force-hide-upload-option {
//         display: none !important;
//         visibility: hidden !important;
//         pointer-events: none !important;
//     }
// `, 'pct-file-privacy-css');

// // --- 2. VUE INTERCEPTOR (MUTATION OBSERVER) ---
// const privacyObserver = new MutationObserver(() => {
//     if ($('body').hasClass('pct-active-form') && $('.modal-dialog').length > 0) {

//         // Force Optimize + Private checkboxes to false before hiding
//         $('.modal-dialog .config-area label.frappe-checkbox').each(function () {
//             let label_text = $(this).text().toLowerCase().trim().replace(/\s+/g, ' ');
//             let checkbox = $(this).find('input[type="checkbox"]');

//             if (label_text === 'optimize' || label_text === 'private') {
//                 checkbox.prop('checked', false).trigger('change');
//                 $(this).addClass('force-hide-upload-option');
//             }
//         });

//         // Hide Set all private / Set all public buttons
//         $('.modal-dialog button').each(function () {
//             let text = $(this).text().toLowerCase().trim().replace(/\s+/g, ' ');

//             if (text === 'set all private' || text === 'set all public') {
//                 $(this).addClass('force-hide-upload-option');
//             }
//         });
//     }
// });

// // Start observing the DOM
// privacyObserver.observe(document.body, { childList: true, subtree: true });

// // Route scope
// frappe.router.on('change', () => {
//     if (frappe.get_route()[0] === 'Form' && frappe.get_route()[1] === 'Petty Cash Transaction') {
//         $('body').addClass('pct-active-form');
//     } else {
//         $('body').removeClass('pct-active-form');
//     }
// });
// -------------------------------------------------------------

// --- 1. HIDE PRIVACY TOGGLE BUTTONS GLOBALLY FOR THIS FORM ---
frappe.dom.set_style(`
    /* Hide standard sidebar lock/unlock icons and Make Private actions */
    body.pct-active-form [data-action="toggle_private"],
    body.pct-active-form [data-action="make_private"],
    body.pct-active-form .btn-private,
    body.pct-active-form .btn-public,
    /* Hide dynamically tagged Vue elements inside the Uploader */
    body.pct-active-form .force-hide-privacy-btn {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }
`, 'pct-file-privacy-css');

// --- 2. VUE INTERCEPTOR (MUTATION OBSERVER) ---
// This continuously monitors the File Uploader modal and actively hides the Private toggles
const privacyObserver = new MutationObserver((mutations) => {
    // Only run if we are on the Petty Cash form AND a modal is open
    if ($('body').hasClass('pct-active-form') && $('.modal-dialog').length > 0) {

        // Target buttons and checkboxes inside the modal that aren't hidden yet
        $('.modal-dialog label.frappe-checkbox:not(.force-hide-privacy-btn), .modal-dialog button:not(.force-hide-privacy-btn)').each(function () {
            // Clean up the text to match reliably (removes extra spaces/newlines Vue might add)
            let text = $(this).text().toLowerCase().trim().replace(/\s+/g, ' ');

            if (text === 'private' || text === 'set all private' || text === 'set all public' || text === 'optimize') {
                $(this).addClass('force-hide-privacy-btn');
            }
        });
    }
});

// Start observing the DOM
privacyObserver.observe(document.body, { childList: true, subtree: true });

// Listen to route changes to safely add/remove the CSS scope
frappe.router.on('change', () => {
    if (frappe.get_route()[0] === 'Form' && frappe.get_route()[1] === 'Petty Cash Transaction') {
        $('body').addClass('pct-active-form');
    } else {
        $('body').removeClass('pct-active-form');
    }
});
// -------------------------------------------------------------



frappe.ui.form.on('Petty Cash Transaction', {

    setup: function (frm) {
        frm.set_query('expense_category', 'items', function (doc, cdt, cdn) {
            return {
                filters: {
                    is_active: 1
                }
            };
        });
    },

    toggle_unsettled_cash_field: function (frm) {
        frappe.db.get_single_value('Sahayog Settings', 'enable_unsettled_cash_flow')
            .then((value) => {
                const show_unsettled_cash = Number(value) === 1;
                frm.toggle_display('current_unsettled_cash', show_unsettled_cash);
            });
    },

    get_indicator: function (doc) {
        const status = doc.approvalstatus || 'Draft';

        if (status === 'Draft') {
            return [__('Draft'), 'grey', 'approvalstatus,=,Draft'];
        }
        if (status === 'Pending Approval') {
            return [__('Pending Approval'), 'orange', 'approvalstatus,=,Pending Approval'];
        }
        if (status === 'Approved') {
            return [__('Approved'), 'blue', 'approvalstatus,=,Approved'];
        }
        if (status === 'Verified') {
            return [__('Verified'), 'green', 'approvalstatus,=,Verified'];
        }
        if (status === 'Posted') {
            return [__('Posted'), 'purple', 'approvalstatus,=,Posted'];
        }
        if (status === 'Canceled') {
            return [__('Canceled'), 'red', 'approvalstatus,=,Canceled'];
        }

        return [__(status), 'grey', `approvalstatus,=,${status}`];
    },

    validate: function (frm) {
        (frm.doc.items || []).forEach(function (row) {
            if (row.description && row.description.length > 30) {
                frappe.throw(
                    __('Row {0}: Description cannot be more than 30 characters including spaces.', [row.idx])
                );
            }
        });
    },



    setup: function (frm) {
        // --- CUSTOM FILE UPLOADER OVERRIDE ---
        // Override Attach Control to force public uploads and remove the 'Private' checkbox
        if (frappe.ui.form.ControlAttach && !frappe.ui.form.ControlAttach.prototype._original_set_upload_options) {

            // Backup the standard frappe upload options function
            frappe.ui.form.ControlAttach.prototype._original_set_upload_options = frappe.ui.form.ControlAttach.prototype.set_upload_options;

            // Override with our custom logic
            frappe.ui.form.ControlAttach.prototype.set_upload_options = function () {
                // Call the original function to build standard options
                this._original_set_upload_options();

                // Only apply this customization if we are inside Petty Cash Transaction
                if (this.frm && this.frm.doctype === "Petty Cash Transaction") {

                    // Force attachment to be Public by default
                    this.upload_options.make_attachments_public = true;

                    // Completely hide/disable the "Private" checkbox from the Vue modal
                    this.upload_options.allow_toggle_private = false;
                }
            };
        }

        // --- 2. CUSTOM FILE UPLOADER OVERRIDE ---
        if (frappe.ui.form.ControlAttach && !frappe.ui.form.ControlAttach.prototype._original_set_upload_options) {
            frappe.ui.form.ControlAttach.prototype._original_set_upload_options = frappe.ui.form.ControlAttach.prototype.set_upload_options;
            frappe.ui.form.ControlAttach.prototype.set_upload_options = function () {
                this._original_set_upload_options();
                if (this.frm && this.frm.doctype === "Petty Cash Transaction") {
                    this.upload_options.make_attachments_public = true;
                    this.upload_options.allow_toggle_private = false;
                }
            };
        }
        // -------------------------------------

        // Add Download Report button to List View
        // This will be available in the list view toolbar
    },


    refresh: function (frm) {

        // Toggle Unsettled Cash field based on settings
        frm.trigger('toggle_unsettled_cash_field');
        frm.set_df_property('custom_ttum_remarks', 'hidden', 1);


        // Set Description Max Length to 30
        set_description_maxlength(frm);



        // Add Download Report button in Form View (optional)
        if (!frm.is_new()) {
            frm.add_custom_button(__('Download as Excel'), function () {
                download_current_record(frm);
            }, __('Reports'));
        }


        // Define the fields you want to check
        const hide_fields = [
            'finacle_tran_id',
            'finacle_tran_date',
            'finacle_tran_particular',
            'journal_entry_ref'
        ];

        // Loop through them and hide if they don't have a value
        hide_fields.forEach(field => {
            // toggle_display(fieldname, show_condition)
            // Shows the field only if frm.doc[field] is truthy (has a value)
            frm.toggle_display(field, !!frm.doc[field]);
        });

        // [NEW] Bulk Allocation Logic
        frm.trigger('toggle_bulk_mode');

        // --- DEBUG LOGGING ---
        console.log("=== DEBUGGING BUTTONS ===");
        console.log("Docstatus (1=Submitted):", frm.doc.docstatus);
        console.log("Approval Status:", frm.doc.approval_status);
        console.log("User:", frappe.session.user);
        console.log("Is Manager?", frappe.user.has_role('HO Petty Cash Manager'));
        // ---------------------


        // Lock if Attempted (flag is set) OR Submitted
        // We fetch the value from DB to be sure, or trust frm.doc
        let is_locked = frm.doc.submission_attempted == 1 || frm.doc.docstatus == 1;

        // NEW LOGIC: Editable only if (Admin OR Manager) AND (Not Locked)
        let is_admin_or_manager = frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager');

        if (is_admin_or_manager && !is_locked) {
            frm.set_df_property('transaction_type', 'read_only', 0);
            frm.set_df_property('branch', 'read_only', 0);
            frm.set_df_property('transaction_date', 'read_only', 0);
        } else {
            frm.set_df_property('transaction_type', 'read_only', 1);
            frm.set_df_property('branch', 'read_only', 1);
            frm.set_df_property('transaction_date', 'read_only', 1);
        }

        // --- BUTTON LOGIC ---

        // SCENARIO 2: Limit Exceeded -> Needs Approval
        if (frm.doc.docstatus === 1 && frm.doc.approval_status === "Pending Approval") {

            // Check permissions explicitly
            // if (frappe.user.has_role('HO Petty Cash Manager') || frappe.session.user === 'Administrator') {
            if (frappe.user.has_role('HO Petty Cash Manager') || frappe.user.has_role('HO Petty Cash Approver') || frappe.session.user === 'Administrator') {
                console.log(">> Adding 'Approve Limit' Button");

                frm.add_custom_button(__('Approve Limit Exceedance'), function () {
                    frappe.confirm('Approve extra expense?', () => {
                        frappe.call({
                            doc: frm.doc,
                            method: 'ho_approve_limit',
                            callback: function () { frm.reload_doc(); }
                        });
                    });
                }, "Actions"); // Should appear in 'Actions' button
            } else {
                console.log(">> User does not have permission for Limit Approval");
            }
        }

        // SCENARIO 1 & 2: Limit OK -> Needs Verification
        if (frm.doc.docstatus === 1 && frm.doc.approval_status === "Approved") {

            // if (frappe.user.has_role('HO Petty Cash Manager') || frappe.session.user === 'Administrator') {
            // Added Verifier Role
            if (frappe.user.has_role('HO Petty Cash Manager') || frappe.user.has_role('HO Petty Cash Verifier') || frappe.session.user === 'Administrator') {
                console.log(">> Adding 'Verify' Button");

                frm.add_custom_button(__('Verify & Process'), function () {
                    frappe.call({
                        doc: frm.doc,
                        method: 'ho_verify_bill',
                        callback: function () { frm.reload_doc(); }
                    });
                }, "Actions");
            } else {
                console.log(">> User does not have permission for Verification");
            }
        }


        const fields_to_lock = ['is_bulk_allocation', 'target_scope', 'source_bank_account', 'amount']; // Removed 'transaction_type', 'branch'

        fields_to_lock.forEach(field => {
            frm.set_df_property(field, 'read_only', is_locked ? 1 : 0);
        });


        // --- NEW LOGIC: DOWNLOAD BUTTONS ---
        // if (frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager')) {
        // Added Verifier Role
        if (frappe.session.user === 'Administrator' || frappe.user.has_role('HO Petty Cash Manager') || frappe.user.has_role('HO Petty Cash Verifier')) {
            if (frm.doc.approval_status === 'Verified') {
                frm.add_custom_button(__('Excel Report'), function () {
                    window.open(
                        frappe.request.url +
                        '?cmd=sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_excel_api' + // <--- Updated Name
                        '&name=' + frm.doc.name
                    );
                }, __("Download Files"));

                // TXT Button
                frm.add_custom_button(__('TXT File (Finacle)'), function () {
                    window.open(
                        frappe.request.url +
                        '?cmd=sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_txt_api' + // <--- Updated Name
                        '&name=' + frm.doc.name
                    );
                }, __("Download Files"));
            }
        }

        // Hide the Menu Button (3 dots) for everyone
        if (!frm.is_new()) {
            frm.page.menu_btn_group.hide();
        }


        // Hide Cancel button if limit exceedance is already approved or fully verified
        if (["Approved", "Verified"].includes(frm.doc.approval_status)) {
            frm.page.clear_secondary_action();

            if (frm.page.btn_secondary) {
                frm.page.btn_secondary.hide();
            }

            frm.page.wrapper.find('button[data-label="Cancel"]').hide();
        }
        if (frappe.user.has_role('HO Petty Cash Verifier') && frm.doc.approval_status === 'Pending Approval') {
            frm.page.clear_secondary_action();

            if (frm.page.btn_secondary) {
                frm.page.btn_secondary.hide();
            }

            frm.page.wrapper.find('button[data-label="Cancel"]').hide();
        }
        set_custom_business_status(frm);
    },

    after_save: function (frm) {
        set_custom_business_status(frm);
    },


    transaction_type: function (frm) {
        // Trigger visibility check when type changes
        frm.trigger('toggle_bulk_mode');

        if (frm.doc.transaction_type === "Fund Allocation") {
            frm.clear_table("items");
            frm.refresh_field("items");
            // [NEW] Trigger Auto-Fetch of HO Account
            frm.trigger('set_default_ho_account');
        }
    },

    is_bulk_allocation: function (frm) {
        frm.trigger('toggle_bulk_mode');
    },

    toggle_bulk_mode: function (frm) {
        // 1. Check Role
        let is_manager = frappe.user.has_role('HO Petty Cash Manager') || frappe.session.user === 'Administrator';
        let is_fund = frm.doc.transaction_type === 'Fund Allocation';

        // 2. Show/Hide Bulk Option
        // Only show the Checkbox if user is Manager AND it's a Fund Allocation
        frm.toggle_display('is_bulk_allocation', is_manager && is_fund);

        // 3. Handle Bulk vs Single Mode
        if (is_fund && frm.doc.is_bulk_allocation) {
            // BULK MODE: Hide specific branch, Show Bulk Fields
            frm.set_df_property('branch', 'reqd', 0); // Make branch optional
            frm.toggle_display('branch', false);      // Hide branch

            // Note: target_scope and source_bank_account visibility is handled by 'depends_on' in JSON

            // Update Label for Amount to be clear
            frm.set_df_property('amount', 'label', 'Amount Per Branch');
        } else {
            // SINGLE MODE: Restore defaults
            if (is_manager) {
                // Only restore if user is allowed to edit branch
                frm.toggle_display('branch', true);
                frm.set_df_property('branch', 'reqd', 1);
            }
            frm.set_df_property('amount', 'label', 'Amount');
        }
    },

    // [NEW FUNCTION] Fetches HO Account from Backend
    set_default_ho_account: function (frm) {
        // Only fetch if currently empty
        if (frm.doc.source_bank_account) return;

        frappe.call({
            method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_ho_source_account",
            callback: function (r) {
                if (r.message) {
                    frm.set_value('source_bank_account', r.message);
                }
            }
        });
    },

    // onload: function (frm) {
    //     if (frm.is_new()) {
    //         frm.set_value('transaction_date', frappe.datetime.get_today());
    //         frm.set_value('amount', 0);

    //         // Fetch Branch from Employee
    //         frappe.db.get_value('Employee',
    //             { user_id: frappe.session.user, status: 'Active' },
    //             'sahayog_branch'
    //         ).then(r => {
    //             if (r && r.message && r.message.sahayog_branch) {
    //                 let user_branch = r.message.sahayog_branch;
    //                 frm.set_value('branch', user_branch);
    //                 frm.trigger('fetch_balance');
    //             }
    //         });
    //     }
    // },

    onload: function (frm) {
        if (frm.is_new()) {
            frm.set_value('transaction_date', frappe.datetime.get_today());
            frm.set_value('amount', 0);

            frappe.db.get_value(
                'Employee',
                { user_id: frappe.session.user, status: 'Active' },
                'sahayog_branch'
            ).then(r => {
                if (r && r.message && r.message.sahayog_branch) {
                    frm.set_value('branch', r.message.sahayog_branch);
                    frm.trigger('fetch_balance');
                    check_branch_wallet_status(frm);
                }
            });
        }

        check_branch_wallet_status(frm);
    },


    branch: function (frm) {
        frm.trigger('fetch_balance');
    },

    fetch_balance: function (frm) {
        if (!frm.doc.branch) return;

        frappe.call({
            method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_branch_balance",
            args: { branch: frm.doc.branch },
            callback: function (r) {
                // Check if response is an object (new format) or just a number (fallback)
                let balance = 0;
                let cash_in_hand = 0;

                if (r.message && typeof r.message === 'object') {
                    // New Dictionary Format
                    balance = r.message.current_balance || 0;
                    cash_in_hand = r.message.unsettled_cash || 0;
                } else {
                    // Old Number Format fallback
                    balance = r.message || 0;
                }

                // Set Bank Balance
                frm.set_value('current_branch_balance', balance);

                // Set Cash in Hand (only if the field exists in your form)
                if (frm.fields_dict['current_unsettled_cash']) {
                    frm.set_value('current_unsettled_cash', cash_in_hand);
                }

                frm.refresh_field('current_branch_balance');
                frm.refresh_field('current_unsettled_cash');

                console.log(`Updated Balances -> Bank: ₹${balance}, Cash: ₹${cash_in_hand}`);
            }
        });
    },

    before_submit: function (frm) {
        // Mark attempted via direct call BEFORE the actual submit proceeds
        // We use a verified Promise to ensure it completes
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.mark_submission_attempt",
                args: { docname: frm.doc.name },
                callback: function (r) {
                    resolve();
                }
            });
        });
    },

});

// Child Table Logic
frappe.ui.form.on('Petty Cash Transaction Item', {
    description: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.description && row.description.length > 30) {
            frappe.msgprint({
                title: __('Character Limit Exceeded'),
                indicator: 'red',
                message: __('Row {0}: Description can contain maximum 30 characters including spaces.', [row.idx])
            });
        }
    },

    form_render: function (frm, cdt, cdn) {
        set_description_maxlength(frm);
    },

    amount: function (frm, cdt, cdn) {
        check_limit_warning(frm, cdt, cdn);
    },

    bill_date: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.billdate) return;

        let today = frappe.datetime.get_today();
        let days_diff = frappe.datetime.get_diff(today, row.billdate);

        if (days_diff < 0) {
            frappe.model.set_value(cdt, cdn, 'billdate', '');
            frappe.throw(
                __('Row {0}: Bill Date cannot be in the future.', [row.idx])
            );
        }

        if (days_diff > 30) {
            frappe.model.set_value(cdt, cdn, 'billdate', '');
            frappe.throw(
                __('Row {0}: Bill Date cannot be older than 30 days from today.', [row.idx])
            );
        }
    },


    expense_category: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (!frm.doc.branch || !frm.doc.transaction_date || !row.expense_category) {
            return;
        }

        frappe.call({
            method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_category_limit_status",
            args: {
                branch: frm.doc.branch,
                category: row.expense_category,
                transaction_date: frm.doc.transaction_date,
                doc_name: frm.doc.name
            },
            callback: function (r) {
                if (r.message != null) {
                    frappe.model.set_value(cdt, cdn, 'available_limit', r.message);
                    check_limit_warning(frm, cdt, cdn);
                }
            }
        });
    }
});

function check_limit_warning(frm, cdt, cdn) {
    var row = locals[cdt][cdn];
    if (row.amount > 0 && row.available_limit != null) {
        if (row.amount > row.available_limit) {
            frappe.show_alert({
                message: __("Row #{0} exceeds available limit. It will require HO Approval.", [row.idx]),
                indicator: 'orange'
            }, 3);
        }
    }
}


// Helper function to download current record (at the end of the file, OUTSIDE the main frappe.ui.form.on block)
function download_current_record(frm) {
    let filters = {
        name: frm.doc.name
    };

    frappe.show_alert({
        message: __('Generating Excel report...'),
        indicator: 'blue'
    }, 3);

    frappe.call({
        method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_transaction_report',
        args: {
            filters: filters
        },
        callback: function (r) {
            if (r.message) {
                // Decode base64 and trigger download
                let file_data = r.message.filecontent;
                let filename = r.message.filename;

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

                frappe.show_alert({
                    message: __('Report downloaded successfully!'),
                    indicator: 'green'
                }, 3);
            }
        }
    });
}


function set_description_maxlength(frm) {
    setTimeout(() => {
        frm.fields_dict.items.grid.grid_rows.forEach(row => {
            if (row.columns && row.columns.description && row.columns.description.field_area) {
                row.columns.description.field_area
                    .find('textarea, input')
                    .attr('maxlength', 30);
            }
        });
    }, 300);
}


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



function set_custom_business_status(frm) {
    const status = frm.doc.approval_status || 'Draft';
    const color = get_approval_status_color(status);

    frm.page.clear_indicator();
    frm.page.set_indicator(__(status), color);
}

function check_branch_wallet_status(frm) {
    if (!frm.doc.branch) return;

    frappe.call({
        method: "sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.check_branch_wallet_active",
        args: {
            branch: frm.doc.branch
        },
        callback: function (res) {
            if (res.message && ["inactive", "not_found"].includes(res.message.status)) {
                frappe.msgprint({
                    title: __('Branch Validation'),
                    indicator: 'red',
                    message: __(res.message.message)
                });

                if (frm.is_new()) {
                    frm.set_value('branch', '');
                    frm.set_value('current_branch_balance', 0);
                    frm.set_value('current_unsettled_cash', 0);
                }
            }
        }
    });
}