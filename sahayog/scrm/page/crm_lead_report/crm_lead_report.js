frappe.pages["crm-lead-report"].on_page_load = async function (wrapper) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "CRM Leads Report",
    single_column: true,
  });

  const $container = $(page.body).empty();
  const user = frappe.session.user;

  // Fetch Report Preference
  let pref_res = await frappe.call({
    method: "sahayog.scrm.api.report_access.get_user_report_preference_record",
    args: { user: user, report_type: "Lead" },
  });

  const prefs = pref_res.message || [];

  // ❌ Access denied
  if (!prefs.length && user !== "Administrator") {
    $container.html(`
      <div class="text-center text-muted">
        <h4>You are not authorized to view this report.</h4>
      </div>
    `);
    return;
  }

  // ℹ️ Admin with no preferences
  if (!prefs.length && user === "Administrator") {
    $container.html(`
      <div class="text-center text-muted">
        <h5>No Report Preference records found.</h5>
      </div>
    `);
    return;
  }

  // Helper
  function inline_list(label, values) {
    if (!values || !values.length) return "";
    return `<strong>${label}:</strong> ${values.join(", ")} | `;
  }

  // ---------- Intro Section ----------
  prefs.forEach((pref) => {
    $container.append(`
      <div style="
        background:#eef6ff;
        border-left:4px solid #4f46e5;
        padding:12px 14px;
        border-radius:8px;
        margin-bottom:16px;
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        font-size:14px;
      ">
        <div style="flex:1; line-height:1.6;">
          📋 <strong>Your Report Preferences:</strong>
          ${inline_list("Regions", pref.region)}
          ${inline_list("Zones", pref.zone)}
          ${inline_list("District", pref.district ? [pref.district] : [])}
          ${inline_list("State", pref.state ? [pref.state] : [])}
          ${inline_list("Products", pref.product)}
          ${inline_list("Sources", pref.source)}
          ${inline_list("SOL IDs", pref.sol_id)}
        </div>

        <div>
          <button class="btn btn-sm btn-default"
            onclick="frappe.set_route('List', 'Report Preference')">
            ✏️ Edit
          </button>
        </div>
      </div>
    `);
  });

  // -----------------------------
  // Date Filters
  // -----------------------------
  const today = frappe.datetime.get_today();

  $container.append(`
    <div class="card mb-3 p-3">
      <div class="row align-items-end">
        <div class="col-md-3">
          <label>From Date</label>
          <input type="date" class="form-control" id="from_date" value="${today}">
        </div>

        <div class="col-md-3">
          <label>To Date</label>
          <input type="date" class="form-control" id="to_date" value="${today}">
        </div>

        <div class="col-md-2">
          <button class="btn btn-dark mt-4 w-100" id="apply_filters">
            Apply
          </button>
        </div>

        <div class="col-md-4 d-flex justify-content-end">
          <button class="btn btn-success mt-4 px-4" id="export_leads">
            ⬇ Export
          </button>
        </div>
      </div>
    </div>

    <div class="alert alert-info mt-3">
      <b>ℹ Info:</b>
      Leads are not displayed in this report.
      Please use the <b>Export</b> button to download filtered leads.
    </div>
  `);
  // ... existing code (filters ke baad) ...

  // 1. Table Container (Bohat saari fields hain isliye table-responsive zaroori hai)
  $container.append(`
    <div id="leads-preview-section" class="mt-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h5>Lead Preview (Filter Testing)</h5>
            <div id="stats-badge-container"></div>
        </div>
        <div class="table-responsive" style="max-height: 600px; border: 1px solid #d1d8dd;">
            <table class="table table-bordered table-hover bg-white" style="font-size: 11px; min-width: 1800px;">
                <thead class="thead-light" style="position: sticky; top: 0; z-index: 10;">
                    <tr>
                        <th>Sr.No.</th>
                        <th>Status</th>
                        <th>Lead ID</th>
                        <th>Customer</th>
                        <th>Contact</th>
                        <th>Source</th>
                        <th>Product Code</th>
                        <th>Product Name</th>
                        <th>Amount</th>
                        <th>Employee Name</th>
                        <th>Employee ID</th>
                        <th>Designation</th>
                        <th>SOL ID</th>
                        <th>Branch</th>
                        <th>District</th>
                        <th>Region</th>
                        <th>Zone</th>
                        <th>Created On</th>
                    </tr>
                </thead>
                <tbody id="leads-table-body">
                    <tr><td colspan="18" class="text-center text-muted">Select dates and click Apply to test filters</td></tr>
                </tbody>
            </table>
        </div>
    </div>
`);

  // 2. Apply Filters Logic
  $("#apply_filters").on("click", async () => {
    const from_date = $("#from_date").val();
    const to_date = $("#to_date").val();

    if (!from_date || !to_date) {
      frappe.msgprint(__("Please select date range"));
      return;
    }

    $("#leads-table-body").html(
      '<tr><td colspan="18" class="text-center">Fetching data...</td></tr>',
    );

    try {
      let res = await frappe.call({
        method: "sahayog.scrm.api.report_access.get_leads",
        args: { from_date, to_date, limit: 100 }, // Testing ke liye 100 kaafi hain
      });

      const data = res.message;
      const leads = data.leads || [];
      const stats = data.stats || {};

      // Update Stats Summary
      $("#stats-badge-container").html(`
            <span class="badge badge-info">Total: ${stats.total}</span>
            <span class="badge badge-success">Converted: ${stats.converted}</span>
            <span class="badge badge-warning">Follow Up: ${stats.follow_up}</span>
        `);

      let html = "";
      if (leads.length === 0) {
        html =
          '<tr><td colspan="18" class="text-center">No leads found for these criteria. Check your Report Preferences.</td></tr>';
      } else {
        leads.forEach((l, i) => {
          const branch = l.branch_info || {};
          const created_on = l.creation
            ? frappe.datetime.str_to_user(l.creation)
            : "-";

          html += `
                    <tr>
                        <td class="text-center">${i + 1}</td>
                        <td><span class="label label-${get_status_indicator(l.status)}">${l.status}</span></td>
                        <td><a href="/app/lead/${l.name}" target="_blank"><b>${l.name}</b></a></td>
                        <td>${l.lead_name || "-"}</td>
                        <td>${l.contact || "-"}</td>
                        <td>${l.source || "-"}</td>
                        <td>${l.product_code || "-"}</td>
                        <td>${l.product_name || "-"}</td>
                        <td>${l.amount || "0"}</td>
                        <td>${l.employee_name || "-"}</td>
                        <td>${l.employee_id || "-"}</td>
                        <td>${l.designation || "-"}</td>
                        <td>${l.sol_id || "-"}</td>
                        <td>${branch.branch || "-"}</td>
                        <td>${branch.district || "-"}</td>
                        <td>${branch.region || "-"}</td>
                        <td>${branch.zone || "-"}</td>
                        <td>${created_on}</td>
                    </tr>
                `;
        });
      }
      $("#leads-table-body").html(html);
    } catch (err) {
      console.error(err);
      $("#leads-table-body").html(
        '<tr><td colspan="18" class="text-center text-danger">Error fetching data. Check Error Log.</td></tr>',
      );
    }
  });

  // Helper for status colors
  function get_status_indicator(status) {
    let color = "gray";
    if (status === "Converted") color = "green";
    if (status === "Follow Up") color = "orange";
    if (status === "Not Interested") color = "red";
    if (status === "Lead") color = "blue";
    return color;
  }

  // ---------- Apply Filters ----------
  $("#apply_filters").on("click", () => {
    frappe.msgprint({
      title: __("Filters Applied"),
      message: __("Leads are filtered and ready for export."),
      indicator: "green",
    });
  });

  // ---------- Export ----------
  // ---------- Export Button Logic ----------
  // ---------- Export Button Logic ----------
  $("#export_leads").on("click", async function () {
    const from_date = $("#from_date").val();
    const to_date = $("#to_date").val();

    if (!from_date || !to_date) {
      frappe.msgprint("Please select From Date and To Date");
      return;
    }

    let res = await frappe.call({
      method: "sahayog.scrm.api.report_access.queue_leads_export",
      args: { from_date, to_date },
    });

    if (res.message && res.message.status === "queued") {
      frappe.show_alert({
        message: __("Export started. Polling for results..."),
        indicator: "blue",
      });

      // ✅ Single Polling Logic
      // Polling section inside your export click handler
      let checkInterval = setInterval(async () => {
        let statusRes = await frappe.call({
          method: "sahayog.scrm.api.report_access.check_export_status",
        });

        if (statusRes.message && statusRes.message.status === "completed") {
          clearInterval(checkInterval);
          const fileUrl = statusRes.message.file_url;

          // Fetch current date for the success message
          const today = frappe.datetime.get_today();
          const formattedToday = frappe.datetime.str_to_user(today); // Formats to dd-mm-yyyy based on user settings

          // Force a hidden link click for download
          const a = document.createElement("a");
          a.href = fileUrl;
          a.download = "";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Success message with dynamic actual date
          frappe.msgprint({
            title: __("Export Ready"),
            indicator: "green",
            message: `
                <div class="text-center">
                    <p>Leads exported successfully on <b>${formattedToday}</b>.</p>
                    <a href="${fileUrl}" target="_blank" class="btn btn-primary btn-sm mt-2">
                        Manual Download Link
                    </a>
                    <p class="text-muted small mt-2">Note: This file will be automatically deleted from the server in 1 hour.</p>
                </div>
            `,
          });
        }
      }, 5000);
    }
  });

  // Export button style
  $("<style>")
    .prop("type", "text/css")
    .html(
      `
      #export_leads {
        font-weight: 600;
        box-shadow: 0 0 0 0.2rem rgba(25,135,84,.25);
      }
    `,
    )
    .appendTo("head");

  // Is block ko on_page_load ke andar rakhein
  frappe.realtime.on("crm_leads_export_done", (data) => {
    console.log("Realtime message received:", data); // Debugging ke liye
    frappe.msgprint({
      title: __("Export Ready"),
      message: data.message,
      indicator: "green",
      primary_action: {
        label: __("Close"),
        action: () => frappe.msgprint.clear(),
      },
    });
  });
};
