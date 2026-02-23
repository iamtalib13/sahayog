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
        .dropdown-list { position: absolute; top: 100%; left: 0; width: 250px; max-height: 250px; overflow-y: auto; background: #fff; border: 1px solid #d1d8dd; border-radius: 4px; z-index: 2000; box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: none; margin-top: 5px; }
        .dropdown-list.show { display: block; }
        .dropdown-item { padding: 8px 12px; font-size: 11px; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #f1f1f1; }
        
        /* Tab Styling */
        .tab-nav { display: flex; background: #f8f9fa; border-bottom: 1px solid #d1d8dd; border-radius: 8px 8px 0 0; }
        .tab-item { padding: 12px 20px; cursor: pointer; font-weight: 600; color: #6b7280; font-size: 13px; border-right: 1px solid #eee; }
        .tab-item.active { background: #fff; color: #05a15d; border-top: 2px solid #05a15d; border-bottom: 1px solid transparent; }
        @keyframes blink-success { 0% { background-color: #dcfce7; } 50% { background-color: #ffffff; } 100% { background-color: #dcfce7; } }
        .blinking-success { animation: blink-success 1.5s infinite; border: 1px solid #22c55e !important; }
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
                                <div class="dropdown-select" @click.stop="toggleDropdown(key)">
                                    <span>{{ getDisplayText(key) }}</span>
                                    <i class="fa fa-caret-down text-muted"></i>
                                </div>
                                <div :class="['dropdown-list', active_dropdown === key ? 'show' : '']">
                                    <div class="dropdown-item" v-for="opt in filter_data[key]" @click.stop="toggleFilter(key, opt)">
                                        <input type="checkbox" :checked="isSelected(key, opt)">
                                        <span>{{ opt }}</span>
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
                        <div class="text-center p-5 text-muted">
                            <i class="fa fa-table fa-2x mb-3" style="color:#d1d8dd"></i>
                            <p>Select Month/Year and click <b>Export CSV</b> for raw data. Employee view coming soon.</p>
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
    tabs: [
      { id: "employee", label: "Employee Wise Performance" },
      { id: "daily_sales", label: "Daily Sales Report" },
      { id: "lead_mgmt", label: "Lead Management" },
    ],

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
        // Preference ke basis par auto-select
        this.selected = {
          zone: [...this.filter_data.zone],
          region: [...this.filter_data.region],
          sol_id: [...this.filter_data.sol_id],
          product: [...this.filter_data.product],
          source: [...this.filter_data.source],
        };
      }
      window.addEventListener("click", () => {
        this.active_dropdown = null;
      });
    },

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
    },
    isSelected(key, val) {
      return this.selected[key].includes(val);
    },
    toggleFilter(key, val) {
      const i = this.selected[key].indexOf(val);
      if (i > -1) this.selected[key].splice(i, 1);
      else this.selected[key].push(val);
    },
    getDisplayText(key) {
      let count = this.selected[key].length;
      let totalOptions = this.filter_data[key].length;

      // 1. Agar kuch bhi select nahi hai
      if (count === 0) {
        return "Select Options";
      }
      // 3. Pehla selected item aur baki ka count dikhane ke liye
      let firstItem = this.selected[key][0];

      if (count > 1) {
        return `${firstItem}`;
      } else {
        return firstItem;
      }
    },
    getTabUrl() {
      if (this.active_tab === "daily_sales")
        return "/app/daily-sales-report?is_embedded=1";
      if (this.active_tab === "lead_mgmt")
        return "/app/crm-lead-management?is_embedded=1";
      return "";
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
