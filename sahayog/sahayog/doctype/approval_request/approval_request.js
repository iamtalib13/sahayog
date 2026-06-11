
// ==============================================================================
// --- FORCE PUBLIC ATTACHMENTS (HIDE PRIVATE TOGGLES IN UPLOADER) ---
// ==============================================================================

// 1. HIDE PRIVACY TOGGLE BUTTONS GLOBALLY FOR THIS FORM
frappe.dom.set_style(`
    /* Hide standard sidebar lock/unlock icons and Make Private actions */
    body.approval-active-form [data-action="toggle_private"],
    body.approval-active-form [data-action="make_private"],
    body.approval-active-form .btn-private,
    body.approval-active-form .btn-public,
    /* Hide dynamically tagged Vue elements inside the Uploader */
    body.approval-active-form .force-hide-privacy-btn {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
    }
`, 'approval-file-privacy-css');

// 2. VUE INTERCEPTOR (MUTATION OBSERVER)
// Continuously monitors the File Uploader modal and actively hides the Private toggles
const privacyObserver = new MutationObserver((mutations) => {
    // Only run if we are on the Approval form AND a modal is open
    if ($('body').hasClass('approval-active-form') && $('.modal-dialog').length > 0) {
        
        // Target buttons and checkboxes inside the modal that aren't hidden yet
        $('.modal-dialog label.frappe-checkbox:not(.force-hide-privacy-btn), .modal-dialog button:not(.force-hide-privacy-btn)').each(function() {
            let text = $(this).text().toLowerCase().trim().replace(/\s+/g, ' ');
            
            if (text === 'private' || text === 'set all private' || text === 'set all public') {
                $(this).addClass('force-hide-privacy-btn');
            }
        });
    }
});

// Start observing the DOM
privacyObserver.observe(document.body, { childList: true, subtree: true });

// Listen to route changes to safely add/remove the CSS scope
frappe.router.on('change', () => {
    if (frappe.get_route()[0] === 'Form' && frappe.get_route()[1] === 'Approval Request') {
        $('body').addClass('approval-active-form');
    } else {
        $('body').removeClass('approval-active-form');
    }
});
// ==============================================================================



// Override Frappe's default Employee link formatter 
frappe.form.link_formatters['Employee'] = function(value, doc) {
    return value;
};

// Show User Full Name instead of Email/ID in User link fields
frappe.form.link_formatters['User'] = function(value, doc, df) {
    if (value) {
        // Look up the user's full name in the browser's local memory
        let full_name = frappe.user_info(value).fullname;
        return full_name ? full_name : value;
    }
    return value;
};

// --- Child Table Auto-Fetch Approver Name ---
frappe.ui.form.on('Approval Approver', {
    selection_type: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        
        // Clear old values when type changes
        frappe.model.set_value(cdt, cdn, 'approver', '');
        frappe.model.set_value(cdt, cdn, 'group_email', '');
        frappe.model.set_value(cdt, cdn, 'approver_name', '');
    },
    approver: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.approver) {
            frappe.model.set_value(cdt, cdn, 'approver_name', '');
            return;
        }

        // Fetch Employee Company Email and Full Name
        frappe.db.get_value('Employee', { 'user_id': row.approver }, ['employee_name', 'company_email'])
            .then(r => {
                if (r.message) {
                    if (!r.message.company_email) {
                        frappe.model.set_value(cdt, cdn, 'approver', '');
                        frappe.model.set_value(cdt, cdn, 'approver_name', '');
                        frappe.msgprint({
                            title: __('Missing Email'),
                            indicator: 'red',
                            message: __('The selected approver (Employee: {0}) does not have a <b>Company Email</b>. Please update their Employee record before selecting them as an approver.', [r.message.employee_name])
                        });
                    } else {
                        frappe.model.set_value(cdt, cdn, 'approver_name', r.message.employee_name || '');
                    }
                } else {
                    // Fallback to User if no Employee record found, but still require an email
                    frappe.db.get_value('User', row.approver, 'email').then(u => {
                        if (u.message && !u.message.email) {
                            frappe.model.set_value(cdt, cdn, 'approver', '');
                            frappe.msgprint(__('Selected User does not have an Email Address.'));
                        } else {
                            frappe.model.set_value(cdt, cdn, 'approver_name', u.message?.full_name || row.approver);
                        }
                    });
                }
            });
    },
    group_email: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.group_email) {
            frappe.model.set_value(cdt, cdn, 'approver_name', '');
            return;
        }
        frappe.db.get_value('Employee Group', row.group_email, 'employee_group_name').then(r => {
            frappe.model.set_value(cdt, cdn, 'approver_name', r.message?.employee_group_name || row.group_email);
        });
    }
});

// --- Helper Functions ---
async function fill_branch_user_details(frm) {
    if (!frm.is_new()) return;
    if (frm.__employee_fetching) return;

    const already_filled = frm.doc.employee && frm.doc.employee_name && frm.doc.designation;
    if (already_filled) return;

    frm.__employee_fetching = true;

    try {
        const r = await frappe.db.get_value(
            'Employee',
            { user_id: frappe.session.user },
            ['name', 'employee_name', 'designation']
        );

        if (r.message) {
            await frm.set_value('employee', r.message.name || '');
            await frm.set_value('employee_name', r.message.employee_name || '');
            await frm.set_value('designation', r.message.designation || '');
        }
    } finally {
        frm.__employee_fetching = false;
    }
}

function prompt_remark(frm, action) {
    frappe.prompt([
        {
            label: 'Remark',
            fieldname: 'remark',
            fieldtype: 'Small Text',
            reqd: 1,
            description: `Please enter your reason to ${action.toLowerCase()} this request.`
        }
    ], function(values) {
        frappe.call({
            method: 'sahayog.sahayog.doctype.approval_request.approval_request.process_approval',
            args: {
                docname: frm.doc.name,
                action: action,
                remark: values.remark
            },
            freeze: true,
            freeze_message: `Processing ${action}...`,
            callback: function(r) {
                if (!r.exc) {
                    frappe.show_alert({message: `Request ${action} Successfully`, indicator: 'green'});
                    frm.reload_doc();
                }
            }
        });
    }, `Confirm ${action}`, 'Submit');
}

function prompt_delegate(frm) {
    frappe.prompt([
        {
            label: 'Delegate To',
            fieldname: 'delegate_user',
            fieldtype: 'Link',
            options: 'User',
            reqd: 1
        },
        {
            label: 'Remark',
            fieldname: 'remark',
            fieldtype: 'Small Text',
            reqd: 1
        }
    ], function(values) {
        frappe.call({
            method: 'sahayog.sahayog.doctype.approval_request.approval_request.delegate_approval',
            args: {
                docname: frm.doc.name,
                delegate_user: values.delegate_user,
                remark: values.remark
            },
            freeze: true,
            freeze_message: 'Delegating...',
            callback: function(r) {
                if (!r.exc) {
                    frappe.show_alert({message: 'Approval Delegated Successfully', indicator: 'green'});
                    frm.reload_doc();
                }
            }
        });
    }, 'Delegate Approval', 'Submit');
}

function prompt_bypass(frm) {
    frappe.prompt([
        {
            label: 'Remark',
            fieldname: 'remark',
            fieldtype: 'Small Text',
            reqd: 1
        }
    ], function(values) {
        frappe.call({
            method: 'sahayog.sahayog.doctype.approval_request.approval_request.bypass_approval',
            args: {
                docname: frm.doc.name,
                remark: values.remark
            },
            freeze: true,
            freeze_message: 'Bypassing...',
            callback: function(r) {
                if (!r.exc) {
                    frappe.show_alert({message: 'Approval Level Bypassed', indicator: 'green'});
                    frm.reload_doc();
                }
            }
        });
    }, 'Bypass Approval Level', 'Submit');
}

// --- Main Document Events ---
frappe.ui.form.on('Approval Request', {
    setup: function(frm) {
        frm.meta.is_submittable = 0;

        // --- CUSTOM FILE UPLOADER OVERRIDE ---
        if (frappe.ui.form.ControlAttach && !frappe.ui.form.ControlAttach.prototype._original_set_upload_options) {
            frappe.ui.form.ControlAttach.prototype._original_set_upload_options = frappe.ui.form.ControlAttach.prototype.set_upload_options;
            frappe.ui.form.ControlAttach.prototype.set_upload_options = function() {
                this._original_set_upload_options();
                if (this.frm && this.frm.doctype === "Approval Request") {
                    this.upload_options.make_attachments_public = true;
                    this.upload_options.allow_toggle_private = false;
                }
            };
        }

        if (frm.is_new()) fill_branch_user_details(frm);

        // --- QUERY FILTERS FOR CHILD TABLE ---
        // Stop "Approver" selection if Type is NOT User
        frm.set_query('approver', 'approvers', function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            if (row.selection_type !== 'User') {
                return { filters: { 'name': ['=', 'FORCE_EMPTY_LINK'] } };
            }
            return {};
        });

        // Stop "Group Email" selection if Type is NOT Group
        frm.set_query('group_email', 'approvers', function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            if (row.selection_type !== 'Group') {
                return { filters: { 'name': ['=', 'FORCE_EMPTY_LINK'] } };
            }
            return {};
        });
    },
    
    refresh: function(frm) {
        frm.meta.is_submittable = 0;

        // --- OVERRIDE DOCUMENT STATUS BADGE ---
        if (frm.doc.approval_status === 'Draft') {
            frm.page.set_indicator(__('Draft'), 'grey');
        } else if (frm.doc.approval_status === 'Pending Approval') {
            frm.page.set_indicator(__('Pending Approval'), 'orange');
        } else if (frm.doc.approval_status === 'Approved') {
            frm.page.set_indicator(__('Approved'), 'green');
        } else if (frm.doc.approval_status === 'Rejected') {
            frm.page.set_indicator(__('Rejected'), 'red');
        } else {
            frm.page.set_indicator(__('Draft'), 'grey');
        }

        if (frm.form_wrapper.find('#approval-journey-container').length === 0) {
            frm.form_wrapper.find('.form-layout .form-page').prepend('<div id="approval-journey-container"></div>');
        }

        if (frm.is_new()) {
            fill_branch_user_details(frm);
            frm.form_wrapper.find('#approval-journey-container').empty();
            return; 
        }

        // --- CUSTOM LOCK LOGIC ---
        const is_locked = ['Pending Approval', 'Approved'].includes(frm.doc.approval_status);
        const is_editable = ['Draft', 'Rejected'].includes(frm.doc.approval_status);
        const is_owner = frm.is_new() || frm.doc.owner === frappe.session.user;

        if (is_locked || !is_owner) {
            frm.disable_save();
            ['title', 'category', 'description', 'approvers', 'attachments'].forEach(field => {
                frm.set_df_property(field, 'read_only', 1);
            });
        } else {
            frm.enable_save();
            ['title', 'category', 'description', 'approvers', 'attachments'].forEach(field => {
                frm.set_df_property(field, 'read_only', 0);
            });
        }

        // --- CLEAR ALL OLD BUTTONS ---
        frm.clear_custom_buttons();
        frm.page.clear_inner_toolbar();

        // --- ADD "SUBMIT REQUEST" AS A STANDALONE INNER BUTTON ---
        if (is_editable && is_owner) {
            if (frm.doc.__unsaved === 1 && !frm.is_new() && !frm.__employee_fetching) {
                frm.doc.__unsaved = 0;
            }

            if (!frm.is_dirty()) {
                let submit_btn = frm.page.add_inner_button(__('Submit Request'), function() {
                    const valid_approvers = (frm.doc.approvers || []).filter(row => 
                        (row.selection_type === 'User' && row.approver) || 
                        (row.selection_type === 'Group' && row.group_email)
                    );
                    
                    if (valid_approvers.length === 0) {
                        frappe.msgprint({
                            title: __('Missing Approver'),
                            indicator: 'red',
                            message: __('You must add at least one Approver or Group in the table before submitting this request.')
                        });
                        return; 
                    }

                    frappe.confirm(__('Are you sure you want to submit this request?'), function() {
                        frappe.call({
                            method: 'sahayog.sahayog.doctype.approval_request.approval_request.submit_for_approval',
                            args: { docname: frm.doc.name },
                            freeze: true,
                            freeze_message: 'Submitting...',
                            callback: function(r) {
                                if (!r.exc) {
                                    frappe.show_alert({message: 'Request Submitted Successfully', indicator: 'green'});
                                    frm.reload_doc();
                                }
                            }
                        });
                    });
                });
                submit_btn.removeClass('btn-default').addClass('btn-primary').css({'color': 'white', 'font-weight': 'bold'});
            }

            if (frm._dirty_watcher) clearInterval(frm._dirty_watcher);
            frm._dirty_watcher = setInterval(() => {
                if (frm.is_dirty() && !frm.__employee_fetching) {
                    frm.page.remove_inner_button(__('Submit Request'));
                    clearInterval(frm._dirty_watcher); 
                }
            }, 300);
        }

        // --- ADD APPROVE / REJECT AS STANDALONE INNER BUTTONS ---
        if (frm.doc.approval_status === 'Pending Approval') {
            frappe.call({
                method: 'sahayog.sahayog.doctype.approval_request.approval_request.is_valid_approver',
                args: { docname: frm.doc.name },
                callback: function(r) {
                    if (r.message && r.message.is_valid) {
                        let approve_btn = frm.page.add_inner_button(__('Approve'), () => prompt_remark(frm, 'Approved'));
                        approve_btn.removeClass('btn-default').addClass('btn-success').css({'color': 'white', 'font-weight': 'bold'});
                           
                        let reject_btn = frm.page.add_inner_button(__('Reject'), () => prompt_remark(frm, 'Rejected'));
                        reject_btn.removeClass('btn-default').addClass('btn-danger').css({'color': 'white', 'font-weight': 'bold'});

                        if (r.message.can_delegate) {
                            let delegate_btn = frm.page.add_inner_button(__('Delegate'), () => prompt_delegate(frm));
                            delegate_btn.removeClass('btn-default').addClass('btn-info').css({'color': 'white', 'font-weight': 'bold'});
                        }

                        if (r.message.can_bypass && !r.message.is_last) {
                            let bypass_btn = frm.page.add_inner_button(__('Bypass'), () => prompt_bypass(frm));
                            bypass_btn.removeClass('btn-default').addClass('btn-warning').css({'color': 'white', 'font-weight': 'bold'});
                        }
                    }
                }
            });
        }

        let action_cleanup_interval = setInterval(() => {
            let $actionBtnGroup = frm.page.wrapper.find('.actions-btn-group');
            if ($actionBtnGroup.length) {
                $actionBtnGroup.attr('style', 'display: none !important');
            }
        }, 50);
        setTimeout(() => clearInterval(action_cleanup_interval), 2000);

        setTimeout(() => frm.trigger('render_approval_progress_intro'), 100);
    },
    category: function(frm) {
        if (frm.doc.category) {
            frappe.db.get_value('Approval Category', frm.doc.category, 'category').then(r => {
                if (r.message && r.message.category) frm.set_value('title', r.message.category);
            });
        }
    },

    render_approval_progress_intro: async function(frm) {
        const container = frm.form_wrapper.find('#approval-journey-container');
        container.empty();

        const approvers = (frm.doc.approvers || []).filter(row => 
            (row.selection_type === 'User' && row.approver) || 
            (row.selection_type === 'Group' && row.group_email)
        );

        let checkpoints = [
            {
                label: frm.doc.employee_name || frm.doc.employee || 'Employee',
                sublabel: 'Requester',
                user: frm.doc.employee || ''
            }
        ];

        let level_counter = 2;

        for (const row of approvers) {
            let label = frappe.utils.escape_html(row.approver_name || (row.selection_type === 'User' ? row.approver : row.group_email));
            
            let status_html = "";
            if (row.approver_status === "Approved") {
                status_html = '<div style="color: #16a34a; font-weight: bold; font-size: 10px; margin-top: 2px;">✓ Approved</div>';
            } else if (row.approver_status === "Pending") {
                status_html = '<div style="color: #f59e0b; font-weight: bold; font-size: 10px; margin-top: 2px;">● Pending</div>';
            } else if (row.approver_status === "Skipped") {
                status_html = '<div style="color: #64748b; font-weight: bold; font-size: 10px; margin-top: 2px;">⤶ Skipped</div>';
            }

            let sublabel = `<div>${frappe.utils.escape_html(row.selection_type)}</div>${status_html}`;
            
            if (row.is_bypassed) {
                label = `<s>${label}</s>`;
                sublabel = '<span style="color: #f59e0b; font-weight: bold;">Bypassed</span>';
            } else if (row.delegated_to) {
                sublabel = `${sublabel}<div style="color: #64748b; font-style: italic; font-size: 10px;">(Delegated)</div>`;
            }

            checkpoints.push({
                label: label,
                sublabel: sublabel,
                user: row.selection_type === 'User' ? row.approver : row.group_email,
                is_bypassed: row.is_bypassed,
                is_delegated: !!row.delegated_to
            });

            if (row.is_bypassed) continue;

            // If Delegated, show Delegate and their Manager (if not already in journey)
            if (row.delegated_to) {
                const is_delegate_already_present = checkpoints.some(c => c.user === row.delegated_to);
                
                if (!is_delegate_already_present) {
                    let d_info = frappe.user_info(row.delegated_to);
                    let d_name = d_info.fullname || row.delegated_to;
                    if (!d_info.fullname) {
                        let res = await frappe.db.get_value('User', row.delegated_to, 'full_name');
                        if (res && res.message) d_name = res.message.full_name;
                    }

                    checkpoints.push({
                        label: frappe.utils.escape_html(d_name),
                        sublabel: '<span style="color: #3b82f6; font-weight: 600;">Delegate</span>',
                        user: row.delegated_to
                    });
                }

                // Delegate's Manager (if not already in journey)
                let d_emp = await frappe.db.get_value('Employee', { user_id: row.delegated_to }, ['reports_to']);
                if (d_emp && d_emp.message && d_emp.message.reports_to) {
                    let d_mgr = await frappe.db.get_value('Employee', d_emp.message.reports_to, ['employee_name', 'user_id']);
                    if (d_mgr && d_mgr.message) {
                        const mgr_user_id = d_mgr.message.user_id || d_mgr.message.name;
                        const is_mgr_already_present = checkpoints.some(c => c.user === mgr_user_id);
                        
                        if (!is_mgr_already_present) {
                            checkpoints.push({
                                label: frappe.utils.escape_html(d_mgr.message.employee_name || d_mgr.message.name),
                                sublabel: 'Delegate Manager',
                                user: mgr_user_id
                            });
                        }
                    }
                }
            } else if (row.selection_type === 'User') {
                // Original Manager (if not already in journey)
                let approver_emp = await frappe.db.get_value(
                    'Employee',
                    { user_id: row.approver },
                    ['name', 'reports_to']
                );

                if (approver_emp && approver_emp.message && approver_emp.message.reports_to) {
                    let manager_emp = await frappe.db.get_value(
                        'Employee',
                        approver_emp.message.reports_to,
                        ['name', 'employee_name', 'user_id']
                    );

                    if (manager_emp && manager_emp.message) {
                        const mgr_user_id = manager_emp.message.user_id || manager_emp.message.name;
                        const is_mgr_already_present = checkpoints.some(c => c.user === mgr_user_id);
                        
                        if (!is_mgr_already_present) {
                            checkpoints.push({
                                label: frappe.utils.escape_html(manager_emp.message.employee_name || manager_emp.message.name),
                                sublabel: 'Manager',
                                user: mgr_user_id
                            });
                        }
                    }
                }
            }
        }

        if (checkpoints.length < 2) return;

        let active_index = 0;
        let status_label = 'Draft';
        let status_class = 'status-draft';

        let acted_by_name = frm.doc.acted_by || '';
        if (frm.doc.acted_by) {
            let acted_user_req = await frappe.db.get_value('User', frm.doc.acted_by, 'full_name');
            if (acted_user_req && acted_user_req.message) {
                acted_by_name = acted_user_req.message.full_name;
            }
        }

        if (frm.doc.approval_status === 'Pending Approval') {
            // Find the first approver (index > 0) who is NOT bypassed AND NOT delegated away
            const first_pending = checkpoints.findIndex((c, i) => i > 0 && !c.is_bypassed && !c.is_delegated);
            active_index = first_pending >= 0 ? first_pending : 1;
            status_label = 'Pending Approval';
            status_class = 'status-pending';
        } else if (frm.doc.approval_status === 'Approved') {
            const acted_index = checkpoints.findIndex(c => c.user === frm.doc.acted_by || c.delegated_to === frm.doc.acted_by);
            active_index = acted_index >= 0 ? acted_index : checkpoints.length - 1;
            status_label = `Approved by ${acted_by_name}`;
            status_class = 'status-approved';
        } else if (frm.doc.approval_status === 'Rejected') {
            const acted_index = checkpoints.findIndex(c => c.user === frm.doc.acted_by || c.delegated_to === frm.doc.acted_by);
            active_index = acted_index >= 0 ? acted_index : 1;
            status_label = `Rejected by ${acted_by_name}`;
            status_class = 'status-rejected';
        }

        const nodes_html = checkpoints.map((item, index) => {
            const is_done = index < active_index;
            const is_current = index === active_index;
            const is_last = index === checkpoints.length - 1;

            let node_class = 'node-idle';
            let dot_content = index + 1;

            if (is_done) {
                node_class = 'node-done';
                dot_content = '✓';
            } else if (is_current) {
                node_class =
                    frm.doc.approval_status === 'Rejected' ? 'node-rejected'
                    : frm.doc.approval_status === 'Approved' ? 'node-done'
                    : 'node-active';

                dot_content =
                    frm.doc.approval_status === 'Approved' ? '✓'
                    : frm.doc.approval_status === 'Rejected' ? '✕'
                    : index + 1;
            }

            const connector_class = index < active_index ? 'connector-done' : 'connector-idle';

            return `
                <div class="checkpoint-wrapper">
                    <div class="checkpoint-inner">
                        <div class="checkpoint-dot ${node_class}">${dot_content}</div>
                        <div class="checkpoint-label">${item.label || ''}</div>
                        <div class="checkpoint-sublabel">${item.sublabel || ''}</div>
                    </div>
                    ${!is_last ? `<div class="connector ${connector_class}"></div>` : ''}
                </div>
            `;
        }).join('');

        const remark_html = frm.doc.approver_remark ? `
            <div class="remark-block ${frm.doc.approval_status === 'Rejected' ? 'remark-rejected' : 'remark-approved'}">
                <span class="remark-label">Remark:</span>
                ${frappe.utils.escape_html(frm.doc.approver_remark)}
            </div>
        ` : '';

        const full_html = `
            <style>
                .custom-approval-journey {
                    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
                    border: 1px solid #dbe7f3;
                    border-radius: 16px;
                    padding: 22px 24px 18px 24px;
                    margin-bottom: 18px;
                    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
                    position: relative;
                    overflow: hidden;
                }
                .custom-approval-journey:before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #3b82f6, #22c55e, #f59e0b);
                }
                .custom-approval-journey .intro-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .custom-approval-journey .intro-title-wrap {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .custom-approval-journey .intro-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: 0.2px;
                }
                .custom-approval-journey .intro-subtitle {
                    font-size: 12px;
                    color: #64748b;
                }
                .custom-approval-journey .status-badge {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 6px 12px;
                    border-radius: 999px;
                    letter-spacing: 0.4px;
                    text-transform: uppercase;
                    white-space: nowrap;
                }
                .custom-approval-journey .status-draft    { background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; }
                .custom-approval-journey .status-pending  { background:#fff7ed; color:#c2410c; border:1px solid #fdba74; }
                .custom-approval-journey .status-approved { background:#dcfce7; color:#15803d; border:1px solid #86efac; }
                .custom-approval-journey .status-rejected { background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; }

                .custom-approval-journey .progress-track {
                    display: flex;
                    align-items: flex-start;
                    overflow-x: auto;
                    padding: 8px 2px 6px;
                    scrollbar-width: thin;
                }
                .custom-approval-journey .checkpoint-wrapper {
                    display: flex;
                    align-items: center;
                    flex: 1 0 auto;
                    min-width: 0;
                }
                .custom-approval-journey .checkpoint-inner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-width: 120px;
                    max-width: 150px;
                }
                .custom-approval-journey .checkpoint-dot {
                    width: 40px;
                    height: 40px;
                    border-radius: 999px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 700;
                    transition: all 0.2s ease;
                }
                .custom-approval-journey .node-idle     { background:#f8fafc; color:#94a3b8; border:2px solid #dbe7f3; }
                .custom-approval-journey .node-active   { background:#fff7ed; color:#ea580c; border:2px solid #fb923c; box-shadow:0 0 0 5px rgba(251,146,60,0.12); }
                .custom-approval-journey .node-done     { background:#16a34a; color:#fff; border:2px solid #16a34a; }
                .custom-approval-journey .node-rejected { background:#dc2626; color:#fff; border:2px solid #dc2626; }

                .custom-approval-journey .checkpoint-label {
                    margin-top: 10px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #0f172a;
                    text-align: center;
                    line-height: 1.35;
                    word-break: break-word;
                }
                .custom-approval-journey .checkpoint-sublabel {
                    margin-top: 3px;
                    font-size: 10px;
                    color: #64748b;
                    text-align: center;
                    line-height: 1.3;
                }
                .custom-approval-journey .connector {
                    flex: 1;
                    height: 5px;
                    border-radius: 999px;
                    margin: 0 8px 34px;
                    min-width: 44px;
                }
                .custom-approval-journey .connector-idle { background: #e2e8f0; }
                .custom-approval-journey .connector-done { background: linear-gradient(90deg, #22c55e, #4ade80); }

                .custom-approval-journey .remark-block {
                    margin-top: 16px;
                    padding: 12px 14px;
                    border-radius: 10px;
                    font-size: 12px;
                    color: #334155;
                    line-height: 1.6;
                    border-left: 4px solid;
                }
                .custom-approval-journey .remark-approved { background:#f0fdf4; border-color:#16a34a; }
                .custom-approval-journey .remark-rejected { background:#fef2f2; border-color:#dc2626; }
                .custom-approval-journey .remark-label { font-weight:700; margin-right:4px; }
            </style>

            <div class="custom-approval-journey">
                <div class="intro-header">
                    <div class="intro-title-wrap">
                        <div class="intro-title">Approval Journey</div>
                        <div class="intro-subtitle">Requester to approver chain with reporting manager path</div>
                    </div>
                    <div class="status-badge ${status_class}">${frappe.utils.escape_html(status_label)}</div>
                </div>

                <div class="progress-track">
                    ${nodes_html}
                </div>

                ${remark_html}
            </div>
        `;

        container.html(full_html);
    }
});
