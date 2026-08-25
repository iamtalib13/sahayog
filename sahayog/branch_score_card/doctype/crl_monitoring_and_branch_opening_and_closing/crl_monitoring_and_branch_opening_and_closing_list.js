frappe.listview_settings['CRL Monitoring and Branch Opening and Closing'] = {
    indicator: function (doc) {
        let issue_docs = frappe.listview_settings['CRL Monitoring and Branch Opening and Closing'].sync_issue_docs || [];
        let partial_docs = frappe.listview_settings['CRL Monitoring and Branch Opening and Closing'].partial_issue_docs || [];

        if (issue_docs.includes(doc.name) || doc.has_sync_issue) {
            return [__("Failed"), "red", "name,=," + doc.name];
        }

        let status = (doc.status || doc.sync_status || "").trim().toLowerCase();

        if (partial_docs.includes(doc.name) || status.includes("partially") || status === "partially success") {
            return [__("Partially Success"), "orange", "name,=," + doc.name];
        } 
        else if (status === "failed" || status === "fail" || status === "issue detected") {
            return [__("Failed"), "red", "name,=," + doc.name];
        } 
        else {
            return [__("Success"), "green", "name,=," + doc.name];
        }
    },

    get_indicator(doc) {
        return frappe.listview_settings['CRL Monitoring and Branch Opening and Closing'].indicator(doc);
    },

    refresh(listview) {
        render_manual_sync_button_filter(listview);
        fetch_and_render_warnings(listview);
    },

    post_render(listview) {
        if (listview.selected_client_status && listview.selected_client_status !== "All") {
            apply_client_side_status_filter(listview, listview.selected_client_status);
        }
    }
};

// Render 'Manual Sync' and Filter Dropdown
function render_manual_sync_button_filter(listview) {
    $('#manual-sync-filter-btn-group').remove();
    $('#status-filter-btn-group').remove();

    // 1. Manual Sync Button
    let $sync_btn_group = $(`
        <div id="manual-sync-filter-btn-group" class="btn-group" style="margin-right: 8px;">
            <button id="manual-sync-filter-btn" class="btn btn-default btn-xs btn-sm" style="background-color: #006768; color: #ffffff; border-color: #006768; display: inline-flex; align-items: center; justify-content: center;">
                <i class="fa fa-refresh" style="margin-right: 5px; color: #ffffff; font-size: 11px;"></i> 
                <span style="color: #ffffff;">${__('Manual Sync')}</span>
            </button>
        </div>
    `);

    $sync_btn_group.find('#manual-sync-filter-btn').on('click', function () {
        show_bulk_sync_dialog(listview);
    });

    let current_status = listview.selected_client_status;
    let current_label = (!current_status || current_status === "All" || current_status === "All Status") 
        ? __('Status') 
        : current_status;

    // 2. Status Dropdown (Z-Index fix applied to list container/dropdown)
    let $status_btn_group = $(`
        <div id="status-filter-btn-group" class="btn-group" style="margin-right: 8px; z-index: 100;">
            <button class="btn btn-default btn-xs btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="background-color: #006768; color: #ffffff; border-color: #006768; display: inline-flex; align-items: center; justify-content: center;">
                <i class="fa fa-filter" style="margin-right: 5px; color: #ffffff; font-size: 11px;"></i> 
                <span id="selected-status-label" style="color: #ffffff;">${current_label}</span> 
                <span class="caret" style="border-top-color: #ffffff; margin-left: 5px;"></span>
            </button>
            <ul class="dropdown-menu" style="min-width: 160px; padding: 6px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1050;">
                <li style="margin-bottom: 3px;">
                    <a class="dropdown-item status-filter-opt" data-status="All" style="display: block; text-decoration: none;">
                        <span style="
                            display: block; 
                            padding: 5px 12px; 
                            background-color: #f3f4f6; 
                            color: #374151; 
                            font-weight: 500; 
                            border-radius: 12px; 
                            text-align: center; 
                            font-size: 12px;
                            border: 1px solid #e5e7eb;
                        ">${__('All Status')}</span>
                    </a>
                </li>
                <li style="margin-bottom: 3px;">
                    <a class="dropdown-item status-filter-opt" data-status="Success" style="display: block; text-decoration: none;">
                        <span style="
                            display: block; 
                            padding: 5px 12px; 
                            background-color: #e6f4ea; 
                            color: #137333; 
                            font-weight: 500; 
                            border-radius: 12px; 
                            text-align: center; 
                            font-size: 12px;
                            border: 1px solid #ceead6;
                        ">${__('Success')}</span>
                    </a>
                </li>
                <li style="margin-bottom: 3px;">
                    <a class="dropdown-item status-filter-opt" data-status="Failed" style="display: block; text-decoration: none;">
                        <span style="
                            display: block; 
                            padding: 5px 12px; 
                            background-color: #fce8e6; 
                            color: #c5221f; 
                            font-weight: 500; 
                            border-radius: 12px; 
                            text-align: center; 
                            font-size: 12px;
                            border: 1px solid #fad2cf;
                        ">${__('Failed')}</span>
                    </a>
                </li>
                <li>
                    <a class="dropdown-item status-filter-opt" data-status="Partially Success" style="display: block; text-decoration: none;">
                        <span style="
                            display: block; 
                            padding: 5px 12px; 
                            background-color: #fef7e0; 
                            color: #b06000; 
                            font-weight: 500; 
                            border-radius: 12px; 
                            text-align: center; 
                            font-size: 12px;
                            border: 1px solid #feefc3;
                        ">${__('Partially Success')}</span>
                    </a>
                </li>
            </ul>
        </div>
    `);

    // Helper function to reset status to 'All'
    function reset_status_to_all() {
        listview.selected_client_status = "All";
        $('#selected-status-label').text(__('Status'));
        listview.filter_area.remove('name');
        listview.refresh();
    }

    $status_btn_group.find('.status-filter-opt').on('click', function (e) {
        e.preventDefault();
        let selected_status = $(this).attr('data-status');
        
        listview.selected_client_status = selected_status;
        
        let display_text = (selected_status === "All" || selected_status === "All Status") ? __('Status') : selected_status;
        $('#selected-status-label').text(display_text);

        let issue_docs = frappe.listview_settings['CRL Monitoring and Branch Opening and Closing'].sync_issue_docs || [];
        let partial_docs = frappe.listview_settings['CRL Monitoring and Branch Opening and Closing'].partial_issue_docs || [];

        listview.filter_area.remove('name');

        if (selected_status === "Failed") {
            if (issue_docs.length > 0) {
                listview.filter_area.add([[listview.doctype, 'name', 'in', issue_docs]]);
            } else {
                frappe.msgprint({
                    title: __('No Records Found'),
                    indicator: 'orange',
                    message: __('No records found matching the "Failed" status filter. Resetting to show all records.'),
                    callback: function() {
                        reset_status_to_all();
                    }
                });
            }
        } 
        else if (selected_status === "Partially Success") {
            if (partial_docs.length > 0) {
                listview.filter_area.add([[listview.doctype, 'name', 'in', partial_docs]]);
            } else {
                frappe.msgprint({
                    title: __('No Records Found'),
                    indicator: 'orange',
                    message: __('No records found matching the "Partially Success" status filter. Resetting to show all records.'),
                    callback: function() {
                        reset_status_to_all();
                    }
                });
            }
        }
        else if (selected_status === "Success") {
            let combined_issues = Array.from(new Set([...issue_docs, ...partial_docs]));
            if (combined_issues.length > 0) {
                listview.filter_area.add([[listview.doctype, 'name', 'not in', combined_issues]]);
            } else {
                listview.refresh();
            }
        } 
        else {
            listview.refresh();
        }
    });

    let $wrapper = $(listview.page.wrapper);
    let $filter_btn = $wrapper.find('.filter-button, .btn-filter, [data-original-title="Filter"]').first();

    if ($filter_btn.length) {
        $sync_btn_group.insertBefore($filter_btn);
        $status_btn_group.insertBefore($filter_btn);
    } else {
        listview.page.add_inner_button(__('Manual Sync'), function () {
            show_bulk_sync_dialog(listview);
        });
    }
}

// Client-side DOM Row Filter
function apply_client_side_status_filter(listview, filter_value) {
    let $list_rows = $(listview.page.wrapper).find('.list-row-container');

    if (!filter_value || filter_value === "All") {
        $list_rows.show();
        return;
    }

    $list_rows.each(function () {
        let $row = $(this);
        let row_status_text = $row.find('.indicator-pill, .level-item, .badge').text().trim().toLowerCase();

        if (filter_value.toLowerCase() === "failed" && row_status_text.includes("failed")) {
            $row.show();
        } 
        else if (filter_value.toLowerCase() === "success" && (row_status_text.includes("success") && !row_status_text.includes("partially"))) {
            $row.show();
        } 
        else if (filter_value.toLowerCase() === "partially success" && row_status_text.includes("partially")) {
            $row.show();
        } 
        else {
            $row.hide();
        }
    });
}

// Fetch Warning Banner & Store Document Lists
function fetch_and_render_warnings(listview) {
    if (listview.is_fetching_warnings) return;
    listview.is_fetching_warnings = true;

    frappe.call({
        method: "sahayog.branch_score_card.doctype.crl_monitoring_and_branch_opening_and_closing.crl_monitoring_and_branch_opening_and_closing.get_list_view_sync_warnings",
        callback: function (r) {
            listview.is_fetching_warnings = false;

            let res = r.message || {};
            let issue_docs = Array.isArray(res) ? res : (res.issue_docs || []);
            let partial_docs = res.partial_docs || [];
            let details = res.details || [];
            let total_count = res.total_count || issue_docs.length;

            frappe.listview_settings['CRL Monitoring and Branch Opening and Closing'].sync_issue_docs = issue_docs;
            frappe.listview_settings['CRL Monitoring and Branch Opening and Closing'].partial_issue_docs = partial_docs;

            $('#list-sync-alert-banner').remove();

            if (total_count > 0 || res.has_issue) {
                let details_html = "";
                if (details && details.length > 0) {
                    details_html = `<ul style="margin-top: 8px; margin-bottom: 0; padding-left: 18px; font-size: 12px; line-height: 1.6;">`;
                    
                    let max_display = Math.min(details.length, 10);
                    for (let i = 0; i < max_display; i++) {
                        let item = details[i];
                        let log_str = item.log ? `: ${item.log}` : "";
                        details_html += `<li><b>Document ${item.docname}:</b> <b>${item.date}</b> — ${log_str}</li>`;
                    }
                    
                    if (details.length > 10) {
                        details_html += `<li><i>...and ${details.length - 10} more sync issues found.</i></li>`;
                    }
                    
                    details_html += `</ul>`;
                }

                // z-index: 1 keeps banner layered beneath dropdown menus
                let alert_html = `
                    <div id="list-sync-alert-banner" class="alert alert-danger" style="margin: 10px 15px; padding: 12px 18px; border-radius: 8px; background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 13px; position: relative; z-index: 1;">
                        <div style="display: flex; align-items: flex-start; gap: 10px;">
                            <i class="fa fa-exclamation-triangle" style="font-size: 18px; color: #dc2626; margin-top: 2px;"></i>
                            <div style="flex-grow: 1;">
                                <div style="font-weight: bold; font-size: 14px; color: #7f1d1d;">
                                    Attention: Data Integrity & Sync Issues Detected!
                                </div>
                                <div style="margin-top: 2px;">
                                    A total of <b>${total_count}</b> record(s) have missing working day entries or synchronization failures:
                                </div>
                                ${details_html}
                            </div>
                        </div>
                    </div>
                `;

                let $wrapper = $(listview.page.wrapper);
                let $target = $wrapper.find('.page-content, .layout-main-section').first();
                
                if ($target.length) {
                    $target.prepend(alert_html);
                } else {
                    $(listview.page.main).prepend(alert_html);
                }
            }
        },
        error: function() {
            listview.is_fetching_warnings = false;
        }
    });
}

function show_bulk_sync_dialog(listview) {
    let yesterday = frappe.datetime.add_days(frappe.datetime.get_today(), -1);

    let d = new frappe.ui.Dialog({
        title: __('Bulk Finacle Manual Sync'),
        fields: [
            {
                label: __('From Date'),
                fieldname: 'from_date',
                fieldtype: 'Date',
                reqd: 1,
                default: frappe.datetime.month_start()
            },
            {
                label: __('To Date'),
                fieldname: 'to_date',
                fieldtype: 'Date',
                reqd: 1,
                default: yesterday
            },
            {
                fieldname: 'progress_html',
                fieldtype: 'HTML'
            }
        ],
        primary_action_label: __('Sync All Branches'),
        primary_action(values) {
            if (!validate_bulk_dates(values)) return;

            frappe.confirm(
                __("Are you sure you want to Bulk Sync Finacle data for all branches from <b>{0}</b> to <b>{1}</b>?", [values.from_date, values.to_date]),
                function() {
                    execute_bulk_sync(listview, d, values);
                },
                function() {
                    frappe.show_alert({ message: __('Bulk Sync Cancelled'), indicator: 'info' });
                }
            );
        }
    });

    d.show();

    let $primary_btn = d.get_primary_btn();
    if ($primary_btn && $primary_btn.length) {
        $primary_btn.css({
            'background-color': '#006768',
            'border-color': '#006768',
            'color': '#ffffff'
        });
    }
}

function execute_bulk_sync(listview, dialog, values) {
    frappe.realtime.on('bulk_sync_progress', (data) => {
        let html = `
            <div style="margin-top: 15px;">
                <p><b>Processing Date:</b> ${data.current_date} (${data.current}/${data.total})</p>
                <div class="progress" style="height: 18px; background-color: #e5e7eb; border-radius: 4px;">
                    <div class="progress-bar progress-bar-striped active" role="progressbar" 
                         style="width: ${data.percent}%; background-color: #006768; color: #ffffff; line-height: 18px; font-weight: bold;">
                        ${data.percent}%
                    </div>
                </div>
            </div>
        `;
        dialog.fields_dict.progress_html.$wrapper.html(html);
    });

    dialog.get_primary_btn().prop('disabled', true);

    frappe.call({
        method: "sahayog.branch_score_card.doctype.crl_monitoring_and_branch_opening_and_closing.crl_monitoring_and_branch_opening_and_closing.manual_sync_failed_partial",
        args: {
            from_date: values.from_date,
            to_date: values.to_date
        },
        callback: function (r) {
            frappe.realtime.off('bulk_sync_progress');
            dialog.hide();

            if (!r.exc && r.message) {
                frappe.msgprint({
                    title: __(r.message.status || 'Bulk Sync Result'),
                    indicator: r.message.indicator || 'green',
                    message: __(r.message.message)
                });
                listview.refresh();
            }
        },
        error: function () {
            frappe.realtime.off('bulk_sync_progress');
            dialog.get_primary_btn().prop('disabled', false);
        }
    });
}

function validate_bulk_dates(values) {
    if (!values || !values.from_date || !values.to_date) return false;

    let today = moment().startOf('day');
    let f_date = moment(values.from_date);
    let t_date = moment(values.to_date);

    if (f_date.isSameOrAfter(today) || t_date.isSameOrAfter(today)) {
        frappe.msgprint(__('<b>From Date</b> or <b>To Date</b> cannot be today or a future date.'));
        return false;
    }

    if (t_date.isBefore(f_date)) {
        frappe.msgprint(__('<b>To Date</b> must be greater than or equal to <b>From Date</b>.'));
        return false;
    }

    let diff_days = t_date.diff(f_date, 'days') + 1;
    if (diff_days > 31) {
        frappe.msgprint(__('Selected Date Range is <b>{0} days</b>. Maximum <b>31 days</b> range allowed.', [diff_days]));
        return false;
    }

    return true;
}