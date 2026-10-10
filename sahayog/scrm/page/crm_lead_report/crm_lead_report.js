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
        #crm-app { padding: 8px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .crm-layout-container { display: flex; gap: 14px; align-items: flex-start; min-height: calc(100vh - 120px); }
        .crm-sidebar {
            width: 250px; min-width: 250px; background: #ffffff;
            border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03); position: sticky; top: 12px;
            max-height: calc(100vh - 140px); overflow-y: auto; transition: all 0.25s ease;
        }
        .crm-sidebar-header {
            display: flex; justify-content: space-between; align-items: center;
            padding-bottom: 10px; margin-bottom: 12px; border-bottom: 1px solid #edf2f7;
        }
        .crm-sidebar-title { font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
        .crm-sidebar-reset { font-size: 11px; font-weight: 600; color: #3b82f6; cursor: pointer; text-decoration: none; }
        .crm-sidebar-reset:hover { text-decoration: underline; }
        .crm-filter-group { margin-bottom: 14px; }
        .crm-filter-label { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 5px; display: block; text-transform: uppercase; letter-spacing: 0.3px; }
        .crm-sidebar-select, .crm-sidebar-input {
            width: 100%; height: 32px; font-size: 12px; border: 1px solid #cbd5e1;
            border-radius: 6px; padding: 0 8px; background: #ffffff; color: #0f172a;
        }
        .crm-sidebar-select:focus, .crm-sidebar-input:focus { border-color: #3b82f6; outline: none; }
        .crm-main-area { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
        .crm-top-actions-bar {
            display: flex; justify-content: space-between; align-items: center;
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 8px 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .crm-filter-capsules-bar {
            display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 8px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .crm-capsule-box {
            position: relative; display: inline-flex; align-items: center;
            background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px;
            height: 30px; padding: 0 8px; min-width: 130px;
        }
        .crm-capsule-box input {
            border: none; background: transparent; font-size: 12px; color: #1e293b;
            width: 100%; outline: none; padding-right: 14px;
        }
        .crm-capsule-box .crm-approx-icon {
            position: absolute; right: 6px; font-size: 11px; color: #94a3b8; pointer-events: none;
        }
        .crm-btn-filter-pill {
            display: inline-flex; align-items: center; gap: 5px; height: 30px;
            padding: 0 10px; border-radius: 6px; font-size: 12px; font-weight: 600;
            cursor: pointer; border: 1px solid #cbd5e1; background: #ffffff; color: #334155;
            transition: all 0.15s; margin-left: auto;
        }
        .crm-btn-filter-pill.active { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .crm-table-container {
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02); overflow: hidden;
        }
        .crm-list-table { width: 100%; border-collapse: collapse; margin: 0; font-size: 12.5px; }
        .crm-list-table thead th {
            background: #f8fafc; color: #475569; font-weight: 600; font-size: 11px;
            text-transform: uppercase; letter-spacing: 0.4px; padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0; text-align: left; white-space: nowrap;
        }
        .crm-list-table tbody tr {
            border-bottom: 1px solid #f1f5f9; transition: background-color 0.15s ease;
        }
        .crm-list-table tbody tr:hover { background-color: #f8fafc; }
        .crm-list-table tbody td {
            padding: 10px 12px; vertical-align: middle; color: #1e293b;
        }
        .crm-soft-pill {
            display: inline-flex; align-items: center; padding: 2px 8px;
            border-radius: 12px; font-size: 11px; font-weight: 600; line-height: 1.4;
        }
        .crm-soft-pill.blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
        .crm-soft-pill.green { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .crm-soft-pill.yellow { background: #fefce8; color: #a16207; border: 1px solid #fef08a; }
        .crm-soft-pill.red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .crm-soft-pill.gray { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .crm-bottom-pagination-bar {
            display: flex; justify-content: space-between; align-items: center;
            background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 8px 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .crm-page-limit-pills { display: inline-flex; align-items: center; gap: 4px; }
        .crm-limit-pill {
            padding: 3px 10px; border-radius: 5px; font-size: 11px; font-weight: 600;
            cursor: pointer; border: 1px solid #cbd5e1; background: #ffffff; color: #475569;
            transition: all 0.15s;
        }
        .crm-limit-pill:hover { background: #f1f5f9; }
        .crm-limit-pill.active {
            background: #0f172a; color: #ffffff; border-color: #0f172a;
        }
        .crm-btn-load-more {
            background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a;
            font-size: 12px; font-weight: 600; padding: 4px 14px; border-radius: 6px;
            cursor: pointer; transition: all 0.15s;
        }
        .crm-btn-load-more:hover { background: #f8fafc; border-color: #94a3b8; }
        .ui-section-card { margin-bottom: 8px; border: 1px solid #d1d8dd; }
       .section-header { 
          background: #ffffff; 
          padding: 8px 15px; 
          border-bottom: 1px solid #d1d8dd; 
          display: flex; 
          flex-wrap: nowrap !important;
          overflow-x: auto;
          white-space: nowrap;
          justify-content: space-between; 
          align-items: center;
          gap: 12px;
        }
        .header-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
        .header-controls { display: flex; align-items: center; gap: 10px; flex-shrink: 0; white-space: nowrap; }
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
/* Modern Frappe UI Metric Cards */
.funnel-container {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    width: 100%;
    margin-bottom: 16px;
    background: transparent;
}

.funnel-stage {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    position: relative;
}

.funnel-stage:hover {
    border-color: #cbd5e1;
    box-shadow: 0 3px 6px -1px rgba(0, 0, 0, 0.06);
}

.funnel-stage.total-leads { border-left: 3px solid #3b82f6; }
.funnel-stage.follow-ups { border-left: 3px solid #f59e0b; }
.funnel-stage.converted { border-left: 3px solid #10b981; }
.funnel-stage.not-interested { border-left: 3px solid #ef4444; }

.funnel-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.funnel-label {
    font-size: 11px;
    font-weight: 600;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin: 0;
}

.funnel-percentage-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
}

.funnel-stage.total-leads .funnel-percentage-pill { background: #eff6ff; color: #1d4ed8; }
.funnel-stage.follow-ups .funnel-percentage-pill { background: #fefce8; color: #b45309; }
.funnel-stage.converted .funnel-percentage-pill { background: #f0fdf4; color: #15803d; }
.funnel-stage.not-interested .funnel-percentage-pill { background: #fef2f2; color: #b91c1c; }

.funnel-amount {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    line-height: 1.2;
    margin-bottom: 4px;
}

.funnel-sub {
    font-size: 11px;
    color: #6b7280;
    font-weight: 500;
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
            <!-- Admin Control Panel Widget (Visible ONLY to Administrator / System Managers) -->
            <div v-if="report_info && report_info.is_admin" class="admin-master-report-bar mb-2 py-1 px-3 rounded shadow-xs d-flex align-items-center justify-content-between" style="background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px; height: 38px;">
                <div class="d-flex align-items-center" style="gap: 10px; overflow: hidden; white-space: nowrap;">
                    <span class="font-weight-bold text-dark" style="font-size: 11px;">
                        Admin Report:
                    </span>
                    <span :class="['badge', report_info.status === 'Ready' ? 'badge-success' : 'badge-warning']" style="font-size: 10px; padding: 2px 6px;">
                        {{ report_info.status === 'Ready' ? 'Ready' : report_info.status }}
                    </span>
                    <span class="text-muted" v-if="report_info.active_filename">
                        Active: <code class="text-primary font-weight-bold" style="font-size: 11px;">{{ report_info.active_filename }}</code> ({{ report_info.size_mb }}MB)
                    </span>
                    <span class="text-info font-weight-bold" v-if="report_info.backup_exists" title="Backup file active for live downloads during rebuild">
                        | Backup Active ({{ report_info.backup_size_mb }}MB)
                    </span>
                    <span class="text-muted" v-if="report_info.last_generated_at">
                        | {{ report_info.last_generated_at }}
                    </span>
                </div>

                <div class="d-flex align-items-center" style="gap: 6px; flex-shrink: 0;">
                    <button class="btn btn-xs btn-default font-weight-bold border" 
                            @click="show_server_files_modal = true" title="View all CSV report files stored on server">
                        Files
                    </button>

                    <button class="btn btn-xs btn-primary font-weight-bold" 
                            @click="syncIncrementalReport" 
                            :disabled="report_info.status === 'Generating'" title="Manually sync latest 3-day lead data in-place">
                        {{ (report_info.status === 'Generating' && active_report_action === 'sync') ? 'Syncing...' : 'Generate' }}
                    </button>

                    <button class="btn btn-xs btn-outline-danger font-weight-bold" 
                            @click="confirmRebuildReport" 
                            :disabled="report_info.status === 'Generating'" title="Rebuild full baseline report cleanly with backup fallback">
                        {{ (report_info.status === 'Generating' && active_report_action === 'rebuild') ? 'Building...' : 'Rebuild' }}
                    </button>
                </div>
            </div>

            <!-- Modal for Viewing Server Files -->
            <div v-if="show_server_files_modal" class="modal-backdrop-custom d-flex align-items-center justify-content-center" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); z-index: 1050;" @click.self="show_server_files_modal = false">
                <div class="bg-white rounded p-4 shadow-lg" style="width: 750px; max-width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                        <h5 class="m-0 font-weight-bold text-dark">Server Lead Report Files</h5>
                        <button class="btn btn-sm btn-link text-muted" @click="show_server_files_modal = false">✕</button>
                    </div>
                    
                    <table class="table table-bordered table-striped table-hover table-sm" style="font-size: 13px;">
                        <thead class="bg-light">
                            <tr>
                                <th>Filename</th>
                                <th>Size</th>
                                <th>Last Modified</th>
                                <th>Status</th>
                                <th class="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="f in report_info.server_files" :key="f.filename">
                                <td><code>{{ f.filename }}</code></td>
                                <td>{{ f.size_mb }} MB</td>
                                <td>{{ f.modified_at }}</td>
                                <td>
                                    <span v-if="f.is_info" class="badge badge-secondary px-2 py-1">Metadata</span>
                                    <span v-else-if="f.is_active" class="badge badge-success px-2 py-1">Active</span>
                                    <span v-else-if="f.is_backup" class="badge badge-info px-2 py-1">Backup</span>
                                    <span v-else class="badge badge-secondary px-2 py-1">Archived</span>
                                </td>
                                <td class="text-center">
                                    <a :href="f.file_url" target="_blank" download class="btn btn-xs btn-primary font-weight-bold">
                                        Download
                                    </a>
                                </td>
                            </tr>
                            <tr v-if="!report_info.server_files || report_info.server_files.length === 0">
                                <td colspan="5" class="text-center text-muted py-3">No report files found on server.</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="text-right mt-3">
                        <button class="btn btn-secondary btn-sm px-4" @click="show_server_files_modal = false">Close</button>
                    </div>
                </div>
            </div>

            <!-- Main Modern CRM Layout -->
            <div class="crm-layout-container">
                <!-- Left Sidebar: Filter Controls -->
                <div v-show="show_sidebar" class="crm-sidebar">
                    <div class="crm-sidebar-header">
                        <span class="crm-sidebar-title">Filters</span>
                        <a href="javascript:void(0)" class="crm-sidebar-reset" @click="resetAllFilters">Reset</a>
                    </div>

                    <div class="crm-filter-group">
                        <label class="crm-filter-label">Period</label>
                        <select v-model="date_range_mode" @change="onDateRangeModeChange" class="crm-sidebar-select">
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                            <option value="Custom Range">Custom Range</option>
                        </select>
                    </div>

                    <div v-if="date_range_mode === 'Monthly'" class="crm-filter-group">
                        <label class="crm-filter-label">Month</label>
                        <input type="month" v-model="master_month" @change="onMasterMonthChange" :max="today.substring(0,7)" class="crm-sidebar-input">
                    </div>

                    <div v-if="date_range_mode === 'Quarterly'" class="crm-filter-group">
                        <label class="crm-filter-label">Quarter</label>
                        <div class="d-flex" style="gap: 6px;">
                            <select v-model="selected_year" @change="onYearChange" class="crm-sidebar-select" style="flex: 1;">
                                <option v-for="y in available_years" :key="y" :value="y">{{ y }}</option>
                            </select>
                            <select v-model="selected_quarter" @change="onQuarterChange" class="crm-sidebar-select" style="flex: 1;">
                                <option value="Q1">Q1 (Jan-Mar)</option>
                                <option value="Q2">Q2 (Apr-Jun)</option>
                                <option value="Q3">Q3 (Jul-Sep)</option>
                                <option value="Q4">Q4 (Oct-Dec)</option>
                            </select>
                        </div>
                    </div>

                    <div v-if="date_range_mode === 'Yearly'" class="crm-filter-group">
                        <label class="crm-filter-label">Year</label>
                        <select v-model="selected_year" @change="onYearChange" class="crm-sidebar-select">
                            <option v-for="y in available_years" :key="y" :value="y">{{ y }}</option>
                        </select>
                    </div>

                    <div class="crm-filter-group">
                        <label class="crm-filter-label">From Date</label>
                        <input type="date" v-model="employee_from_date" @change="onDateChange" class="crm-sidebar-input">
                    </div>

                    <div class="crm-filter-group">
                        <label class="crm-filter-label">To Date</label>
                        <input type="date" v-model="employee_to_date" @change="onDateChange" class="crm-sidebar-input">
                    </div>

                    <div class="crm-filter-group">
                        <label class="crm-filter-label">Zone & Region</label>
                        <div class="d-flex" style="gap: 6px;">
                            <button class="btn btn-xs btn-default w-100 font-weight-bold" @click="active_popup = 'zone'">
                                Zone ({{ selected.zone.length }})
                            </button>
                            <button class="btn btn-xs btn-default w-100 font-weight-bold" @click="active_popup = 'region'">
                                Region ({{ selected.region.length }})
                            </button>
                        </div>
                    </div>

                    <div class="crm-filter-group">
                        <label class="crm-filter-label">Branch (SOL ID)</label>
                        <button class="btn btn-xs btn-default w-100 font-weight-bold text-left d-flex justify-content-between align-items-center" @click="active_popup = 'sol_id'">
                            <span class="text-truncate">{{ selected.sol_id.length ? selected.sol_id.length + ' Selected' : 'All Branches' }}</span>
                            <span class="text-muted" style="font-size: 10px;">›</span>
                        </button>
                    </div>

                    <div class="crm-filter-group">
                        <label class="crm-filter-label">Product</label>
                        <button class="btn btn-xs btn-default w-100 font-weight-bold text-left d-flex justify-content-between align-items-center" @click="active_popup = 'product'">
                            <span class="text-truncate">{{ selected.product.length ? selected.product.length + ' Selected' : 'All Products' }}</span>
                            <span class="text-muted" style="font-size: 10px;">›</span>
                        </button>
                    </div>

                    <div class="crm-filter-group">
                        <label class="crm-filter-label">Source</label>
                        <button class="btn btn-xs btn-default w-100 font-weight-bold text-left d-flex justify-content-between align-items-center" @click="active_popup = 'source'">
                            <span class="text-truncate">{{ selected.source.length ? selected.source.length + ' Selected' : 'All Sources' }}</span>
                            <span class="text-muted" style="font-size: 10px;">›</span>
                        </button>
                    </div>
                </div>

                <!-- Right Main Area -->
                <div class="crm-main-area">
                    <!-- Top Actions Bar -->
                    <div class="crm-top-actions-bar">
                        <div class="d-flex align-items-center" style="gap: 10px;">
                            <span class="font-weight-bold text-dark" style="font-size: 13px;">CRM Leads Report</span>
                            <span class="crm-soft-pill blue">{{ (master_month || today.substring(0,7)) }}</span>
                        </div>

                        <div class="d-flex align-items-center" style="gap: 8px;">
                            <button class="btn btn-xs btn-default border font-weight-bold" @click="goToLeadList">
                                Lead List
                            </button>
                            <button class="btn btn-xs btn-default border font-weight-bold" @click="toggleAnalytics()">
                                {{ show_analytics ? 'Hide Insights' : 'Insights' }}
                            </button>
                            <button class="btn btn-xs btn-default border font-weight-bold" @click="openLeadTransferDialog">
                                Reassign
                            </button>
                            <button class="btn btn-xs btn-default border font-weight-bold" style="background:#e0e7ff; color:#3730a3;" @click="openBMVerificationDialog">
                                BM Verification
                                <span v-if="bm_pending_count > 0" class="badge badge-danger ml-1">{{ bm_pending_count }}</span>
                            </button>
                            <button v-if="totalLeadsInReport > 0" class="btn btn-xs btn-dark font-weight-bold" @click="openDownloadDialog" :disabled="loading">
                                Export
                            </button>
                        </div>
                    </div>

                    <!-- Summary Metric Cards (Frappe UI Style) -->
                    <div class="funnel-container">
                        <div v-for="stage in funnelStages" :key="stage.label" :class="['funnel-stage', stage.class]">
                            <div class="funnel-card-header">
                                <span class="funnel-label">{{ stage.label }}</span>
                                <span class="funnel-percentage-pill" v-if="stage.percentage !== undefined">{{ stage.percentage }}%</span>
                            </div>
                            <div class="funnel-amount">
                                ₹{{ (stage.amount || 0).toLocaleString('en-IN') }}
                            </div>
                            <div class="funnel-sub">
                                {{ (stage.count || 0).toLocaleString('en-IN') }} leads
                            </div>
                        </div>
                    </div>

                    <!-- Performance Insights Grid -->
                    <div class="analytics-grid" v-if="!analytics_loading && show_analytics">
                        <div class="analytics-card">
                            <div class="analytics-title">Top 5 Branches</div>
                            <table class="mini-table">
                                <thead><tr><th>Branch</th><th>Leads</th><th>Conv %</th></tr></thead>
                                <tbody>
                                    <tr v-for="(b, i) in analytics_data.top_branches" :key="i">
                                        <td><span :class="['rank-badge', i < 3 ? 'top-3-rank' : '']">{{i+1}}</span> {{b.branch}}</td>
                                        <td><b>{{b.total_leads}}</b></td>
                                        <td><span class="crm-soft-pill green">{{b.conversion_rate}}%</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="analytics-card">
                            <div class="analytics-title">Top 10 Performers</div>
                            <div style="max-height: 250px; overflow-y: auto;">
                                <table class="mini-table">
                                    <thead><tr><th>Employee</th><th>Leads</th><th>Conv %</th></tr></thead>
                                    <tbody>
                                        <tr v-for="(e, i) in analytics_data.top_employees" :key="i">
                                            <td><span :class="['rank-badge', i < 3 ? 'top-3-rank' : '']">{{i+1}}</span> {{e.employee_name}}</td>
                                            <td><b>{{e.total_leads}}</b></td>
                                            <td><span class="crm-soft-pill green">{{e.conversion_rate}}%</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="analytics-card">
                            <div class="analytics-title">Lowest CRM Usage</div>
                            <table class="mini-table">
                                <thead><tr><th>Branch</th><th>Follow-ups</th><th>Usage %</th></tr></thead>
                                <tbody>
                                    <tr v-for="(b, i) in analytics_data.lowest_usage_branches" :key="i">
                                        <td>{{b.branch}}</td>
                                        <td>{{b.followups}}</td>
                                        <td><span class="crm-soft-pill red">{{b.usage_percent}}%</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Capsule Filter Inputs Bar (Matches Screenshot) -->
                    <div class="crm-filter-capsules-bar">
                        <div class="crm-capsule-box" style="width: 130px;">
                            <input type="text" v-model="capsule_id" placeholder="ID">
                            <span class="crm-approx-icon">≈</span>
                        </div>
                        <div class="crm-capsule-box" style="width: 170px;">
                            <input type="text" v-model="capsule_name" placeholder="Employee Name">
                            <span class="crm-approx-icon">≈</span>
                        </div>
                        <div class="crm-capsule-box" style="width: 160px;">
                            <input type="text" v-model="capsule_branch" placeholder="Branch / SOL">
                            <span class="crm-approx-icon">≈</span>
                        </div>
                        <div class="crm-capsule-box" style="width: 150px;">
                            <input type="text" v-model="capsule_rating" placeholder="Rating / Status">
                            <span class="crm-approx-icon">≈</span>
                        </div>

                        <div class="crm-btn-filter-pill" :class="{ active: show_sidebar }" @click="show_sidebar = !show_sidebar">
                            Filter <span v-if="show_sidebar">✕</span>
                        </div>

                        <span class="text-muted font-weight-bold ml-2" style="font-size: 11px;">
                            {{ paginatedEmployees.length }} of {{ filteredEmployees.length }}
                        </span>
                    </div>

                    <!-- Loading / Error / Empty States -->
                    <div v-if="employee_report_loading" class="loading-spinner-dsr">
                        <div class="spinner-dsr"></div>
                        <span>Loading Performance Data...</span>
                    </div>
                    <div v-else-if="employee_error_message" class="alert alert-danger text-center p-3">
                        {{ employee_error_message }}
                    </div>
                    <div v-else-if="filteredEmployees.length === 0" class="empty-state-dsr">
                        <p class="text-muted font-weight-bold">No records found matching filters.</p>
                    </div>

                    <!-- Minimalist List View Data Table -->
                    <div v-else class="crm-table-container">
                        <table class="crm-list-table">
                            <thead>
                                <tr>
                                    <th style="width: 36px; padding-left: 14px;">
                                        <input type="checkbox" @change="toggleSelectAll" :checked="selected_row_ids.length > 0 && selected_row_ids.length === paginatedEmployees.length">
                                    </th>
                                    <th>Employee Name</th>
                                    <th>Branch</th>
                                    <th>Total Leads</th>
                                    <th>Follow-ups</th>
                                    <th>Not Interested</th>
                                    <th>Converted</th>
                                    <th>Amount (₹)</th>
                                    <th>Qualification</th>
                                    <th>Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="emp in paginatedEmployees" :key="emp.employee_id">
                                    <td style="padding-left: 14px;">
                                        <input type="checkbox" :value="emp.employee_id" :checked="selected_row_ids.includes(emp.employee_id)" @change="toggleRowSelect(emp.employee_id)">
                                    </td>
                                    <td>
                                        <div style="font-weight: 600; color: #0f172a;">{{ emp.employee_name || 'N/A' }}</div>
                                        <small class="text-muted">{{ emp.employee_id }} • {{ emp.designation || 'Staff' }}</small>
                                    </td>
                                    <td>
                                        <div style="font-weight: 500;">{{ emp.sol_id }} - {{ emp.branch || 'N/A' }}</div>
                                        <div style="display:flex; gap: 4px; margin-top: 3px;">
                                            <span class="crm-soft-pill gray" style="font-size:10px;">{{ emp.zone || 'N/A' }}</span>
                                            <span class="crm-soft-pill blue" style="font-size:10px;">{{ emp.region || 'N/A' }}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="font-weight-bold">{{ emp.total_leads || 0 }}</span>
                                    </td>
                                    <td>
                                        <span class="text-muted">{{ emp.total_followups || 0 }}</span>
                                    </td>
                                    <td>
                                        <span class="text-muted">{{ emp.total_not_interested || 0 }}</span>
                                    </td>
                                    <td>
                                        <span class="crm-soft-pill green">{{ emp.total_converted || 0 }}</span>
                                    </td>
                                    <td>
                                        <span class="font-weight-bold" style="color: #047857;">
                                            ₹{{ (emp.converted_amount || 0).toLocaleString('en-IN') }}
                                        </span>
                                    </td>
                                    <td>
                                        <span :class="['crm-soft-pill', getLeadStatus(emp.total_leads).class === 'badge-pastel-green' ? 'green' : (getLeadStatus(emp.total_leads).class === 'badge-pastel-red' ? 'red' : 'yellow')]">
                                            {{ getLeadStatus(emp.total_leads).label }}
                                        </span>
                                    </td>
                                    <td>
                                        <span :class="['crm-soft-pill', getEnhancedRating(emp).class === 'badge-pastel-green' ? 'green' : (getEnhancedRating(emp).class === 'badge-pastel-red' ? 'red' : 'blue')]">
                                            {{ getEnhancedRating(emp).label }}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Bottom Pagination Bar (Matches Screenshot) -->
                    <div class="crm-bottom-pagination-bar" v-if="filteredEmployees.length > 0">
                        <div class="crm-page-limit-pills">
                            <span v-for="limit in [20, 100, 500, 2500]" 
                                  :key="limit"
                                  class="crm-limit-pill" 
                                  :class="{ active: page_size === limit }"
                                  @click="setPageSize(limit)">
                                {{ limit }}
                            </span>
                        </div>

                        <div class="text-muted" style="font-size: 11.5px; font-weight: 500;">
                            Showing <b>{{ paginatedEmployees.length ? 1 : 0 }}</b> - <b>{{ paginatedEmployees.length }}</b> of <b>{{ filteredEmployees.length }}</b> records
                        </div>

                        <button class="crm-btn-load-more" 
                                @click="loadMore" 
                                :disabled="paginatedEmployees.length >= filteredEmployees.length">
                            Load More
                        </button>
                    </div>
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
    date_range_mode: "Monthly",
    selected_year: new Date().getFullYear(),
    selected_quarter: "Q1",
    available_years: [2026, 2025, 2024, 2023],
    master_month: frappe.datetime.now_date().substring(0, 7),
    employee_from_date: "", // Init mein set hoga
    employee_to_date: "", // Init mein set hoga

    bm_pending_count: 0,
    employee_performance_data: [],
    has_pref: true,
    employee_report_loading: false,
    employee_error_message: null,
    employee_search_term: "",
    show_sidebar: true,
    capsule_id: "",
    capsule_name: "",
    capsule_branch: "",
    capsule_rating: "",
    page_size: 20,
    page_limit: 20,
    selected_row_ids: [],
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
    show_server_files_modal: false,
    active_report_action: null,
    report_info: {
      is_admin: false,
      status: "Loading...",
      active_filename: "",
      backup_filename: "",
      backup_exists: false,
      backup_size_mb: 0,
      size_mb: 0,
      last_generated_at: "-",
      server_files: []
    },

    fetchReportInfo() {
      frappe.call({
        method: "sahayog.scrm.api.report_access.get_fast_lead_report_info",
        callback: (r) => {
          if (r.message) {
            this.report_info = r.message;
            if (r.message.status === "Generating") {
              setTimeout(() => { this.fetchReportInfo(); }, 5000);
            } else {
              this.active_report_action = null;
            }
          }
        }
      });
    },
    confirmRebuildReport() {
      frappe.confirm(
        __("Are you sure you want to trigger a full baseline report rebuild? <br><br><b>Note:</b> This will clean deleted leads. Live users will seamlessly continue downloading from active backup file without any disruption."),
        () => {
          this.rebuildFullReport();
        }
      );
    },
    rebuildFullReport() {
      this.active_report_action = "rebuild";
      this.report_info.status = "Generating";
      frappe.show_alert({ message: __("Full Baseline Rebuild Started in Background Worker... Backup file active for live users."), indicator: "orange" });
      frappe.call({
        method: "sahayog.scrm.api.report_access.trigger_fast_lead_report_job",
        args: { force_rebuild: true },
        callback: (r) => {
          if (r.message && r.message.status === "success") {
            frappe.show_alert({
              message: __("Rebuild job enqueued in background worker. Live status auto-polling..."),
              indicator: "blue"
            });
            this.fetchReportInfo();
          }
        }
      });
    },

    syncIncrementalReport() {
      this.active_report_action = "sync";
      this.report_info.status = "Generating";
      frappe.show_alert({ message: __("Syncing Latest 3-Day Incremental Lead Data in Background Worker..."), indicator: "orange" });
      frappe.call({
        method: "sahayog.scrm.api.report_access.trigger_fast_lead_report_job",
        args: { force_rebuild: false },
        callback: (r) => {
          if (r.message && r.message.status === "success") {
            frappe.show_alert({
              message: __("Sync job enqueued in background worker. Live status auto-polling..."),
              indicator: "blue"
            });
            this.fetchReportInfo();
          }
        }
      });
    },

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

    openDownloadDialog() {
      let d = new frappe.ui.Dialog({
        title: __("Download & View Report Options"),
        fields: [
          {
            fieldtype: "HTML",
            fieldname: "download_options_html",
            options: `
              <div style="display: flex; flex-direction: column; gap: 10px; padding: 5px 0;">
                <p style="font-size: 13px; color: #4b5563; margin-bottom: 5px;">Select an option below:</p>
                <button id="btn-dl-todays-leads" class="btn btn-outline-primary text-left font-weight-bold" style="padding: 10px 14px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
                  <span>Today's Lead Records</span>
                  <span class="text-muted">→</span>
                </button>
                <button id="btn-dl-filtered-past" class="btn btn-outline-info text-left font-weight-bold" style="padding: 10px 14px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
                  <span>Download Filtered Previous Data</span>
                  <span class="text-muted">↓</span>
                </button>
              </div>
            `
          }
        ]
      });
      d.show();

      d.$wrapper.find('#btn-dl-todays-leads').on('click', () => {
        d.hide();
        this.openTodaysLeadReport();
      });

      d.$wrapper.find('#btn-dl-filtered-past').on('click', () => {
        d.hide();
        this.downloadReport();
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

    openTodaysLeadReport() {
      frappe.set_route("query-report", "Lead Report");
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

      return this.employee_performance_data.filter((emp) => {
        if (this.capsule_id) {
          const idVal = String(emp.employee_id || "").toLowerCase();
          if (!idVal.includes(this.capsule_id.toLowerCase())) return false;
        }
        if (this.capsule_name) {
          const nameVal = String(emp.employee_name || "").toLowerCase();
          if (!nameVal.includes(this.capsule_name.toLowerCase())) return false;
        }
        if (this.capsule_branch) {
          const brVal = String(emp.branch || "" + (emp.sol_id || "")).toLowerCase();
          if (!brVal.includes(this.capsule_branch.toLowerCase())) return false;
        }
        if (this.capsule_rating) {
          const ratTerm = this.capsule_rating.toLowerCase();
          const rObj = this.getLeadStatus ? this.getLeadStatus(emp.total_leads) : {};
          const qObj = this.getEnhancedRating ? this.getEnhancedRating(emp) : {};
          const fullRating = `${rObj.label || ""} ${qObj.label || ""}`.toLowerCase();
          if (!fullRating.includes(ratTerm)) return false;
        }
        if (this.employee_search_term) {
          const term = this.employee_search_term.toLowerCase();
          const combined = `${emp.employee_id || ""} ${emp.employee_name || ""} ${emp.branch || ""} ${emp.sol_id || ""}`.toLowerCase();
          if (!combined.includes(term)) return false;
        }
        return true;
      });
    },
    get paginatedEmployees() {
      return this.filteredEmployees.slice(0, this.page_limit);
    },
    setPageSize(n) {
      this.page_size = n;
      this.page_limit = n;
    },
    loadMore() {
      this.page_limit += this.page_size;
    },
    toggleSelectAll(e) {
      if (e.target.checked) {
        this.selected_row_ids = this.paginatedEmployees.map((emp) => emp.employee_id || emp.name);
      } else {
        this.selected_row_ids = [];
      }
    },
    toggleRowSelect(id) {
      const idx = this.selected_row_ids.indexOf(id);
      if (idx > -1) this.selected_row_ids.splice(idx, 1);
      else this.selected_row_ids.push(id);
    },
    resetAllFilters() {
      this.selected = { zone: [], region: [], sol_id: [], product: [], source: [] };
      this.capsule_id = "";
      this.capsule_name = "";
      this.capsule_branch = "";
      this.capsule_rating = "";
      this.employee_search_term = "";
      this.onFilterChange();
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
    onDateRangeModeChange() {
      const currentYear = new Date().getFullYear();
      if (this.date_range_mode === "Monthly") {
        this.master_month = frappe.datetime.now_date().substring(0, 7);
        this.employee_from_date = this.month_start;
        this.employee_to_date = this.month_end;
      } else if (this.date_range_mode === "Quarterly") {
        this.selected_year = currentYear;
        this.selected_quarter = "Q1";
        this.updateQuarterlyDates();
      } else if (this.date_range_mode === "Yearly") {
        this.selected_year = currentYear;
        this.employee_from_date = `${currentYear}-01-01`;
        this.employee_to_date = `${currentYear}-12-31`;
      } else if (this.date_range_mode === "Custom Range") {
        // Keep existing from / to or default
      }
      this.fetchEmployeePerformance();
    },
    updateQuarterlyDates() {
      const year = this.selected_year || new Date().getFullYear();
      const quarterMap = {
        Q1: { from: `${year}-01-01`, to: `${year}-03-31` },
        Q2: { from: `${year}-04-01`, to: `${year}-06-30` },
        Q3: { from: `${year}-07-01`, to: `${year}-09-30` },
        Q4: { from: `${year}-10-01`, to: `${year}-12-31` }
      };
      const q = quarterMap[this.selected_quarter] || quarterMap["Q1"];
      this.employee_from_date = q.from;
      this.employee_to_date = q.to;
    },
    onQuarterChange() {
      this.updateQuarterlyDates();
      this.fetchEmployeePerformance();
    },
    onYearChange() {
      if (this.date_range_mode === "Quarterly") {
        this.updateQuarterlyDates();
      } else if (this.date_range_mode === "Yearly") {
        const year = this.selected_year || new Date().getFullYear();
        this.employee_from_date = `${year}-01-01`;
        this.employee_to_date = `${year}-12-31`;
      }
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
    isBMUser() {
      if (frappe.session.user === "Administrator") return true;
      if (frappe.user && frappe.user.has_role) {
        return frappe.user.has_role("Branch Manager") || frappe.user.has_role("System Manager");
      }
      return frappe.user_roles && (frappe.user_roles.includes("Branch Manager") || frappe.user_roles.includes("System Manager"));
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

    openBMVerificationDialog() {
      let self = this;
      let selected_status = "Pending";
      let search_text = "";
      let search_timer = null;
      let current_start = 0;
      const page_len = 20;
      let total_count = 0;
      const default_from_date = frappe.datetime.month_start();
      const default_to_date = frappe.datetime.month_end();
      let dialog = new frappe.ui.Dialog({
        title: __("BM Lead Verification"),
        size: "extra-large",
        fields: [
          {
            fieldtype: "HTML",
            fieldname: "metrics_html"
          },
          { fieldtype: "Column Break" },
          {
            label: "From",
            fieldname: "from_date",
            fieldtype: "Date",
            default: default_from_date,
            onchange() {
              current_start = 0;
              loadVerificationData();
            }
          },
          { fieldtype: "Column Break" },
          {
            label: "To",
            fieldname: "to_date",
            fieldtype: "Date",
            default: default_to_date,
            onchange() {
              current_start = 0;
              loadVerificationData();
            }
          },
          { fieldtype: "Column Break" },
          {
            label: "Status",
            fieldname: "status_filter",
            fieldtype: "Select",
            options: ["Pending", "Verified", "Rejected", "All"],
            default: "Pending",
            onchange() {
              selected_status = dialog.get_value("status_filter");
              current_start = 0;
              loadVerificationData();
            }
          },
          { fieldtype: "Column Break" },
          {
            label: "Search",
            fieldname: "search_text",
            fieldtype: "Data",
            placeholder: "Employee / CRM / Customer / Product / Amt",
            onchange() {
              search_text = dialog.get_value("search_text") || "";
              current_start = 0;
              loadVerificationData();
            }
          },
          { fieldtype: "Section Break" },
          {
            fieldtype: "HTML",
            fieldname: "leads_table_html"
          }
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
          frappe.confirm(
            __(`Are you sure you want to verify <b>${selected.length}</b> lead(s)?`),
            async () => {
              frappe.show_alert({ message: __("Verifying leads..."), indicator: "orange" });
              let res = await frappe.call({
                method: "sahayog.scrm.controller.lead.lead.verify_branch_leads",
                args: { lead_names: selected, action: "Verified" }
              });
              if (res.message && res.message.status === "success") {
                frappe.show_alert({ message: __(`${res.message.count} Leads Verified successfully!`), indicator: "green" });
                self.fetchBMPendingCount();
                loadVerificationData();
              }
            }
          );
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
              self.fetchBMPendingCount();
              loadVerificationData();
            }
          }, __("Confirm Rejection"), __("Reject Leads"));
        }
      });

      async function loadVerificationData(is_page=false) {
        if (!is_page) {
          dialog.fields_dict.leads_table_html.$wrapper.html('<div style="text-align:center;padding:20px;color:#6b7280;font-weight:600;">Loading leads...</div>');
        } else {
          dialog.$wrapper.find('.btn-prev-leads,.btn-next-leads').prop('disabled', true);
          dialog.$wrapper.find('.leads-page-status').text('Loading...');
        }
        let from_date = dialog.get_value("from_date");
        let to_date = dialog.get_value("to_date");
        let res = await frappe.call({
          method: "sahayog.scrm.controller.lead.lead.get_bm_lead_verification_data",
          args: {
            status: selected_status,
            from_date: from_date,
            to_date: to_date,
            start: current_start,
            page_length: page_len,
            search: search_text,
            include_metrics: is_page ? 0 : 1
          }
        });
        if (!res.message) return;
        let m = res.message.metrics;
        let leads = res.message.leads || [];
        total_count = res.message.total_count || 0;
        function renderHeaderMetrics(m) {
          let $hdr = dialog.$wrapper.find('.modal-header');
          let $metrics = $hdr.find('.bm-header-metrics');
          if (!$metrics.length) {
            $metrics = $('<div class="bm-header-metrics" style="display:inline-flex;align-items:center;gap:6px;margin-left:14px;flex-wrap:wrap;"></div>');
            $hdr.find('.modal-title').after($metrics);
          }
          $metrics.html(`
            <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:#fff7ed;color:#c2410c;border:1px solid #ffedd5;">
              Pending: <b>${m.total_pending || 0}</b>
            </span>
            <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:#fef2f2;color:#b91c1c;border:1px solid #fee2e2;">
              Today: <b>${m.today_pending || 0}</b>
            </span>
            <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:#fefce8;color:#a16207;border:1px solid #fef9c3;">
              Yesterday: <b>${m.yesterday_pending || 0}</b>
            </span>
            <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:#f3f4f6;color:#4b5563;border:1px solid #e5e7eb;">
              Older: <b>${m.older_pending || 0}</b>
            </span>
          `);

          let cur_from = dialog.get_value("from_date");
          let cur_to = dialog.get_value("to_date");
          let monthText = "";
          if (cur_from && cur_to) {
            let d1 = frappe.datetime.str_to_obj(cur_from);
            let d2 = frappe.datetime.str_to_obj(cur_to);
            let m1 = d1.toLocaleString('default', { month: 'long', year: 'numeric' });
            let m2 = d2.toLocaleString('default', { month: 'long', year: 'numeric' });
            monthText = (m1 === m2) ? m1 : `${m1} – ${m2}`;
          } else if (cur_from) {
            let d = frappe.datetime.str_to_obj(cur_from);
            monthText = d.toLocaleString('default', { month: 'long', year: 'numeric' });
          }
          $hdr.find('.bm-header-month').remove();
          dialog.set_title(`${__("BM Lead Verification")} <span style="font-size:13px;font-weight:600;color:var(--text-muted,#6b7280);margin-left:6px;">(${monthText})</span>`);
        }

        if (m) {
          renderHeaderMetrics(m);
        }

        function updateSelectionCount() {
          let count = dialog.$wrapper.find('.chk-lead-verify:checked').length;
          let total_visible = dialog.$wrapper.find('.chk-lead-verify').length;
          let $badge = dialog.$wrapper.find('.leads-selected-badge');
          let $btnPrimary = dialog.get_primary_btn();
          let $btnSecondary = dialog.get_secondary_btn();

          if (count > 0) {
            $badge.show();
            dialog.$wrapper.find('.leads-selected-count').text(count);
            $btnPrimary.text(`${__("Verify Selected")} (${count})`);
            $btnSecondary.text(`${__("Reject Selected")} (${count})`);
          } else {
            $badge.hide();
            $btnPrimary.text(__("Verify Selected"));
            $btnSecondary.text(__("Reject Selected"));
          }
          dialog.$wrapper.find('#chk-select-all-leads').prop('checked', total_visible > 0 && count === total_visible);
        }

        if (leads.length === 0) {
          updateSelectionCount();
          let empty_search = search_text ? `<div style="margin-bottom:8px;padding:6px 10px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:12px;">Search '${search_text}' me <b>${search_pending}</b> pending mile.</div>` : '';
          dialog.fields_dict.leads_table_html.$wrapper.html(empty_search + '<div style="text-align:center;padding:25px;color:#6b7280;">No leads found for this verification status.</div>');
          return;
        }

        let rowsHtml = leads.map(l => {
          let badgeClass = l.custom_verification_status === "Verified" ? "background:#dcfce7;color:#166534;" : (l.custom_verification_status === "Rejected" ? "background:#fee2e2;color:#991b1b;" : "background:#fef3c7;color:#92400e;");
          let cDate = l.creation ? frappe.datetime.str_to_user(l.creation) : "-";
          let prods = l.products || [];
          let prodHtml = prods.length ? prods.map(p => `<div style="white-space:nowrap;">${p.product_name || p.product}<b style="float:right;margin-left:10px;">₹${Number(p.amount||0).toLocaleString('en-IN')}</b></div>`).join('') : '<span style="color:#9ca3af;">-</span>';
          let total = l.total_amount != null ? l.total_amount : prods.reduce((s,p) => s + Number(p.amount||0), 0);
          return `
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:8px;"><input type="checkbox" class="chk-lead-verify" value="${l.name}"></td>
              <td style="padding:8px;"><a href="/app/lead/${l.name}" target="_blank" style="font-weight:bold;color:#2563eb;">${l.lead_name || '-'}</a><br><small style="color:#6b7280;">${l.name}</small><br><small style="color:#6b7280;">${l.mobile_no || '-'} • ${l.source || '-'}</small></td>
              <td style="padding:8px;">${l.custom_employee_name || '-'}<br><small style="color:#6b7280;">${l.custom_employee_id || ''}</small></td>
              <td style="padding:8px;font-size:11px;">${prodHtml}</td>
              <td style="padding:8px;font-weight:bold;white-space:nowrap;">₹${Number(total||0).toLocaleString('en-IN')}</td>
              <td style="padding:8px;font-size:11px;">${cDate}</td>
              <td style="padding:8px;"><span style="padding:2px 8px;border-radius:12px;font-weight:bold;font-size:11px;${badgeClass}">${l.custom_verification_status || 'Pending'}</span></td>
            </tr>
          `;
        }).join('');

        let show_from = total_count === 0 ? 0 : current_start + 1;
        let show_to = Math.min(current_start + page_len, total_count);
        let search_info = search_text ? `<div style="margin-bottom:8px;padding:6px 10px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:12px;">Search '${search_text}' me <b>${search_pending}</b> pending / <b>${total_count}</b> records.</div>` : '';
        dialog.fields_dict.leads_table_html.$wrapper.html(`
          ${search_info}
          <div style="max-height:350px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:6px;">
            <table class="table table-bordered table-sm" style="margin:0; font-size:12px;">
              <thead style="background:#f9fafb; position:sticky; top:0;">
                <tr>
                  <th style="width:30px;"><input type="checkbox" id="chk-select-all-leads"></th>
                  <th>Customer</th>
                  <th>Employee</th>
                  <th>Products</th>
                  <th>Total</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 2px;font-size:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span class="text-muted leads-page-status">Showing ${show_from}-${show_to} of ${total_count}</span>
              <span class="leads-selected-badge" style="display:none;background:#eff6ff;color:#1d4ed8;font-weight:600;padding:2px 8px;border-radius:12px;border:1px solid #bfdbfe;">
                Selected: <b class="leads-selected-count">0</b>
              </span>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-xs btn-default btn-prev-leads" ${current_start === 0 ? 'disabled' : ''}>Prev</button>
              <button class="btn btn-xs btn-default btn-next-leads" ${(current_start + page_len) >= total_count ? 'disabled' : ''}>Next (20)</button>
            </div>
          </div>
        `);

        updateSelectionCount();

        dialog.$wrapper.find('#chk-select-all-leads').off('change').on('change', function() {
          let checked = $(this).is(':checked');
          dialog.$wrapper.find('.chk-lead-verify').prop('checked', checked);
          updateSelectionCount();
        });

        dialog.$wrapper.find('.chk-lead-verify').off('change').on('change', function() {
          updateSelectionCount();
        });
        dialog.$wrapper.find('.btn-prev-leads').on('click', function() {
          if (current_start === 0) return;
          current_start = Math.max(0, current_start - page_len);
          loadVerificationData(true);
        });
        dialog.$wrapper.find('.btn-next-leads').on('click', function() {
          if ((current_start + page_len) >= total_count) return;
          current_start += page_len;
          loadVerificationData(true);
        });
      }

      dialog.show();
      dialog.$wrapper.find('.modal-dialog').css({ 'max-width': '1300px', 'width': '96%' });
      dialog.$wrapper.find('.modal-content').css({
        'border-radius': '12px',
        'box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'border': '1px solid var(--border-color, #e2e8f0)',
        'overflow': 'hidden'
      });
      dialog.$wrapper.css({
        'backdrop-filter': 'blur(4px)',
        '-webkit-backdrop-filter': 'blur(4px)'
      });
      (function () {
        dialog.$wrapper.find('.modal-header').css({
          'padding': '14px 20px',
          'border-bottom': '1px solid var(--border-color, #e5e7eb)',
          'background': 'var(--fg-color, #ffffff)',
          'display': 'flex',
          'align-items': 'center',
          'flex-wrap': 'wrap',
          'gap': '8px'
        });
        dialog.$wrapper.find('.modal-title').css({
          'font-size': '15px',
          'font-weight': '600',
          'color': 'var(--text-color, #111827)',
          'margin-right': '4px'
        });
        dialog.$wrapper.find('.modal-footer').css({
          'padding': '12px 20px',
          'border-top': '1px solid var(--border-color, #e5e7eb)',
          'background': 'var(--fg-color, #ffffff)'
        });
        let $sec = dialog.$wrapper.find('[data-fieldname="from_date"]').closest('.form-section');
        $sec.css({ 'padding': '10px 0 4px 0', 'margin-top': '0' });
        $sec.find('.form-column').css({ 'padding-left': '6px', 'padding-right': '6px' });
        dialog.$wrapper.find('[data-fieldname="metrics_html"]').closest('.form-column').hide();
        dialog.$wrapper.find('.control-label').css({
          'font-size': '11px',
          'font-weight': '500',
          'color': 'var(--text-muted, #64748b)',
          'margin-bottom': '4px',
          'display': 'block'
        });
        dialog.$wrapper.find('.frappe-control input, .frappe-control select').css({
          'height': '32px',
          'font-size': '12px',
          'border-radius': '6px'
        });
      })();
      loadVerificationData();
      dialog.fields_dict.search_text.$input.on('input', function() {
        clearTimeout(search_timer);
        search_timer = setTimeout(() => {
          search_text = dialog.get_value("search_text") || "";
          current_start = 0;
          loadVerificationData();
        }, 500);
      });
    },

    async fetchBMPendingCount() {
      if (!this.isBMUser()) return;
      try {
        let res = await frappe.call({
          method: "sahayog.scrm.controller.lead.lead.get_bm_lead_verification_data",
          args: { status: "Pending" }
        });
        if (res.message && res.message.metrics) {
          this.bm_pending_count = res.message.metrics.total_pending || 0;
        }
      } catch (e) {
        this.bm_pending_count = 0;
      }
    },

    // 3. INITIALIZATION (Fix yahan tha)
    async init() {
      this.fetchBMPendingCount();
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
      this.fetchReportInfo();
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
      if (this.show_analytics) {
        this.fetchAnalytics();
      }

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
                Showing only your created leads (No Report Preference assigned)
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
    toggleAnalytics() {
      this.show_analytics = !this.show_analytics;
      if (this.show_analytics && !this.analytics_data.top_branches?.length) {
        this.fetchAnalytics();
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

    showNoLeadsMessage() {
      page.set_intro(`
        <div class="p-2" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; font-size: 12px; color: #b91c1c;">
          <b>No Records Found:</b> There are no leads available for the selected month or applied filter criteria.
        </div>
      `);
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
                    <span style="font-weight:bold; font-size: 12px; color: ${isDisabled ? "#94a3b8" : "#05a15d"};">${isDisabled ? "OFF" : "ON"}</span>
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

frappe.pages["crm-lead-report"].on_page_show = function () {
  // Log every page visit into Activity Log
  frappe.call({
    method: "sahayog.api.custom_api.record_page_visit",
    args: { page: "crm-lead-report" },
    freeze: false,
  });
};
