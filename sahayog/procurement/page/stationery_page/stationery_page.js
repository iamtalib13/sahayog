frappe.pages['stationery-page'].on_page_load = function(wrapper) {
    const clusterizeScript = document.createElement("script");
  clusterizeScript.src = "https://cdn.jsdelivr.net/npm/clusterize.js@0.18.1/clusterize.min.js";
  document.head.appendChild(clusterizeScript);

  // ✅ Optional: Clusterize CSS
  const clusterizeCSS = document.createElement("link");
  clusterizeCSS.rel = "stylesheet";
  clusterizeCSS.href = "https://cdn.jsdelivr.net/npm/clusterize.js@0.18.1/clusterize.min.css";
  document.head.appendChild(clusterizeCSS);

  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Inventory Management',
    single_column: true
  });

  let stock_data = {}; // Live stock tracking: { item_name: { qty, rate } }

  $(page.body).html(`
    <div class="row" style="min-height: 600px;">
      <div class="col-md-2">
        <div class="list-group" id="sidebar">
          <a class="list-group-item list-group-item-action active" data-view="dashboard">Stock Dashboard</a>
          <a class="list-group-item list-group-item-action" data-view="inward">Stock Inward</a>
          <a class="list-group-item list-group-item-action" data-view="outward">Stock Outward</a>
        </div>
      </div>
      <div class="col-md-10">
        <div id="content" class="p-3 bg-white shadow-sm border rounded" >
          <!-- View will be loaded here -->
        </div>
      </div>
    </div>
  `);

  load_view("dashboard");

  $('#sidebar a').on('click', function () {
    $('#sidebar a').removeClass('active');
    $(this).addClass('active');
    load_view(this.getAttribute("data-view"));
  });

  function load_view(view) {
    const content = document.getElementById("content");
    if (view === "dashboard") {
      render_dashboard();
    } else if (view === "inward") {
      render_inward();
    } else if (view === "outward") {
      render_outward();
    }
  }
// DASHBOARD RENDER FUNCTION & This function fetches live stock data from ERPNext and renders it
function render_dashboard() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div style="border-bottom: 1px solid #ccc; display: flex; gap: 40px; padding-bottom: 8px;">
      <span id="tab-stock-balance" style="cursor: pointer; padding-bottom: 4px; font-weight: bold; border-bottom: 3px solid black;">
        📦 Stock Balance
      </span>
      <span id="tab-stock-ledger" style="cursor: pointer; padding-bottom: 4px; color: #555;">
        📜 Stock Ledger
      </span>
      <span id="asset-valuation" style="cursor: pointer; padding-bottom: 4px; color: #555;">
        💰 Asset Valuation
      </span>
    </div>
    <div id="section-area" class="pt-3"></div>
  `;

  const tabStockBalance = document.getElementById("tab-stock-balance");
  const tabStockLedger = document.getElementById("tab-stock-ledger");
  const tabAssetValuation = document.getElementById("asset-valuation");

  // Default view
  render_stock_balance();

  tabStockBalance.addEventListener("click", () => {
    setActiveTab(tabStockBalance, tabStockLedger, tabAssetValuation);
    render_stock_balance();
  });

  tabStockLedger.addEventListener("click", () => {
    setActiveTab(tabStockLedger, tabStockBalance, tabAssetValuation);
    render_stock_ledger();
  });

  tabAssetValuation.addEventListener("click", () => {
    setActiveTab(tabAssetValuation, tabStockBalance, tabStockLedger);
    render_asset_valuation();
  });

  function setActiveTab(active, ...others) {
    active.style.fontWeight = "bold";
    active.style.borderBottom = "3px solid black";
    active.style.color = "black";

    others.forEach(tab => {
      tab.style.fontWeight = "normal";
      tab.style.borderBottom = "none";
      tab.style.color = "#555";
    });
  }
}
// This function fetches asset valuation entries and renders them in a new tab
function render_asset_valuation(itemCode = null, location = null) {
  const section = document.getElementById("section-area");
  section.innerHTML = "<h4>Loading Asset Valuation...</h4>";

  frappe.call({
    method: "sahayog.api.stationery_api.get_asset_entries",
    args: {
      item_code: itemCode,
      location: location
    },
    callback: function (r) {

      if (r.message && r.message.length > 0) {

        // Generate table rows
        const rows = r.message.map(asset => `
          <tr>
            <td>${asset.item_code || ""}</td>
            <td>${asset.asset_name || ""}</td>
            <td>${asset.location || ""}</td>
            <td>${asset.purchase_receipt || ""}</td>
            <td>${asset.purchase_invoice || ""}</td>
            <td>${asset.purchase_date || ""}</td>
            <td>${asset.available_for_use_date || ""}</td>
            <td>${asset.gross_purchase_amount || ""}</td>
          </tr>
        `).join("");

        // Inject card + table HTML
        section.innerHTML = `
          <div class="card mt-3">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="card-title">Asset Valuation</h5>
                <span class="badge bg-primary">${r.message.length} Records</span>
                <div class="d-flex justify-content-end" style="gap: 8px; padding-left: 10px;">
                  <button id="refresh-asset" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">Refresh</button>
                  <button id="export-asset" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">⬇ Export Excel</button>
                </div>
              </div>
              <div class="table-responsive">
                <table class="table table-striped table-hover table-bordered" id="asset-table">
                  <thead class="table-light">
                    <tr>
                      <th>Item Code</th>
                      <th>Asset Name</th>
                      <th>Location</th>
                      <th>Purchase Receipt</th>
                      <th>Purchase Invoice</th>
                      <th>Purchase Date</th>
                      <th>Available for Use Date</th>
                      <th>Gross Purchase Amount</th>
                    </tr>
                    <tr class="search-row">
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search Item Code"></th>
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search Asset Name"></th>
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search Location"></th>
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search PR"></th>
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search PI"></th>
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search Purchase Date"></th>
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search Available Date"></th>
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search Amount"></th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>
          </div>
        `;

        // Search filter per column
        document.querySelectorAll("#asset-table thead tr.search-row input").forEach((input, colIndex) => {
          input.addEventListener("keyup", function () {
            const filter = this.value.toLowerCase();
            document.querySelectorAll("#asset-table tbody tr").forEach(row => {
              const cell = row.cells[colIndex];
              if (cell) {
                const text = cell.textContent.toLowerCase();
                row.style.display = text.includes(filter) ? "" : "none";
              }
            });
          });
        });

        // Button actions
        document.getElementById("refresh-asset").addEventListener("click", () => {
          render_asset_valuation(itemCode, location);
        });
        document.getElementById("export-asset").addEventListener("click", () => {
          exportTableToCSV("asset-table", "Asset_Valuation.csv");
        });

      } else {
        section.innerHTML = "<p class='text-danger'>❌ No Asset Entries Found</p>";
      }
    }
  });
}
// Show stock balance on button click
async function render_stock_balance() {
  const section = document.getElementById("section-area");
  section.innerHTML = "<h4>Loading Stock Balance...</h4>";

  frappe.call({
    method: "sahayog.api.stationery_api.get_stock_balance_data", // no /api/method/ prefix
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
                  <th>Actual Qty</th>
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
function exportTableToCSV0(filename) {
  const table = document.getElementById("stock-table");
  const rows = Array.from(table.querySelectorAll("tr"));
  let csvContent = rows.map(row => {
    const cols = Array.from(row.querySelectorAll("th, td"));
    return cols.map(col => `"${col.innerText}"`).join(",");
  }).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
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
    const section = document.getElementById("section-area");
    section.innerHTML = "<h4>Loading Stock Ledger...</h4>";

    try {
        const ledgerEntries = await frappe.db.get_list("Stock Ledger Entry", {
            fields: ["name", "item_code", "warehouse", "posting_date", "actual_qty", "voucher_type"],
            order_by: "posting_date desc",
            limit: 20
        });

        const qtyStyles = {
            positive: { bg: "#E8F5E9", color: "#4CAF50" },
            negative: { bg: "#FFEBEE", color: "#F44336" }
        };

        const rows = ledgerEntries.map(entry => {
            const style = entry.actual_qty >= 0 ? qtyStyles.positive : qtyStyles.negative;
            return `
            <tr>
                <td>${entry.posting_date}</td>
                <td>${entry.item_code}</td>
                <td>${entry.warehouse}</td>
                <td>${entry.voucher_type}</td>
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
            </tr>`;
        }).join("");

        section.innerHTML = `
        <div class="card mt-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="card-title">Recent Stock Ledger Entries</h5>
                    <div class="d-flex justify-content-end" style="gap: 8px; padding-right: 2px;">
                        <button id="refresh-stock" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">Refresh</button>
                        <button id="export-stock-Ledger" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">⬇ Export Excel</button>
                    </div>
                </div>
                <table class="table table-striped table-hover" id="ledger-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Item Code</th>
                            <th>Warehouse</th>
                            <th>Voucher Type</th>
                            <th class="qty-cell">Qty</th>
                        </tr>
                        <tr class="search-row">
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Date"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Item"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Warehouse"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Voucher"></th>
                            <th><input type="text" class="form-control form-control-sm" placeholder="Search Qty"></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;

        // Align Qty column center
        const styleTag = document.createElement("style");
        styleTag.innerHTML = `
            #ledger-table th.qty-cell, 
            #ledger-table td.qty-cell { text-align: center; }
            .search-row input { width: 100%; padding: 2px 5px; font-size: 0.8rem; }
        `;
        document.head.appendChild(styleTag);

        // Search filter functionality per column
        document.querySelectorAll(".search-row input").forEach((input, colIndex) => {
            input.addEventListener("keyup", function () {
                const filter = this.value.toLowerCase();
                const table = document.getElementById("ledger-table");
                const rows = table.querySelectorAll("tbody tr");

                rows.forEach(row => {
                    const cell = row.getElementsByTagName("td")[colIndex];
                    if (cell) {
                        const txtValue = cell.textContent || cell.innerText;
                        row.style.display = txtValue.toLowerCase().includes(filter) ? "" : "none";
                    }
                });
            });
        });

        // Buttons
        document.getElementById("refresh-stock").addEventListener("click", render_stock_ledger);
        document.getElementById("export-stock-Ledger").addEventListener("click", function () {
            exportTableToCSV("ledger-table", "Stock_Ledger.csv");
        });

    } catch (error) {
        section.innerHTML = "<p class='text-danger'>❌ Failed to load Stock Ledger entries</p>";
        console.error(error);
    }
}
// This function shows item details in a popup
function showItemDetails(item) {
  const html = `
    <p><strong>Item Code:</strong> ${item.name}</p>
    <p><strong>Name:</strong> ${item.item_name}</p>
    <p><strong>UOM:</strong> ${item.stock_uom}</p>
    <p><strong>Description:</strong><br>${item.description || "N/A"}</p>
  `;
  frappe.msgprint({
    title: `Item: ${item.name}`,
    message: html,
    indicator: 'blue'
  });
}
// RENDER INWARD FORM FUNCTION
async function render_inward() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div style="border-bottom: 1px solid #ccc; display: flex; gap: 40px; padding-bottom: 8px;">
      <span id="tab-list" style="cursor: pointer; padding-bottom: 4px; font-weight: bold; border-bottom: 3px solid black;">
        📄 Inward Entries
      </span>
      <span id="tab-form" style="cursor: pointer; padding-bottom: 4px; color: #555;">
        ➕ Inward Form
      </span>
    </div>
    <div id="inward-section" class="pt-3"></div>
  `;

  const tabList = document.getElementById("tab-list");
  const tabForm = document.getElementById("tab-form");

  // Default load
  render_inward_list();

  // Tab click events
  tabList.addEventListener("click", () => {
    setActiveTab(tabList, tabForm);
    render_inward_list();
  });

  tabForm.addEventListener("click", () => {
    setActiveTab(tabForm, tabList);
    render_inward_form();
  });

  function setActiveTab(active, inactive) {
    // Active styles
    active.style.fontWeight = "bold";
    active.style.borderBottom = "3px solid black";
    active.style.color = "black";

    // Inactive styles
    inactive.style.fontWeight = "normal";
    inactive.style.borderBottom = "none";
    inactive.style.color = "#555";
  }
}
// This function renders the inward entry form dynamically
async function render_inward_form(selectedSupplier = "") {
  const section = document.getElementById("inward-section");

  const suppliers = await frappe.db.get_list("Supplier", { fields: ["name"] });
  const items = await frappe.db.get_list("Item", {
    fields: ["item_code", "item_name", "description"],
    limit: 1000
  });

  const supplierOptions = suppliers.map(s => 
    `<option value="${s.name}" ${selectedSupplier === s.name ? "selected" : ""}>${s.name}</option>`
  ).join("");

  const itemOptions = items.map(i =>
    `<option value="${i.item_code}">${i.item_code} - ${i.item_name}${i.description ? `, ${i.description}` : ''}</option>`
  ).join("");

  section.innerHTML = `
  <div class="card">
    <div class="card-body">
      <h4>Stock Inward Entry</h4>

      <div class="row g-3 mb-3">
        <div class="col-md-3">
          <label for="supplier" class="form-label">Supplier</label>
          <input type="search" list="supplier-list" class="form-control" id="supplier" placeholder="Search Supplier" value="${selectedSupplier}" required />
          <datalist id="supplier-list">
            <option value="Add New Supplier"></option>
            ${supplierOptions}
          </datalist>
        </div>
        <div class="col-md-2">
          <label for="invoice_date" class="form-label">Invoice Date</label>
          <input type="date" class="form-control" id="invoice_date" value="${new Date().toISOString().split('T')[0]}" required />
        </div>
      </div>

      <input type="hidden" id="type" value="Purchase Order" />
      <input type="hidden" id="request_for" value="Store" />

      <table class="table table-bordered" id="inward-table">
        <thead>
          <tr>
            <th><input type="checkbox" id="select-all"></th>
            <th>No.</th>
            <th>Item Code</th>
            <th>Accepted Quantity</th>
            <th>Rate (INR)</th>
            <th>Amount (INR)</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <button id="add-delete-btn" class="btn btn-sm btn-primary">➕ Add</button>
      </div>
      
      <div class="mt-3">
        <button id="submit-inward" class="btn btn-success">Submit Inward Entry</button>
      </div>
    </div>
  </div>
  `;

  // Handle "Add New Supplier"
  document.getElementById("supplier").addEventListener("change", function () {
    if (this.value === "Add New Supplier") {
      create_supplier_with_callback((newSupplierName) => {
        render_inward_form(newSupplierName);
      });
      this.value = "";
    }
  });

  const tbody = document.querySelector("#inward-table tbody");
  const addDeleteBtn = document.getElementById("add-delete-btn");

  // Add row function
  function addRow() {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" class="row-check"></td>
      <td></td>
      <td><input type="search" list="product-list" class="form-control product-input" placeholder="Search Product" /></td>
      <td><input type="number" class="form-control" value="0" /></td>
      <td><input type="number" class="form-control" value="0" /></td>
      <td class="amount">₹ 0.00</td>
    `;
    tbody.appendChild(row);
    updateSrNumbers();
  }

  // Select all
  document.getElementById("select-all").addEventListener("change", function () {
    document.querySelectorAll(".row-check").forEach(chk => chk.checked = this.checked);
    toggleAddDelete();
  });

  // Checkbox change handler
  tbody.addEventListener("change", function (e) {
    if (e.target.classList.contains("row-check")) {
      toggleAddDelete();
    }
  });

  // Toggle button between Add and Delete
  function toggleAddDelete() {
    const anyChecked = document.querySelectorAll(".row-check:checked").length > 0;
    addDeleteBtn.textContent = anyChecked ? "🗑 Delete" : "➕ Add";
    addDeleteBtn.className = anyChecked ? "btn btn-sm btn-danger" : "btn btn-sm btn-primary";
  }

  // Handle Add/Delete button click
  addDeleteBtn.addEventListener("click", function () {
    if (addDeleteBtn.textContent.includes("Delete")) {
      document.querySelectorAll(".row-check:checked").forEach(chk => chk.closest("tr").remove());
      updateSrNumbers();
      toggleAddDelete();
    } else {
      addRow();
    }
  });

  // When product selected → show "code - name"
  tbody.addEventListener("change", function (e) {
    if (e.target.classList.contains("product-input")) {
      const selectedCode = e.target.value;
      const item = items.find(i => i.item_code === selectedCode);
      if (item) {
        e.target.value = `${item.item_code} - ${item.item_name}`;
      }
    }
  });

  // Update amount when qty/rate changes
  tbody.addEventListener("input", function (e) {
    const row = e.target.closest("tr");
    const qty = parseFloat(row.cells[3].querySelector("input").value) || 0;
    const rate = parseFloat(row.cells[4].querySelector("input").value) || 0;
    const amount = qty * rate;
    row.querySelector(".amount").textContent = `₹ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  });

  function updateSrNumbers() {
    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row, idx) => {
      row.cells[1].innerText = idx + 1;
    });
  }

  // Submit inward entry
  document.getElementById("submit-inward").addEventListener("click", async function () {
    const supplier = document.getElementById("supplier").value;
    const invoice_date = document.getElementById("invoice_date").value;

    if (!supplier || !invoice_date) {
      frappe.show_alert({ message: "⚠ Please fill all required fields.", indicator: "red" }, 5);
      return;
    }

    const rows = tbody.querySelectorAll("tr");
    if (rows.length === 0) {
      frappe.show_alert({ message: "⚠ Please add at least one product row.", indicator: "red" }, 5);
      return;
    }

    const itemsData = Array.from(rows).map(row => {
      const productFieldValue = row.cells[2].querySelector("input").value;
      const itemCode = productFieldValue.split(" - ")[0];
      return {
        item_code: itemCode,
        qty: parseFloat(row.cells[3].querySelector("input").value),
        rate: parseFloat(row.cells[4].querySelector("input").value)
      };
    });

    try {
      const res = await frappe.call({
        method: "frappe.client.insert",
        args: {
          doc: {
            doctype: "Purchase Receipt",
            supplier: supplier,
            posting_date: invoice_date,
            custom_po_wo: "Purchase Order",
            custom_request_for: "Store",
            set_warehouse: "Store - Stationary Gondia",
            items: itemsData
          }
        }
      });

      frappe.show_alert({ message: ` Purchase Receipt <b>${res.message.name}</b> created successfully`, indicator: "green" }, 5);
      
      // Keep form open with same supplier & focus first product input
      render_inward_form(supplier);
      setTimeout(() => {
        document.querySelector(".product-input")?.focus();
      }, 300);

    } catch (err) {
      console.error(err);
      frappe.show_alert({ message: "❌ Failed to submit Inward Entry", indicator: "red" }, 5);
    }
  });

  // Add datalist for products
  // Add datalist for products
  const datalistHTML = `<datalist id="product-list">${itemOptions}</datalist>`;
  document.body.insertAdjacentHTML("beforeend", datalistHTML);

  // Add one default row when form loads
  addRow();

}
// Modified create_supplier to return new supplier name
async function create_supplier_with_callback(callback) {
  const modalWrapper = document.createElement("div");
  modalWrapper.innerHTML = `
    <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.3); backdrop-filter: blur(4px); z-index:9998;"></div>
    <div style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:20px; border-radius:10px; z-index:9999; width:90%; max-width:500px;">
      <h5>➕ Create New Supplier</h5>
      <label>Supplier Name</label>
      <input type="text" id="supplier-name" class="form-control mb-2">
      <label>Supplier Type</label>
      <select id="supplier-type" class="form-control mb-3">
        <option value="Company">Company</option>
        <option value="Individual">Individual</option>
      </select>
      <button id="submit-supplier" class="btn btn-primary">✅ Create Supplier</button>
    </div>
  `;
  document.body.appendChild(modalWrapper);

  document.getElementById("submit-supplier").addEventListener("click", async () => {
    const name = document.getElementById("supplier-name").value.trim();
    const type = document.getElementById("supplier-type").value;
    if (!name) {
      frappe.show_alert({ message: "⚠ Supplier Name is required", indicator: "red" }, 5);
      return;
    }
    try {
      await frappe.call({
        method: "frappe.client.insert",
        args: {
          doc: {
            doctype: "Supplier",
            supplier_name: name,
            supplier_type: type
          }
        }
      });
      frappe.show_alert({ message: `✅ Supplier <b>${name}</b> created successfully`, indicator: "green" }, 5);
      document.body.removeChild(modalWrapper);
      if (callback) callback(name);
    } catch (error) {
      frappe.show_alert({ message: "❌ Failed to create supplier", indicator: "red" }, 5);
      console.error(error);
    }
  });
}
// This function creates a new supplier entry
async function create_supplier() {
  // Add modal HTML to body
  const modalWrapper = document.createElement("div");
  modalWrapper.innerHTML = `
    <div id="supplier-modal-overlay" style="
      position: fixed;
      top: 0; left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      z-index: 9998;
    "></div>

    <div id="supplier-modal" style="
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.2);
      width: 90%;
      max-width: 500px;
      z-index: 9999;
      padding: 20px;
    ">
      <button id="close-supplier-modal" style="
        position: absolute;
        top: 10px; right: 10px;
        background: transparent;
        border: none;
        font-size: 20px;
        cursor: pointer;
      ">&times;</button>
      
      <h5>➕ Create New Supplier</h5>
      <div style="margin-top: 20px;">
        <label>Supplier Name</label>
        <input type="text" id="supplier-name" placeholder="Enter Supplier Name" style="
          width: 100%;
          padding: 8px;
          margin-top: 5px;
          margin-bottom: 15px;
          border-radius: 5px;
          border: 1px solid #ccc;
        ">

        <label>Supplier Type</label>
        <select id="supplier-type" style="
          width: 100%;
          padding: 8px;
          margin-top: 5px;
          margin-bottom: 15px;
          border-radius: 5px;
          border: 1px solid #ccc;
        ">
          <option value="Company">Company</option>
          <option value="Individual">Individual</option>
        </select>

        <button id="submit-supplier" style="
          background: #007bff;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        "> Create Supplier</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalWrapper);

  // Close modal logic
  document.getElementById("close-supplier-modal").addEventListener("click", () => {
    modalWrapper.remove();
  });

  // Handle create supplier
  document.getElementById("submit-supplier").addEventListener("click", async () => {
    const name = document.getElementById("supplier-name").value.trim();
    const type = document.getElementById("supplier-type").value;

    if (!name) {
      frappe.show_alert({
        message: __('Supplier Name is required'),
        indicator: 'red'
      }, 5);
      return;
    }

    try {
      await frappe.call({
        method: "frappe.client.insert",
        args: {
          doc: {
            doctype: "Supplier",
            supplier_name: name,
            supplier_type: type
          }
        }
      });

      frappe.show_alert({
        message: __( ` Supplier <b>${name}</b> created successfully` ),
        indicator: 'green'
      }, 5);

      modalWrapper.remove(); // Close modal after success
      render_inward_form();  // Reload the form
    } catch (error) {
      frappe.show_alert({
        message: __(' Failed to create supplier. Maybe it already exists?'),
        indicator: 'red'
      }, 5);
      console.error(error);
    }
  });
}
// RENDER INWARD LIST FUNCTION & This function fetches recent inward entries and renders them in a table
async function render_inward_list() {
  const section = document.getElementById("inward-section");
  section.innerHTML = "<h4>Loading Inward Records...</h4>";

  const receipts = await frappe.db.get_list("Purchase Receipt", {
    fields: ["name", "supplier", "posting_date", "status"],
    order_by: "creation desc",
    limit: 1000
  });

  const statusStyles = {
    Draft: { text: "Draft", bg: "#FFF4E5", color: "#FF9800" },
    Submitted: { text: "Submitted", bg: "#E8F5E9", color: "#4CAF50" }
  };

  // Generate all rows
  let allRows = receipts.map(r => {
    const style = statusStyles[r.status] || statusStyles.Submitted;
    return `
      <tr class="receipt-row" data-name="${r.name}">
        <td>${r.name}</td>
        <td>${r.supplier}</td>
        <td>${r.posting_date}</td>
        <td style="text-align:center;">
          <span style="
            background:${style.bg};
            color:${style.color};
            padding:3px 10px;
            border-radius:999px;
            font-size:0.85rem;
            font-weight:500;
            display:inline-block;
            min-width:80px;
            text-align:center;
          ">${style.text}</span>
        </td>
      </tr>
    `;
  });

  // HTML structure with proper alignment
  section.innerHTML = `
    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">       
          <h5 class="card-title">Recent Inward Entries</h5>
          <div class="d-flex justify-content-end" style="gap: 8px; padding-right: 2px;">
            <button id="refresh-Inward" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">Refresh</button>
            <button id="export-Inward-list" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">⬇ Export Excel</button>
          </div>  
        </div>     

        <div class="clusterize">
          <table class="table table-hover table-striped mb-0">
            <thead>
              <tr>
                <th>PR No</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
              <tr class="search-row">
                <th><input type="text" class="form-control form-control-sm" placeholder="Search PR No" /></th>
                <th><input type="text" class="form-control form-control-sm" placeholder="Search Supplier" /></th>
                <th><input type="text" class="form-control form-control-sm" placeholder="Search Date" /></th>
                <th><input type="text" class="form-control form-control-sm" placeholder="Search Status" /></th>
              </tr>
            </thead>
          </table>

          <div id="scroll-area" class="clusterize-scroll">
            <table class="table table-hover table-striped" id="inward-table">
              <tbody id="content-area" class="clusterize-content">
                <tr><td colspan="4">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize Clusterize
  let clusterize = new Clusterize({
    rows: allRows,
    scrollId: 'scroll-area',
    contentId: 'content-area',
    tag: 'tr'
  });

  // Multi-column search filtering
  document.querySelectorAll(".search-row input").forEach((input, colIndex) => {
    input.addEventListener("keyup", function () {
      const filters = Array.from(document.querySelectorAll(".search-row input"))
                           .map(inp => inp.value.toLowerCase());

      const filteredRows = receipts
        .filter(r => {
          const style = statusStyles[r.status] || statusStyles.Submitted;
          const rowData = [
            r.name.toLowerCase(),
            r.supplier.toLowerCase(),
            r.posting_date.toLowerCase(),
            style.text.toLowerCase()
          ];
          return filters.every((f, i) => !f || rowData[i].includes(f));
        })
        .map(r => {
          const style = statusStyles[r.status] || statusStyles.Submitted;
          return `
            <tr class="receipt-row" data-name="${r.name}">
              <td>${r.name}</td>
              <td>${r.supplier}</td>
              <td>${r.posting_date}</td>
              <td style="text-align:center;">
                <span style="
                  background:${style.bg};
                  color:${style.color};
                  padding:3px 10px;
                  border-radius:999px;
                  font-size:0.85rem;
                  font-weight:500;
                  display:inline-block;
                  min-width:80px;
                  text-align:center;
                ">${style.text}</span>
              </td>
            </tr>
          `;
        });

      clusterize.update(filteredRows);
    });
  });

  // Buttons
  document.getElementById("refresh-Inward")
    .addEventListener("click", render_inward_list);

  document.getElementById("export-Inward-list")
    .addEventListener("click", function () {
      exportTableToCSV("inward-table", "Inward_Report.csv");
    });

  // Row click handling
  setTimeout(() => {
    document.querySelectorAll(".receipt-row").forEach(row => {
      row.addEventListener("click", async () => {
        const name = row.dataset.name;
        const doc = await frappe.db.get_doc("Purchase Receipt", name);
        showPurchaseReceiptDetails(doc);
      });
    });
  }, 100);
}
// This function shows purchase receipt details in a popup & It formats the items in a table and displays total quantities and amounts
function showPurchaseReceiptDetails(doc) {
  // Status badge
  const statusBadge = doc.docstatus === 0
    ? `<span class="badge bg-primary">Draft</span>`
    : `<span class="badge bg-success">Submitted</span>`;

  // Build rows
  let itemsRows = doc.items.map((item, index) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td>${item.item_code}</td>
      <td><input type="number" class="form-control form-control-sm qty-input" id="qty-${index}" value="${item.qty}" min="0"></td>
      <td><input type="number" class="form-control form-control-sm rate-input" id="rate-${index}" value="${item.rate}" min="0"></td>
      <td id="amount-${index}" class="text-end">₹ ${(item.qty * item.rate).toFixed(2)}</td>
    </tr>
  `).join("");

  // HTML
  const html = `
    <div class="card shadow-sm">
      <div class="card-header d-flex align-items-center">
        <h5 class="mb-0">Purchase Receipt: ${doc.name}</h5>
        ${statusBadge}
      </div>
      <div class="card-body">
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label"><strong>Supplier</strong></label>
            <input type="text" class="form-control" value="${doc.supplier}" readonly>
          </div>
          <div class="col-md-6">
            <label class="form-label"><strong>Invoice Date</strong></label>
            <input type="date" class="form-control" value="${doc.posting_date}">
          </div>
        </div>

        <table class="table table-bordered table-sm align-middle">
          <thead class="table-light">
            <tr>
              <th class="text-center" style="width: 50px;">No.</th>
              <th>Item Code</th>
              <th style="width: 150px;">Accepted Quantity</th>
              <th style="width: 150px;">Rate (INR)</th>
              <th class="text-end" style="width: 150px;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="text-end mt-3">
          <button class="btn btn-success" id="submit-inward-btn">
            <i class="fa fa-check"></i> Submit Inward Entry
          </button>
        </div>
      </div>
    </div>
  `;

  // Render
  document.getElementById("inward-section").innerHTML = html;

  // ✅ Update amounts live
  doc.items.forEach((_, index) => {
    const qtyInput = document.getElementById(`qty-${index}`);
    const rateInput = document.getElementById(`rate-${index}`);
    const amountCell = document.getElementById(`amount-${index}`);

    const updateAmount = () => {
      let qty = parseFloat(qtyInput.value) || 0;
      let rate = parseFloat(rateInput.value) || 0;
      amountCell.textContent = `₹ ${(qty * rate).toFixed(2)}`;
    };

    qtyInput.addEventListener("input", updateAmount);
    rateInput.addEventListener("input", updateAmount);
  });

  // ✅ Handle submit
  document.getElementById("submit-inward-btn").addEventListener("click", async () => {
    try {
      let items = doc.items.map((item, index) => ({
        item_code: item.item_code,
        qty: parseFloat(document.getElementById(`qty-${index}`).value) || 0,
        rate: parseFloat(document.getElementById(`rate-${index}`).value) || 0
      }));

      if (!items.some(i => i.qty > 0)) {
        frappe.msgprint("Please add at least one valid item before submitting.");
        return;
      }

      await frappe.call({
        method: "frappe.client.insert",
        args: {
          doc: {
            doctype: "Stock Entry",
            stock_entry_type: "Material Receipt",
            docstatus: 0, // Draft
            supplier: doc.supplier,
            posting_date: doc.posting_date,
            items: items
          }
        }
      });

      frappe.msgprint("✅ Inward Entry submitted successfully!");
    } catch (err) {
      frappe.msgprint("❌ Error submitting inward entry.");
      console.error(err);
    }
  });
}
// OUTWARD FORM RENDER FUNCTION
async function render_outward() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div style="border-bottom: 1px solid #ccc; display: flex; gap: 40px; padding-bottom: 8px;">
      <span id="tab-list" style="cursor: pointer; padding-bottom: 4px; font-weight: bold; border-bottom: 3px solid black;">
        📄 Outward Entries
      </span>
      <span id="tab-form" style="cursor: pointer; padding-bottom: 4px; color: #555;">
        ➕ Outward Form
      </span>
    </div>
    <div id="outward-section" class="pt-3"></div>
  `;

  const tabList = document.getElementById("tab-list");
  const tabForm = document.getElementById("tab-form");

  // Default load
  render_outward_list();

  // Tab click events
  tabList.addEventListener("click", () => {
    setActiveTab(tabList, tabForm);
    render_outward_list();
  });

  tabForm.addEventListener("click", () => {
    setActiveTab(tabForm, tabList);
    render_outward_form();
  });

  function setActiveTab(active, inactive) {
    // Active styles
    active.style.fontWeight = "bold";
    active.style.borderBottom = "3px solid black";
    active.style.color = "black";

    // Inactive styles
    inactive.style.fontWeight = "normal";
    inactive.style.borderBottom = "none";
    inactive.style.color = "#555";
  }
}
// This function fetches recent outward entries and renders them in a table
async function render_outward_list() {
  const section = document.getElementById("outward-section");
  section.innerHTML = "<h4>Loading Outward Records...</h4>";

  // Fetch Outward (Material Issue) records
  const stockEntries = await frappe.db.get_list("Stock Entry", {
    fields: ["name", "stock_entry_type", "posting_date", "docstatus"],
    filters: { stock_entry_type: "Material Issue" },
    order_by: "creation desc",
    limit: 100
  });

  const statusStyles = {
    Draft: { text: "Draft", bg: "#FFF4E5", color: "#FF9800" },
    Submitted: { text: "Submitted", bg: "#E8F5E9", color: "#4CAF50" }
  };

  // Build data rows
  const allRows = stockEntries.map(entry => {
    const statusKey = entry.docstatus === 0 ? "Draft" : "Submitted";
    const style = statusStyles[statusKey];
    return `
      <tr class="stock-entry-row" data-name="${entry.name}">
        <td>${entry.name}</td>
        <td>${entry.stock_entry_type}</td>
        <td>${entry.posting_date}</td>
        <td style="text-align:center;">
          <span style="
            background:${style.bg};
            color:${style.color};
            padding:3px 10px;
            border-radius:999px;
            font-size:0.85rem;
            font-weight:500;
            display:inline-block;
            min-width:80px;
            text-align:center;
          ">${style.text}</span>
        </td>
      </tr>
    `;
  });

  // Table with header and search row
  section.innerHTML = `
    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title">Recent Outward Entries</h5>
          <div class="d-flex justify-content-end" style="gap: 8px; padding-right: 2px;">
            <button id="refresh-Outward" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">Refresh</button>
            <button id="export-Outward-list" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">⬇ Export Excel</button>
          </div>   
        </div>

        <table class="table table-hover table-striped table-bordered" id="outward-table">
          <thead>
            <tr>
              <th>Stock Entry No</th>
              <th>Type</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
            <tr class="search-row">
              <th><input type="text" class="form-control form-control-sm" placeholder="Search Stock Entry No" /></th>
              <th><input type="text" class="form-control form-control-sm" placeholder="Search Type" /></th>
              <th><input type="text" class="form-control form-control-sm" placeholder="Search Date" /></th>
              <th><input type="text" class="form-control form-control-sm" placeholder="Search Status" /></th>
            </tr>
          </thead>
          <tbody>${allRows.join("")}</tbody>
        </table>
      </div>
    </div>
  `;

  // Column-based filtering (multi-column)
  document.querySelectorAll(".search-row input").forEach((input, colIndex) => {
    input.addEventListener("keyup", function () {
      const filters = Array.from(document.querySelectorAll(".search-row input"))
                           .map(inp => inp.value.toLowerCase());

      const filteredRows = stockEntries
        .filter(entry => {
          const statusKey = entry.docstatus === 0 ? "Draft" : "Submitted";
          const style = statusStyles[statusKey];
          const rowData = [
            entry.name.toLowerCase(),
            entry.stock_entry_type.toLowerCase(),
            entry.posting_date.toLowerCase(),
            style.text.toLowerCase()
          ];
          return filters.every((f, i) => !f || rowData[i].includes(f));
        })
        .map(entry => {
          const statusKey = entry.docstatus === 0 ? "Draft" : "Submitted";
          const style = statusStyles[statusKey];
          return `
            <tr class="stock-entry-row" data-name="${entry.name}">
              <td>${entry.name}</td>
              <td>${entry.stock_entry_type}</td>
              <td>${entry.posting_date}</td>
              <td style="text-align:center;">
                <span style="
                  background:${style.bg};
                  color:${style.color};
                  padding:3px 10px;
                  border-radius:999px;
                  font-size:0.85rem;
                  font-weight:500;
                  display:inline-block;
                  min-width:80px;
                  text-align:center;
                ">${style.text}</span>
              </td>
            </tr>
          `;
        });

      document.querySelector("#outward-table tbody").innerHTML = filteredRows.join("");

      // Reattach click events for new rows
      document.querySelectorAll(".stock-entry-row").forEach(row => {
        row.addEventListener("click", async () => {
          const name = row.dataset.name;
          const doc = await frappe.db.get_doc("Stock Entry", name);
          showStockEntryDetails(doc);
        });
      });
    });
  });

  // Refresh & Export buttons
  document.getElementById("refresh-Outward").addEventListener("click", render_outward_list);
  document.getElementById("export-Outward-list").addEventListener("click", function () {
    exportTableToCSV("outward-table", "Outward_Report.csv");
  });

  // Row click events
  document.querySelectorAll(".stock-entry-row").forEach(row => {
    row.addEventListener("click", async () => {
      const name = row.dataset.name;
      const doc = await frappe.db.get_doc("Stock Entry", name);
      showStockEntryDetails(doc);
    });
  });
}
//show outward form  function
async function render_outward_form() {
    const content = document.getElementById("outward-section");
    content.innerHTML = "<h4>Loading...</h4>";

    try {
        const res = await fetch("/api/method/sahayog.api.stationery_api.get_stock_entry_items");
        const data = await res.json();

        if (!data.message || !Array.isArray(data.message)) {
            content.innerHTML = "<h4>No stock items found</h4>";
            return;
        }

        const stockItems = data.message;
        const rateLookup = {};
        const itemOptions = stockItems.map(i => {
            rateLookup[i.item_code] = i.basic_rate;
            return `<option value="${i.item_code}">${i.item_code} - ${i.item_name}</option>`;
        }).join("");

        content.innerHTML = `
            <h4>Stock Outward Entry</h4>
            <label class="form-label">Stock Entry Type:</label>
            <div class="mb-3" style="display: flex; gap: 10px;">
                <input type="text" class="form-control" value="Material Issue" readonly />
                <input type="date" class="form-control" id="invoice_date" value="${new Date().toISOString().split('T')[0]}" required />
            </div>

            <table class="table table-bordered" id="inward-table">
                <thead>
                    <tr>
                        <th>Sr.no</th>
                        <th>Item Code</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>

            <form id="inward-form" class="row g-3 mb-3">
                <div class="col-md-4">
                    <select class="form-control" id="item_code" required>
                        <option value="">Select Item</option>
                        ${itemOptions}
                    </select>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control" placeholder="Qty" id="quantity" required />
                </div>
                <input type="hidden" id="uom" value="Nos" />
                <div class="col-md-2">
                    <input type="number" class="form-control" placeholder="Rate" id="rate" readonly />
                </div>
                <div class="col-md-2">
                    <button type="submit" class="btn btn-primary w-100">Add</button>
                </div>
            </form>

            <div class="mb-3">
                <button id="submit_outward" class="btn btn-success">Submit Outward Entry</button>
            </div>
        `;

        let counter = 1;
        let outwardItems = [];

        document.getElementById("item_code").addEventListener("change", function () {
            const selectedItem = this.value;
            document.getElementById("rate").value = rateLookup[selectedItem] || "";
        });

        document.getElementById("inward-form").addEventListener("submit", function (e) {
            e.preventDefault();

            const itemCode = document.getElementById("item_code").value;
            const quantity = parseFloat(document.getElementById("quantity").value);
            const rate = parseFloat(document.getElementById("rate").value);
            const total = quantity * rate;

            if (!itemCode || isNaN(quantity) || quantity <= 0 || isNaN(rate) || rate <= 0) {
                frappe.msgprint("Please enter valid item details.");
                return;
            }

            outwardItems.push({
                item_code: itemCode,
                qty: quantity,
                rate: rate,
                total: total
            });

            const row = `
                <tr>
                    <td>${counter++}</td>
                    <td>${itemCode}</td>
                    <td>${quantity}</td>
                    <td>${rate}</td>
                    <td>${total.toFixed(2)}</td>
                </tr>
            `;
            document.querySelector("#inward-table tbody").insertAdjacentHTML("beforeend", row);

            this.reset();
            document.getElementById("rate").value = "";
        });

        document.getElementById("submit_outward").addEventListener("click", function () {
            submit_outward(outwardItems);
        });

    } catch (err) {
        console.error(err);
        content.innerHTML = "<h4>Error loading form</h4>";
    }
}
// ✅ Updated to accept outwardItems from the form
async function submit_outward(outwardItems) {
    if (!outwardItems || outwardItems.length === 0) {
        frappe.msgprint("Please add at least one valid item before submitting.");
        return;
    }

    const stockEntryData = {
        doctype: "Stock Entry",
        stock_entry_type: "Material Issue",
        items: outwardItems.map(it => ({
            item_code: it.item_code,
            qty: it.qty,
            basic_rate: it.rate,
            s_warehouse: "Store - Stationary Gondia" // Change as per your setup
        }))
    };

    try {
        frappe.show_alert("Submitting outward entry...", 5);

        const response = await frappe.call({
            method: "frappe.client.insert",
            args: { doc: stockEntryData }
        });

        frappe.msgprint(`Outward Entry created successfully: ${response.message.name}`);
    } catch (error) {
        console.error("Error creating Stock Entry:", error);
        frappe.msgprint("Error submitting outward entry.");
    }
}

};