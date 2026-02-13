frappe.pages["crm-lead-report"].on_page_load = async function (wrapper) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "CRM Leads Report",
    single_column: true,
  });

  const $container = $(page.body).empty();
  const user = frappe.session.user;

  // --- Step 1: CSS (Original + Progress Bar Styles) ---
  $("<style>")
    .prop("type", "text/css")
    .html(
      `
    .dashboard-tabs { display: flex; border-bottom: 1px solid #d1d8dd; margin-bottom: 20px; gap: 5px; }
    .nav-tab { padding: 10px 20px; cursor: pointer; border-bottom: 3px solid transparent; font-weight: 600; color: #6b7280; }
    .nav-tab.active { color: #7775ce; border-bottom-color: #7775ce; background: #f9fafb; }
    .chip-group { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
    .filter-chip { 
        padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 500;
        border: 1px solid #d1d8dd; cursor: pointer; background: #fff;
        display: flex; align-items: center; transition: all 0.2s;
    }
    .filter-chip.active { background: #7775ce; color: #fff; border-color: #7775ce; }
    .chip-count { background: rgba(0,0,0,0.1); padding: 1px 6px; border-radius: 10px; margin-left: 6px; font-size: 10px; }
    .filter-chip.active .chip-count { background: rgba(255,255,255,0.2); }
    .section-label { font-size: 12px; text-transform: uppercase; color: #000 !important; font-weight: 700; margin-bottom: 8px; margin-top: 10px;letter-spacing: 0.5px;}
    /* Naya Button Color (Indigo) */
    .btn-generate {
        background: #5e5cc7 !important; /* Modern Indigo */
        color: white !important;
        font-weight: bold !important;
        border: none !important;
        height: 38px;
        transition: all 0.2s ease;
    }
    .btn-generate:hover {
        background: #4b49ac !important;
        transform: translateY(-1px);
    }
    .dashboard-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .border-dashed { border: 2px dashed #d1d8dd !important; background: #fafbfc; border-radius: 12px; }
    
    .filters-wrapper { display: flex; flex-wrap: wrap; gap: 20px; width: 100%; }
    /* Isse har section sirf utni space lega jitni zaruri hai */
    .filter-section { 
        flex: 0 1 auto; /* Flex-grow ko 0 kiya taaki faltu space na khiche */
        min-width: 150px; 
        border-right: 1px solid #f0f0f0; 
        padding-right: 15px; 
        margin-bottom: 10px;
    }
    .filter-section:last-child { border-right: none; }
    .date-action-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; gap: 15px; }

    /* Progress Bar Modal */
    #export-prog-modal {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 30px; border-radius: 12px; z-index: 2000;
        width: 90%; max-width: 450px; display: none; box-shadow: 0 15px 35px rgba(0,0,0,0.2); text-align: center;
    }
    #export-prog-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.5); z-index: 1999; display: none; backdrop-filter: blur(3px);
    }
    .export-progress-bar { width: 100%; height: 10px; background: #e0e6ed; border-radius: 5px; overflow: hidden; margin: 20px 0; }
    #export-fill { height: 100%; background: linear-gradient(90deg, #7775ce, #059669); width: 0%; transition: width 0.4s ease; }
    #export-perc { font-weight: bold; font-size: 18px; color: #7775ce; }
  `,
    )
    .appendTo("head");

  // --- Step 2: Structure ---
  $container.append(`
    <div id="export-prog-overlay"></div>
    <div id="export-prog-modal">
        <h4 style="margin:0;">Generating Report</h4>
        <p class="text-muted" id="export-status-text">Processing records...</p>
        <div class="export-progress-bar"><div id="export-fill"></div></div>
        <div id="export-perc">0%</div>
    </div>

    <div class="dashboard-tabs">
        <div class="nav-tab active" data-tab="preference">Preference Wise</div>
        <div class="nav-tab" data-tab="employee">Employee Wise</div>
        <div class="nav-tab" data-tab="daily_sales">Daily Sales Report</div>
        <div class="nav-tab" data-tab="lead_mgmt">Lead Management</div>
    </div>
    <div id="tab-content-area"></div>
  `);

  // --- Step 3: Render Function ---
  // --- Step 3: Render Function (Modified only to add SOL ID) ---
  // --- Step 3: Render Function (Optimized for Dynamic Space) ---
  async function render_preference_view() {
    const $view = $("#tab-content-area").empty();
    let res = await frappe.call({
      method:
        "sahayog.scrm.api.report_access.get_user_report_preference_record",
      args: { user: user },
    });

    const pref = (res.message || [])[0];
    if (!pref) {
      $view.html(
        `<div class="text-center p-5 text-muted">No preferences found.</div>`,
      );
      return;
    }

    let region_data = pref.all_regions
      ? (
          await frappe.call({
            method: "sahayog.scrm.api.report_access.get_all_system_regions",
          })
        ).message
      : pref.region || [];

    // Naya helper function: sirf tabhi div banayega jab data array empty na ho
    const render_section = (label, values, field_id) => {
      if (!values || !values.length) return ""; // Blank string return karega
      return `<div class="filter-section">${render_chip_group(label, values, field_id)}</div>`;
    };

    $view.append(`
      <div class="dashboard-card">
        <div class="filters-wrapper">
            ${render_section("Zones", pref.zone, "zone")}
            ${render_section("Regions", region_data, "region")}
            ${render_section("SOL IDs", pref.sol_id, "sol_id")}
            ${render_section("Products", pref.product, "product")}
            ${render_section("Sources", pref.source, "source")}
        </div>
        <div class="date-action-row">
            <div style="flex: 1;"><div class="section-label">From Date</div><input type="date" class="form-control" id="from_date" value="${frappe.datetime.get_today()}"></div>
            <div style="flex: 1;"><div class="section-label">To Date</div><input type="date" class="form-control" id="to_date" value="${frappe.datetime.get_today()}"></div>
            <div style="flex: 0.5;">
              <button class="btn btn-primary w-100 btn-generate" id="apply_filters">
                  <i class="fa fa-play-circle mr-2"></i> GENERATE REPORT
              </button>
        </div>
        </div>
      </div>
      <div id="report-status-box" class="mt-4 text-center p-5 border-dashed">
        <i class="fa fa-bar-chart fa-2x text-muted mb-2"></i>
        <h7 class="text-muted">Click "Generate Report" to fetch data</h7>
      </div>
    `);
  }
  function render_chip_group(label, values, field_id) {
    let chips = values
      .map(
        (val) => `
        <div class="filter-chip active" data-field="${field_id}" data-value="${val}">
            ${val} <span class="chip-count"><i class="fa fa-check"></i></span>
        </div>
    `,
      )
      .join("");
    return `<div class="section-label">${label}</div><div class="chip-group">${chips}</div>`;
  }

  // --- Step 4: Logic Handlers ---

  // Tab Switching
  $(document).on("click", ".nav-tab", function () {
    $(".nav-tab").removeClass("active");
    $(this).addClass("active");
    const tab = $(this).data("tab");
    if (tab === "preference") render_preference_view();
    else if (tab === "daily_sales") frappe.set_route("daily-sales-report");
    else if (tab === "lead_mgmt") frappe.set_route("crm-lead-management");
    else
      $("#tab-content-area").html(
        `<div class="p-5 text-center text-muted">View for ${tab} is under development.</div>`,
      );
  });

  // Chip Toggle
  $(document).on("click", ".filter-chip", function () {
    $(this).toggleClass("active"); // Ye 'active' class add/remove karega

    // Icon update karne ke liye (Check/Cross)
    const isActive = $(this).hasClass("active");
    $(this)
      .find(".chip-count")
      .html(
        isActive
          ? '<i class="fa fa-check"></i>'
          : '<i class="fa fa-times"></i>',
      );
    // YEH CONSOLE ADD KAREIN
    console.log("Chip Clicked:", $(this).data("value"));
    console.log(
      "Current State (Has Active Class?):",
      $(this).hasClass("active"),
    );
  });

  // Apply Filters (Fixing value gathering)
  $(document).on("click", "#apply_filters", async () => {
    const from = $("#from_date").val();
    const to = $("#to_date").val();
    let active_filters = {};

    $(".filter-chip.active").each(function () {
      let field = $(this).data("field");
      let val = $(this).data("value");
      if (!active_filters[field]) active_filters[field] = [];
      active_filters[field].push(val);
    });

    // 🔥 YAHI ADD KARNA HAI (THIS IS THE FIX)
    const all_fields = ["zone", "region", "sol_id", "product", "source"];

    all_fields.forEach((field) => {
      if (!active_filters[field]) {
        active_filters[field] = [];
      }
    });

    $("#report-status-box").html('<i class="fa fa-spinner fa-spin fa-2x"></i>');

    let res = await frappe.call({
      method: "sahayog.scrm.api.report_access.get_leads",
      args: { from_date: from, to_date: to, filters: active_filters },
    });

    const stats = res.message.stats || { total: 0 };
    $("#report-status-box").html(`
        <h2 class="text-primary">${stats.total}</h2>
        <p class="text-muted">Leads found for selected criteria</p>
        <button class="btn btn-success btn-sm" id="export_leads_v2"><i class="fa fa-download"></i> Export CSV</button>
    `);
  });

  // Initial Load
  render_preference_view();

  // Note: Export Modal HTML and Progress Logic remains same at the end of your script.

  // --- Export Button Logic Update ---
  // --- Export Button Logic (Fixed with Event Delegation) ---
  // --- Updated Export Button Logic (Progress Bar + Detailed Success Message) ---
  $container.on("click", "#export_leads_v2", async function () {
    const from_date = $("#from_date").val();
    const to_date = $("#to_date").val();

    // --- UPDATE: Filter collection logic changed from checkbox to chips ---
    let active_filters = {};
    // Hum chips ki 'active' class check karenge
    $(".filter-chip.active").each(function () {
      let field = $(this).data("field"); // e.g., 'source'
      let val = $(this).data("value"); // e.g., 'Campaign'

      if (!active_filters[field]) active_filters[field] = [];
      active_filters[field].push(val);

      // 🔥 YAHI ADD KARNA HAI (THIS IS THE FIX)
      const all_fields = ["zone", "region", "sol_id", "product", "source"];

      all_fields.forEach((field) => {
        if (!active_filters[field]) {
          active_filters[field] = [];
        }
      });
      // YEH CONSOLE ADD KAREIN
      console.log("---------- DEBUG FILTERS ----------");
      console.log("Is any chip found?", $(".filter-chip").length);
      console.log("Is any ACTIVE chip found?", $(".filter-chip.active").length);
      console.log("Final Filters JSON:", JSON.stringify(active_filters));
      console.log("-----------------------------------");
    });
    // ---------------------------------------------------------------------

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

          // 4. Detailed Success Message
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
