frappe.listview_settings['Branch Petty Cash Account'] = {
    onload(listview) {
        const is_admin = frappe.session.user === 'Administrator';
        const is_ho_manager = frappe.user.has_role('HO Petty Cash Manager');

        if (!is_admin && !is_ho_manager) return;

        if (is_admin) {
            let dialog = null;
            let log_html = '';

            const render_dialog = () => {
                if (!dialog) {
                    dialog = new frappe.ui.Dialog({
                        title: __('Bulk Finacle Balance sync'),
                        fields: [
                            {
                                fieldtype: 'HTML',
                                fieldname: 'progress_area'
                            }
                        ],
                        primary_action_label: __('Close'),
                        primary_action() {
                            dialog.hide();
                        }
                    });
                }
                dialog.show();
            };

            const update_dialog = (data) => {
                render_dialog();

                log_html += `
                    <div style="padding:6px 0; border-bottom:1px solid #eee;">
                        <b>${frappe.utils.escape_html(data.branch || 'System')}</b> :
                        ${frappe.utils.escape_html(data.message || '')}
                        ${data.balance != null ? ` | Balance: <b>${format_currency(data.balance)}</b>` : ''}
                        ${data.current ? ` | ${data.current}/${data.total}` : ''}
                    </div>
                `;

                dialog.fields_dict.progress_area.$wrapper.html(`
                    <div style="max-height:400px; overflow:auto;">
                        <div style="margin-bottom:10px;">
                            <b>Status:</b> ${frappe.utils.escape_html(data.status || '')}
                        </div>
                        <div>
                            ${log_html}
                        </div>
                    </div>
                `);
            };

            frappe.realtime.on('bulk_finacle_balance_sync', function (data) {
                update_dialog(data);

                if (data.status === 'complete') {
                    frappe.show_alert({
                        message: __('Bulk Finacle Balance sync completed'),
                        indicator: 'green'
                    });
                    listview.refresh();
                }
            });

            listview.page.add_inner_button(__('Bulk Finacle Balance sync'), function () {
                frappe.confirm(
                    __('Are you sure you want to sync Finacle balance for all active branches?'),
                    function () {
                        log_html = '';
                        render_dialog();
                        update_dialog({
                            status: 'queued',
                            message: 'Request accepted. Starting background sync...'
                        });

                        frappe.call({
                            method: 'sahayog.petty_cash_management.api.branch_petty_cash_account_balance_fetch.start_bulk_finacle_balance_sync',
                            callback: function (r) {
                                if (r.message && r.message.status === 'queued') {
                                    frappe.show_alert({
                                        message: __(r.message.message),
                                        indicator: 'blue'
                                    });
                                }
                            }
                        });
                    }
                );
            });
        }

        listview.page.add_inner_button(__('Download Report'), function () {
            const url = '/api/method/sahayog.petty_cash_management.doctype.branch_petty_cash_account.branch_petty_cash_account.download_branch_petty_cash_account_report';
            window.open(url, '_blank');
        });
    }
};