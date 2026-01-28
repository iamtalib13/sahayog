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

  // AGAR All Regions checked hai, toh saare regions API se mangwayein
  let system_regions = [];
  if (prefs.length > 0 && prefs[0].all_regions) {
    let reg_res = await frappe.call({
      method: "sahayog.scrm.api.report_access.get_all_system_regions",
    });
    system_regions = reg_res.message || [];
  }

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

  // --- Step 1: Edit Button Only for Admin & Dropdown Framework ---

  // Helper function to create interactive dropdowns
  function create_filter_dropdown(label, values, field_id) {
    if (!values || !values.length) return "";

    // Har value ke liye checkbox wala HTML
    let options_html = values
      .map(
        (val) => `
      <li class="px-3 py-1">
        <label class="d-flex align-items-center mb-0" style="cursor:pointer; font-weight: normal;">
          <input type="checkbox" class="pref-filter-checkbox mr-2" 
            data-field="${field_id}" value="${val}" checked> 
          ${val}
        </label>
      </li>
    `,
      )
      .join("");

    return `
      <div class="dropdown d-inline-block mr-3 mb-2">
        <button class="btn btn-xs btn-outline-primary dropdown-toggle font-weight-bold" 
          type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"
          style="border-radius: 20px; padding: 4px 12px; background: white;">
          ${label} <span class="badge badge-primary ml-1 count-badge">${values.length}</span>
        </button>
        <ul class="dropdown-menu shadow" style="max-height: 250px; overflow-y: auto; min-width: 180px;">
          <li class="px-3 py-1 border-bottom bg-light">
            <small class="text-muted uppercase font-weight-bold">Select ${label}</small>
          </li>
          ${options_html}
        </ul>
      </div>
    `;
  }

  // ---------- Intro Section (Revised) ----------
  prefs.forEach((pref) => {
    // Check if user is Administrator for Edit Button
    const show_edit = frappe.session.user === "Administrator";
    // Logic: Agar all_regions check hai to saare regions dikhao, warna sirf selected wale
    const region_data = pref.all_regions ? system_regions : pref.region || [];

    $container.append(`
      <div class="pref-container" style="
        background: #ffffff;
        border: 1px solid #d1d8dd;
        border-left: 5px solid #4f46e5;
        padding: 16px;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      ">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div style="font-size: 14px; font-weight: 600; color: #374151;">
            <i class="fa fa-sliders text-primary mr-2"></i> Active Report Preferences
          </div>
          ${
            show_edit
              ? `
            <button class="btn btn-xs btn-default text-primary" 
              onclick="frappe.set_route('List', 'Report Preference')"
              style="border: 1px solid #d1d8dd;">
              <i class="fa fa-pencil"></i> Edit Master
            </button>
          `
              : ""
          }
        </div>

        <div id="interactive-filters" class="d-flex flex-wrap align-items-center">
          ${create_filter_dropdown("Zones", pref.zone, "zone")}
          ${create_filter_dropdown("Regions", region_data, "region")}
          ${create_filter_dropdown("Districts", pref.district ? [pref.district] : [], "district")}
          ${create_filter_dropdown("Products", pref.product, "product")}
          ${create_filter_dropdown("Sources", pref.source, "source")}
          ${create_filter_dropdown("SOL IDs", pref.sol_id, "sol_id")}
        </div>
        <small class="text-muted mt-2 d-block">
          <i class="fa fa-info-circle"></i> Uncheck items to exclude them from the current report generation.
        </small>
      </div>
    `);
  });
  // Dropdown badges ko live update karne ke liye
  $(document).on("change", ".pref-filter-checkbox", function () {
    const field = $(this).data("field");
    const count = $(
      `.pref-filter-checkbox[data-field="${field}"]:checked`,
    ).length;
    $(this).closest(".dropdown").find(".count-badge").text(count);
  });
  // -----------------------------
  // Date Filters
  // -----------------------------
  // -----------------------------
  // Filter & Status Section
  // -----------------------------
  const today = frappe.datetime.get_today();

  $container.append(`
    <div class="filter-card card shadow-sm mb-4">
      <div class="card-body">
        <div class="row align-items-end">
          <div class="col-md-4">
            <label class="text-muted small mb-1 uppercase font-weight-bold">From Date</label>
            <input type="date" class="form-control border-0 bg-light" id="from_date" value="${today}">
          </div>
          <div class="col-md-4">
            <label class="text-muted small mb-1 uppercase font-weight-bold">To Date</label>
            <input type="date" class="form-control border-0 bg-light" id="to_date" value="${today}">
          </div>
          <div class="col-md-4">
             <button class="btn btn-primary w-100 font-weight-bold" id="apply_filters" style="height: 40px;">
                <i class="fa fa-filter mr-2"></i> Apply Filters
             </button>
          </div>
        </div>
      </div>
    </div>

    <div id="report-status-box" class="text-center p-5 border-dashed rounded-lg" style="border: 2px dashed #d1d8dd; background: #fafbfc;">
        <div id="status-content">
            <div class="mb-3">
                <i class="fa fa-calendar-check-o fa-3x text-muted"></i>
            </div>
            <h5 class="text-dark">Ready to generate your report?</h5>
            <p class="text-muted">Select the date range above and click <b>Apply Filters</b> to prepare your leads.</p>
        </div>
    </div>
    <style>
  /* Export Progress Modal Styles */
  .export-progress-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 12px;
    z-index: 2000;
    width: 90%;
    max-width: 450px;
    display: none;
    box-shadow: 0 15px 35px rgba(0,0,0,0.2);
    text-align: center;
  }
  .modal-overlay-custom {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1999;
    display: none;
    backdrop-filter: blur(3px);
  }
  .export-progress-bar {
    width: 100%; height: 10px;
    background: #e0e6ed;
    border-radius: 5px;
    overflow: hidden;
    margin: 20px 0;
  }
  .export-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4f46e5, #059669);
    width: 0%;
    transition: width 0.4s ease;
  }
  .export-percentage { font-weight: bold; font-size: 18px; color: #4f46e5; }
</style>

<div class="modal-overlay-custom" id="export-prog-overlay"></div>
<div class="export-progress-modal" id="export-prog-modal">
  <h4 style="margin-bottom:10px;">Exporting Report</h4>
  <p class="text-muted" id="export-status-text">Starting export process...</p>
  <div class="export-percentage" id="export-perc">0%</div>
  <div class="export-progress-bar">
    <div class="export-progress-fill" id="export-fill"></div>
  </div>
  <small class="text-muted">Please keep this tab open</small>
</div>
  `);
  // ... existing code (filters ke baad) ...

  // 1. Table Container (Bohat saari fields hain isliye table-responsive zaroori hai)
  //   $container.append(`
  //     <div id="leads-preview-section" class="mt-4">
  //         <div class="d-flex justify-content-between align-items-center mb-2">
  //             <h5>Lead Preview (Filter Testing)</h5>
  //             <div id="stats-badge-container"></div>
  //         </div>
  //         <div class="table-responsive" style="max-height: 600px; border: 1px solid #d1d8dd;">
  //             <table class="table table-bordered table-hover bg-white" style="font-size: 11px; min-width: 1800px;">
  //                 <thead class="thead-light" style="position: sticky; top: 0; z-index: 10;">
  //                     <tr>
  //                         <th>Sr.No.</th>
  //                         <th>Status</th>
  //                         <th>Lead ID</th>
  //                         <th>Customer</th>
  //                         <th>Contact</th>
  //                         <th>Source</th>
  //                         <th>Product Code</th>
  //                         <th>Product Name</th>
  //                         <th>Amount</th>
  //                         <th>Employee Name</th>
  //                         <th>Employee ID</th>
  //                         <th>Designation</th>
  //                         <th>SOL ID</th>
  //                         <th>Branch</th>
  //                         <th>District</th>
  //                         <th>Region</th>
  //                         <th>Zone</th>
  //                         <th>Created On</th>
  //                     </tr>
  //                 </thead>
  //                 <tbody id="leads-table-body">
  //                     <tr><td colspan="18" class="text-center text-muted">Select dates and click Apply to test filters</td></tr>
  //                 </tbody>
  //             </table>
  //         </div>
  //     </div>
  // `);

  //   // 2. Apply Filters Logic
  //   $("#apply_filters").on("click", async () => {
  //     const from_date = $("#from_date").val();
  //     const to_date = $("#to_date").val();

  //     if (!from_date || !to_date) {
  //       frappe.msgprint(__("Please select date range"));
  //       return;
  //     }

  //     $("#leads-table-body").html(
  //       '<tr><td colspan="18" class="text-center">Fetching data...</td></tr>',
  //     );

  //     try {
  //       let res = await frappe.call({
  //         method: "sahayog.scrm.api.report_access.get_leads",
  //         args: { from_date, to_date, limit: 100 }, // Testing ke liye 100 kaafi hain
  //       });

  //       const data = res.message;
  //       const leads = data.leads || [];
  //       const stats = data.stats || {};

  //       // Update Stats Summary
  //       $("#stats-badge-container").html(`
  //             <span class="badge badge-info">Total: ${stats.total}</span>
  //             <span class="badge badge-success">Converted: ${stats.converted}</span>
  //             <span class="badge badge-warning">Follow Up: ${stats.follow_up}</span>
  //         `);

  //       let html = "";
  //       if (leads.length === 0) {
  //         html =
  //           '<tr><td colspan="18" class="text-center">No leads found for these criteria. Check your Report Preferences.</td></tr>';
  //       } else {
  //         leads.forEach((l, i) => {
  //           const branch = l.branch_info || {};
  //           const created_on = l.creation
  //             ? frappe.datetime.str_to_user(l.creation)
  //             : "-";

  //           html += `
  //                     <tr>
  //                         <td class="text-center">${i + 1}</td>
  //                         <td><span class="label label-${get_status_indicator(l.status)}">${l.status}</span></td>
  //                         <td><a href="/app/lead/${l.name}" target="_blank"><b>${l.name}</b></a></td>
  //                         <td>${l.lead_name || "-"}</td>
  //                         <td>${l.contact || "-"}</td>
  //                         <td>${l.source || "-"}</td>
  //                         <td>${l.product_code || "-"}</td>
  //                         <td>${l.product_name || "-"}</td>
  //                         <td>${l.amount || "0"}</td>
  //                         <td>${l.employee_name || "-"}</td>
  //                         <td>${l.employee_id || "-"}</td>
  //                         <td>${l.designation || "-"}</td>
  //                         <td>${l.sol_id || "-"}</td>
  //                         <td>${branch.branch || "-"}</td>
  //                         <td>${branch.district || "-"}</td>
  //                         <td>${branch.region || "-"}</td>
  //                         <td>${branch.zone || "-"}</td>
  //                         <td>${created_on}</td>
  //                     </tr>
  //                 `;
  //         });
  //       }
  //       $("#leads-table-body").html(html);
  //     } catch (err) {
  //       console.error(err);
  //       $("#leads-table-body").html(
  //         '<tr><td colspan="18" class="text-center text-danger">Error fetching data. Check Error Log.</td></tr>',
  //       );
  //     }
  //   });

  //   // Helper for status colors
  //   function get_status_indicator(status) {
  //     let color = "gray";
  //     if (status === "Converted") color = "green";
  //     if (status === "Follow Up") color = "orange";
  //     if (status === "Not Interested") color = "red";
  //     if (status === "Lead") color = "blue";
  //     return color;
  //   }

  // ---------- Apply Filters ----------
  // ---------- Apply Filters Logic ----------
  // ---------- Apply Filters Logic ----------
  // ---------- Apply Filters Logic with Lead Count ----------
  // ---------- Apply Filters Logic with Correct Lead Count ----------
  $("#apply_filters").on("click", async () => {
    const from = $("#from_date").val();
    const to = $("#to_date").val();

    if (!from || !to) {
      frappe.msgprint("Please select both dates");
      return;
    }

    // --- Optimized Checkbox Value Gathering ---
    // Hum har field (Zone, Product, etc.) se sirf wahi values uthayenge jo Checked hain
    let active_filters = {};
    $(".pref-filter-checkbox:checked").each(function () {
      let field = $(this).data("field");
      let val = $(this).val();
      if (!active_filters[field]) active_filters[field] = [];
      active_filters[field].push(val);
    });
    console.log("Active Filters:", active_filters); // Debugging ke liye
    // Show loading state
    $("#report-status-box").html(
      `<div class="text-muted"><i class="fa fa-spinner fa-spin fa-2x"></i><p>Calculating leads...</p></div>`,
    );

    try {
      // Fetch data without limit to get accurate total count
      let res = await frappe.call({
        method: "sahayog.scrm.api.report_access.get_leads",
        args: { from_date: from, to_date: to, filters: active_filters },
      });

      const stats = res.message.stats || { total: 0 };

      // Updated UI: Showing only Filtered Leads Count
      $("#report-status-box").css({
        background: "#f0fff4",
        "border-color": "#68d391",
      }).html(`
            <div class="text-center animate__animated animate__fadeIn">
                <div class="mb-3">
                    <i class="fa fa-check-circle fa-2x text-success"></i>
                </div>
                <h5 class="text-success font-weight-bold">Filters Applied Successfully!</h5>
                
                <div class="row justify-content-center my-4">
                    <div class="col-md-4">
                        <div class="p-3 bg-white rounded shadow-sm border" style="border-top: 4px solid #059669 !important;">
                            <h2 class="m-0 text-success font-weight-bold">${stats.total}</h2>
                            <div class="text-muted uppercase small font-weight-bold mt-1">Total Filtered Leads</div>
                        </div>
                    </div>
                </div>

                <p class="text-muted">You can now download the report for the period <br> 
                   <b>${frappe.datetime.str_to_user(from)}</b> to <b>${frappe.datetime.str_to_user(to)}</b>.
                </p>
                
                <button class="btn btn-success btn-lg px-5 shadow-sm mt-2" id="export_leads_v2">
                    <i class="fa fa-download mr-2"></i> Download CSV Report
                </button>
            </div>
        `);
    } catch (e) {
      console.error(e);
      frappe.msgprint(
        "Error fetching lead counts. Please check your network or filters.",
      );
    }
  });
  // --- Export Button Logic Update ---
  // --- Export Button Logic (Fixed with Event Delegation) ---
  // --- Updated Export Button Logic (Progress Bar + Detailed Success Message) ---
  $container.on("click", "#export_leads_v2", async function () {
    const from_date = $("#from_date").val();
    const to_date = $("#to_date").val();
    // JS Export button click handler mein ye line add karein:
    let active_filters = {};
    $(".pref-filter-checkbox:checked").each(function () {
      let field = $(this).data("field");
      let val = $(this).val();
      if (!active_filters[field]) active_filters[field] = [];
      active_filters[field].push(val);
    });
    // 1. Show Progress Modal
    $("#export-prog-overlay").show();
    $("#export-prog-modal").show();
    $("#export-fill").css("width", "10%");
    $("#export-perc").text("10%");
    $("#export-status-text").text("Requesting server to generate file...");

    const $btn = $(this);
    $btn
      .prop("disabled", true)
      .html('<i class="fa fa-spinner fa-spin"></i> Processing...');

    let res = await frappe.call({
      method: "sahayog.scrm.api.report_access.queue_leads_export",
      args: { from_date, to_date, filters: active_filters },
    });
    if (res.message && res.message.status === "queued") {
      $("#export-fill").css("width", "30%");
      $("#export-perc").text("30%");
      $("#export-status-text").text("Job queued. Waiting for server...");

      let checkInterval = setInterval(async () => {
        let statusRes = await frappe.call({
          method: "sahayog.scrm.api.report_access.check_export_status",
        });

        // Simulate progress bar movement
        let currentWidth = parseInt($("#export-fill").css("width"));
        if (currentWidth < 90) {
          let nextWidth = currentWidth + 7;
          $("#export-fill").css("width", nextWidth + "%");
          $("#export-perc").text(nextWidth + "%");
          $("#export-status-text").text(
            "Processing records and generating CSV...",
          );
        }

        if (statusRes.message && statusRes.message.status === "completed") {
          clearInterval(checkInterval);

          // 2. Finalize Progress UI
          $("#export-fill").css("width", "100%");
          $("#export-perc").text("100%");
          $("#export-status-text").text("Success! Preparing your download...");

          setTimeout(() => {
            $("#export-prog-overlay").fadeOut();
            $("#export-prog-modal").fadeOut();
          }, 800);

          $btn
            .prop("disabled", false)
            .html('<i class="fa fa-download mr-2"></i> Download CSV Report');

          const data = statusRes.message;

          // 3. Trigger Silent Download
          const a = document.createElement("a");
          a.href = data.file_url;
          a.download = data.file_url.split("/").pop();
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // 4. Detailed Success Message (Restored & Improved)
          frappe.msgprint({
            title: __(
              '<div style="color: #059669; font-weight: bold;">🚀 Export Completed</div>',
            ),
            message: `
              <div style="font-family: 'Inter', sans-serif; padding: 5px;">
                <p style="font-size: 15px; margin-bottom: 15px;">Your report has been generated successfully.</p>
                
                <div style="background: #f0fdf4; padding: 15px; border-radius: 10px; border: 1px solid #bbf7d0;">
                  <div style="margin-bottom: 8px;">
                    <span style="color: #166534; font-weight: 600;">📊 Row Count:</span> 
                    <span style="float: right; background: #dcfce7; padding: 2px 8px; border-radius: 5px; font-weight: bold;">${data.row_count} rows</span>
                  </div>
                  <div style="margin-bottom: 8px; border-top: 1px dashed #bbf7d0; padding-top: 8px;">
                    <span style="color: #166534; font-weight: 600;">📁 Filename:</span><br>
                    <small style="word-break: break-all; color: #666;">${data.file_url.split("/").pop()}</small>
                  </div>
                  <div style="border-top: 1px dashed #bbf7d0; padding-top: 8px;">
                    <span style="color: #166534; font-weight: 600;">📅 Period:</span><br>
                    <span style="font-size: 13px;">${frappe.datetime.str_to_user(data.from_date)} to ${frappe.datetime.str_to_user(data.to_date)}</span>
                  </div>
                </div>

                <div style="margin-top: 15px; text-align: center;">
                   <a href="${data.file_url}" target="_blank" class="btn btn-xs btn-default" style="text-decoration: none;">
                     <i class="fa fa-external-link"></i> Re-download File
                   </a>
                </div>
              </div>
            `,
            indicator: "green",
          });
        }
      }, 3000);
    } else {
      $("#export-prog-overlay").hide();
      $("#export-prog-modal").hide();
      $btn
        .prop("disabled", false)
        .html('<i class="fa fa-download mr-2"></i> Download CSV Report');
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
  $("<style>")
    .prop("type", "text/css")
    .html(
      `
      .filter-card { border-radius: 12px; border: none; }
      .form-control:focus { box-shadow: none; border: 1px solid #4f46e5; }
      .rounded-lg { border-radius: 15px !important; }
      .border-dashed { border-style: dashed !important; border-width: 2px !important; }
      .btn-primary { background-color: #4f46e5; border: none; transition: all 0.2s; }
      .btn-primary:hover { background-color: #4338ca; transform: translateY(-1px); }
      .btn-success { background-color: #059669; border: none; }
      .uppercase { text-transform: uppercase; letter-spacing: 0.5px; }
    `,
    )
    .appendTo("head");
};
