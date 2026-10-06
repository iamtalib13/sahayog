frappe.listview_settings["Lead"] = {
  get_indicator(doc) {
    if (doc.custom_verification_status === "Pending") {
      return [__("Verification Pending"), "orange", "custom_verification_status,=,Pending"];
    } else if (doc.custom_verification_status === "Rejected") {
      return [__("Verification Rejected"), "red", "custom_verification_status,=,Rejected"];
    }
  },
  refresh(listview) {
    const roles = frappe.user_roles || (frappe.boot && frappe.boot.user && frappe.boot.user.roles) || [];
    const is_privileged = roles.includes("System Manager") || frappe.session.user === "Administrator";
    const is_bm = roles.includes("Branch Manager") || is_privileged;

    listview.page.add_inner_button(__("Today's Lead Report"), function () {
      frappe.set_route("query-report", "Lead Report");
    });

    listview.page.add_inner_button(__("BM Lead Verification"), function () {
      openBMVerificationModal(listview);
    });

    if (is_privileged) {
      listview.page.add_inner_button(__("Generate Fast Report"), function () {
        frappe.show_alert({ message: __("Generating CSV Report..."), indicator: "orange" });
        frappe.call({
          method: "sahayog.scrm.api.report_access.generate_fast_lead_report",
          freeze: true,
          freeze_message: __("Generating Fast Lead Report..."),
          callback: function (r) {
            if (r.message && r.message.status === "success") {
              frappe.msgprint({
                title: __("Report Generated"),
                indicator: "green",
                message: __(`Report generated successfully using <b>${r.message.method}</b>.<br>File Size: <b>${r.message.size_kb} KB</b>.<br>Click 'Download Report' to download the CSV.`)
              });
            }
          }
        });
      }, __("Fast Report Test"));

      listview.page.add_inner_button(__("Download Report"), function () {
        let download_url = "/api/method/sahayog.scrm.api.report_access.download_fast_lead_report";
        window.open(download_url, "_blank");
      }, __("Fast Report Test"));
    }

    listview.page.add_inner_button(__("Filter by Employee"), function () {
      let dialog = new frappe.ui.Dialog({
        title: __("Select Employee"),
        fields: [
          {
            fieldname: "employee",
            fieldtype: "Link",
            options: "Employee",
            label: __("Employee"),
            reqd: 1,
          },
        ],
        primary_action_label: __("Apply Filter"),
        primary_action(values) {
          let emp = values.employee;
          if (!emp) {
            frappe.msgprint(__("Please select an employee"));
            return;
          }
          frappe.db.get_value("Employee", emp, "user_id").then((r) => {
            let user_id = (r.message && r.message.user_id) || null;
            if (user_id) {
              listview.filter_area.clear().then(() => {
                listview.filter_area.add("Lead", "lead_owner", "=", user_id);
              });
              dialog.hide();
            } else {
              frappe.msgprint(
                __("Selected employee does not have a User ID linked"),
              );
            }
          });
        },
      });
      dialog.show();
    });
  },
};

function openBMVerificationModal(listview) {
  let selected_status = "Pending";
  let dialog = new frappe.ui.Dialog({
    title: __("BM Lead Verification"),
    size: "large",
    fields: [
      { fieldtype: "HTML", fieldname: "metrics_html" },
      {
        label: __("Filter Status"),
        fieldname: "status_filter",
        fieldtype: "Select",
        options: ["Pending", "Verified", "Rejected", "All"],
        default: "Pending",
        onchange() {
          selected_status = dialog.get_value("status_filter");
          loadVerificationData();
        }
      },
      { fieldtype: "HTML", fieldname: "leads_table_html" }
    ],
    primary_action_label: __("Verify Selected"),
    primary_action: async () => {
      let selected = [];
      dialog.$wrapper.find('.chk-lead-verify:checked').each(function() {
        selected.push($(this).val());
      });
      if (selected.length === 0) {
        frappe.msgprint(__("Please select at least one lead to verify."));
        return;
      }
      frappe.show_alert({ message: __("Verifying leads..."), indicator: "orange" });
      let res = await frappe.call({
        method: "sahayog.scrm.controller.lead.lead.verify_branch_leads",
        args: { lead_names: selected, action: "Verified" }
      });
      if (res.message && res.message.status === "success") {
        frappe.show_alert({ message: __(`${res.message.count} Leads Verified successfully!`), indicator: "green" });
        if (listview) listview.refresh();
        loadVerificationData();
      }
    },
    secondary_action_label: __("Reject Selected"),
    secondary_action: async () => {
      let selected = [];
      dialog.$wrapper.find('.chk-lead-verify:checked').each(function() {
        selected.push($(this).val());
      });
      if (selected.length === 0) {
        frappe.msgprint(__("Please select at least one lead to reject."));
        return;
      }
      frappe.prompt([
        { label: "Rejection Remarks", fieldname: "remarks", fieldtype: "Small Text", reqd: 1 }
      ], async (vals) => {
        let res = await frappe.call({
          method: "sahayog.scrm.controller.lead.lead.verify_branch_leads",
          args: { lead_names: selected, action: "Rejected", remarks: vals.remarks }
        });
        if (res.message && res.message.status === "success") {
          frappe.show_alert({ message: __(`${res.message.count} Leads Rejected.`), indicator: "red" });
          if (listview) listview.refresh();
          loadVerificationData();
        }
      }, __("Confirm Rejection"), __("Reject Leads"));
    }
  });

  async function loadVerificationData() {
    dialog.fields_dict.leads_table_html.$wrapper.html('<div style="text-align:center;padding:20px;"><i class="fa fa-spinner fa-spin fa-2x text-muted"></i></div>');
    let res = await frappe.call({
      method: "sahayog.scrm.controller.lead.lead.get_bm_lead_verification_data",
      args: { status: selected_status }
    });
    if (!res.message) return;
    let m = res.message.metrics || {};
    let leads = res.message.leads || [];

    dialog.fields_dict.metrics_html.$wrapper.html(`
      <div style="display:flex; gap:12px; margin-bottom:15px;">
        <div style="flex:1; background:#fef3c7; color:#92400e; padding:10px 14px; border-radius:8px; border-left:4px solid #f59e0b;">
          <div style="font-size:11px; font-weight:bold; text-transform:uppercase;">Total Pending</div>
          <div style="font-size:20px; font-weight:bold;">${m.total_pending || 0}</div>
        </div>
        <div style="flex:1; background:#fee2e2; color:#991b1b; padding:10px 14px; border-radius:8px; border-left:4px solid #ef4444;">
          <div style="font-size:11px; font-weight:bold; text-transform:uppercase;">Today's Pending</div>
          <div style="font-size:20px; font-weight:bold;">${m.today_pending || 0}</div>
        </div>
        <div style="flex:1; background:#ffedd5; color:#9a3412; padding:10px 14px; border-radius:8px; border-left:4px solid #f97316;">
          <div style="font-size:11px; font-weight:bold; text-transform:uppercase;">Yesterday's Pending</div>
          <div style="font-size:20px; font-weight:bold;">${m.yesterday_pending || 0}</div>
        </div>
        <div style="flex:1; background:#f3f4f6; color:#374151; padding:10px 14px; border-radius:8px; border-left:4px solid #6b7280;">
          <div style="font-size:11px; font-weight:bold; text-transform:uppercase;">Older Pending</div>
          <div style="font-size:20px; font-weight:bold;">${m.older_pending || 0}</div>
        </div>
      </div>
    `);

    if (leads.length === 0) {
      dialog.fields_dict.leads_table_html.$wrapper.html('<div style="text-align:center;padding:25px;color:#6b7280;">No leads found for this verification status.</div>');
      return;
    }

    let rowsHtml = leads.map(l => {
      let badgeClass = l.custom_verification_status === "Verified" ? "background:#dcfce7;color:#166534;" : (l.custom_verification_status === "Rejected" ? "background:#fee2e2;color:#991b1b;" : "background:#fef3c7;color:#92400e;");
      let cDate = l.creation ? frappe.datetime.str_to_user(l.creation) : "-";
      return `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:8px;"><input type="checkbox" class="chk-lead-verify" value="${l.name}"></td>
          <td style="padding:8px;"><a href="/app/lead/${l.name}" target="_blank" style="font-weight:bold;color:#2563eb;">${l.name}</a><br><small style="color:#6b7280;">${l.lead_name || ''}</small></td>
          <td style="padding:8px;">${l.mobile_no || '-'}</td>
          <td style="padding:8px;">${l.custom_employee_name || '-'}<br><small style="color:#6b7280;">(${l.custom_employee_id || '-'})</small></td>
          <td style="padding:8px;font-size:11px;">${cDate}</td>
          <td style="padding:8px;"><span style="padding:2px 8px;border-radius:12px;font-weight:bold;font-size:11px;${badgeClass}">${l.custom_verification_status || 'Pending'}</span></td>
        </tr>
      `;
    }).join('');

    dialog.fields_dict.leads_table_html.$wrapper.html(`
      <div style="max-height:350px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:6px;">
        <table class="table table-bordered table-sm" style="margin:0; font-size:12px;">
          <thead style="background:#f9fafb; position:sticky; top:0;">
            <tr>
              <th style="width:30px;"><input type="checkbox" id="chk-select-all-leads"></th>
              <th>Lead ID / Name</th>
              <th>Mobile</th>
              <th>Employee</th>
              <th>Created On</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `);

    dialog.$wrapper.find('#chk-select-all-leads').on('change', function() {
      let checked = $(this).is(':checked');
      dialog.$wrapper.find('.chk-lead-verify').prop('checked', checked);
    });
  }

  dialog.show();
  loadVerificationData();
}
