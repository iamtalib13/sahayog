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
        const status = doc.approval_status || 'Draft';

        if (status === 'Draft') {
            return [__('Draft'), 'grey', 'approval_status,=,Draft'];
        }
        if (status === 'Pending Checker') {
            return [__('Pending Checker'), 'yellow', 'approval_status,=,Pending Checker'];
        }
        if (status === 'Rejected') {
            return [__('Rejected'), 'red', 'approval_status,=,Rejected'];
        }
        if (status === 'Pending Approval') {
            return [__('Pending Approval'), 'orange', 'approval_status,=,Pending Approval'];
        }
        if (status === 'Checked') {
            return [__('Checked'), 'teal', 'approval_status,=,Checked'];
        }
        if (status === 'Approved') {
            return [__('Approved'), 'blue', 'approval_status,=,Approved'];
        }
        if (status === 'Verified') {
            return [__('Verified'), 'green', 'approval_status,=,Verified'];
        }
        if (status === 'Posted') {
            return [__('Posted'), 'purple', 'approval_status,=,Posted'];
        }
        if (status === 'Canceled') {
            return [__('Canceled'), 'red', 'approval_status,=,Canceled'];
        }

        return [__(status), 'grey', `approval_status,=,${status}`];
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
        // if (!frm.is_new()) {
        //     frm.add_custom_button(__('Download as Excel'), function () {
        //         download_current_record(frm);
        //     }, __('Reports'));
        // }


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

                frm.add_custom_button(__('Reject (Approver)'), function () {
                    frappe.confirm('Reject this expense?', () => {
                        frappe.call({
                            doc: frm.doc,
                            method: 'ho_approver_reject',
                            callback: function () { frm.reload_doc(); }
                        });
                    });
                }, "Actions");
            } else {
                console.log(">> User does not have permission for Limit Approval");
            }
        }

        // SCENARIO: Pending Checker -> Checker can approve
        if (frm.doc.docstatus === 1 && frm.doc.approval_status === "Pending Checker") {
            // if (frappe.user.has_role('HO Petty Cash Checker') || frappe.session.user === 'Administrator') {
            if (frappe.user.has_role('HO Petty Cash Checker') || frappe.user.has_role('HO Petty Cash Manager') || frappe.user.has_role('System Manager') || frappe.session.user === 'Administrator') {
                frm.add_custom_button(__('Approve (Checker)'), function () {
                    frappe.confirm('Approve this transaction?', () => {
                        frappe.call({
                            doc: frm.doc,
                            method: 'ho_checker_approve',
                            callback: function () { frm.reload_doc(); }
                        });
                    });
                }, "Actions");

                frm.add_custom_button(__('Reject (Checker)'), function () {
                    frappe.confirm('Reject this transaction?', () => {
                        frappe.call({
                            doc: frm.doc,
                            method: 'ho_checker_reject',
                            callback: function () { frm.reload_doc(); }
                        });
                    });
                }, "Actions");
            }
        }

        // SCENARIO 1 & 2: Limit OK -> Needs Verification
        if (frm.doc.docstatus === 1 && frm.doc.approval_status === "Approved" || frm.doc.docstatus === 1 && frm.doc.approval_status === "Checked") {

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

                frm.add_custom_button(__('Reject (Verifier)'), function () {
                    frappe.confirm(__('Reject this expense?'), () => {
                        frappe.call({
                            doc: frm.doc,
                            method: 'ho_verifier_reject',
                            callback: function () { frm.reload_doc(); }
                        });
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
                frm.page.remove_inner_button(__('Individual TTUM TXT File (Finacle)'), __('Download Files'));
                console.log(">> Removing 'Download TTUM TXT File' Button");
                if (!frm.doc.exclude_from_ttum) {
                    console.log(">> Adding 'Download TTUM TXT File' Button");
                    frm.add_custom_button(__('Individual TTUM TXT File (Finacle)'), function () {
                        window.open(
                            frappe.request.url +
                            '?cmd=sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.download_txt_api' + // <--- Updated Name
                            '&name=' + frm.doc.name
                        );
                        setTimeout(() => {
                            frm.reload_doc();
                        }, 1500);
                    }, __("Download Files"));
                }
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
        render_petty_cash_stepper_intro(frm);
    },

    after_save: function (frm) {
        set_custom_business_status(frm);
        render_petty_cash_stepper_intro(frm);
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
                // 'sahayog_branch'
                'petty_cash_branch'
            ).then(r => {
                // if (r && r.message && r.message.sahayog_branch) {
                //     frm.set_value('branch', r.message.sahayog_branch);
                if (r && r.message && r.message.petty_cash_branch) {
                    frm.set_value('branch', r.message.petty_cash_branch);
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

    exclude_from_ttum: function (frm) {
        if (cint(frm.doc.exclude_from_ttum)) {
            frm.page.remove_inner_button(__('Individual TTUM TXT File (Finacle)'), __('Download Files'));
        }
    },

    download_ttum: function (frm) {
        if (!frm.doc.ttum_reference) {
            frappe.msgprint({
                title: __('No TTUM Found'),
                indicator: 'orange',
                message: __('No TTUM Reference linked with this transaction yet.')
            });
            return;
        }

        frappe.call({
            method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_ttum_file_url',
            args: {
                ttum_reference: frm.doc.ttum_reference
            },
            callback: function (r) {
                if (r && r.message) {
                    const download_link = document.createElement('a');
                    download_link.href = r.message;
                    download_link.download = r.message.split('/').pop();
                    document.body.appendChild(download_link);
                    download_link.click();
                    document.body.removeChild(download_link);
                } else {
                    frappe.msgprint({
                        title: __('Download Error'),
                        indicator: 'red',
                        message: __('Attached TTUM file not found.')
                    });
                }
            }
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

    payment_mode(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (row.payment_mode !== 'Transfer') {
            frappe.model.set_value(cdt, cdn, 'beneficiary_name', '');
            frappe.model.set_value(cdt, cdn, 'beneficiary_account_number', '');
        }
    },

    // beneficiary_account_number(frm, cdt, cdn) {
    //     const row = locals[cdt][cdn];

    //     if (!row.beneficiary_account_number) {
    //         return;
    //     }

    //     const digits_only = String(row.beneficiary_account_number)
    //         .replace(/\D/g, '')
    //         .slice(0, 15);

    //     if (row.beneficiary_account_number !== digits_only) {
    //         frappe.model.set_value(
    //             cdt,
    //             cdn,
    //             'beneficiary_account_number',
    //             ""
    //         );

    //         frappe.show_alert({
    //             message: __('Beneficiary Account Number accepts only numeric digits.'),
    //             indicator: 'orange'
    //         }, 3);
    //     }
    // },

    beneficiary_account_number(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (!row.beneficiary_account_number) {
            return;
        }

        const entered_value = String(row.beneficiary_account_number);
        const digits_only = entered_value.replace(/\D/g, '');

        // Remove alphabets, spaces, and special characters only.
        // Do NOT slice/truncate digits beyond 15.
        if (entered_value !== digits_only) {
            frappe.model.set_value(
                cdt,
                cdn,
                'beneficiary_account_number',
                digits_only
            );

            frappe.show_alert({
                message: __('Beneficiary Account Number accepts only numeric digits.'),
                indicator: 'orange'
            }, 3);

            return;
        }

        // Show immediate warning, but do not modify the entered account number.
        if (digits_only.length !== 15) {
            frappe.show_alert({
                message: __(
                    'Beneficiary Account Number must contain exactly 15 digits. Entered: {0} digits.',
                    [digits_only.length]
                ),
                indicator: 'orange'
            }, 3);
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


    gst_no: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.gst_no) return;
        const val = String(row.gst_no).trim();
        if (val.length !== 15 || !/^[A-Za-z0-9]+$/.test(val)) {
            frappe.show_alert({
                message: __('Row {0}: GST No. must be exactly 15 alphanumeric characters.', [row.idx]),
                indicator: 'red'
            }, 4);
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
        'Pending Checker': 'yellow',
        'Rejected': 'red',
        'Pending Approval': 'orange',
        'Approved': 'blue',
        'Checked': 'teal',
        'Verified': 'green',
        'Posted': 'purple',
        'Canceled': 'red'
    };

    return color_map[status] || 'grey';
}



function can_view_ttum_status_badge() {
    return (
        frappe.session.user === 'Administrator' ||
        frappe.user.has_role('System Manager') ||
        frappe.user.has_role('HO Petty Cash Approver') ||
        frappe.user.has_role('HO Petty Cash Auditor') ||
        frappe.user.has_role('HO Petty Cash Checker') ||
        frappe.user.has_role('HO Petty Cash Manager') ||
        frappe.user.has_role('HO Petty Cash Verifier')
    );
}

function set_custom_business_status(frm) {
    const status = frm.doc.approval_status || 'Draft';
    const color = get_approval_status_color(status);

    frm.page.clear_indicator();
    frm.page.set_indicator(__(status), color);

    frm.page.wrapper.find('.ttum-status-badge').remove();
    if (can_view_ttum_status_badge() && frm.doc.approval_status === 'Verified' && frm.doc.finacle_tran_date) {
        let badge_text = '';
        let badge_color = '';

        if (frm.doc.bulk_ttum_downloaded || frm.doc.exclude_from_ttum) {
            badge_text = __('TTUM Downloaded');
            badge_color = 'green';
        } else {
            badge_text = __('Verified But TTUM Not Downloaded');
            badge_color = 'orange';
        }

        const badge_html = $(`<span class="indicator-pill no-indicator-dot whitespace-nowrap ${badge_color} ttum-status-badge ml-2"><span>${badge_text}</span></span>`);
        frm.page.indicator.after(badge_html);
    }
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

function render_petty_cash_stepper_intro(frm) {
    frm.set_intro('');
    if (frm.dashboard && frm.dashboard.wrapper) {
        frm.dashboard.wrapper.find('.pct-stepper-card').remove();
    }

    const status = frm.doc.approval_status || 'Draft';

    if (status === 'Draft' || frm.is_new()) {
        return;
    }

    frappe.call({
        method: 'sahayog.petty_cash_management.doctype.petty_cash_transaction.petty_cash_transaction.get_workflow_stage_users',
        args: { docname: frm.doc.name },
        callback: function (r) {
            const users_info = r.message || {};
            build_petty_cash_stepper(frm, status, users_info);
        }
    });
}

function build_petty_cash_stepper(frm, status, users_info) {
    const is_over_limit = flt(frm.doc.amount_exceeding_limit) > 0 || ['Pending Checker', 'Pending Approval'].includes(status);
    const rejected_stage = users_info.rejected_by_stage;

    const format_user_badge = (user_obj) => {
        if (!user_obj || !user_obj.user_id) return '';
        const name_str = user_obj.employee_name ? ` • ${user_obj.employee_name}` : '';
        return `<div class="pct-step-user"><span class="pct-uid">${user_obj.user_id}</span>${name_str}</div>`;
    };

    const branch_state = {
        label: __('Branch User'),
        detail: __('Submitted'),
        status: 'completed',
        user: format_user_badge(users_info.branch_user)
    };

    let checker_state = {};
    let approver_state = {};
    let verifier_state = {};
    let ttum_state = {};

    if (!is_over_limit) {
        checker_state = { label: __('Checker'), detail: __('Skipped'), status: 'skipped', user: '' };
        approver_state = { label: __('Approver'), detail: __('Skipped'), status: 'skipped', user: '' };

        if (status === 'Rejected' && rejected_stage === 'Verifier') {
            verifier_state = {
                label: __('Verifier'),
                detail: __('Rejected'),
                status: 'rejected',
                user: format_user_badge(users_info.verifier_user)
            };
        } else {
            const is_verified = status === 'Verified' && frm.doc.finacle_tran_date;
            if (is_verified) {
                verifier_state = {
                    label: __('Verifier'),
                    detail: __('Verified'),
                    status: 'completed',
                    user: format_user_badge(users_info.verifier_user)
                };
            } else {
                verifier_state = {
                    label: __('Verifier'),
                    detail: __('Pending'),
                    status: 'pending',
                    user: format_user_badge(users_info.verifier_user)
                };
            }
        }
    } else {
        if (status === 'Pending Checker') {
            checker_state = {
                label: __('Checker'),
                detail: __('Pending'),
                status: 'pending',
                user: format_user_badge(users_info.checker_user)
            };
            approver_state = { label: __('Approver'), detail: __('Waiting'), status: 'upcoming', user: '' };
        } else if (status === 'Pending Approval') {
            checker_state = {
                label: __('Checker'),
                detail: __('Approved'),
                status: 'completed',
                user: format_user_badge(users_info.checker_user)
            };
            approver_state = {
                label: __('Approver'),
                detail: __('Pending'),
                status: 'pending',
                user: format_user_badge(users_info.approver_user)
            };
        } else if (['Approved', 'Verified'].includes(status)) {
            checker_state = {
                label: __('Checker'),
                detail: __('Approved'),
                status: 'completed',
                user: format_user_badge(users_info.checker_user)
            };
            approver_state = {
                label: __('Approver'),
                detail: __('Approved'),
                status: 'completed',
                user: format_user_badge(users_info.approver_user)
            };
        } else if (status === 'Rejected') {
            if (rejected_stage === 'Checker') {
                checker_state = {
                    label: __('Checker'),
                    detail: __('Rejected'),
                    status: 'rejected',
                    user: format_user_badge(users_info.checker_user)
                };
                approver_state = { label: __('Approver'), detail: __('Waiting'), status: 'upcoming', user: '' };
            } else if (rejected_stage === 'Approver') {
                checker_state = {
                    label: __('Checker'),
                    detail: __('Approved'),
                    status: 'completed',
                    user: format_user_badge(users_info.checker_user)
                };
                approver_state = {
                    label: __('Approver'),
                    detail: __('Rejected'),
                    status: 'rejected',
                    user: format_user_badge(users_info.approver_user)
                };
            } else if (rejected_stage === 'Verifier') {
                checker_state = {
                    label: __('Checker'),
                    detail: __('Approved'),
                    status: 'completed',
                    user: format_user_badge(users_info.checker_user)
                };
                approver_state = {
                    label: __('Approver'),
                    detail: __('Approved'),
                    status: 'completed',
                    user: format_user_badge(users_info.approver_user)
                };
            } else {
                checker_state = { label: __('Checker'), detail: status, status: 'upcoming', user: '' };
                approver_state = { label: __('Approver'), detail: status, status: 'upcoming', user: '' };
            }
        } else {
            checker_state = { label: __('Checker'), detail: status, status: 'upcoming', user: '' };
            approver_state = { label: __('Approver'), detail: status, status: 'upcoming', user: '' };
        }

        if (status === 'Rejected' && rejected_stage === 'Verifier') {
            verifier_state = {
                label: __('Verifier'),
                detail: __('Rejected'),
                status: 'rejected',
                user: format_user_badge(users_info.verifier_user)
            };
        } else {
            verifier_state = {
                label: __('Verifier'),
                detail: __('Skipped (Direct Verified)'),
                status: 'skipped',
                user: format_user_badge(users_info.verifier_user)
            };
        }
    }

    const has_ttum_date = Boolean(frm.doc.ttum_downloaded_date);
    if (has_ttum_date) {
        let type_label = __('Downloaded');
        if (cint(frm.doc.exclude_from_ttum)) {
            type_label = __('Individual Downloaded');
        } else if (cint(frm.doc.bulk_ttum_downloaded)) {
            type_label = __('Bulk Downloaded');
        }
        ttum_state = {
            label: __('TTUM'),
            detail: type_label,
            status: 'completed',
            user: format_user_badge(users_info.ttum_user)
        };
    } else {
        ttum_state = {
            label: __('TTUM'),
            detail: __('Not Downloaded'),
            status: 'upcoming',
            user: ''
        };
    }

    const stages = [branch_state, checker_state, approver_state, verifier_state, ttum_state];

    const get_icon = (st) => {
        if (st === 'completed') return '✓';
        if (st === 'pending') return '●';
        if (st === 'skipped') return '↷';
        if (st === 'rejected') return '✕';
        return '○';
    };

    const get_badge_class = (st) => {
        if (st === 'completed') return 'pct-step-done';
        if (st === 'pending') return 'pct-step-active';
        if (st === 'skipped') return 'pct-step-skipped';
        if (st === 'rejected') return 'pct-step-rejected';
        return 'pct-step-upcoming';
    };

    let steps_html = stages.map((step, idx) => {
        const is_last = idx === stages.length - 1;
        const badge_cls = get_badge_class(step.status);
        const icon = get_icon(step.status);

        return `
            <div class="pct-timeline-step ${badge_cls}">
                <div class="pct-step-body">
                    <div class="pct-step-top">
                        <div class="pct-timeline-marker">
                            <span class="pct-timeline-icon">${icon}</span>
                        </div>
                        <div class="pct-timeline-content">
                            <div class="pct-step-title">${step.label}</div>
                            <div class="pct-step-desc">${step.detail}</div>
                        </div>
                    </div>
                    ${step.user ? `<div class="pct-step-user-wrap">${step.user}</div>` : ''}
                </div>
                ${!is_last ? '<div class="pct-timeline-connector"></div>' : ''}
            </div>
        `;
    }).join('');

    const flow_type_badge = is_over_limit 
        ? '<span class="pct-badge-flow pct-badge-over">⚡ Over Limit Approval Flow</span>' 
        : '<span class="pct-badge-flow pct-badge-within">🛡️ Within Limit Verification Flow</span>';

    const banner_html = `
        <style>
            @keyframes pctPulse {
                0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5); transform: scale(1); }
                50% { transform: scale(1.04); }
                70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
                100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); transform: scale(1); }
            }
            .pct-stepper-card {
                padding: 16px 20px;
                border-radius: 14px;
                background: linear-gradient(145deg, #ffffff, #f8fafc);
                border: 1px solid #e2e8f0;
                box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04);
                margin-bottom: 8px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .pct-stepper-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
                padding-bottom: 10px;
                border-bottom: 1px solid #f1f5f9;
            }
            .pct-stepper-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 700;
                font-size: 12px;
                color: #334155;
                text-transform: uppercase;
                letter-spacing: 0.6px;
            }
            .pct-badge-flow {
                font-size: 11px;
                font-weight: 600;
                padding: 4px 12px;
                border-radius: 20px;
                letter-spacing: 0.3px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .pct-badge-within {
                background: #eff6ff;
                color: #1d4ed8;
                border: 1px solid #bfdbfe;
            }
            .pct-badge-over {
                background: #fff7ed;
                color: #c2410c;
                border: 1px solid #fed7aa;
            }
            .pct-stepper-flow {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                width: 100%;
                overflow-x: auto;
                padding: 4px 2px;
            }
            .pct-timeline-step {
                display: flex;
                align-items: flex-start;
                position: relative;
                flex: 1;
                min-width: 150px;
            }
            .pct-step-body {
                display: flex;
                flex-direction: column;
                width: 100%;
            }
            .pct-step-top {
                display: flex;
                align-items: center;
            }
            .pct-timeline-marker {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 700;
                flex-shrink: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .pct-timeline-content {
                margin-left: 8px;
                line-height: 1.2;
            }
            .pct-step-title {
                font-size: 12px;
                font-weight: 700;
                color: #1e293b;
                letter-spacing: -0.1px;
            }
            .pct-step-desc {
                font-size: 11px;
                color: #64748b;
                margin-top: 2px;
                font-weight: 500;
            }
            .pct-step-user-wrap {
                width: 100%;
                margin-top: 6px;
                display: flex;
                justify-content: center;
            }
            .pct-step-user {
                width: 100%;
                text-align: center;
                padding: 3px 6px;
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                font-size: 10px;
                color: #475569;
                line-height: 1.3;
                word-break: break-word;
            }
            .pct-step-user .pct-uid {
                font-weight: 700;
                color: #0f172a;
            }
            .pct-timeline-connector {
                flex: 1;
                height: 2px;
                background: #e2e8f0;
                margin: 14px 10px 0 10px;
                min-width: 16px;
                border-radius: 2px;
                transition: background 0.3s ease;
            }
            /* Step States */
            .pct-step-done .pct-timeline-marker {
                background: linear-gradient(135deg, #10b981, #059669);
                color: #ffffff;
                box-shadow: 0 3px 8px rgba(16, 185, 129, 0.35);
            }
            .pct-step-done .pct-step-title {
                color: #065f46;
            }
            .pct-step-done .pct-step-desc {
                color: #059669;
                font-weight: 600;
            }
            .pct-step-done .pct-timeline-connector {
                background: #10b981;
            }
            .pct-step-active .pct-timeline-marker {
                background: linear-gradient(135deg, #f97316, #ea580c);
                color: #ffffff;
                animation: pctPulse 2s infinite ease-in-out;
            }
            .pct-step-active .pct-step-title {
                color: #c2410c;
                font-weight: 800;
            }
            .pct-step-active .pct-step-desc {
                color: #ea580c;
                font-weight: 700;
            }
            .pct-step-active .pct-step-user {
                background: #fff7ed;
                border-color: #ffedd5;
            }
            .pct-step-rejected .pct-timeline-marker {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: #ffffff;
                box-shadow: 0 3px 8px rgba(239, 68, 68, 0.35);
            }
            .pct-step-rejected .pct-step-title {
                color: #991b1b;
                font-weight: 800;
            }
            .pct-step-rejected .pct-step-desc {
                color: #dc2626;
                font-weight: 700;
            }
            .pct-step-rejected .pct-step-user {
                background: #fef2f2;
                border-color: #fecaca;
            }
            .pct-step-skipped .pct-timeline-marker {
                background: #94a3b8;
                color: #ffffff;
            }
            .pct-step-skipped .pct-step-title {
                color: #64748b;
            }
            .pct-step-skipped .pct-step-desc {
                color: #94a3b8;
                font-style: italic;
            }
            .pct-step-upcoming .pct-timeline-marker {
                background: #ffffff;
                color: #cbd5e1;
                border: 2px dashed #cbd5e1;
            }
            .pct-step-upcoming .pct-step-title {
                color: #94a3b8;
            }
            .pct-step-upcoming .pct-step-desc {
                color: #cbd5e1;
            }
            .close-message {
                display: none;
            }
        </style>
        <div class="pct-stepper-card">
            <div class="pct-stepper-header">
                <span style="font-weight:700; font-size:12px; color:#334155; text-transform:uppercase; letter-spacing:0.5px;">Workflow Progress</span>
                ${flow_type_badge}
            </div>
            <div class="pct-stepper-flow">
                ${steps_html}
            </div>
        </div>
    `;

    frm.set_intro('');
    if (frm.dashboard && frm.dashboard.wrapper) {
        frm.dashboard.wrapper.find('.form-message, .pct-stepper-card').remove();
    }
    frm.set_intro(banner_html, 'blue');
}