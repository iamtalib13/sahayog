// Override Frappe's default Employee link formatter 
frappe.form.link_formatters['Employee'] = function(value, doc) {
    return value;
};

// --- Child Table Auto-Fetch Approver Name ---
frappe.ui.form.on('Approval Approver', {
    approver: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.approver) {
            frappe.model.set_value(cdt, cdn, 'approver_name', '');
            return;
        }
        frappe.db.get_value('User', row.approver, 'full_name').then(r => {
            frappe.model.set_value(cdt, cdn, 'approver_name', r.message?.full_name || '');
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

// --- Main Document Events ---
frappe.ui.form.on('Approval Request', {
    setup: function(frm) {
        frm.meta.is_submittable = 0;
        if (frm.is_new()) fill_branch_user_details(frm);
    },
    
    refresh: function(frm) {
        frm.meta.is_submittable = 0;

        if (frm.form_wrapper.find('#approval-journey-container').length === 0) {
            frm.form_wrapper.find('.form-layout .form-page').prepend('<div id="approval-journey-container"></div>');
        }

        if (frm.is_new()) {
            fill_branch_user_details(frm);
            frm.form_wrapper.find('#approval-journey-container').empty();
            return; 
        }

        // --- CUSTOM LOCK LOGIC ---
        const is_locked = ['Pending Approval', 'Approved'].includes(frm.doc.status);
        const is_editable = ['Draft', 'Rejected'].includes(frm.doc.status);

        if (is_locked) {
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
        if (is_editable) {
            if (!frm.is_dirty()) {
                let submit_btn = frm.page.add_inner_button(__('Submit Request'), function() {
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

            // BULLETPROOF DIRTY WATCHER
            if (frm._dirty_watcher) clearInterval(frm._dirty_watcher);
            frm._dirty_watcher = setInterval(() => {
                if (frm.is_dirty()) {
                    frm.page.remove_inner_button(__('Submit Request'));
                    clearInterval(frm._dirty_watcher); 
                }
            }, 500);
        }

        // --- ADD APPROVE / REJECT AS STANDALONE INNER BUTTONS ---
        // We now ask the backend if the current user is an approver OR a manager
        if (frm.doc.status === 'Pending Approval') {
            frappe.call({
                method: 'sahayog.sahayog.doctype.approval_request.approval_request.is_valid_approver',
                args: { docname: frm.doc.name },
                callback: function(r) {
                    if (r.message) {
                        let approve_btn = frm.page.add_inner_button(__('Approve'), () => prompt_remark(frm, 'Approved'));
                        approve_btn.removeClass('btn-default').addClass('btn-success').css({'color': 'white', 'font-weight': 'bold'});
                           
                        let reject_btn = frm.page.add_inner_button(__('Reject'), () => prompt_remark(frm, 'Rejected'));
                        reject_btn.removeClass('btn-default').addClass('btn-danger').css({'color': 'white', 'font-weight': 'bold'});
                    }
                }
            });
        }

        // --- OBLITERATE THE ACTIONS DROPDOWN ---
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

        const approvers = (frm.doc.approvers || []).filter(row => row.approver);

        let checkpoints = [
            {
                label: frm.doc.employee_name || frm.doc.employee || 'Employee',
                sublabel: 'Requester',
                user: frm.doc.employee || ''
            }
        ];

        let level_counter = 2;

        for (const row of approvers) {
            checkpoints.push({
                label: row.approver_name || row.approver,
                sublabel: `Level ${level_counter} Approver`,
                user: row.approver
            });
            level_counter++;

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
                    checkpoints.push({
                        label: manager_emp.message.employee_name || manager_emp.message.name,
                        sublabel: `Level ${level_counter} Reports To`,
                        user: manager_emp.message.user_id || manager_emp.message.name
                    });
                    level_counter++;
                }
            }
        }

        if (checkpoints.length < 2) return;

        let active_index = 0;
        let status_label = 'Draft';
        let status_class = 'status-draft';

        if (frm.doc.status === 'Pending Approval') {
            active_index = 1;
            status_label = 'Pending Approval';
            status_class = 'status-pending';
        } else if (frm.doc.status === 'Approved') {
            const acted_index = checkpoints.findIndex(c => c.user === frm.doc.acted_by);
            active_index = acted_index >= 0 ? acted_index : checkpoints.length - 1;
            status_label = `Approved by ${frm.doc.acted_by || ''}`;
            status_class = 'status-approved';
        } else if (frm.doc.status === 'Rejected') {
            const acted_index = checkpoints.findIndex(c => c.user === frm.doc.acted_by);
            active_index = acted_index >= 0 ? acted_index : 1;
            status_label = `Rejected by ${frm.doc.acted_by || ''}`;
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
                    frm.doc.status === 'Rejected' ? 'node-rejected'
                    : frm.doc.status === 'Approved' ? 'node-done'
                    : 'node-active';

                dot_content =
                    frm.doc.status === 'Approved' ? '✓'
                    : frm.doc.status === 'Rejected' ? '✕'
                    : index + 1;
            }

            const connector_class = index < active_index ? 'connector-done' : 'connector-idle';

            return `
                <div class="checkpoint-wrapper">
                    <div class="checkpoint-inner">
                        <div class="checkpoint-dot ${node_class}">${dot_content}</div>
                        <div class="checkpoint-label">${frappe.utils.escape_html(item.label || '')}</div>
                        <div class="checkpoint-sublabel">${frappe.utils.escape_html(item.sublabel || '')}</div>
                    </div>
                    ${!is_last ? `<div class="connector ${connector_class}"></div>` : ''}
                </div>
            `;
        }).join('');

        const remark_html = frm.doc.approver_remark ? `
            <div class="remark-block ${frm.doc.status === 'Rejected' ? 'remark-rejected' : 'remark-approved'}">
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