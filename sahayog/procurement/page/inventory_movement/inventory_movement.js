frappe.pages['inventory-movement'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Inventory Movement ',
		single_column: true
	});
    // Live stock tracking: { item_name: { qty, rate } }

  $(page.body).html(`
    <div class="row" style="min-height: 600px;">
      <div class="col-md-2">
        <div class="list-group" id="sidebar">
          <a class="list-group-item list-group-item-action active" data-view="Stock_Balance">Stock Balance</a>
          <a class="list-group-item list-group-item-action" data-view="inward">_Stock Ledger</a>
        </div>
      </div>
      <div class="col-md-10">
        <div id="content" class="p-3 bg-white shadow-sm border rounded" >
          <!--- View will be loaded here --->
        </div>
      </div>
    </div>
  `);

  load_view("Stock_Balance");

  $('#sidebar a').on('click', function () {
    $('#sidebar a').removeClass('active');
    $(this).addClass('active');
    load_view(this.getAttribute("data-view"));
  });

  function load_view(view) {
    if (view === "Stock_Balance") {
      render_stock_balance();
    } else if (view === "inward") {
      render_stock_ledger();
    } 
  }
// Show stock balance on button click
async function render_stock_balance() {
  const section = document.getElementById("content");
  section.innerHTML = "<h4>Loading Stock Balance...</h4>";

  frappe.call({
    method: "sahayog.procurement.api.stock_balance_ledger.get_stock_balance_data", // use dot notation for custom method
    args: {
      // Optional — pass filters if needed
      company: null,
      from_date: null,
      to_date: null,
      item_code: null,
      warehouse: null
    },
    callback: function (response) {
      console.log("Stock Balance API response:", response);

      if (!response.message || !response.message.data || response.message.data.length === 0) {
        section.innerHTML = "<h4>No stock data found</h4>";
        return;
      }

      const stockData = response.message.data;

      // Generate table rows
      const rows = stockData.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.item_code || ""}</td>
          <td>${item.item_name || ""}</td>
          <td>${item.warehouse || ""}</td>
          <td style="text-align:center; ${item.bal_qty >= 0 ? "color:green" : "color:red"}">
            ${item.bal_qty ?? ""}
          </td>
          <td>${item.val_rate ?? ""}</td>
        </tr>
      `).join("");

      // Render the card + table
      section.innerHTML = `
        <div class="card mt-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="card-title">Stock Balance Report</h5>
              <div class="d-flex justify-content-end" style="gap: 8px; padding-right: 2px;">
                <button id="refresh-stock" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">Refresh</button>
                <button id="export-stock" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">⬇ Export Excel</button>
              </div>
            </div>
            <table class="table table-bordered table-hover table-striped text-center" id="stock-table">
              <thead>
                <tr>
                  <th>Sr.no</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Warehouse</th>
                  <th>Actual Quantity</th>
                  <th>Rate</th>
                </tr>
                <tr>
                  <th><input type="text" class="form-control form-control-sm" disabled></th>
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search Item Code"></th>
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search Item Name"></th>
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search Warehouse"></th>
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search Qty"></th>
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search Rate"></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;

      // Column search
      document.querySelectorAll("#stock-table thead tr:nth-child(2) input").forEach((input, colIndex) => {
        input.addEventListener("keyup", () => {
          const filter = input.value.toLowerCase();
          document.querySelectorAll("#stock-table tbody tr").forEach(row => {
            const cell = row.cells[colIndex];
            if (cell) {
              const text = cell.textContent.toLowerCase();
              row.style.display = text.includes(filter) ? "" : "none";
            }
          });
        });
      });

      // Button actions
      document.getElementById("refresh-stock").addEventListener("click", render_stock_balance);
      document.getElementById("export-stock").addEventListener("click", () => {
        exportTableToCSV("stock-table", "Stock_Report.csv");
      });
    },
    error: function (err) {
      console.error("Error fetching stock balance:", err);
      section.innerHTML = "<h4>Error loading stock data</h4>";
    }
  });
}
// Helper function: Export HTML Table to CSV
function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) {
    console.error(`Table with id "${tableId}" not found.`);
    return;
  }

  const rows = Array.from(table.querySelectorAll("tr"));
  let csvContent = rows.map(row => {
    const cols = Array.from(row.querySelectorAll("th, td"));
    return cols.map(col => `"${col.innerText.replace(/"/g, '""')}"`).join(",");
  }).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
// This function fetches stock ledger entries and renders them in a table
async function render_stock_ledger() {
    const section = document.getElementById("content");
    section.innerHTML = "<h4>Loading Stock Ledger...</h4>";

    try {
        const ledgerEntries = await frappe.db.get_list("Stock Ledger Entry", {
            fields: ["name", "item_code", "warehouse", "posting_date", "actual_qty", "voucher_type", "valuation_rate"],
            order_by: "posting_date desc",
            limit: 20
        });

        // Fetch item names in bulk
        const itemCodes = [...new Set(ledgerEntries.map(e => e.item_code))];
        const items = await frappe.db.get_list("Item", {
            filters: { name: ["in", itemCodes] },
            fields: ["name", "item_name"]
        });

        const itemMap = Object.fromEntries(items.map(i => [i.name, i.item_name]));

        const qtyStyles = {
            positive: { bg: "#E8F5E9", color: "#4CAF50" },
            negative: { bg: "#FFEBEE", color: "#F44336" }
        };

const rows = ledgerEntries.map(entry => {
    const isInward = entry.actual_qty >= 0;
    // Sophisticated, subtle color palette
    const rowStyle = `
      background-color: ${isInward ? "#E3F9ED" : "#FFF1F1"};
      border-left: 5px solid ${isInward ? "#5db462ff" : "#da5553ff"};
      transition: box-shadow 0.15s;
      cursor: pointer;
    `;
    const rowTitle = isInward
      ? "Inward (Stock Increased)"
      : "Outward (Stock Decreased)";
    const style = isInward
      ? qtyStyles.positive
      : qtyStyles.negative;

    return `
      <tr style="${rowStyle}" title="${rowTitle}">
        <td>${entry.posting_date}</td>
        <td>${entry.item_code}</td>
        <td>${itemMap[entry.item_code] || "-"}</td>
        <td>${entry.warehouse}</td>
        <td>${entry.voucher_type}</td>
        <td>${entry.valuation_rate || "-"}</td>
        <td class="qty-cell">
          <span style="
              background:${style.bg};
              color:${style.color};
              padding:3px 10px;
              border-radius:999px;
              font-size:0.85rem;
              font-weight:500;
              display:inline-block;
              min-width:50px;
              text-align:center;">
            ${entry.actual_qty}
          </span>
        </td>
      </tr>
    `;
}).join("");



        section.innerHTML = `
        <div class="card mt-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="card-title">Recent Stock Ledger Entries</h5>
                    <div class="d-flex justify-content-end" style="gap: 8px; padding-right: 2px;">
                        <button id="refresh-stock" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">Refresh</button>
                        <button id="export-stock-Ledger" class="btn btn-sm btn-outline-primary"style="border: 1px solid #0f0f0f;">⬇ Export Excel</button>
                    </div>
                </div>
                <table class="table table-striped table-hover" id="ledger-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Item Code</th>
                            <th>Item Name</th>
                            <th>Warehouse</th>
                            <th>Voucher Type</th>
                            <th>Rate</th>
                            <th class="qty-cell">Quantity</th>
                        </tr>
                        <tr class="search-row">
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Date"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Item Code"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Item Name"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Warehouse"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Voucher"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Rate"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Qty"></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;

        // --- FIX: Add this search handler block below! ---
        document.querySelectorAll("#ledger-table thead tr.search-row input").forEach((input, colIndex) => {
          input.addEventListener("keyup", function () {
            const filter = this.value.toLowerCase();
            document.querySelectorAll("#ledger-table tbody tr").forEach(row => {
              const cell = row.cells[colIndex];
              if (cell) {
                const text = cell.textContent.toLowerCase();
                row.style.display = text.includes(filter) ? "" : "none";
              }
            });
          });
        });
        // --- End search handler ---
        document.getElementById("refresh-stock").addEventListener("click", render_stock_ledger);
        document.getElementById("export-stock-Ledger").addEventListener("click", () => {
          exportTableToCSV("ledger-table", "Stock_Ledger.csv");
        });

    } catch (error) {
        section.innerHTML = "<p class='text-danger'>❌ Failed to load Stock Ledger entries</p>";
        console.error(error);
    }
}
}