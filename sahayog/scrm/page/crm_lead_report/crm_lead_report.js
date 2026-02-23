frappe.pages["crm-lead-report"].on_page_load = async function (wrapper) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "CRM Leads Report",
    single_column: true,
  });

  const $container = $(page.body).empty();

  // Custom set_intro implementation for this page
  page.set_intro = function (html) {
    if (!this.$intro_area) {
      this.$intro_area = $(
        '<div class="page-intro" style="margin-bottom: 10px; min-height: 0;"></div>',
      ).prependTo($container);
    }
    this.$intro_area.html(
      html
        ? `<div style="padding: 8px 12px; border-radius: 6px; font-size: 12px; border: 1px solid transparent;">${html}</div>`
        : "",
    );
    if (!html) this.$intro_area.hide();
    else this.$intro_area.show();
  };
  // Transparent UI aur Tab Styling
  $("<style>")
    .prop("type", "text/css")
    .html(
      `
        #crm-app { padding: 10px; background-color: transparent; }
        .ui-section-card { background: #fff; border: none !important; border-radius: 8px; margin-bottom: 20px; box-shadow: none !important; }
        .section-header { background: #f8f9fa; padding: 10px 15px; border-bottom: 1px solid #d1d8dd; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; }
        .header-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
        .header-controls { display: flex; align-items: center; gap: 15px; }
        .select-input { height: 32px; font-size: 13px; border: 1px solid #d1d8dd; border-radius: 4px; padding: 0 8px; margin-left: 5px; cursor: pointer; }
        .btn-generate-sm { background: #1f2937; color: #fff; border: none; padding: 0 20px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px; height: 32px; }
        .filter-grid { display: flex; flex-wrap: wrap; gap: 20px; padding: 20px; }
        .filter-column { flex: 1; min-width: 160px; border-right: 1px solid #eee; padding-right: 15px; }
        .filter-column:last-child { border-right: none; }
        .filter-label { font-size: 10px; font-weight: 700; color: #1f2937; text-transform: uppercase; margin-bottom: 10px; display: block; }
        .mini-chip-list { display: flex; flex-wrap: wrap; gap: 5px; }
        .mini-chip { font-size: 11px; min-width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid #d1d8dd; cursor: pointer; background: #fff; }
        .mini-chip.active { background: #05a15d !important; color: #fff !important; border-color: #05a15d !important; font-weight: bold; }
        .custom-dropdown { position: relative; width: 100%; }
        .dropdown-select { background: #fff; border: 1px solid #d1d8dd; border-radius: 4px; padding: 6px 10px; font-size: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
      .dropdown-list { 
    position: absolute; 
    top: 100%; 
    /* Center alignment logic */
    left: 50%; 
    transform: translateX(-50%); 
    
    width: 320px; 
    max-height: 280px; 
    overflow-y: auto; 
    background: #fff; 
    border: 1px solid #d1d8dd; 
    border-radius: 6px; 
    z-index: 2000; 
    box-shadow: 0 12px 30px rgba(0,0,0,0.15); 
    display: none; 
    margin-top: 5px; 
}

/* Jab dropdown khulega tab display block ke saath animation ya transform barakar rakhein */
.dropdown-list.show { 
    display: block; 
}
       .dropdown-item {
    padding: 10px 14px; /* Spacing badhayi */
    font-size: 11.5px;
    display: flex !important;
    align-items: flex-start !important; 
    gap: 12px; /* Checkbox aur text ke beech barabar gap */
    cursor: pointer;
    border-bottom: 1px solid #f3f4f6;
    white-space: normal !important; 
    line-height: 1.5;
    transition: background 0.2s ease;
}
        
        /* Tab Styling */
        .tab-nav { display: flex; background: #f8f9fa; border-bottom: 1px solid #d1d8dd; border-radius: 8px 8px 0 0; }
        .tab-item { padding: 12px 20px; cursor: pointer; font-weight: 600; color: #6b7280; font-size: 13px; border-right: 1px solid #eee; }
        .tab-item.active { background: #fff; color: #05a15d; border-top: 2px solid #05a15d; border-bottom: 1px solid transparent; }
        @keyframes blink-success { 0% { background-color: #dcfce7; } 50% { background-color: #ffffff; } 100% { background-color: #dcfce7; } }
        .blinking-success { animation: blink-success 1.5s infinite; border: 1px solid #22c55e !important; }
       .dropdown-item {
    padding: 10px 12px;
    font-size: 11px;
    display: flex !important;
    align-items: flex-start !important; /* Checkbox ko upar line se align rakhega */
    gap: 10px;
    cursor: pointer;
    border-bottom: 1px solid #f1f1f1;
    white-space: normal !important; /* Text ko niche wrap hone dega */
    line-height: 1.4;
}

.dropdown-item input[type="checkbox"] {
    margin: 0;
    margin-top: 3px; /* Exact center alignment with first line of text */
    cursor: pointer;
    min-width: 15px; 
    height: 15px;
    accent-color: #05a15d; /* Frappe Green theme ke liye */
}
    /* Text wrapping logic */
.dropdown-item span {
    flex: 1; 
    word-break: break-word; 
    color: #374151;
    font-weight: 500;
}
  .dropdown-item:last-child {
    border-bottom: none;
}

.dropdown-item:hover {
    background-color: #f0fdf4; /* Light green hover */
}
  `,
    )
    .appendTo("head");

  $container.append(`
        <div id="crm-app" v-scope @vue:mounted="init()">
            <div class="ui-section-card">
                <div class="section-header">
                    <div class="header-title">Lead Export Filters</div>
                    <div class="header-controls">
                        <div class="d-flex align-items-center">
                            <span style="font-size:10px; font-weight:bold; color:#6b7280">PERIOD:</span>
                            <select v-model="selected_year" class="select-input">
                                <option v-for="y in years" :value="y">{{ y }}</option>
                            </select>
                            <select v-model="selected_month" class="select-input" style="min-width: 100px;">
                                <option v-for="(m, index) in months" :value="index + 1">{{ m }}</option>
                            </select>
                        </div>
                        <button class="btn-generate-sm" @click="applyFilters" :disabled="loading">
                            <i v-if="loading" class="fa fa-spinner fa-spin mr-1"></i> EXPORT CSV
                        </button>
                    </div>
                </div>

                <div class="section-body">
                    <div class="filter-grid">
                        <div v-for="key in ['zone', 'region']" :key="key" class="filter-column">
                            <span class="filter-label">{{ key }}</span>
                           <div class="mini-chip-list">
                           <div v-for="opt in filter_data[key]" 
                            :class="['mini-chip', isSelected(key, opt) ? 'active' : '']"
                            @click="toggleFilter(key, opt)">
                            {{ formatDisplayText(key, opt) }}
                        </div>
                        </div>
                        </div>

                        <div v-for="key in ['sol_id', 'product', 'source']" :key="key" class="filter-column">
                            <span class="filter-label">{{ key.replace('_', ' ') }}</span>
                            <div class="custom-dropdown">
                               <div class="dropdown-select">
                                    <input type="text"
                                    v-model="search_query[key]"
                                    :placeholder="getDisplayText(key)"
                                    class="dropdown-input"
                                    @focus="active_dropdown = key"
                                    @click.stop>
                                    <i class="fa fa-caret-down text-muted"></i>
                                </div>
                                <div :class="['dropdown-list', active_dropdown === key ? 'show' : '']">
                                    <div class="dropdown-item"v-for="opt in filter_data[key].filter(o => 
                                          !search_query[key] || 
                                          (o.label || o).toLowerCase().includes(search_query[key].toLowerCase())
                                      )"@click.stop="toggleFilter(key, opt.value || opt)">
                                                    <input type="checkbox" :checked="isSelected(key, opt.value || opt)">
                                     <span>{{ opt.label || opt }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="ui-section-card"> 
                <div class="tab-nav">
                    <div v-for="t in tabs" :class="['tab-item', active_tab == t.id ? 'active' : '']" @click="active_tab = t.id">
                        {{ t.label }}
                    </div>
                </div>
                <div class="tab-content" style="padding:20px; min-height:300px;">
                     <div v-if="active_tab === 'employee'">
                        <div class="employee-report-controls d-flex align-items-center mb-3 p-3" style="background:#f8f9fa; border-radius:8px;">
                            <span class="mr-2" style="font-size:10px; font-weight:bold; color:#6b7280;">FROM:</span>
                          <input type="date"
                            v-model="employee_from_date"
                            @change="onDateChange"
                            class="form-control form-control-sm mr-3"
                            style="width:150px;">

                          <input type="date"
                            v-model="employee_to_date"
                            @change="onDateChange"
                            class="form-control form-control-sm mr-3"
                            style="width:150px;">
                        </div>
                        
                        <div v-if="employee_report_loading" class="text-center p-5 text-muted">
                            <i class="fa fa-spinner fa-spin fa-2x mb-3"></i>
                            <p>Loading Employee Performance Data...</p>
                        </div>
                        <div v-else-if="employee_error_message" class="alert alert-danger text-center p-3">
                            <i class="fa fa-exclamation-triangle mr-2"></i> {{ employee_error_message }}
                        </div>
                        <div v-else-if="employee_performance_data.length === 0" class="text-center p-5 text-muted">
                            <i class="fa fa-table fa-2x mb-3" style="color:#d1d8dd"></i>
                            <p>No employee performance data found for the selected period.</p>
                        </div>
                        <div v-else class="table-responsive" style="max-height: 500px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                            <table class="table table-bordered table-hover mb-0" style="font-size: 12px;">
                                <thead style="position: sticky; top: 0; background-color: #f8f9fa; z-index: 1;">
                                    <tr>
                                        <th>Employee ID</th>
                                        <th>Employee Name</th>
                                        <th>SOL ID</th>
                                        <th>Branch</th>
                                        <th>Total Leads</th>
                                        <th>Converted Leads</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="emp in employee_performance_data" :key="emp.employee_id">
                                        <td>{{ emp.employee_id || 'N/A' }}</td>
                                        <td>{{ emp.employee_name || 'N/A' }}</td>
                                        <td>{{ emp.sol_id || 'N/A' }}</td>
                                       <td>{{ emp.branch_info?.branch || 'N/A' }}</td>
                                        <td>{{ emp.total_leads }}</td>
                                        <td>{{ emp.total_converted_leads }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                     </div>
                     <iframe v-else :src="getTabUrl()" style="width:100%; height:70vh; border:none;"></iframe>
                </div>
            </div>
        </div>
    `);

  PetiteVue.createApp({
    selected_year: new Date().getFullYear(),
    selected_month: new Date().getMonth() + 1,
    years: [2024, 2025, 2026],
    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    loading: false,
    active_tab: "employee",
    active_dropdown: null,
    filter_data: { zone: [], region: [], sol_id: [], product: [], source: [] },
    selected: { zone: [], region: [], sol_id: [], product: [], source: [] },
    search_query: {
      sol_id: "",
      product: "",
      source: "",
    },
    tabs: [
      { id: "employee", label: "Employee Wise Performance" },
      { id: "daily_sales", label: "Daily Sales Report" },
      { id: "lead_mgmt", label: "Lead Management" },
    ],
    // New properties for Employee Wise Performance tab
    employee_from_date: null,
    employee_to_date: null,
    employee_performance_data: [],
    employee_report_loading: false,
    employee_error_message: null,
    onDateChange() {
      if (this.employee_from_date && this.employee_to_date) {
        this.fetchEmployeePerformance();
      }
    },

    async init() {
      let res = await frappe.call(
        "sahayog.scrm.api.report_access.get_user_report_preference_record",
        { user: frappe.session.user },
      );
      const pref = (res.message || [])[0];
      if (pref) {
        this.filter_data = {
          zone: pref.zone || [],
          region: pref.region || [],
          sol_id: pref.sol_id || [],
          product: pref.product || [],
          source: pref.source || [],
        };

        this.selected = {
          zone: [...this.filter_data.zone],
          region: [...this.filter_data.region],
          sol_id: this.filter_data.sol_id.map((o) => o.value || o), // Map to value
          product: this.filter_data.product.map((o) => o.value || o), // Map to value
          source: [...this.filter_data.source],
        };
        // DEBUG LOGS
        console.log("Filter Data (Product):", this.filter_data.product);
        console.log("Selected Array (Product):", this.selected.product);
        // Preference ke basis par auto-select
      }
      window.addEventListener("click", () => {
        this.active_dropdown = null;
      });

      // Set default dates for Employee Performance tab to today's date
      const today = frappe.datetime.nowdate();
      this.employee_from_date = today;
      this.employee_to_date = today;

      // Fetch employee performance data by default on load for the active tab
      if (this.active_tab === "employee") {
        this.fetchEmployeePerformance();
      }
    },

    // Watch for active_tab changes to load data automatically

    formatDisplayText(key, val) {
      if (!val) return "";

      // Specific check for Head Office
      if (val.toLowerCase().replace(/\s/g, "") === "headoffice") {
        return "HO";
      }

      // Zone aur Region ke liye number nikalne ka logic
      if (key === "zone" || key === "region") {
        let parts = val.split("-");
        // Agar hyphen hai (Zone-1), to aakhri part lo, warna pura dikhao
        return parts.length > 1 ? parts[parts.length - 1] : val;
      }

      return val;
    },
    toggleDropdown(key) {
      this.active_dropdown = this.active_dropdown === key ? null : key;
      if (this.active_dropdown === null) {
        this.search_query[key] = "";
      }
    },
    isSelected(key, val) {
      // .some use karo taaki == se compare ho sake (Number vs String)
      return this.selected[key].some((item) => item == val);
    },
    toggleFilter(key, val) {
      // Find index using loose equality
      const i = this.selected[key].findIndex((item) => item == val);
      if (i > -1) {
        this.selected[key].splice(i, 1);
      } else {
        this.selected[key].push(val);
      }
    },
    getDisplayText(key) {
      let selectedItems = this.selected[key] || [];
      let count = selectedItems.length;

      if (count === 0) {
        return "Select Options";
      }

      // Find the label for the first selected value if it exists in filter_data
      let firstVal = selectedItems[0];
      let firstItem = this.filter_data[key].find(
        (o) => (o.value || o) === firstVal,
      );
      let displayText = firstItem ? firstItem.label || firstItem : firstVal;

      if (count === 1) {
        return displayText;
      }

      return `${displayText} +${count - 1} more`;
    },
    getTabUrl() {
      if (this.active_tab === "daily_sales")
        return "/app/daily-sales-report?is_embedded=1";
      if (this.active_tab === "lead_mgmt")
        return "/app/crm-lead-management?is_embedded=1";
      return "";
    },

    async fetchEmployeePerformance() {
      this.employee_report_loading = true;
      this.employee_error_message = null;
      this.employee_performance_data = [];

      if (!this.employee_from_date || !this.employee_to_date) {
        this.employee_error_message =
          "Please select both From Date and To Date.";
        this.employee_report_loading = false;
        return;
      }

      console.log(
        "fetchEmployeePerformance called with dates:",
        this.employee_from_date,
        this.employee_to_date,
      ); // Debug log

      try {
        let res = await frappe.call({
          method:
            "sahayog.scrm.api.report_access.get_employee_performance_data",
          args: {
            from_date: this.employee_from_date,
            to_date: this.employee_to_date,
          },
        });
        if (res.message) {
          this.employee_performance_data = res.message;
        } else {
          this.employee_error_message =
            "No data found for the selected date range.";
        }
      } catch (error) {
        this.employee_error_message =
          error.message || "An error occurred while fetching data.";
        frappe.msgprint({
          title: __("Error"),
          message: this.employee_error_message,
          indicator: "red",
        });
      } finally {
        this.employee_report_loading = false;
      }
    },

    async applyFilters() {
      this.loading = true;

      // Update intro to show processing status (Compact)
      page.set_intro(`
        <div class="p-2" style="background-color: #fffbeb; border-left: 4px solid #d97706; border-radius: 4px; font-size: 12px; color: #92400e;">
          <i class="fa fa-spinner fa-spin mr-2"></i> <b>Generating Report...</b> Please stay on this page for the download link.
        </div>
      `);

      const fromDate = `${this.selected_year}-${String(this.selected_month).padStart(2, "0")}-01`;
      const toDate = new Date(this.selected_year, this.selected_month, 0)
        .toISOString()
        .split("T")[0];

      try {
        let res = await frappe.call({
          method: "sahayog.scrm.api.report_access.queue_leads_export",
          args: {
            from_date: fromDate,
            to_date: toDate,
            filters: this.selected,
          },
        });
        if (res.message?.status === "queued") {
          frappe.show_alert({
            message: "Export started...",
            indicator: "blue",
          });
          this.checkStatus();
        }
      } finally {
        this.loading = false;
      }
    },

    checkStatus() {
      let progress = 10;
      let timer = setInterval(async () => {
        let res = await frappe.call(
          "sahayog.scrm.api.report_access.check_export_status",
        );

        // Update progress simulation (Compact)
        if (progress < 90) progress += 10;
        page.set_intro(`
          <div class="p-2" style="background-color: #fffbeb; border-left: 4px solid #d97706; border-radius: 4px; font-size: 12px; color: #92400e;">
            <i class="fa fa-spinner fa-spin mr-2"></i> <b>Processing (${progress}%)...</b> Fetching records.
          </div>
        `);
        if (res.message?.status === "completed") {
          clearInterval(timer);

          const fileName = res.message.file_url.split("/").pop();
          const monthName = this.months[this.selected_month - 1];

          page.set_intro(`
    <div class="p-2 blinking-success" 
         style="background:#f0fdf4; border-left:4px solid #22c55e; border-radius:4px; font-size:12px; color:#166534;">
      
      <div style="display:flex; justify-content:space-between;">
        <span><b>Export Complete</b></span>
        <span>${res.message.row_count} rows</span>
      </div>

      <div style="margin-top:6px; font-size:11px;">
        📁 <b>File:</b> ${fileName}
      </div>

      <div style="font-size:11px;">
        📅 <b>Period:</b> ${monthName} ${this.selected_year}
      </div>
    </div>
  `);

          // Silent Download
          const a = document.createElement("a");
          a.href = res.message.file_url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else if (res.message?.status === "failed") {
          clearInterval(timer);
          page.set_intro(`
            <div class="p-2" style="background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px; font-size: 12px; color: #b91c1c;">
              <i class="fa fa-exclamation-triangle mr-2"></i> <b>Export Failed</b> Please try again later.
            </div>
          `);
        }
      }, 5000);
    },
  }).mount("#crm-app");

  // Global Export Logic (Using Set Intro for Status)
  window.trigger_export = async () => {
    const app = document.querySelector("#crm-app").__vue_app; // Petite vue instance link
    page.set_intro(
      '<div class="py-1 text-primary"><i class="fa fa-cog fa-spin mr-2"></i> Exporting records... Status: 10%</div>',
    );

    let res = await frappe.call({
      method: "sahayog.scrm.api.report_access.queue_leads_export",
      args: {
        from_date: $('input[v-model="from_date"]').val(),
        to_date: $('input[v-model="to_date"]').val(),
        filters: {}, // Yahan Vue selected state pass karni hogi
      },
    });

    if (res.message?.status === "queued") {
      let check = setInterval(async () => {
        let statusRes = await frappe.call(
          "sahayog.scrm.api.report_access.check_export_status",
        );
        if (statusRes.message?.status === "completed") {
          clearInterval(check);
          page.set_intro(`
                        <div class="d-flex align-items-center justify-content-between py-1">
                            <div class="text-success"><i class="fa fa-check-circle mr-2"></i> Export Ready (${statusRes.message.row_count} rows)</div>
                            <a href="${statusRes.message.file_url}" target="_blank" class="btn btn-xs btn-primary">Download File</a>
                        </div>
                    `);
          frappe.show_alert({
            message: "Report generated successfully!",
            indicator: "green",
          });
        } else {
          page.set_intro(
            '<div class="py-1 text-primary"><i class="fa fa-cog fa-spin mr-2"></i> Processing... Please do not close the page.</div>',
          );
        }
      }, 3000);
    }
  };
};
