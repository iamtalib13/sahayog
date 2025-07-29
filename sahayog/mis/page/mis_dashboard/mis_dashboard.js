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
      const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "MIS Dashboard",
        single_column: true,
      });

      let hotInstance = null;

      $(wrapper).find(".layout-main-section").html(`
        <style>
          .handsontable {
            font-size: 13px;
          }
          .ht_master .htCore thead th {
            position: sticky;
            top: 0;
            background: #fff;
            z-index: 2;
          }
          #export-btn {
            display: none;
            float: right;
            margin-bottom: 10px;
          }
          #report-table-container {
            padding: 10px;
          }
          #hot-table-wrapper {
            overflow-x: auto;
            border: 1px solid #ddd;
            padding: 5px;
          }
        </style>

        <div class="mis-dashboard-controls" style="margin-bottom: 20px;">
          <select id="mis-report-dropdown" class="form-control" style="width: 80%; margin-bottom: 10px;"></select>
          <button id="get-report-btn" class="btn btn-primary">Get Report</button>
        </div>

        <div id="report-table-container">
          <button id="export-btn" class="btn btn-secondary">Export CSV</button>
          <div id="hot-table"></div>
        </div>
      `);

      // Populate report dropdown
      frappe.db
        .get_list("MIS Report", {
          fields: ["name", "last_updated_date"],
          filters: { is_active: 1 },
          limit: 100,
        })
        .then((reports) => {
          const dropdown = $("#mis-report-dropdown");
          dropdown.empty().append(`<option></option>`);

          reports.forEach((report) => {
            dropdown.append(
              `<option value="${report.name}" data-last-updated="${report.last_updated_date}">
                ${report.name}
              </option>`
            );
          });

          dropdown.select2({
            placeholder: "Search MIS Report",
            allowClear: true,
            width: "resolve",
            templateResult: formatOption,
            templateSelection: formatSelection,
            escapeMarkup: (markup) => markup,
          });
        });

      function formatOption(option) {
        if (!option.id) return option.text;

        const name = option.text;
        const updatedRaw = option.element?.dataset?.lastUpdated;
        const formattedDate = updatedRaw
          ? frappe.datetime.str_to_user(updatedRaw)
          : "N/A";

        return `
          <div>
            <div>${name}</div>
            <div style="font-size: 11px;">${formattedDate}</div>
          </div>
        `;
      }

      function formatSelection(option) {
        return option.text;
      }

      // Load selected report
      $(wrapper).on("click", "#get-report-btn", () => {
        const selectedReport = $("#mis-report-dropdown").val();
        if (!selectedReport) return frappe.msgprint("Please select a report");

        frappe.db.get_doc("MIS Report", selectedReport).then((doc) => {
          const fileUrl = doc.report_attachment;
          const reportName = selectedReport;
          const lastUpdated = frappe.datetime.str_to_user(
            doc.last_updated_date
          );

          if (!fileUrl) return frappe.msgprint("No attachment found.");

          const ext = fileUrl.split(".").pop().toLowerCase();

          fetch(fileUrl)
            .then((res) => {
              if (!res.ok) throw new Error("Failed to fetch file.");
              return ext === "csv"
                ? res
                    .text()
                    .then((text) =>
                      parseCSVtoTable(text, reportName, lastUpdated)
                    )
                : ["xlsx", "xls"].includes(ext)
                ? res
                    .arrayBuffer()
                    .then((buffer) =>
                      parseExcelToTable(buffer, reportName, lastUpdated)
                    )
                : frappe.msgprint("Unsupported file format.");
            })
            .catch((err) => {
              console.error(err);
              frappe.msgprint("Failed to load file content");
            });
        });
      });

      function parseCSVtoTable(csvText, reportName, lastUpdated) {
        const data = Papa.parse(csvText.trim(), { skipEmptyLines: true }).data;
        renderTable(data, reportName, lastUpdated);
      }

      function parseExcelToTable(arrayBuffer, reportName, lastUpdated) {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        renderTable(data, reportName, lastUpdated);
      }

      function renderTable(data, reportName, lastUpdated) {
        const container = document.getElementById("hot-table");
        container.innerHTML = "";

        if (!data?.length) {
          container.innerHTML = "<p>No data found.</p>";
          $("#export-btn").hide();
          return;
        }

        $("#export-btn").show();

        const colHeaders = data[0];
        const rowData = data.slice(1);

        const metadataHTML = `
          <div style="margin-bottom: 10px;">
            <h3 style="margin: 0;">${reportName || "N/A"}</h3>
            <div style="margin-top: 2px;"><small><strong>Last Updated:</strong> ${
              lastUpdated || "N/A"
            }</small></div>
          </div>
        `;

        container.innerHTML = metadataHTML;

        const scrollWrapper = document.createElement("div");
        scrollWrapper.id = "hot-table-wrapper";

        const hotContainer = document.createElement("div");
        scrollWrapper.appendChild(hotContainer);
        container.appendChild(scrollWrapper);

        hotInstance = new Handsontable(hotContainer, {
          data: rowData,
          colHeaders,
          rowHeaders: true,
          width: "100%",
          height: 400,
          licenseKey: "non-commercial-and-evaluation",
          filters: true,
          dropdownMenu: {
            items: {
              filter_by_condition: {},
              filter_by_value: {},
              filter_action_bar: {},
            },
          },
          contextMenu: {
            items: {
              filter_by_condition: {},
              filter_by_value: {},
              filter_action_bar: {},
            },
          },
          readOnly: true,
          stretchH: "all",
          autoWrapRow: true,
        });
      }

      // Export CSV
      $(wrapper).on("click", "#export-btn", () => {
        if (!hotInstance) return frappe.msgprint("Please load a report first.");

        const exportPlugin = hotInstance.getPlugin("exportFile");

        exportPlugin.downloadFile("csv", {
          bom: true,
          columnHeaders: true,
          exportHiddenColumns: false,
          exportHiddenRows: false,
          fileExtension: "csv",
          filename: `report_[YYYY]-[MM]-[DD]`,
          mimeType: "text/csv",
          rowHeaders: true,
        });
      });
    }
  );
};
