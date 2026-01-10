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
    async: false,
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

  function inline_list(label, values) {
    if (!values || !values.length) return "";
    return `<strong>${label}:</strong> ${values.join(", ")} | `;
  }

  // ---------- Intro Section ----------
  // ---------- Compact Intro Section ----------
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
        ${inline_list("Products", pref.product)}
        ${inline_list("Sources", pref.source)}
        ${inline_list("SOL IDs", pref.sol_id)}
        ${inline_list("District", pref.district ? [pref.district] : [])}
        ${inline_list("State", pref.state ? [pref.state] : [])}
        ${inline_list("Zones", pref.zone)}
        ${inline_list("Regions", pref.region)}
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
  // Date Filters (Default = Today)
  // -----------------------------
  const today = frappe.datetime.get_today();

  let filter_html = `
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

    <!-- Apply -->
    <div class="col-md-2">
      <button class="btn btn-dark mt-4 w-100" id="apply_filters">
        Apply
      </button>
    </div>

    <!-- ✅ Export (RIGHT MOST) -->
    <div class="col-md-4 d-flex justify-content-end">
      <button class="btn btn-success mt-4 px-4" id="export_leads">
        ⬇ Export
      </button>
    </div>

  </div>
</div>
`;

  $container.append(filter_html);

  $container.append(`
  <div class="card p-3">
    <h5>Lead List</h5>
    <div class="table-responsive">
      <table class="table table-bordered table-sm" id="lead_table">
        <thead>
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
        <tbody></tbody>
      </table>
    </div>
  </div>
`);
  async function load_leads() {
    const from_date = $("#from_date").val();
    const to_date = $("#to_date").val();

    console.log("Date Filter:", from_date, to_date);

    const res = await frappe.call({
      method: "sahayog.scrm.api.report_access.get_leads",
      args: {
        from_date,
        to_date,
      },
    });

    console.log("Leads API Response:", res);

    const data = res.message || {};
    const leads = data.leads || [];
    const stats = data.stats || {};

    const tbody = $("#lead_table tbody").empty();

    if (!leads.length) {
      tbody.append(
        `<tr><td colspan="18" class="text-center">No Leads Found</td></tr>`
      );
      return;
    }

    leads.forEach((l, i) => {
      tbody.append(`
<tr>
  <td>${i + 1}</td>
  <td>${l.status}</td>
  <td>${l.name}</td>
  <td>${l.lead_name || "-"}</td>
  <td>${l.contact || "-"}</td>
  <td>${l.source || "-"}</td>
  <td>${l.products?.[0]?.product || "-"}</td>
  <td>${l.products?.[0]?.product_name || "-"}</td>
  <td>${l.products?.[0]?.product_amount || "-"}</td>
  <td>${l.employee_name || "-"}</td>
  <td>${l.employee_id || "-"}</td>
  <td>${l.designation || "-"}</td>
  <td>${l.sol_id || "-"}</td>
  <td>${l.branch_info?.branch || "-"}</td>
  <td>${l.branch_info?.district || "-"}</td>
  <td>${l.branch_info?.region || "-"}</td>
  <td>${l.branch_info?.zone || "-"}</td>

  <td>${format_ddmmyyyy(l.creation)}</td>


</tr>
`);
    });
    console.log("Date Filter:", from_date, to_date);
    console.log("API Response:", res.message);
    console.log("Leads:", leads);
    console.log("Stats:", stats);
  }

  $("#apply_filters").on("click", load_leads);

  // ✅ EXPORT BUTTON (FIX)
  $("#export_leads").on("click", function () {
    const from_date = $("#from_date").val();
    const to_date = $("#to_date").val();

    if (!from_date || !to_date) {
      frappe.msgprint("Please select From Date and To Date");
      return;
    }

    const url =
      `/api/method/sahayog.scrm.api.report_access.export_leads` +
      `?from_date=${from_date}&to_date=${to_date}`;

    window.open(url);
  });
  // Export Button Styles
  $("<style>")
    .prop("type", "text/css")
    .html(
      `
    #export_leads {
      font-weight: 600;
      box-shadow: 0 0 0 0.2rem rgba(25,135,84,.25);
    }
  `
    )
    .appendTo("head");

  // initial load
  load_leads();
};
// Helper to format date as DD/MM/YYYY
function format_ddmmyyyy(datetime) {
  if (!datetime) return "-";

  const d = frappe.datetime.str_to_obj(datetime);

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}
