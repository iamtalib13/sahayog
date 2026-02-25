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
      /* DSR-like Styling for Employee Wise Tab */
      .report-header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding: 10px 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
      }
      .report-date-display {
        display: flex;
        align-items: center;
        font-size: 14px;
        font-weight: 600;
        color: #495057;
      }
      .report-date-icon {
        margin-right: 8px;
        font-size: 16px;
        color: #6c757d;
      }
      .metric-cards-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      .metric-card {
        background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
      }
      .metric-label {
        font-size: 12px;
        color: #6c757d;
        margin-bottom: 8px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .metric-value {
        font-size: 24px;
        font-weight: 700;
        color: #343a40;
        line-height: 1.2;
      }
      .table-responsive-dsr {
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.06);
        max-height: 500px;
        overflow-y: auto;
        border: 1px solid #e0e0e0;
      }
      .dsr-table {
        width: 100%;
        margin: 0;
        border-collapse: collapse;
        font-size: 13px;
      }
      .dsr-table thead {
        background: linear-gradient(135deg, #343a40 0%, #495057 100%);
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .dsr-table th {
        color: white;
        text-align: left; /* Changed from center to left */
        font-size: 13px;
        font-weight: 600;
        padding: 10px 12px;
        border: none;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        line-height: 1.3;
      }
      .dsr-table td {
        vertical-align: middle;
        text-align: left; /* Changed from center to left */
        font-size: 13px;
        padding: 9px 12px;
        border-top: 1px solid #dee2e6;
        border-bottom: none;
        line-height: 1.45;
        color: #343a40;
      }
      .dsr-table tbody tr:hover {
        background-color: #f8f9fa;
      }
      .dsr-table th:first-child,
      .dsr-table td:first-child {
        width: 60px;
        min-width: 60px;
        text-align: center;
        font-weight: 600;
      }
      .empty-state-dsr {
        text-align: center;
        padding: 40px 20px;
        color: #6c757d;
        font-size: 14px;
        background: #fff;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
      }
      .loading-spinner-dsr {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 50px;
        background: #fff;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
      }
      .spinner-dsr {
        width: 24px;
        height: 24px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 10px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      /* Responsive adjustments */
      @media (max-width: 768px) {
        .report-header-section {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        .metric-cards-container {
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .dsr-table th, .dsr-table td {
          font-size: 12px;
          padding: 8px 6px;
        }
        .metric-card.primary {
        border-left: 4px solid #007bff;
        }

       .metric-card.success {
       border-left: 4px solid #22c55e;
        }
        /* Enhanced Rating Badges */
       .rating-badge-dsr {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        }
        .bg-good { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .bg-average { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
        .bg-bad { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .bg-qualified { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }

        .emp-info-sub {
            font-size: 10px;
            color: #6b7280;
            display: block;
            margin-top: 2px;
        }
      }
      /* Enhanced Rating & Pastel Badges - Moving outside media query */
    .rating-badge-dsr, .dsr-badge {
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap; /* Text wrap na ho */
    margin-top: 0 !important; /* Top margin hata diya side alignment ke liye */
}

    /* Pastel Green */
    .badge-pastel-green, .bg-good, .bg-qualified { 
        background-color: #f0fdf4 !important; 
        color: #166534 !important; 
        border: 1px solid #bbf7d0 !important; 
    }

    /* Pastel Red */
    .badge-pastel-red, .bg-bad, .bg-disqualified { 
        background-color: #fef2f2 !important; 
        color: #991b1b !important; 
        border: 1px solid #fecaca !important; 
    }
    /* Pastel Yellow for Average */
.bg-average { 
    background-color: #fef9c3 !important; 
    color: #854d0e !important; 
    border: 1px solid #fef08a !important; 
}
    .status-cell-container {
    display: flex;
    align-items: center;
    justify-content: flex-start; /* Isse content left align rahega */
    gap: 8px; /* Number aur Badge ke beech ka gap */
}

.value-text {
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
    min-width: 15px; /* Alignment barakar rakhne ke liye */
}


    .emp-info-sub {
        font-size: 10px;
        color: #6b7280;
        display: block;
        margin-top: 2px;
    }
    .report-date-display input[type="date"] {
    border: 1px solid #d1d8dd;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 13px;
    font-family: inherit;
    color: #495057;
    cursor: pointer;
    background: #fff;
}
.report-date-display input[type="date"]:focus {
    border-color: #05a15d;
    outline: none;
    box-shadow: 0 0 0 2px rgba(5, 161, 93, 0.1);
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
                      <button 
                          class="btn-generate-sm" 
                          v-if="totalLeadsInReport > 0"
                          @click="applyFilters" 
                          :disabled="loading"
                      >
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
               <div class="header-title mb-3">Employee Wise Performance</div>
                <div class="tab-content" style="padding:20px; min-height:300px;">
                    <div>
                        <!-- Report Header with Date Display -->
                       <div class="report-header-section">
                            <div class="report-date-display">
                                <span class="report-date-icon">📅</span>
                                <span class="mr-2">Period:</span>
                                <input type="date" v-model="employee_from_date" @change="onDateChange" class="select-input" style="width: 140px; margin-right: 10px;">
                                <span class="mr-2">to</span>
                                <input type="date" v-model="employee_to_date" @change="onDateChange" class="select-input" style="width: 140px;">
                            </div>
                            
                            <div class="employee-search-container" style="position: relative; flex: 1; max-width: 300px; margin-left: 20px;">
                                <i class="fa fa-search" style="position: absolute; left: 10px; top: 10px; color: #6b7280;"></i>
                                <input type="text" 
                                      v-model="employee_search_term" 
                                      placeholder="Search Employee ID or Name..." 
                                      class="select-input" 
                                      style="width: 100%; padding-left: 30px;">
                            </div>
                        </div>

                        <!-- Summary Metric Cards -->
                        <div class="metric-cards-container">
                            <div class="metric-card primary">
                                <div class="metric-label">Total Leads</div>
                                <div class="metric-value">{{ totalLeadsInReport }}</div>
                            </div>
                           <div class="metric-card success">
                                <div class="metric-label">Converted Leads</div>
                                <div class="metric-value">{{ totalConvertedLeadsInReport }}</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-label">Total Follow-ups</div>
                                <div class="metric-value">{{ totalFollowupsInReport }}</div>
                            </div>

                            <div class="metric-card">
                                <div class="metric-label">Not Interested</div>
                                <div class="metric-value">{{ totalNotInterestedInReport }}</div>
                            </div>
                        </div>
                        
                        <!-- Loading/Error/Empty States -->
                        <div v-if="employee_report_loading" class="loading-spinner-dsr">
                            <div class="spinner-dsr"></div>
                            <span>Loading Employee Performance Data...</span>
                        </div>
                        <div v-else-if="employee_error_message" class="alert alert-danger text-center p-3">
                            <i class="fa fa-exclamation-triangle mr-2"></i> {{ employee_error_message }}
                        </div>
                        <div v-else-if="employee_performance_data.length === 0" class="empty-state-dsr">
                            <i class="fa fa-table fa-2x mb-3" style="color:#d1d8dd"></i>
                            <p>No employee performance data found for the selected period.</p>
                        </div>
                        <!-- Employee Performance Table -->
                        <div class="header-title mb-2">Employee Performance Summary</div>
                        <div v-else class="table-responsive-dsr">
                            <table class="dsr-table">
                               <thead>
                                    <tr>
                                        <th>Employee ID</th>
                                        <th>Employee Name</th>
                                        <th>Branch</th> 
                                        <th>Follow-ups</th>
                                        <th>Not Interested</th> 
                                        <th>Converted</th>
                                        <th>Qualification</th>
                                        <th>Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                 <tr v-for="emp in filteredEmployees" :key="emp.employee_id">
                                    <td><span style="font-weight:bold;">{{ emp.employee_id || 'N/A' }}</span></td>
                                    <td>
                                        <div style="font-weight: 600;">{{ emp.employee_name || 'N/A' }}</div>
                                        <span class="emp-info-sub">{{ emp.designation || 'N/A' }}</span>
                                    </td>
                                  
                                    <td>
                                        <div style="font-weight: 600; color: #1f2937;">
                                            {{ emp.sol_id }} - {{ emp.branch || 'N/A' }}
                                        </div>
                                        
                                        <div class="status-cell-container" style="margin-top: 5px; gap: 5px;">
                                            <span class="dsr-badge badge-pastel-green">
                                                {{ emp.zone || 'N/A' }}
                                            </span>
                                            <span class="dsr-badge bg-qualified">
                                                {{ emp.region || 'N/A' }}
                                            </span>
                                        </div>
                                    </td>
                                    
                                    <td>
                                        <span class="value-text">{{ emp.total_followups || 0 }}</span>
                                    </td>
                                    <td>
                                        <span class="value-text">{{ emp.total_converted || 0 }}</span>
                                    </td>
                                    <td>
                                        <span class="value-text">{{ emp.total_not_interested || 0 }}</span>
                                    </td>

                                   <td>
                                      <div class="status-cell-container">
                                          <span class="value-text">{{ emp.total_leads }}</span>
                                          <span :class="['dsr-badge', getLeadStatus(emp.total_leads).class]">
                                              {{ getLeadStatus(emp.total_leads).label }}
                                          </span>
                                      </div>
                                  </td>

                                 <td>
                                      <div class="status-cell-container">
                                          <span :class="['dsr-badge', getEnhancedRating(emp).class]">
                                              {{ getEnhancedRating(emp).label }}
                                          </span>
                                      </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                        </div>
                     </div>
                    
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
    tabs: [{ id: "employee", label: "Employee Wise Performance" }],
    // New properties for Employee Wise Performance tab
    employee_from_date: null,
    employee_to_date: null,
    employee_performance_data: [],
    employee_report_loading: false,
    employee_error_message: null,
    employee_search_term: "",

    get filteredEmployees() {
      if (!this.employee_performance_data) return [];

      // Agar search box khali hai toh poora data dikhao
      if (!this.employee_search_term) return this.employee_performance_data;

      const term = this.employee_search_term.toLowerCase();

      return this.employee_performance_data.filter((emp) => {
        return (
          (emp.employee_id && emp.employee_id.toLowerCase().includes(term)) ||
          (emp.employee_name && emp.employee_name.toLowerCase().includes(term))
        );
      });
    },
    get totalLeadsInReport() {
      return this.filteredEmployees.reduce(
        (sum, emp) => sum + (emp.total_leads || 0),
        0,
      );
    },
    get totalConvertedLeadsInReport() {
      return this.filteredEmployees.reduce(
        (sum, emp) => sum + (emp.total_converted || 0),
        0,
      );
    },
    get totalFollowupsInReport() {
      return this.filteredEmployees.reduce(
        (sum, emp) => sum + (emp.total_followups || 0),
        0,
      );
    },

    get totalNotInterestedInReport() {
      return this.filteredEmployees.reduce(
        (sum, emp) => sum + (emp.total_not_interested || 0),
        0,
      );
    },
    getRating(emp) {
      if (emp.total_converted > 0) return { label: "Good", class: "bg-good" };
      if (emp.follow_ups >= 4) return { label: "Average", class: "bg-average" };
      return { label: "Bad", class: "bg-bad" };
    },

    getQualification(total) {
      return total >= 10
        ? { label: "Qualified", class: "bg-qualified" }
        : { label: "Disqualified", class: "bg-bad" };
    },
    onDateChange() {
      // Jaise hi date change hogi, ye function call hoga
      if (this.employee_from_date && this.employee_to_date) {
        console.log(
          "Fetching data for:",
          this.employee_from_date,
          "to",
          this.employee_to_date,
        );
        this.fetchEmployeePerformance();
      }
    },
    // Is function ko methods section mein add/replace karein
    getEnhancedRating(emp) {
      // 1. Agar ek bhi lead convert hui hai
      if (emp.total_converted > 0) {
        return { label: "Good", class: "badge-pastel-green" };
      }
      // 2. Agar convert nahi hui par 4 ya usse zyada follow-ups hain
      else if ((emp.total_followups || 0) >= 4) {
        return { label: "Average", class: "bg-average" };
      }
      // 3. Baaki sab cases mein "Bad"
      else {
        return { label: "Bad", class: "badge-pastel-red" };
      }
    },
    // Status logic for Badges
    // Status logic for Badges
    getLeadStatus(count) {
      return count >= 10
        ? { label: "Qualified", class: "badge-pastel-green" }
        : { label: "Disqualified", class: "badge-pastel-red" };
    },

    getConversionStatus(count) {
      return count > 0
        ? { label: "Good", class: "badge-pastel-green" }
        : { label: "Bad", class: "badge-pastel-red" };
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
          console.log("Raw Data from Server:", res.message);
          this.employee_performance_data = res.message;
        } else {
          this.employee_error_message =
            "No data found for the selected date range.";
        }
        if (this.totalLeadsInReport === 0) {
          this.showNoLeadsMessage();
        } else {
          page.set_intro(""); // Clear message if data exists
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
      // Safety check: though button is hidden, we block the function too
      if (this.totalLeadsInReport === 0) {
        this.showNoLeadsMessage();
        return;
      }

      this.loading = true;
      page.set_intro(`
        <div class="p-2" style="background-color: #fffbeb; border-left: 4px solid #d97706; border-radius: 4px; font-size: 12px; color: #92400e;">
          <i class="fa fa-spinner fa-spin mr-2"></i> <b>Generating Report...</b> Please stay on this page.
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
          this.checkStatus();
        }
      } catch (e) {
        this.loading = false;
      }
    },

    showNoLeadsMessage() {
      page.set_intro(`
        <div class="p-2" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; font-size: 12px; color: #b91c1c;">
          <i class="fa fa-info-circle mr-2"></i> <b>No Records Found:</b> There are no leads available for the selected month or applied filter criteria.
        </div>
      `);
    },

    checkStatus() {
      let progress = 10;
      let timer = setInterval(async () => {
        let res = await frappe.call(
          "sahayog.scrm.api.report_access.check_export_status",
        );

        if (progress < 90) progress += 10;

        page.set_intro(`
          <div class="p-2" style="background-color: #fffbeb; border-left: 4px solid #d97706; border-radius: 4px; font-size: 12px; color: #92400e;">
            <i class="fa fa-spinner fa-spin mr-2"></i> <b>Processing (${progress}%)...</b> Fetching data.
          </div>
        `);

        if (res.message?.status === "completed") {
          clearInterval(timer);
          this.loading = false;

          if (res.message.row_count === 0) {
            this.showNoLeadsMessage();
            return;
          }

          const fileName = res.message.file_url.split("/").pop();
          page.set_intro(`
            <div class="p-2 blinking-success" style="background:#f0fdf4; border-left:4px solid #22c55e; border-radius:4px; font-size:12px; color:#166534;">
              <div style="display:flex; justify-content:space-between;">
                <span><i class="fa fa-check-circle"></i> <b>Export Ready</b></span>
                <span><b>${res.message.row_count} rows</b></span>
              </div>
              <div style="margin-top:4px; font-size:11px;">📁 ${fileName}</div>
            </div>
          `);

          // Trigger download
          const a = document.createElement("a");
          a.href = res.message.file_url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else if (res.message?.status === "failed") {
          clearInterval(timer);
          this.loading = false;
          page.set_intro(
            `<div class="p-2" style="color:#b91c1c;"><b>Error:</b> Export failed.</div>`,
          );
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
