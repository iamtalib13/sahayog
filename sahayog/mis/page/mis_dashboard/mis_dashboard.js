frappe.pages["mis-dashboard"].on_page_load = function (wrapper) {
  frappe.require(
    [
      "/assets/sahayog/js/papaparse.min.js",
      "/assets/sahayog/js/xlsx.full.min.js",
      "/assets/sahayog/js/handsontable.full.min.js",
      "/assets/sahayog/js/select2.min.js",
      "/assets/sahayog/css/handsontable.full.min.css",
      "/assets/sahayog/css/select2.min.css",
    ],
    () => {
      new MISDashboard(wrapper);
    }
  );
};

class MISDashboard {
  constructor(wrapper) {
    this.wrapper = wrapper;
    this.hotInstance = null;
    this.currentReportData = null;

    this.setupPage();
    this.renderUI();
    this.bindEvents();
    this.loadReports();
  }

  setupPage() {
    this.page = frappe.ui.make_app_page({
      parent: this.wrapper,
      title: "Praman Report Dashboard",
      single_column: true,
    });
  }

  renderUI() {
    const styles = `
      <style>
        /* Minimal Container */
        .mis-container { 
          padding: 12px;
          background: #f8fafc;
          min-height: 100vh;
        }

        /* Compact Header */
        .mis-header {
          background: linear-gradient(135deg, #006767 0%, #004d4d 100%);
          color: white;
          padding: 16px 20px;
          border-radius: 8px;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(0, 103, 103, 0.2);
        }
        .mis-header h1 {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        /* Compact Controls */
        .mis-controls { 
          background: white;
          padding: 16px; 
          border-radius: 8px; 
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0, 103, 103, 0.1);
          border: 1px solid #e2e8f0;
        }

        /* Inline Controls Layout */
        .controls-row {
          display: flex;
          gap: 12px;
          align-items: end;
        }
        .controls-select {
          flex: 1;
        }
        .controls-button {
          flex-shrink: 0;
        }

        /* Compact Select2 */
        .select2-container--default .select2-selection--single {
          height: 36px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          padding: 0 12px !important;
        }
        .select2-container--default .select2-selection--single .select2-selection__rendered {
          line-height: 34px !important;
          font-size: 14px !important;
          color: #374151 !important;
        }
        .select2-container--default.select2-container--focus .select2-selection--single {
          border-color: #006767 !important;
        }

        /* ✅ Enhanced: Dropdown options styling with more info */
        .select2-dropdown {
          background: white !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
        }
        .select2-results__option {
          background: transparent !important;
          color: #374151 !important;
          padding: 10px 12px !important;
          font-size: 14px !important;
          border-bottom: 1px solid #f3f4f6;
        }
        .select2-results__option:last-child {
          border-bottom: none;
        }
        .select2-results__option--highlighted {
          background-color: #f3f4f6 !important;
          color: #111827 !important;
        }
        .select2-results__option--selected {
          background-color: #006767 !important;
          color: white !important;
        }
        .select2-search--dropdown .select2-search__field {
          border: 1px solid #d1d5db !important;
          border-radius: 4px !important;
          padding: 6px 8px !important;
          color: #374151 !important;
        }

        /* Custom option styling */
        .report-option {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .report-name {
          font-weight: 600;
          font-size: 14px;
          color: inherit;
        }
        .report-dates {
          font-size: 12px;
          color: #64748b;
        }
        .select2-results__option--highlighted .report-dates {
          color: #64748b;
        }
        .select2-results__option--selected .report-dates {
          color: rgba(255, 255, 255, 0.8);
        }

        /* Compact Button */
        .btn-load-report {
          background: #006767;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          height: 36px;
        }
        .btn-load-report:hover { background: #004d4d; }

        /* Compact Report Info */
        .mis-report-info {
          background: #006767;
          color: white;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 12px;
          display: none;
          font-size: 14px;
        }
        .mis-report-title { 
          font-weight: 600; 
          margin-bottom: 4px;
        }

        /* Minimal Table Container */
        .mis-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 103, 103, 0.1);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        /* Compact Table Header */
        .mis-table-header {
          background: #f8fafc;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          display: none;
        }

        /* Compact Export Button */
        .mis-export-btn {
          background: #10b981;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .mis-export-btn:hover { background: #059669; }

        /* Table with Scrollbars */
        #table-content {
          height: calc(100vh - 220px);
          overflow: auto;
        }
        
        /* Handsontable Optimizations */
        .handsontable { 
          font-size: 12px;
        }
        .ht_master .htCore thead th {
          background: #006767 !important;
          color: white !important;
          font-weight: 500 !important;
          font-size: 12px !important;
          padding: 8px !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
        }
        .ht_master .htCore tbody td {
          padding: 6px 8px !important;
          font-size: 12px !important;
        }
        .ht_master .htCore tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }

        /* Custom Scrollbars for Table */
        #table-content::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #table-content::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        #table-content::-webkit-scrollbar-thumb {
          background: #006767;
          border-radius: 4px;
        }
        #table-content::-webkit-scrollbar-thumb:hover {
          background: #004d4d;
        }

        /* Handsontable Scrollbars */
        .ht_master .wtHolder::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .ht_master .wtHolder::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .ht_master .wtHolder::-webkit-scrollbar-thumb {
          background: #006767;
          border-radius: 4px;
        }

        /* Minimal States */
        .loading-indicator, .no-data {
          text-align: center;
          padding: 40px 20px;
          font-size: 14px;
          color: #64748b;
        }
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid #006767;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .controls-row {
            flex-direction: column;
            gap: 8px;
          }
          .btn-load-report {
            width: 100%;
          }
        }
      </style>
    `;

    const html = `
      ${styles}
      <div class="mis-container">

        <div class="mis-controls">
          <div class="controls-row">
            <div class="controls-select">
              <select id="mis-report-dropdown" class="form-control" style="width: 100%;"></select>
            </div>
            <div class="controls-button">
              <button id="load-report-btn" class="btn-load-report">
                Load Report
              </button>
            </div>
          </div>
        </div>

        <div class="mis-report-info" id="report-info">
          <div class="mis-report-title" id="report-title"></div>
          <div class="mis-report-meta" id="report-meta"></div>
        </div>

        <div class="mis-table-container">
          <div class="mis-table-header" id="table-header">
            <button id="export-btn" class="mis-export-btn">
              Export CSV
            </button>
          </div>
          <div id="table-content">
            <div class="no-data">Select a report to view data</div>
          </div>
        </div>
      </div>
    `;

    $(this.wrapper).find(".layout-main-section").html(html);
  }

  bindEvents() {
    $(this.wrapper).on("click", "#load-report-btn", () =>
      this.loadSelectedReport()
    );
    $(this.wrapper).on("click", "#export-btn", () => this.exportCSV());
  }

  async loadReports() {
    try {
      // ✅ Enhanced: Fetch start_date and end_date along with name
      const reports = await frappe.db.get_list("MIS Report", {
        fields: ["name", "start_date", "end_date"],
        filters: { is_active: 1 },
        limit: 100,
        order_by: "end_date desc",
      });

      this.populateDropdown(reports);
    } catch (error) {
      console.error("Failed to load reports:", error);
      frappe.msgprint("Failed to load reports");
    }
  }

  populateDropdown(reports) {
    const dropdown = $("#mis-report-dropdown");
    dropdown.empty().append(`<option value="">Select report...</option>`);

    reports.forEach((report) => {
      // ✅ Enhanced: Store all report data in data attributes
      dropdown.append(
        `<option value="${report.name}" 
          data-start-date="${report.start_date || ""}" 
          data-end-date="${report.end_date || ""}">
          ${report.name}
        </option>`
      );
    });

    dropdown.select2({
      placeholder: "Search reports...",
      allowClear: true,
      width: "100%",
      templateResult: this.formatDropdownOption,
      templateSelection: this.formatDropdownSelection,
      escapeMarkup: (markup) => markup,
    });
  }

  // ✅ Enhanced: Format dropdown options with report details
  formatDropdownOption(option) {
    if (!option.id) return option.text;

    const startDate = option.element?.dataset?.startDate;
    const endDate = option.element?.dataset?.endDate;

    const formattedStartDate = startDate
      ? frappe.datetime.str_to_user(startDate)
      : "N/A";
    const formattedEndDate = endDate
      ? frappe.datetime.str_to_user(endDate)
      : "N/A";

    return `
      <div class="report-option">
        <div class="report-name">${option.text}</div>
        <div class="report-dates">
          From: ${formattedStartDate} | To: ${formattedEndDate}
        </div>
      </div>
    `;
  }

  // ✅ Enhanced: Show only report name in selected value
  formatDropdownSelection(option) {
    return option.text;
  }

  async loadSelectedReport() {
    const selectedReport = $("#mis-report-dropdown").val();
    if (!selectedReport) {
      frappe.msgprint("Please select a report");
      return;
    }

    this.showLoading();

    try {
      const doc = await frappe.db.get_doc("MIS Report", selectedReport);
      await this.processReportFile(doc);
    } catch (error) {
      console.error("Failed to load report:", error);
      frappe.msgprint("Failed to load report");
      this.showNoData("Failed to load report");
    }
  }

  async processReportFile(doc) {
    const {
      report_attachment: fileUrl,
      name: reportName,
      start_date,
      end_date,
    } = doc;

    if (!fileUrl) {
      frappe.msgprint("No file attachment found");
      this.showNoData("No file found");
      return;
    }

    const fileExtension = fileUrl.split(".").pop().toLowerCase();

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Failed to fetch file");

      let data;
      if (fileExtension === "csv") {
        const text = await response.text();
        data = this.parseCSV(text);
      } else if (["xlsx", "xls"].includes(fileExtension)) {
        const buffer = await response.arrayBuffer();
        data = this.parseExcel(buffer);
      } else {
        frappe.msgprint("Unsupported file format");
        this.showNoData("Unsupported format");
        return;
      }

      // ✅ Enhanced: Pass both start_date and end_date
      this.renderReport(data, reportName, start_date, end_date);
    } catch (error) {
      console.error("File processing error:", error);
      frappe.msgprint("Failed to process file");
      this.showNoData("Processing failed");
    }
  }

  parseCSV(csvText) {
    return Papa.parse(csvText.trim(), { skipEmptyLines: true }).data;
  }

  parseExcel(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 });
  }

  // ✅ Enhanced: Accept both start_date and end_date
  renderReport(data, reportName, startDate, endDate) {
    if (!data?.length) {
      this.showNoData("No data found");
      return;
    }

    this.currentReportData = data;
    this.updateReportInfo(reportName, startDate, endDate);
    this.renderTable(data);
    this.showTableHeader();
  }

  // ✅ Enhanced: Display both start and end dates
  updateReportInfo(reportName, startDate, endDate) {
    $("#report-title").text(reportName);

    const formattedStartDate = startDate
      ? frappe.datetime.str_to_user(startDate)
      : "N/A";
    const formattedEndDate = endDate
      ? frappe.datetime.str_to_user(endDate)
      : "N/A";

    $("#report-meta").text(
      `Period: ${formattedStartDate} to ${formattedEndDate}`
    );
    $("#report-info").show();
  }

  renderTable(data) {
    if (this.hotInstance) {
      this.hotInstance.destroy();
      this.hotInstance = null;
    }

    const container = document.getElementById("table-content");
    container.innerHTML = '<div id="handsontable-container"></div>';

    const [headers, ...rows] = data;

    this.hotInstance = new Handsontable(
      document.getElementById("handsontable-container"),
      {
        data: rows,
        colHeaders: headers,
        rowHeaders: true,
        width: "100%",
        height: "100%",
        licenseKey: "non-commercial-and-evaluation",
        filters: true,
        dropdownMenu: [
          "filter_by_condition",
          "filter_by_value",
          "filter_action_bar",
        ],
        contextMenu: [
          "filter_by_condition",
          "filter_by_value",
          "filter_action_bar",
        ],
        readOnly: true,
        stretchH: "all",
        manualColumnResize: true,
        manualRowResize: true,
        scrollbarX: true,
        scrollbarY: true,
      }
    );
  }

  showLoading() {
    $("#table-content").html(`
      <div class="loading-indicator">
        <div class="loading-spinner"></div>
        <div>Loading...</div>
      </div>
    `);
    $("#report-info").hide();
    $("#table-header").hide();
  }

  showNoData(message = "No data") {
    $("#table-content").html(`<div class="no-data">${message}</div>`);
    $("#report-info").hide();
    $("#table-header").hide();
  }

  showTableHeader() {
    $("#table-header").show();
  }

  exportCSV() {
    if (!this.hotInstance) {
      frappe.msgprint("No data to export");
      return;
    }

    const exportPlugin = this.hotInstance.getPlugin("exportFile");
    const reportName = $("#report-title")
      .text()
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    exportPlugin.downloadFile("csv", {
      bom: true,
      columnHeaders: true,
      exportHiddenColumns: false,
      exportHiddenRows: false,
      fileExtension: "csv",
      filename: `${reportName}_[YYYY]-[MM]-[DD]`,
      mimeType: "text/csv",
      rowHeaders: false,
    });
  }

  destroy() {
    if (this.hotInstance) {
      this.hotInstance.destroy();
      this.hotInstance = null;
    }
    this.currentReportData = null;
  }
}
