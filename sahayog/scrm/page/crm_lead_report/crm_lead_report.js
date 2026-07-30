frappe.pages["crm-lead-report"].on_page_load = async function (wrapper) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "CRM Leads Report",
    single_column: true,
  });

  // Add wrapper class to scope custom styles
  $(wrapper).addClass("crm-lead-report-page");

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
        .crm-lead-report-page .page-title {
            display: inline-block !important;
            vertical-align: middle !important;
            margin-bottom: 0 !important;
            margin-right: 16px !important;
            float: none !important;
            width: auto !important;
            flex: none !important;
        }
        .crm-lead-report-page .title-area,
        .crm-lead-report-page .page-head {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            flex-wrap: wrap !important;
        }
        .crm-lead-report-page #crm-branch-capsules {
            display: inline-flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            vertical-align: middle !important;
            margin: 0 !important;
            float: none !important;
        }
        #crm-app { padding: 10px; background-color: transparent; }
        .ui-section-card { margin-bottom: 8px; border: 1px solid #d1d8dd; }
       .section-header { 
          background: #ffffff; 
          padding: 8px 15px; 
          border-bottom: 1px solid #d1d8dd; 
          display: flex; 
          flex-wrap: wrap; /* Mobile friendly */
          justify-content: space-between; 
          align-items: center; 
        }
        .header-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
        .header-controls { display: flex; align-items: center; gap: 15px; }
        .select-input { height: 32px; font-size: 13px; border: 1px solid #d1d8dd; border-radius: 4px; padding: 0 8px; margin-left: 5px; cursor: pointer; }
        .btn-generate-sm { background: #1f2937; color: #fff; border: none; padding: 0 20px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px; height: 32px; }
       .filter-grid { display: none; }
       /* Filter Pill Style for Header */
        .filter-pill {
            display: flex; align-items: center; gap: 6px; background: #fff; 
            padding: 2px 8px; border: 1px solid #d1d8dd; border-radius: 4px; 
            font-size: 11px; cursor: pointer; transition: 0.2s; height: 28px;
        }
        .filter-pill:hover { border-color: #05a15d; background: #f0fdf4; }
        .pencil-icon { color: #05a15d; font-size: 10px; }
        .filter-modal-content {
          background: #fff; padding: 15px; border-radius: 8px; width: 400px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.2); position: relative;
        }
        .filter-column {
          flex: 0 0 auto;          /* Equal width remove */
          min-width: unset;        /* Fixed minimum remove */
          width: fit-content;      /* Content jitna ho utna */
          max-width: 280px;        /* Control overflow */
          border-right: none;      /* Divider remove (optional) */
          padding-right: 0;
        }
        .filter-column:last-child { border-right: none; }
        .filter-label { font-size: 10px; font-weight: 700; color: #1f2937; text-transform: uppercase; margin-bottom: 10px; display: block; }
        .mini-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-width: 240px;
        }
        .mini-chip { font-size: 11px; min-width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid #d1d8dd; cursor: pointer; background: #fff; }
        .mini-chip.active { background: #05a15d !important; color: #fff !important; border-color: #05a15d !important; font-weight: bold; }
        .custom-dropdown { position: relative; width: 100%; }
       .dropdown-select {
          background: #fff;
          border: 1px solid #d1d8dd;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          width: 220px;      /* Fixed compact width */
        }
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
.dropdown-input {
  border: none;
  outline: none;
  font-size: 12px;
  width: 100%;
  text-align: center;   /* 👈 CENTER TEXT */
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
      margin-bottom: 25px;
      }
     .metric-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      border-left: 4px solid #d1d8dd; /* Neutral */
      }
     .metric-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
      .metric-value { font-size: 20px; font-weight: 800; color: #111827; }
      .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .metric-card.primary { border-left-color: #3b82f6; }   /* Blue */
      .metric-card.success { border-left-color: #10b981; }   /* Green */
      .metric-card.warning { border-left-color: #f59e0b; }   /* Orange */
      .metric-card:nth-child(3) { border-left-color: #f59e0b; } /* Orange for Follow-ups */
      .metric-card:last-child { border-left-color: #ef4444; }   /* Red for Not Interested */
      .amt-text { font-weight: 700; color: #1f2937; white-space: nowrap; }
     .table-responsive-dsr {
      border: none;
      box-shadow: none;
      }
      .dsr-table {
      border-spacing: 0 8px; /* Rows ke beech gap */
      border-collapse: separate;
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
      padding: 14px 12px;
      border-top: 1px solid #f3f4f6;
      border-bottom: 1px solid #f3f4f6;
      }
     .dsr-table tbody tr {
      background-color: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      border-radius: 8px;
      }
      .dsr-table th:first-child,
      .dsr-table td:first-child { border-left: 1px solid #f3f4f6; border-top-left-radius:    8px; border-bottom-left-radius: 8px; }
      .dsr-table td:last-child { border-right: 1px solid #f3f4f6; border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
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
    padding: 4px 12px;
    border-radius: 20px; /* Pill Shape */
    font-size: 10px;
    font-weight: 700;
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
/* Isko CSS block mein add karein */
.filter-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5); /* Background dhundla karne ke liye */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999; /* Taaki sabse upar dikhe */
}

.filter-modal-content {
    background: white;
    padding: 20px;
    border-radius: 12px;
    width: 450px; /* Width thodi badhayi hai professional look ke liye */
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
/* Style block mein ye add karein */
.filter-pill-header {
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;
}
.filter-pill-header:hover {
    background: #f3f4f6;
}
/* Horizontal Funnel Styling - No White Gaps */
/* Horizontal Funnel Styling - Gap Fixed */
.funnel-container {
    display: flex;
    width: 100%;
    gap: 0;
    margin-bottom: 25px;
    background: #fff; /* Base background taaki niche se kuch na dikhe */
    border-radius: 8px;
    overflow: hidden;
}

.funnel-stage {
    position: relative;
    flex: 1;
    height: 90px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 38px; /* Arrow ke liye thodi zyada space */
    padding-right: 15px;
    
    /* Yahan 92% aur 8% use kiya hai perfect interlocking ke liye */
    clip-path: polygon(0% 0%, 92% 0%, 100% 50%, 92% 100%, 0% 100%, 8% 50%);
    
    /* Negative margin ko thoda aur badhaya hai overlap cover karne ke liye */
    margin-right: -22px; 
    border: none !important;
    outline: none;
}

.funnel-stage:first-child {
    /* Pehla wala box piche se flat rahega */
    clip-path: polygon(0% 0%, 92% 0%, 100% 50%, 92% 100%, 0% 100%);
    padding-left: 20px;
}

.funnel-stage:last-child {
    /* Aakhri wala box aage se flat rahega */
    clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 8% 50%);
    margin-right: 0;
}

/* Colors with better saturation */
.funnel-stage.total-leads { background: #eff6ff; z-index: 4; border-left: 5px solid #3b82f6 !important; }
.funnel-stage.follow-ups { background: #fefce8; z-index: 3; border-left: 5px solid #eab308 !important; }
.funnel-stage.converted { background: #f0fdf4; z-index: 2; border-left: 5px solid #10b981 !important; }
.funnel-stage.not-interested { background: #fef2f2; z-index: 1; border-left: 5px solid #ef4444 !important; }

/* Isse stages ke beech ek halki line dikhegi jo unhe 'connected' dikhayegi white space ki jagah */
.funnel-stage::after {
    content: "";
    position: absolute;
    right: 0;
    top: 0;
    width: 1px;
    height: 100%;
    background: rgba(0,0,0,0.03);
    z-index: 5;
}

/* Text styles */
.funnel-amount { font-size: 19px; font-weight: 800; color: #111827; }
.funnel-label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 700; margin-bottom: 2px; }
.funnel-sub { font-size: 11px; color: #4b5563; }
.funnel-percentage { 
    position: absolute; 
    top: 8px; 
    right: 25px; 
    font-size: 11px; 
    font-weight: 800; 
    color: rgba(0,0,0,0.15); 
}
.export-dropdown {
    position: relative;
    display: inline-block;
}

.export-menu {
    position: absolute;
    top: 100%; /* Button ke exact niche */
    right: 0;
    background: #fff;
    border: 1px solid #d1d8dd;
    border-radius: 6px;
    min-width: 160px; /* Thoda wide professional dikhne ke liye */
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    z-index: 3001; /* Sabse upar */
    display: block !important; /* v-if handling handles visibility */
    margin-top: 5px;
}

.export-item {
    padding: 8px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
}

.export-item:hover {
    background: #f0fdf4;
    color: #05a15d;
}
.analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}
.analytics-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 15px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
.analytics-title {
    font-size: 12px;
    font-weight: 700;
    color: #374151;
    text-transform: uppercase;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.mini-table {
    width: 100%;
    font-size: 11px;
}
.mini-table th { color: #6b7280; padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: left; }
.mini-table td { padding: 8px; border-bottom: 1px solid #f9fafb; }
.rank-badge {
    width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center;
    background: #f3f4f6; border-radius: 4px; font-weight: bold; color: #4b5563; margin-right: 5px;
}
.top-3-rank { background: #fef3c7; color: #92400e; } /* Gold color for top 3 */
.btn-toggle-analytics {
    background: #f3f4f6;
    color: #4b5563;
    border: 1px solid #d1d8dd;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
}
.btn-toggle-analytics:hover {
    background: #e5e7eb;
}
.analytics-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}
    `,
    )
    .appendTo("head");

  $container.append(`
        <div id="crm-app" v-scope @vue:mounted="init()">
            <div class="ui-section-card">
               <div class="section-header">
                    <div class="header-controls" style="flex: 1; justify-content: flex-start; gap: 20px;">
                        <div v-for="key in ['zone', 'region', 'sol_id', 'product', 'source']" 
                            class="d-flex align-items-center filter-pill-header" 
                            style="cursor: pointer; gap: 6px;" 
                            @click="active_popup = key">
                            
                            <span style="font-size:11px; font-weight:700; color:#4b5563; text-transform: uppercase; letter-spacing: 0.5px;">
                                {{ key.replace('_', ' ') }}
                            </span>
                            <i class="fa fa-filter" style="font-size: 10px; color: #05a15d;"></i>
                        </div>
                    </div>

                    <div class="header-controls">
                        <div class="d-flex align-items-center" style="gap: 10px;">
                            <div class="d-flex align-items-center">
                                <span style="font-size:10px; font-weight:bold; color:#6b7280">PICK MONTH:</span>
                                <input 
                                type="month" 
                                v-model="master_month" 
                                @change="onMasterMonthChange"
                                :max="today.substring(0,7)"
                                class="select-input">
                            </div>
                            <div class="d-flex align-items-center">
                                <span style="font-size:10px; font-weight:bold; color:#6b7280">FROM:</span>
                               <input 
                                type="date"
                                v-model="employee_from_date"
                                :min="month_start"
                                :max="today < month_end ? today : month_end"
                                @change="onDateChange"
                                class="select-input">
                            </div>
                            <div class="d-flex align-items-center">
                                <span style="font-size:10px; font-weight:bold; color:#6b7280">TO:</span>
                                <input 
                                type="date"
                                v-model="employee_to_date"
                                :min="employee_from_date"
                                :max="today < month_end ? today : month_end"
                                @change="onDateChange"
                                class="select-input">
                            </div>
                        </div>

                        <div v-if="totalLeadsInReport > 0">
                            <button class="btn-generate-sm"
                                    @click="downloadReport" 
                                    :disabled="loading">
                                <i class="fa fa-download mr-1"></i> DOWNLOAD
                            </button>
                        </div>
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

                        <div v-for="key in ['sol_id', 'product', 'source'].filter(k => filter_data[k] && filter_data[k].length > 0)" :key="key" class="filter-column">
                            <span class="filter-label">{{ (key || '').replace('_', ' ') }}</span>
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
                                   <div class="dropdown-item"
                                    v-for="opt in getFilteredOptions(active_dropdown)"

                                    @click.stop="toggleFilter(key, opt.value || opt)">
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
                       

                        <!-- Summary Metric Cards -->
                        <div class="funnel-container">
                            <div v-for="stage in funnelStages" 
                                :key="stage.label" 
                                :class="['funnel-stage', stage.class]">
                                
                                <span class="funnel-percentage" v-if="stage.percentage !== undefined">{{ stage.percentage }}%</span>
                                <div class="funnel-label">{{ stage.label }}</div>
                                <div class="funnel-amount">
                                    <small style="font-size: 12px;">₹</small>{{ (stage.amount || 0).toLocaleString('en-IN') }}
                                </div>
                                <div class="funnel-sub">
                                    {{ stage.count }} <span style="font-size: 9px; color: #9ca3af;">leads</span>
                                </div>
                            </div>
                        </div>
                     <div class="analytics-section-header mt-4">
                        <div class="header-title" style="margin:0;">Performance Insights</div>

                            <div style="display:flex; gap:8px;">
                                <button class="btn-toggle-analytics"
                                        @click="goToLeadList">
                                    <i class="fa fa-list>" style="margin-right:5px;"></i>Lead List
                                </button>
                                <button class="btn-toggle-analytics"
                                        @click="show_analytics = !show_analytics">
                                    <i :class="['fa', show_analytics ? 'fa-eye-slash' : 'fa-eye']"
                                      style="margin-right:5px;"></i>
                                    {{ show_analytics ? 'Hide Analytics' : 'Show Analytics' }}
                                </button>

                               <button 
                                    v-if="frappe.user_roles.includes('Branch Manager')"
                                    class="btn-toggle-analytics"
                                    @click="openLeadTransferDialog">

                                    <i class="fa fa-exchange"></i>
                                    Lead Transfer

                                </button>
                            </div>
                        </div>
                    
                        <div class="analytics-grid" v-if="!analytics_loading && show_analytics">
                            <div class="analytics-card">
                                <div class="analytics-title"><i class="fa fa-university text-primary"></i> Top 5 Branches</div>
                                <table class="mini-table">
                                    <thead><tr><th>Branch</th><th>Leads</th><th>Conv %</th></tr></thead>
                                    <tbody>
                                        <tr v-for="(b, i) in analytics_data.top_branches" :key="i">
                                            <td><span :class="['rank-badge', i < 3 ? 'top-3-rank' : '']">{{i+1}}</span> {{b.branch}}</td>
                                            <td><b>{{b.total_leads}}</b></td>
                                            <td><span class="badge-pastel-green">{{b.conversion_rate}}%</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div class="analytics-card">
                                <div class="analytics-title"><i class="fa fa-users text-success"></i> Top 10 Performers</div>
                                <div style="max-height: 250px; overflow-y: auto;">
                                    <table class="mini-table">
                                        <thead><tr><th>Employee</th><th>Leads</th><th>Conv %</th></tr></thead>
                                        <tbody>
                                            <tr v-for="(e, i) in analytics_data.top_employees" :key="i">
                                                <td><span :class="['rank-badge', i < 3 ? 'top-3-rank' : '']">{{i+1}}</span> {{e.employee_name}}</td>
                                                <td><b>{{e.total_leads}}</b></td>
                                                <td><span class="badge-pastel-green">{{e.conversion_rate}}%</span></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="analytics-card">
                                <div class="analytics-title"><i class="fa fa-exclamation-circle text-danger"></i> Lowest CRM Usage</div>
                                <table class="mini-table">
                                    <thead><tr><th>Branch</th><th>Follow-ups</th><th>Usage %</th></tr></thead>
                                    <tbody>
                                        <tr v-for="(b, i) in analytics_data.lowest_usage_branches" :key="i">
                                            <td>{{b.branch}}</td>
                                            <td>{{b.followups}}</td>
                                            <td><span class="badge-pastel-red">{{b.usage_percent}}%</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div v-if="active_tab === 'transfer'" style="padding:20px">

                        <div class="card p-3">

                            <h5>Lead Reassignment</h5>

                            <div class="row">

                                <div class="col-md-6">
                                    <label>Target Employee (Resigned)</label>
                                    <input type="text" v-model="lead_transfer.target_employee" class="form-control">
                                </div>

                                <div class="col-md-6">
                                    <label>Source Employee (New Owner)</label>
                                    <input type="text" v-model="lead_transfer.source_employee" class="form-control">
                                </div>

                            </div>

                            <button
                                class="btn btn-danger mt-3"
                                @click="transferLeads"
                                :disabled="transfer_loading"
                            >
                                Transfer Leads
                            </button>

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
                        <div v-else class="table-responsive-dsr">
                            <table class="dsr-table">
                               <thead>
                                    <tr>
                                      <th>Employee ID</th>
                                      <th>Employee Name</th>
                                      <th>Branch</th> 
                                      <th>Total Leads</th> <th>Follow-ups</th>
                                      <th>Not Interested</th> 
                                      <th>Converted</th>
                                      <th style="color: #05a15d;">Amount (₹)</th> 
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
                                            <span class="dsr-badge badge-pastel-green">{{ emp.zone || 'N/A' }}</span>
                                            <span class="dsr-badge bg-qualified">{{ emp.region || 'N/A' }}</span>
                                        </div>
                                    </td>

                                    <td>
                                        <span class="value-text">{{ emp.total_leads || 0 }}</span>
                                    </td>
                                    
                                    <td>
                                        <span class="value-text">{{ emp.total_followups || 0 }}</span>
                                    </td>

                                    <td>
                                        <span class="value-text">{{ emp.total_not_interested || 0 }}</span>
                                    </td>

                                    <td>
                                        <div class="status-cell-container">
                                            <span class="value-text" style="color: #05a15d;">{{ emp.total_converted || 0 }}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="amt-text">
                                            {{ (emp.converted_amount || 0).toLocaleString('en-IN') }}
                                        </div>
                                    </td>
                                    <td>
                                        <div class="status-cell-container">
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
               <div class="filter-modal-overlay" v-if="active_popup" @click.self="active_popup = null">
                  <div class="filter-modal-content">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                          <h6 class="text-uppercase m-0" style="font-size:12px; font-weight:bold;">Select {{ (active_popup || '').replace('_',' ') }}</h6>
                          
                          <div v-if="active_popup === 'product'" style="display: flex; align-items: center; gap: 6px;">
                              <input type="checkbox" v-model="hide_excluded_products" id="hide_excluded" style="cursor: pointer; width: 14px; height: 14px; accent-color: #05a15d;">
                              <label for="hide_excluded" style="font-size: 11px; font-weight: 600; color: #6b7280; cursor: pointer; margin: 0;">Exclude</label>
                          </div>
                      </div>
                      
                      <div style="max-height: 300px; overflow-y: auto;">
                          <div v-if="active_popup === 'zone' || active_popup === 'region'" class="mini-chip-list">
                              <div v-for="opt in getFilteredOptions(active_popup)" 
                                  :class="['mini-chip', isSelected(active_popup, opt) ? 'active' : '']"
                                  @click="toggleFilter(active_popup, opt)">
                                  {{ formatDisplayText(active_popup, opt) }}
                              </div>
                          </div>

                          <div v-else>
                               <input type="text" v-model="search_query[active_popup]" placeholder="Search..." class="form-control form-control-sm mb-2">
                              
                              <div class="dropdown-item" 
                                  v-for="opt in getFilteredOptions(active_popup)" 
                                  @click="toggleFilter(active_popup, opt.value || opt)">
                                  <input type="checkbox" :checked="isSelected(active_popup, opt.value || opt)">
                                  <span class="ml-2">{{ opt.label || opt }}</span>
                              </div>
                              
                              <div v-if="getFilteredOptions(active_popup).length === 0" class="text-center p-3 text-muted">
                                  No results found
                              </div>
                          </div>
                        </div>
                      <button class="btn btn-primary btn-sm btn-block mt-3" @click="active_popup = null">Done</button>
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
    search_query: { sol_id: "", product: "", source: "" },

    // Master Date Properties
    master_month: frappe.datetime.now_date().substring(0, 7),
    employee_from_date: "", // Init mein set hoga
    employee_to_date: "", // Init mein set hoga

    employee_performance_data: [],
    has_pref: true,
    employee_report_loading: false,
    employee_error_message: null,
    employee_search_term: "",
    active_popup: null,
    hide_excluded_products: false,
    show_export_menu: false,
    // Isse replace karein
    analytics_data: {
      top_branches: [],
      top_employees: [],
      lowest_usage_branches: [],
    },
    analytics_loading: false,
    show_analytics: false, // By default Analytics dikhega
    lead_transfer: {
      target_employee: "",
      source_employee: "",
    },
    transfer_loading: false,
    visible_branches: [],
    disabled_branches: [],

    toggleExportMenu() {
      this.show_export_menu = !this.show_export_menu;
    },
    toggleBranchCapsule(sol_id) {
      const idx = this.disabled_branches.indexOf(sol_id);

      if (idx > -1) {
        this.disabled_branches.splice(idx, 1);
      } else {
        this.disabled_branches.push(sol_id);
      }

      this.fetchEmployeePerformance();
      this.updateCapsuleUI();
    },

    /*
     * generateFastReport()
     * Triggered by 'Generate Fast Report' action.
     * Calls python backend generate_fast_lead_report API to execute a high-speed
     * SELECT ... INTO OUTFILE query which dumps all database leads directly to a master CSV file.
     */
    generateFastReport() {
      this.show_export_menu = false;
      frappe.show_alert({ message: __("Generating CSV Report..."), indicator: "orange" });
      frappe.call({
        method: "sahayog.scrm.api.report_access.generate_fast_lead_report",
        freeze: true,
        freeze_message: __("Generating Fast Lead Report..."),
        callback: (r) => {
          if (r.message && r.message.status === "success") {
            frappe.msgprint({
              title: __("Report Generated"),
              indicator: "green",
              message: __(`Report generated successfully using <b>${r.message.method}</b>.<br>File Size: <b>${r.message.size_kb} KB</b>.<br>Click 'Download Report' to download the CSV.`)
            });
          }
        }
      });
    },

    /*
     * downloadReport()
     * Triggered by the main 'DOWNLOAD' button on the CRM dashboard.
     * Captures current active date range and filter dropdown selections from the UI,
     * encodes them, and sends a direct browser download request to the python backend.
     */
    downloadReport() {
      this.show_export_menu = false;
      let from_date = this.employee_from_date;
      let to_date = this.employee_to_date;
      let filters_str = encodeURIComponent(JSON.stringify(this.selected));
      let download_url = `/api/method/sahayog.scrm.api.report_access.download_fast_lead_report?from_date=${from_date}&to_date=${to_date}&filters=${filters_str}`;
      window.open(download_url, "_blank");
    },
  
    getSelectedCountText(key) {
      const count = this.selected[key].length;
      if (count === 0) return "All";
      if (count === 1) {
        // Pehle selected item ka naam dikhao
        const firstVal = this.selected[key][0];
        const item = this.filter_data[key].find(
          (o) => (o.value || o) === firstVal,
        );
        return item ? item.label || item : firstVal;
      }
      return `${count} Selected`;
    },
    get month_start() {
      if (!this.master_month) return "";
      return this.master_month + "-01";
    },
    get month_end() {
      if (!this.master_month) return "";

      const [year, month] = this.master_month.split("-").map(Number);

      // JS month 0-based hota hai
      const lastDay = new Date(year, month, 0).getDate();

      return `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    },
    get today() {
      return frappe.datetime.nowdate();
    },
    getFilteredOptions(key) {
      let list = this.filter_data[key] || [];

      if (!Array.isArray(list)) return [];

      // Search filter
      list = list.filter((o) => {
        let label = (o.label || o || "").toString().toLowerCase();
        return (
          !this.search_query[key] ||
          label.includes(this.search_query[key].toLowerCase())
        );
      });

      // Product exclude logic
      if (key === "product" && this.hide_excluded_products) {
        list = list.filter((o) => !o.exclude);
      }

      return list;
    },
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
    get funnelStages() {
      const total = this.totalLeadsInReport || 0;

      const totalAmount = this.filteredEmployees.reduce(
        (sum, e) => sum + (e.total_leads_amount || 0),
        0,
      );

      const convertedAmount = this.filteredEmployees.reduce(
        (sum, e) => sum + (e.converted_amount || 0),
        0,
      );

      const followupAmount = this.filteredEmployees.reduce(
        (sum, e) => sum + (e.followup_amount || 0),
        0,
      );

      const notInterestedAmount = this.filteredEmployees.reduce(
        (sum, e) => sum + (e.not_interested_amount || 0),
        0,
      );

      const converted = this.totalConvertedLeadsInReport;
      const followups = this.totalFollowupsInReport;
      const notInterested = this.totalNotInterestedInReport;

      const conversionRate =
        total > 0 ? Math.round((converted / total) * 100) : 0;

      const followupRate =
        total > 0 ? Math.round((followups / total) * 100) : 0;

      return [
        {
          label: "Total Leads",
          count: total,
          amount: totalAmount,
          percentage: 100,
          class: "total-leads",
        },
        {
          label: "Follow Ups",
          count: followups,
          amount: followupAmount,
          percentage: followupRate,
          class: "follow-ups",
        },
        {
          label: "Converted",
          count: converted,
          amount: convertedAmount,
          percentage: conversionRate,
          class: "converted",
        },
        {
          label: "Not Interested",
          count: notInterested,
          amount: notInterestedAmount,
          percentage: total > 0 ? Math.round((notInterested / total) * 100) : 0,
          class: "not-interested",
        },
      ];
    },
    get overallConversionRate() {
      const total = this.totalLeadsInReport || 0;
      return total > 0
        ? Math.round((this.totalConvertedLeadsInReport / total) * 100)
        : 0;
    },
    get totalRevenue() {
      return this.filteredEmployees.reduce(
        (sum, e) => sum + (e.converted_amount || 0),
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
    onMasterMonthChange() {
      if (!this.master_month) return;

      this.employee_from_date = this.month_start;
      this.employee_to_date = this.month_end;
      // console.log(this.employee_from_date, this.employee_to_date);
      this.fetchEmployeePerformance();
    },
    onDateChange() {
      const today = frappe.datetime.nowdate();

      if (this.employee_from_date > today || this.employee_to_date > today) {
        frappe.msgprint({
          title: "Invalid Date",
          message: "You cannot select a future date.",
          indicator: "red",
        });

        this.employee_from_date = today;
        this.employee_to_date = today;
        return;
      }

      this.fetchEmployeePerformance();
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
    goToLeadList() {
      frappe.set_route("list", "Lead");
    },
    openLeadTransferDialog() {
      let lead_count = 0;
      let target_emp_name = "";
      let source_emp_name = "";

      let dialog = new frappe.ui.Dialog({
        title: "Transfer Leads",
        size: "small",

        fields: [
          {
            fieldtype: "HTML",
            fieldname: "lead_info",
          },

          {
            label: "Target Employee",
            fieldname: "target_employee",
            fieldtype: "Link",
            options: "Employee",
            reqd: 1,
          },

          {
            label: "New Lead Owner",
            fieldname: "source_employee",
            fieldtype: "Link",
            options: "Employee",
            reqd: 1,
          },
        ],

        primary_action_label: "Transfer Leads",

        primary_action: async (values) => {
          frappe.confirm(
            `Transfer <b>${lead_count}</b> leads from 
        <b>${target_emp_name} (${values.target_employee})</b> 
        to 
        <b>${source_emp_name} (${values.source_employee})</b>?`,
            async () => {
              frappe.show_alert({
                message: "Transferring leads...",
                indicator: "orange",
              });

              let res = await frappe.call({
                method:
                  "sahayog.scrm.api.report_access.transfer_employee_leads",
                args: values,
              });

              if (res.message.status === "success") {
                frappe.msgprint({
                  title: "Success",
                  message: `${res.message.count} Leads Transferred`,
                  indicator: "green",
                });

                dialog.hide();
              } else {
                frappe.msgprint("No leads found for selected employee");
              }
            },
          );
        },
      });

      dialog.show();

      // Fetch lead count when target employee selected
      dialog.fields_dict.target_employee.$input.on("change", async () => {
        let emp = dialog.get_value("target_employee");
        if (!emp) return;

        let res = await frappe.call({
          method: "sahayog.scrm.api.report_access.get_employee_lead_count",
          args: { employee: emp },
        });

        lead_count = res.message.count || 0;
        target_emp_name = res.message.employee_name || "";

        dialog.fields_dict.lead_info.$wrapper.html(`
    <div style="background:#f0f9ff;padding:8px;border-left:4px solid #0ea5e9;border-radius:4px;font-size:12px;">
      <b>${target_emp_name}(${emp})</b> has 
      <b>${lead_count}</b> leads.
    </div>
  `);
      });
      // Get source employee name
      dialog.fields_dict.source_employee.$input.on("change", async () => {
        let emp = dialog.get_value("source_employee");
        if (!emp) return;

        let r = await frappe.db.get_doc("Employee", emp);
        source_emp_name = r.employee_name;
      });
    },

    // 3. INITIALIZATION (Fix yahan tha)
    async init() {
      // Preference load karein
      let res = await frappe.call(
        "sahayog.scrm.api.report_access.get_user_report_preference_record",
        { user: frappe.session.user },
      );
      frappe.call({
        method: "sahayog.scrm.api.report_access.get_all_products_sources",
        callback: (r) => {
          if (r.message) {
            // Data ko reactive property mein set karein
            this.filter_data.product = r.message.products || [];
            this.filter_data.source = r.message.sources || [];

            // Debug ke liye console check karein ki data aaya ya nahi
            // console.log("Products Loaded:", this.filter_data.product);
          }
        },
      });

      const pref = (res.message || [])[0];

      if (!pref) {
        // ❗ No block — fallback mode
        this.has_pref = false;
        // console.log("No Report Preference → showing own leads only");
        this.selected = {
          zone: [],
          region: [],
          sol_id: [],
          product: [],
          source: [],
        };
      }
      if (pref) {
        this.filter_data.zone = pref.zone || [];
        this.filter_data.region = pref.region || [];
        this.filter_data.sol_id = pref.sol_id || [];

        // console.log(this.filter_data);
        this.selected = {
          zone: [...this.filter_data.zone],
          region: [...this.filter_data.region],
          sol_id: this.filter_data.sol_id.map((o) => o.value || o),
          product: [],
          source: [],
        };
      }

      // SET DEFAULT DATES ON LOAD
      // Default: Today date in both fields
      const today = frappe.datetime.nowdate();
      this.master_month = today.substring(0, 7);

      this.employee_from_date = today; // ✅ today
      this.employee_to_date = today; // ✅ today

      // console.log(this.employee_from_date, this.employee_to_date);
      this.fetchEmployeePerformance();

      // init() function ke andar ka event listener aise update karein:
      window.addEventListener("click", () => {
        this.active_dropdown = null;
        this.show_export_menu = false;
        // active_popup ko null mat kijiye yahan, warna modal bhi band ho jayega
      });
      await this.fetchVisibleBranches();
    },

    // Watch for active_tab changes to load data automatically
    formatDisplayText(key, val) {
      if (val == null || val === undefined) return "";

      let sVal = String(val);

      // Specific check for Head Office
      if (sVal.toLowerCase().replace(/\s/g, "") === "headoffice") {
        return "HO";
      }

      // Zone aur Region ke liye number nikalne ka logic
      if (key === "zone" || key === "region") {
        let parts = sVal.split("-");
        // Agar hyphen hai (Zone-1), to aakhri part lo, warna pura dikhao
        return parts.length > 1 ? parts[parts.length - 1] : sVal;
      }

      return sVal;
    },
    toggleDropdown(key) {
      this.active_dropdown = this.active_dropdown === key ? null : key;
      if (this.active_dropdown === null) {
        this.search_query[key] = "";
      }
    },
    isSelected(key, val) {
      if (!this.selected || !this.selected[key]) return false;
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
      this.fetchVisibleBranches();
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

    getActiveSolIds() {
      return this.selected.sol_id.filter(
        (sol) => !this.disabled_branches.includes(String(sol)),
      );
    },
    async fetchEmployeePerformance() {
      this.employee_report_loading = true;
      this.employee_error_message = null;
      this.fetchAnalytics();

      try {
        let res = await frappe.call({
          method:
            "sahayog.scrm.api.report_access.get_employee_performance_data",
          args: {
            from_date: this.employee_from_date,
            to_date: this.employee_to_date,
            sol_ids: JSON.stringify(this.getActiveSolIds()),
          },
        });
        this.employee_performance_data = res.message || [];

        if (this.employee_performance_data.length === 0) {
          this.showNoLeadsMessage();
        } else {
          if (!this.has_pref && frappe.session.user !== "Administrator") {
            page.set_intro(`
              <div style="background:#fef9c3; padding:6px; font-size:11px; border-left: 4px solid #facc15; border-radius: 4px; color: #854d0e;">
                <i class="fa fa-info-circle mr-1"></i> Showing only your created leads (No Report Preference assigned)
              </div>
            `);
          } else {
            page.set_intro("");
          }
        }
      } catch (error) {
        this.employee_error_message = error.message || "Error fetching data.";
      } finally {
        this.employee_report_loading = false;
      }
    },
    async fetchAnalytics() {
      this.analytics_loading = true;
      try {
        let res = await frappe.call({
          method: "sahayog.scrm.api.report_access.get_crm_top_analytics",
          args: {
            from_date: this.employee_from_date,
            to_date: this.employee_to_date,
          },
        });
        if (res.message) {
          this.analytics_data = res.message;
        }
      } catch (e) {
        console.error("Analytics Error:", e);
      } finally {
        this.analytics_loading = false;
      }
    },

    async fetchVisibleBranches() {
      let res = await frappe.call({
        method: "sahayog.scrm.api.report_access.get_branches_by_filters",
        args: {
          zones: JSON.stringify(this.selected.zone),
          regions: JSON.stringify(this.selected.region),
          sol_ids: JSON.stringify(this.selected.sol_id),
        },
      });
      this.visible_branches = res.message || [];
      this.updateCapsuleUI();
    },
    updateCapsuleUI() {
      $("#crm-branch-capsules").remove();

      const count = this.visible_branches?.length || 0;
      if (!count) return;

      const visible = this.visible_branches.slice(0, 6);

      const branchBadges = visible
        .map((b) => {
          const displayLabel = `${b.sol_id}${b.branch ? " - " + b.branch : ""}`;
          const isDisabled = this.disabled_branches.includes(String(b.sol_id));
          const dotColor = isDisabled ? "#ef4444" : "#22c55e";

          const capsuleStyle = isDisabled
            ? `
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #991b1b;
                opacity: 0.85;
            `
            : `
                background: #e8fdf0;
                border: 1px solid #a6efc0;
                color: #15803d;
            `;

          return `
                <span
                    class="crm-branch-pill"
                    data-sol="${b.sol_id}"
                    style="
                        ${capsuleStyle}
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        padding: 4px 10px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 600;
                        white-space: nowrap;
                        max-width: 180px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        line-height: 1;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    "
                    title="${displayLabel}"
                >
                    <span style="
                        display: inline-block;
                        width: 6px;
                        height: 6px;
                        border-radius: 50%;
                        background: ${dotColor};
                        margin-right: 6px;
                        flex-shrink: 0;
                    "></span>
                    ${displayLabel}
                </span>
            `;
        })
        .join("");

      const moreBadge =
        count > 6
          ? `
                <span
                    id="show-all-branches"
                    style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        padding: 4px 10px;
                        border-radius: 12px;
                        background: #f1f5f9;
                        border: 1px solid #cbd5e1;
                        color: #475569;
                        font-size: 11px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all .2s ease;
                        line-height: 1;
                    "
                >
                    +${count - 6} More
                </span>
            `
          : "";

      const $title = $(wrapper).find(".page-title");
      $title.after(`
        <div id="crm-branch-capsules">
            ${branchBadges}
            ${moreBadge}
        </div>
      `);

      // Add click handler for visible capsules
      $(".crm-branch-pill").on("click", (e) => {
        const solId = $(e.currentTarget).data("sol");
        this.toggleBranchCapsule(String(solId));
      });

      // Dialog box trigger for 'More'
      $("#show-all-branches").on("click", () => {
        const html = this.visible_branches
          .map((b) => {
            const isDisabled = this.disabled_branches.includes(
              String(b.sol_id),
            );
            return `
                <div
                    class="branch-toggle-item"
                    data-sol="${b.sol_id}"
                    style="
                        padding: 10px 12px;
                        border-bottom: 1px solid #f1f5f9;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                        background: ${isDisabled ? "#f8fafc" : "#ffffff"};
                    "
                >
                    <span style="font-weight: 600; color: ${isDisabled ? "#94a3b8" : "#0369a1"}; min-width: 90px;">
                        ${b.sol_id}
                    </span>
                    <span style="flex: 1; color: ${isDisabled ? "#94a3b8" : "#334155"}; padding-left: 12px;">
                        ${b.branch || "-"}
                    </span>
                    <i class="fa ${isDisabled ? "fa-toggle-off" : "fa-toggle-on"}" style="color: ${isDisabled ? "#cbd5e1" : "#05a15d"}; font-size: 16px;"></i>
                </div>
            `;
          })
          .join("");

        const d = new frappe.ui.Dialog({
          title: `Manage Branches (${count})`,
          size: "large",
          fields: [{ fieldtype: "HTML", fieldname: "branches" }],
        });

        d.fields_dict.branches.$wrapper.html(`
            <div style="max-height: 450px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
                ${html}
            </div>
        `);

        // Attach toggle event in dialog
        d.fields_dict.branches.$wrapper
          .find(".branch-toggle-item")
          .on("click", (e) => {
            const solId = $(e.currentTarget).data("sol");
            this.toggleBranchCapsule(String(solId));
            // Re-render dialog content
            d.hide();
          });

        d.show();
      });
    },
  }).mount("#crm-app");
};
