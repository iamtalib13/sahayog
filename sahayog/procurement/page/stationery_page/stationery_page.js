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
          <a class="list-group-item list-group-item-action" data-view="asset">Asset</a>
          
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
    }else if (view === "asset") {
      asset_movements();
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
    
    </div>
    <div id="section-area" class="pt-3"></div>
  `;

  const tabStockBalance = document.getElementById("tab-stock-balance");
  const tabStockLedger = document.getElementById("tab-stock-ledger");

  // Default view
  render_stock_balance();

  tabStockBalance.addEventListener("click", () => {
    setActiveTab(tabStockBalance, tabStockLedger);
    render_stock_balance();
  });

  tabStockLedger.addEventListener("click", () => {
    setActiveTab(tabStockLedger, tabStockBalance);
    render_stock_ledger();
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
    const section = document.getElementById("section-area");
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
// OUTWARD FORM RENDER FUNCTION
function setActiveTab(active, inactive) {
  active.style.fontWeight = "bold";
  active.style.borderBottom = "3px solid black";
  active.style.color = "black";

  inactive.style.fontWeight = "normal";
  inactive.style.borderBottom = "none";
  inactive.style.color = "#555";
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

  // Set default active tab on load to list
  setActiveTab(tabList, tabForm);
  render_inward_list();

  tabList.addEventListener("click", () => {
    setActiveTab(tabList, tabForm);
    render_inward_list();
  });

  tabForm.addEventListener("click", () => {
    setActiveTab(tabForm, tabList);
    render_inward_form();
  });
}
// This function renders the inward entry form dynamically also this code handles both new and existing records, subbmition  of both is in same function
async function render_inward_form(doc = null, selectedSupplier = "") {
  setActiveTab(
    document.getElementById("tab-form"),
    document.getElementById("tab-list")
  );
  const section = document.getElementById("inward-section");
  if (!section) return console.error("Container #inward-section not found");

  // Load Suppliers and Items
  let suppliers = [], items = [];
  try {
    suppliers = await frappe.db.get_list("Supplier", { fields: ["name"] });
    items = await frappe.db.get_list("Item", {
      fields: ["item_code", "item_name", "description"],
      limit: 1000
    });
  } catch (e) {
    section.innerHTML = `<div class="alert alert-danger">Error loading data. Please try again.</div>`;
    return;
  }

  const supplierOptions = suppliers.map(s =>
    `<option value="${s.name}" ${selectedSupplier === s.name ? "selected" : ""}>${s.name}</option>`
  ).join("");
  const itemOptions = items.map(i =>
    `<option value="${i.item_code}">${i.item_code} - ${i.item_name}${i.description ? `, ${i.description}` : ''}</option>`
  ).join("");

  const isEdit = doc && doc.name;
  const isSubmitted = isEdit && doc.docstatus !== 0;
  const supplierVal = isEdit ? doc.supplier || '' : selectedSupplier;
  const invoiceDateVal = isEdit
    ? (doc.posting_date ? doc.posting_date.split('T')[0] : new Date().toISOString().split('T')[0])
    : new Date().toISOString().split('T')[0];

  let warehouseValue = "Store - Stationary Gondia";
  try {
    const res = await frappe.call({
      method: "sahayog.api.stationery_api.get_user_warehouse",
    });
    if (res.message?.warehouse) warehouseValue = res.message.warehouse;
  } catch (error) {
    // use default
  }
  let displayWarehouse = isEdit && doc.set_warehouse ? doc.set_warehouse : warehouseValue;

  let itemsRows = '';
  if (isEdit && doc.items && doc.items.length) {
    itemsRows = doc.items.map((item, idx) => {
      const found = items.find(i => i.item_code === item.item_code);
      const displayVal = found ? `${found.item_code} : ${found.item_name}` : item.item_code;
      return `
        <tr>
          <td><input type="checkbox" class="row-check" ${isSubmitted ? 'disabled' : ''}></td>
          <td>${idx + 1}</td>
          <td>
            <input type="search" list="product-list" class="form-control product-input"
              value="${displayVal}" placeholder="Search Product"
              ${isSubmitted ? 'readonly disabled' : ''}/>
          </td>
          <td>
            <input type="number" class="form-control qty-input"
              value="${item.qty}" min="0" ${isSubmitted ? 'readonly disabled' : ''}/>
          </td>
          <td>
            <input type="number" class="form-control rate-input"
              value="${item.rate}" min="0" ${isSubmitted ? 'readonly disabled' : ''}/>
          </td>
          <td class="amount">₹ ${(item.qty * item.rate).toFixed(2)}</td>
        </tr>
      `;
    }).join('');
  } else {
    itemsRows = `
      <tr>
        <td><input type="checkbox" class="row-check"></td>
        <td>1</td>
        <td><input type="search" list="product-list" placeholder="Search Product" class="form-control product-input" /></td>
        <td><input type="number" value="0" min="0" class="form-control qty-input" /></td>
        <td><input type="number" value="0" min="0" class="form-control rate-input" /></td>
        <td class="amount">₹ 0.00</td>
      </tr>
    `;
  }

  section.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h4>Stock Inward Entry</h4>
        ${isEdit ? `<div class="mb-2"><strong>Purchase Receipt Number:</strong> ${doc.name}</div>` : ""}
        ${isEdit ? `
        <div class="mb-3">
          <button id="back-to-inward-list" class="btn btn-sm btn-outline-secondary">
            <i class="fa fa-arrow-left"></i> Back
          </button>
        </div>` : ""}
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label for="supplier" class="form-label">Supplier</label>
            <input list="supplier-list" id="supplier" class="form-control"
              placeholder="Search Supplier" value="${supplierVal}" required
              ${isSubmitted ? 'readonly disabled' : ''}/>
            <datalist id="supplier-list">
              <option value="Add New Supplier"></option>
              ${supplierOptions}
            </datalist>
          </div>
          <div class="col-md-3">
            <label for="warehouse" class="form-label">Warehouse</label>
            <input type="text" id="warehouse" class="form-control" value="${displayWarehouse}" readonly />
          </div>
          <div class="col-md-2">
            <label for="invoice_date" class="form-label">Invoice Date</label>
            <input type="date" id="invoice_date" class="form-control"
              value="${invoiceDateVal}" required ${isSubmitted ? 'readonly disabled' : ''}/>
          </div>
        </div>
        <table class="table table-bordered" id="inward-table">
          <thead>
            <tr>
              <th><input type="checkbox" id="select-all" ${isSubmitted ? 'disabled' : ''}></th>
              <th>No.</th>
              <th>Item Code</th>
              <th>Accepted Quantity</th>
              <th>Rate (INR)</th>
              <th>Amount (INR)</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <button id="add-delete-btn" class="btn btn-sm btn-primary" ${isSubmitted ? 'disabled' : ''}>➕ Add</button>
        </div>
        <button id="submit-inward" class="btn btn-success" ${isSubmitted ? 'disabled' : ''}>
          ${isSubmitted ? "View Only" : (isEdit ? "Update Inward Entry" : "Submit Inward Entry")}
        </button>
      </div>
    </div>
    <datalist id="product-list">${itemOptions}</datalist>
  `;

  const tbody = section.querySelector("#inward-table tbody");
  const addDeleteBtn = section.querySelector("#add-delete-btn");
  const selectAllCheckbox = section.querySelector("#select-all");
  const supplierInput = section.querySelector("#supplier");

  supplierInput.addEventListener("change", function () {
    if (this.value === "Add New Supplier" && !isSubmitted) {
      create_supplier_with_callback(newSupplierName => {
        render_inward_form(null, newSupplierName);
      });
      this.value = "";
    }
  });

  if (isEdit) {
    const backBtn = section.querySelector("#back-to-inward-list");
    if (backBtn) backBtn.addEventListener("click", () => render_inward_list());
  }

  function updateSrNumbers() {
    tbody.querySelectorAll("tr").forEach((row, idx) => {
      row.cells[1].innerText = idx + 1;
    });
  }
  function toggleAddDelete() {
    const anyChecked = tbody.querySelectorAll(".row-check:checked").length > 0;
    addDeleteBtn.textContent = anyChecked ? "🗑 Delete" : "➕ Add";
    addDeleteBtn.className = anyChecked ? "btn btn-sm btn-danger" : "btn btn-sm btn-primary";
  }

  addDeleteBtn.addEventListener("click", () => {
    if (isSubmitted) return;
    const anyChecked = tbody.querySelectorAll(".row-check:checked").length > 0;
    if (anyChecked) {
      tbody.querySelectorAll(".row-check:checked").forEach(chk => chk.closest("tr").remove());
      updateSrNumbers();
      toggleAddDelete();
      selectAllCheckbox.checked = false;
    } else {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox" class="row-check"></td>
        <td></td>
        <td><input type="search" list="product-list" class="form-control product-input" placeholder="Search Product"></td>
        <td><input type="number" class="form-control qty-input" value="0" min="0"></td>
        <td><input type="number" class="form-control rate-input" value="0" min="0"></td>
        <td class="amount">₹ 0.00</td>
      `;
      tbody.appendChild(row);
      updateSrNumbers();
    }
  });

  selectAllCheckbox.addEventListener("change", () => {
    if (isSubmitted) return;
    const checked = selectAllCheckbox.checked;
    tbody.querySelectorAll(".row-check").forEach(chk => chk.checked = checked);
    toggleAddDelete();
  });

  tbody.addEventListener("change", e => {
    if (isSubmitted) return;
    if (e.target.classList.contains("row-check")) {
      toggleAddDelete();
      return;
    }
    if (e.target.classList.contains("product-input")) {
      const val = e.target.value.split(" : ")[0];
      const item = items.find(i => i.item_code === val);
      if (item) e.target.value = `${item.item_code} : ${item.item_name}`;
    }
  });

  tbody.addEventListener("input", e => {
    if (isSubmitted) return;
    const row = e.target.closest("tr");
    if (!row) return;
    const qty = parseFloat(row.querySelector(".qty-input").value) || 0;
    const rate = parseFloat(row.querySelector(".rate-input").value) || 0;
    row.querySelector(".amount").textContent = `₹ ${(qty * rate).toFixed(2)}`;
  });

  section.querySelector("#submit-inward").addEventListener("click", async () => {
    if (isSubmitted) return;
    const supplier = supplierInput.value;
    const invoice_date = section.querySelector("#invoice_date").value;
    if (!supplier || !invoice_date) {
      frappe.show_alert({ message: "⚠ Fill all required fields.", indicator: "red" }, 5);
      return;
    }
    const rows = tbody.querySelectorAll("tr");
    if (!rows.length) {
      frappe.show_alert({ message: "⚠ Add at least one product row.", indicator: "red" }, 5);
      return;
    }
    const itemsData = [...rows].map(row => {
      const val = row.querySelector(".product-input").value;
      return {
        item_code: val.split(" : ")[0].trim(),
        qty: parseFloat(row.querySelector(".qty-input").value) || 0,
        rate: parseFloat(row.querySelector(".rate-input").value) || 0
      };
    });
    try {
      if (isEdit) {
        const { message: currentDoc } = await frappe.call({
          method: "frappe.client.get",
          args: { doctype: "Purchase Receipt", name: doc.name }
        });
        Object.assign(currentDoc, {
          supplier,
          posting_date: invoice_date,
          set_warehouse: displayWarehouse,
          items: itemsData
        });
        await frappe.call({ method: "frappe.client.save", args: { doc: currentDoc } });
        frappe.show_alert("✅ Inward Entry updated successfully!");
      } else {
        const { message } = await frappe.call({
          method: "frappe.client.insert",
          args: {
            doc: {
              doctype: "Purchase Receipt",
              supplier,
              posting_date: invoice_date,
              custom_request_for: "Store",
              custom_po_wo: "Purchase Order",
              set_warehouse: displayWarehouse,
              items: itemsData
            }
          }
        });
        frappe.show_alert({
          message: `Purchase Receipt <b>${message.name}</b> created successfully`,
          indicator: "green"
        });
      }
      render_inward_list();
    } catch (err) {
      frappe.show_alert({ message: "❌ Failed to save Inward Entry", indicator: "red" });
    }
  });

  if (!isEdit && !tbody.children.length) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" class="row-check"></td>
      <td>1</td>
      <td><input type="search" list="product-list" class="form-control product-input" placeholder="Search Product"></td>
      <td><input type="number" class="form-control qty-input" value="0" min="0"></td>
      <td><input type="number" class="form-control rate-input" value="0" min="0"></td>
      <td class="amount">₹ 0.00</td>
    `;
    tbody.appendChild(row);
  }
  toggleAddDelete();
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
      <div class="d-flex justify-content-between">
        <button id="back-supplier" class="btn btn-secondary">🔙 Back</button>
        <button id="submit-supplier" class="btn btn-primary">✅ Create Supplier</button>
      </div>
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

  document.getElementById("back-supplier").addEventListener("click", () => {
    document.body.removeChild(modalWrapper);
  });
}
// RENDER INWARD LIST FUNCTION & This function fetches recent inward entries and renders them in a table
async function render_inward_list() {
  setActiveTab(
    document.getElementById("tab-list"),
    document.getElementById("tab-form")
  );
  const section = document.getElementById("inward-section");
  section.innerHTML = "<h4>Loading Inward Records...</h4>";

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  try {
    const res = await fetch("/api/method/sahayog.api.stationery_api.get_inward_list");
    const data = await res.json();
    const receipts = data.message || [];

    const statusStyles = {
      Draft: { text: "Draft", bg: "#FFF4E5", color: "#FF9800" },
      Submitted: { text: "Submitted", bg: "#E8F5E9", color: "#4CAF50" }
    };

    const allRows = receipts.map(r => {
      const style = statusStyles[r.status] || statusStyles.Submitted;
      return `
        <tr class="receipt-row" data-name="${r.name}" style="cursor: pointer;">
          <td>${r.name}</td>
          <td>${r.supplier}</td>
          <td>${formatDate(r.posting_date)}</td>
          <td>${r.total_qty ?? "0"}</td>
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
                  <th>Actual Quantity</th>
                  <th>Status</th>
                </tr>
                <tr class="search-row">
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search PR No" /></th>
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search Supplier" /></th>
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search Date" /></th>
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search Qty" /></th>
                  <th><input type="text" class="form-control form-control-sm" placeholder="Search Status" /></th>
                </tr>
              </thead>
            </table>
            <div id="scroll-area" class="clusterize-scroll">
              <table class="table table-hover table-striped" id="inward-table">
                <tbody id="content-area" class="clusterize-content">
                  <tr><td colspan="5">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    const clusterize = new Clusterize({
      rows: allRows,
      scrollId: 'scroll-area',
      contentId: 'content-area',
      tag: 'tr'
    });

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
              formatDate(r.posting_date).toLowerCase(),
              (r.total_qty ?? "0").toString(),
              style.text.toLowerCase()
            ];
            return filters.every((f, i) => !f || rowData[i].includes(f));
          })
          .map(r => {
            const style = statusStyles[r.status] || statusStyles.Submitted;
            return `
              <tr class="receipt-row" data-name="${r.name}" style="cursor: pointer;">
                <td>${r.name}</td>
                <td>${r.supplier}</td>
                <td>${formatDate(r.posting_date)}</td>
                <td>${r.total_qty ?? "0"}</td>
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

    document.getElementById("refresh-Inward").addEventListener("click", render_inward_list);
    document.getElementById("export-Inward-list").addEventListener("click", function () {
      exportTableToCSV("inward-table", "Inward_Report.csv");
    });

    setTimeout(() => {
      document.querySelectorAll(".receipt-row").forEach(row => {
        row.addEventListener("click", async () => {
          const name = row.dataset.name;
          const doc = await frappe.db.get_doc("Purchase Receipt", name);
          render_inward_form(doc);
        });
      });
    }, 100);

  } catch (error) {
    section.innerHTML = "<p class='text-danger'>❌ Failed to load Inward Records</p>";
    console.error(error);
  }
}
// This function shows purchase receipt details in a popup & It formats the items in a table and displays total quantities and amounts

// RENDER OUTWARD FUNCTION
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

  // Default load with proper tab active style
  setActiveTab(tabList, tabForm);
  render_outward_list();

  tabList.addEventListener("click", () => {
    setActiveTab(tabList, tabForm);
    render_outward_list();
  });

  tabForm.addEventListener("click", () => {
    setActiveTab(tabForm, tabList);
    render_outward_form();
  });
}
// This function fetches recent outward entries and renders them in a table
async function render_outward_list() {
  // Set active tab for outward list view
  setActiveTab(
    document.getElementById("tab-list"),
    document.getElementById("tab-form")
  );
  const section = document.getElementById("outward-section");
  section.innerHTML = "<h4>Loading Outward Records...</h4>";

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  function formatTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  function formatLastModified(modified) {
    if (!modified) return "";
    const d = new Date(modified);
    const now = new Date();
    const diffHrs = (now - d) / (1000 * 60 * 60);
    return diffHrs <= 24 ? formatTime(modified) : formatDate(modified);
  }

  try {
    const res = await fetch("/api/method/sahayog.api.stationery_api.get_outward_entries");
    const { message: outwardEntries = [] } = await res.json();

    const statusStyles = {
      Draft:  { text: "Draft",     bg: "#FFF4E5", color: "#FF9800" },
      Submitted: { text: "Submitted", bg: "#E8F5E9", color: "#4CAF50" }
    };

    // Flat arrays for Clusterize
    let allRows = outwardEntries.map(entry => {
      const statusKey = entry.status === "Draft" ? "Draft" : "Submitted";
      const style = statusStyles[statusKey] || statusStyles.Draft;
      const availableQty = (entry.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
      return `
        <tr class="stock-entry-row" data-name="${entry.name}" style="cursor:pointer;">
          <td>${entry.name}</td>
          <td>${entry.purpose || ""}</td>
          <td>
        <span title="Posted: ${formatDate(entry.posting_date)}">
          ${formatLastModified(entry.modified)}
        </span>
          </td>
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
          text-align:center;">
          ${style.text}
        </span>
          </td>
          <td style="text-align:center;">${availableQty}</td>
        </tr>
      `;
        });

    section.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title mb-3">Recent Outward Entries</h5>
          <div class="mt-3 d-flex justify-content-end" style="gap: 10px;">
            <button id="refresh-Outward" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">Refresh</button>
            <button id="export-Outward-list" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">⬇ Export Excel</button>
          </div>
          <div class="table-responsive" style="border-radius:6px;">
            <table class="table table-hover table-striped table-bordered mb-0" style="margin-bottom:0;">
              <thead>
                <tr>
                  <th style="width:18%;">Stock Entry No</th>
                  <th style="width:18%;">Type</th>
                  <th style="width:18%;">Date/Time</th>
                  <th style="width:20%;">Status</th>
                  <th style="width:12%;">Available Qty</th>
                </tr>
                <tr>
                  <td><input type="text" class="form-control form-control-sm" placeholder="Search Entry No" /></td>
                  <td><input type="text" class="form-control form-control-sm" placeholder="Search Type" /></td>
                  <td><input type="text" class="form-control form-control-sm" placeholder="Search Date/Time" /></td>
                  <td><input type="text" class="form-control form-control-sm" placeholder="Search Status" /></td>
                  <td><input type="text" class="form-control form-control-sm" placeholder="Search Qty" /></td>
                </tr>
              </thead>
            </table>
            <!-- Table body is rendered separately below header for Clusterize -->
            <div id="scrollArea" style="max-height:360px;overflow-y:auto;">
              <table class="table table-hover table-striped table-bordered mb-0" style="table-layout:fixed;" id="outward-table">
                <tbody id="contentArea"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Clusterize binding
    const clusterize = new Clusterize({
      scrollId: "scrollArea",
      contentId: "contentArea",
      rows: allRows
    });

    // Row click (event delegation since rows rendered virtually)
    document.getElementById("scrollArea").addEventListener("click", async (e) => {
      let tr = e.target.closest('tr.stock-entry-row');
      if (!tr) return;
      const name = tr.dataset.name;
      try {
        const doc = await frappe.db.get_doc("Stock Entry", name);
        render_outward_form(doc);
      } catch {
        frappe.msgprint("Failed to load Stock Entry details.");
      }
    });
    document.getElementById("refresh-Outward").addEventListener("click", render_outward_list);
    document.getElementById("export-Outward-list").addEventListener("click", () => {
      exportTableToCSV("outward-table", "Outward_Report.csv");
    });

    // Search box logic
    const filters = Array.from(section.querySelectorAll("thead tr:nth-child(2) input"));
    filters.forEach((input, colIndex) => {
      input.addEventListener("input", () => {
        const filterValues = filters.map(i => i.value.toLowerCase().trim());
        const filteredRows = outwardEntries.map(entry => {
          const statusKey = entry.status === "Draft" ? "Draft" : "Submitted";
          const style = statusStyles[statusKey] || statusStyles.Draft;
          const availableQty = (entry.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);

          // Build filter array
          const cellValues = [
            entry.name,
            entry.purpose || "",
            formatLastModified(entry.modified),
            style.text,
            availableQty + ""
          ].map(val => (val || "").toString().toLowerCase());

          // Filter matching
          let visible = true;
          for (let i = 0; i < filterValues.length; i++) {
            if (filterValues[i] &&
                !cellValues[i].includes(filterValues[i])) {
              visible = false;
              break;
            }
          }
          if (!visible) return null;

          // If match, include row
          return `
            <tr class="stock-entry-row" data-name="${entry.name}" style="cursor:pointer;">
              <td>${entry.name}</td>
              <td>${entry.purpose || ""}</td>
              <td>
                <span title="Posted: ${formatDate(entry.posting_date)}">
                  ${formatLastModified(entry.modified)}
                </span>
              </td>
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
                  text-align:center;">
                  ${style.text}
                </span>
              </td>
              <td style="text-align:center;">${availableQty}</td>
            </tr>
          `;
        }).filter(Boolean);
        clusterize.update(filteredRows);
      });
    });

  } catch (err) {
    section.innerHTML = `<p class="text-danger">❌ Failed to load Outward Records</p>`;
    console.error(err);
  }
}
// This function shows stock entry details in a popup
async function showStockEntryDetails(doc) {
  const statusBadge = doc.docstatus === 0
    ? `<span class="badge bg-primary">Draft</span>`
    : `<span class="badge bg-success">Submitted</span>`;

  // Build rows with qty, rate editable if draft
  const itemsRows = doc.items.map((item, index) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td>${item.item_code}</td>
      <td><input type="number" class="form-control form-control-sm qty-input" id="qty-${index}" value="${item.qty}" min="0" ${doc.docstatus !== 0 ? 'readonly' : ''}></td>
      <td><input type="number" class="form-control form-control-sm rate-input" id="rate-${index}" value="${item.rate}" min="0" ${doc.docstatus !== 0 ? 'readonly' : ''}></td>
      <td id="amount-${index}" class="text-end">₹ ${(item.qty * item.rate).toFixed(2)}</td>
    </tr>
  `).join("");

  const html = `
    <div class="card shadow-sm">
      <div class="card-header d-flex align-items-center">
        <h5 class="mb-0">Stock Entry: ${doc.name}</h5>
        ${statusBadge}
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <button class="btn btn-sm btn-outline-secondary" id="back-to-outward-list">
              <i class="fa fa-arrow-left"></i> Back
            </button>
          </div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label"><strong>Stock Entry Type</strong></label>
            <input type="text" class="form-control" value="${doc.stock_entry_type}" readonly>
          </div>
          <div class="col-md-6">
            <label class="form-label"><strong>Posting Date</strong></label>
            <input type="date" class="form-control" id="posting_date" value="${doc.posting_date.split('T')[0]}" ${doc.docstatus !== 0 ? 'readonly' : ''}>
          </div>
        </div>

        <table class="table table-bordered table-sm align-middle">
          <thead class="table-light">
            <tr>
              <th class="text-center" style="width: 50px;">No.</th>
              <th>Item Code</th>
              <th style="width: 150px;">Quantity</th>
              <th style="width: 150px;">Rate (INR)</th>
              <th class="text-end" style="width: 150px;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        ${doc.docstatus === 0 ? `
          <div class="text-end mt-3">
            <button class="btn btn-success" id="submit-stockentry-btn">
              <i class="fa fa-check"></i> Submit Stock Entry
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  const section = document.getElementById("outward-section");
  section.innerHTML = html;

  setTimeout(() => {
    const backBtn = document.getElementById("back-to-outward-list");
    if (backBtn) backBtn.addEventListener("click", () => {
      render_outward_list();
    });
  }, 0);

  if (doc.docstatus === 0) {
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

    document.getElementById("submit-stockentry-btn").addEventListener("click", async () => {
      try {
        const posting_date = document.getElementById("posting_date").value;

        // Fetch fresh copy of Stock Entry doc for update
        const currentDocResp = await frappe.call({
          method: "frappe.client.get",
          args: {
            doctype: "Stock Entry",
            name: doc.name
          }
        });
        const currentDoc = currentDocResp.message;

        // Prepare updated items with mandatory s_warehouse (and t_warehouse if needed)
        const updatedItems = [];
        currentDoc.items.forEach((item, index) => {
          const qty = parseFloat(document.getElementById(`qty-${index}`).value) || 0;
          const rate = parseFloat(document.getElementById(`rate-${index}`).value) || 0;
          updatedItems.push({
            item_code: item.item_code,
            qty: qty,
            rate: rate,
            s_warehouse: item.s_warehouse || "Your Source Warehouse", // Replace with your value or doc default
            t_warehouse: item.t_warehouse || "Your Target Warehouse"  // Replace with your value or doc default, or remove if not required
          });
        });

        if (!updatedItems.some(i => i.qty > 0)) {
          frappe.msgprint("Please add at least one valid item before submitting.");
          return;
        }

        currentDoc.items = updatedItems;
        currentDoc.posting_date = posting_date;

        // Save updated Stock Entry doc (still Draft)
        await frappe.call({
          method: "frappe.client.save",
          args: { doc: currentDoc }
        });

        frappe.msgprint("✅ Stock Entry updated successfully!");
        render_outward_list(); // Optionally, refresh your list or view

      } catch (err) {
        frappe.msgprint("❌ Error submitting stock entry.");
        console.error(err);
      }
    });
  }
}
//show outward form  function 
async function render_outward_form(doc = null) {
  setActiveTab(
    document.getElementById("tab-form"),
    document.getElementById("tab-list")
  );

  const section = document.getElementById("outward-section");
  section.innerHTML = "<h4>Loading Outward Form...</h4>";

  let defaultSourceWarehouse = "Store - Stationary Gondia";
  try {
    const warehouseRes = await fetch("/api/method/sahayog.api.stationery_api.get_user_warehouse");
    const warehouseData = await warehouseRes.json();
    if (warehouseData.message && warehouseData.message.warehouse) {
      defaultSourceWarehouse = warehouseData.message.warehouse;
    }
  } catch (err) {
    console.error("Failed to fetch default source warehouse:", err);
  }

  const res = await fetch("/api/method/sahayog.api.stationery_api.get_stock_entry_items");
  const data = await res.json();
  const items = Array.isArray(data.message) ? data.message : [];

  const whRes = await fetch("/api/resource/Warehouse?fields=[\"name\"]");
  const whData = await whRes.json();
  const warehouses = (whData.data || []).map(w => w.name);

  const rateLookup = {};
  const qtyLookup = {};
  items.forEach(i => {
    rateLookup[i.item_code] = i.basic_rate;
    qtyLookup[i.item_code] = i.qty;
  });

  const itemOptions = items.map(i =>
    `<option value="${i.item_code}">${i.item_code} - ${i.item_name}</option>`
  ).join("");
  const datalistHTML = `<datalist id="product-list">${itemOptions}</datalist>`;
  if (!document.querySelector("#product-list")) {
    document.body.insertAdjacentHTML("beforeend", datalistHTML);
  }

  const whOptions = warehouses.map(w => `<option value="${w}">${w}</option>`).join("");
  const invoiceDateValue = doc
    ? (doc.posting_date ? doc.posting_date.split('T')[0] : "")
    : new Date().toISOString().split('T')[0];
  const fromWarehouseValue = doc ? (doc.from_warehouse || defaultSourceWarehouse) : defaultSourceWarehouse;
  const toWarehouseValue = doc ? (doc.to_warehouse || (warehouses[1] || "")) : (warehouses[1] || "");

  const stockEntryInfoHTML = doc ? `
    <div class="mb-3">
      <h5>Stock Entry No: <strong>${doc.name}</strong></h5>
      <h6>Status: <span class="badge bg-${doc.docstatus === 0 ? 'warning text-dark' : 'success'}">
        ${doc.docstatus === 0 ? 'Draft' : 'Submitted'}
      </span></h6>
    </div>` : "";

  section.innerHTML = `
    <style>
      .dot-red {
        width: 14px;
        height: 14px;
        background: #eb2677;
        border-radius: 50%;
        box-shadow: 0 0 7px 2px #eb2677cc;
        display: inline-block;
      }
      .dot-green {
        width: 18px;
        height: 18px;
        background: #3cc291;
        border-radius: 50%;
        box-shadow: 0 0 10px 3px #3cc29199;
        display: inline-block;
      }
    </style>

    <div class="card">
      <div class="card-body">
        <h4>Stock Outward Entry</h4>
        ${stockEntryInfoHTML}
        <div class="row g-3 mb-3 align-items-center" style="flex-wrap: nowrap;">
          <div class="col-md-2">
            <label class="form-label">Stock Entry Type</label>
            <input type="text" class="form-control" value="Material Transfer" readonly />
          </div>
          <div class="col-md-2">
            <label for="invoice_date" class="form-label">Invoice Date</label>
            <input type="date" class="form-control" id="invoice_date"
              value="${invoiceDateValue}" ${doc && doc.docstatus !== 0 ? 'readonly' : ''} required />
          </div>
          <div class="col-md-8 d-flex align-items-center" style="gap: 10px;">
            <div class="d-flex flex-column align-items-center">
              <span class="dot-red"></span>
              <label for="from-warehouse" style="font-weight: 600; margin-top: 4px;">Source Warehouse</label>
              <select id="from-warehouse" class="form-control form-control-sm" style="min-width:180px;"
                ${doc && doc.docstatus !== 0 ? "disabled" : ""}>
                ${whOptions}
              </select>
            </div>

            <div style="position: relative; width: 90px; height: 32px; display: flex; align-items: center; justify-content: center;">
<svg width="90" height="32" xmlns="http://www.w3.org/2000/svg">
  <line x1="10" y1="16" x2="80" y2="16" stroke="#222" stroke-width="2" stroke-dasharray="6,7" />
  ${
    (doc && doc.docstatus !== 0)
      ? `<circle cx="80" cy="16" r="5" fill="#2aaaff" />`
      : `<circle r="5" fill="#2aaaff">
           <animateMotion dur="1.7s" repeatCount="indefinite"
             keyPoints="0;1" keyTimes="0;1" fill="freeze"
             path="M10,16 L80,16" />
           <animate attributeName="opacity" values="1;.3;1" dur="1.7s" repeatCount="indefinite" />
         </circle>`
  }
</svg>

            </div>

            <div class="d-flex flex-column align-items-center">
              <span class="dot-green"></span>
              <label for="to-warehouse" style="font-weight: 600; margin-top: 4px;">Target Warehouse</label>
              <select id="to-warehouse" class="form-control form-control-sm" style="min-width:180px;"
                ${doc && doc.docstatus !== 0 ? "disabled" : ""}>
                ${whOptions}
              </select>
            </div>
          </div>
        </div>

        <div style="overflow-x:auto; width: 100%;">
          <table class="table table-bordered" id="outward-table" style="min-width:900px;">
            <thead>
              <tr>
                <th><input type="checkbox" id="select-all"></th>
                <th>No.</th>
                <th>Item Code</th>
                <th>Quantity</th>
                <th>Available Quantity</th>
                <th>Rate (INR)</th>
                <th>Amount (INR)</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-2">
          <button id="add-delete-btn" class="btn btn-sm btn-primary" ${doc && doc.docstatus !== 0 ? 'disabled' : ''}>➕ Add</button>
        </div>

        <div class="mt-3">
          <button id="submit-outward" class="btn btn-success" ${doc && doc.docstatus !== 0 ? 'disabled' : ''}>
            ${doc ? (doc.docstatus === 0 ? 'Update Outward Entry' : 'View Only') : 'Submit Outward Entry'}
          </button>
        </div>
      </div>
    </div>
  `;

  // Set dropdown values
  document.getElementById("from-warehouse").value = fromWarehouseValue;
  document.getElementById("to-warehouse").value = toWarehouseValue;

  const tbody = document.querySelector("#outward-table tbody");
  const addDeleteBtn = document.getElementById("add-delete-btn");

  function addRow(itemObj = null) {
    const itemCodeValue = itemObj ? itemObj.item_code : "";
    const qtyValue = itemObj ? itemObj.qty : 0;
    const rateValue = itemObj ? (itemObj.rate ?? itemObj.basic_rate ?? 0) : 0; // ensure rate displays properly
    const availQty = itemCodeValue && qtyLookup[itemCodeValue] != null ? qtyLookup[itemCodeValue] : 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" class="row-check" ${doc && doc.docstatus !== 0 ? 'disabled' : ''}></td>
      <td></td>
      <td>
        <input type="search" list="product-list" class="form-control product-input"
          placeholder="Search Product" style="min-width:220px;"
          value="${itemCodeValue ? itemCodeValue + ' - ' + (items.find(i => i.item_code === itemCodeValue)?.item_name || '') : ''}"
          ${doc && doc.docstatus !== 0 ? 'readonly' : ''}
        >
      </td>
      <td>
        <input type="number" class="form-control qty-input" value="${qtyValue}" min="0" ${doc && doc.docstatus !== 0 ? 'readonly' : ''}/>
      </td>
      <td class="available-qty text-end">${availQty}</td>
      <td>
        <input type="number" class="form-control rate-input" value="${rateValue}" min="0" ${doc && doc.docstatus !== 0 ? 'readonly' : ''} />
      </td>
      <td class="amount">₹ ${(qtyValue * rateValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    `;
    tbody.appendChild(row);
    updateSrNumbers();
  }

  function updateSrNumbers() {
    tbody.querySelectorAll("tr").forEach((row, idx) => {
      row.cells[1].innerText = idx + 1;
    });
  }

  function toggleAddDelete() {
    const anyChecked = tbody.querySelectorAll(".row-check:checked").length > 0;
    addDeleteBtn.textContent = anyChecked ? "🗑 Delete" : "➕ Add";
    addDeleteBtn.className = anyChecked ? "btn btn-sm btn-danger" : "btn btn-sm btn-primary";
  }

  if (doc && Array.isArray(doc.items) && doc.items.length > 0) {
    doc.items.forEach(item => addRow(item));
  } else {
    addRow();
  }

  document.getElementById("select-all").addEventListener("change", function () {
    tbody.querySelectorAll(".row-check").forEach(c => c.checked = this.checked);
    toggleAddDelete();
  });

  tbody.addEventListener("change", (e) => {
    if (e.target.classList.contains("row-check")) {
      toggleAddDelete();
    }
    if (e.target.classList.contains("product-input") && !(doc && doc.docstatus !== 0)) {
      let userInput = e.target.value;
      const matched = items.find(i => userInput === i.item_code || userInput === `${i.item_code} - ${i.item_name}`);
      if (matched) {
        e.target.value = `${matched.item_code} - ${matched.item_name}`;
        e.target.title = e.target.value;
        const row = e.target.closest("tr");
        row.querySelector(".rate-input").value = rateLookup[matched.item_code] ?? 0;
        row.querySelector(".qty-input").value = "0";
        row.querySelector(".amount").textContent = "₹ 0.00";
        row.querySelector(".available-qty").textContent = qtyLookup[matched.item_code] ?? 0;
      }
    }
  });

  addDeleteBtn.addEventListener("click", () => {
    if (addDeleteBtn.textContent.includes("Delete")) {
      tbody.querySelectorAll(".row-check:checked").forEach(chk => chk.closest("tr").remove());
      updateSrNumbers();
      toggleAddDelete();
    } else {
      addRow();
    }
  });

  tbody.addEventListener("input", function (e) {
    const row = e.target.closest("tr");
    if (!row) return;
    const qty = parseFloat(row.querySelector(".qty-input").value) || 0;
    const rate = parseFloat(row.querySelector(".rate-input").value) || 0;
    row.querySelector(".amount").textContent = `₹ ${(qty * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  });

  document.getElementById("submit-outward").addEventListener("click", async () => {
    if (doc && doc.docstatus !== 0) {
      frappe.show_alert({ message: "This stock entry is submitted and cannot be edited.", indicator: "warning" }, 5);
      return;
    }
    const invoice_date = document.getElementById("invoice_date").value;
    const from_warehouse = document.getElementById("from-warehouse").value;
    const to_warehouse = document.getElementById("to-warehouse").value;
    const rows = tbody.querySelectorAll("tr");
    if (rows.length === 0 || !invoice_date) {
      frappe.show_alert({ message: "⚠ Please fill all required fields.", indicator: "red" }, 5);
      return;
    }
    let invalid = false;
    rows.forEach(row => {
      const prodVal = row.querySelector(".product-input").value;
      const itemCode = prodVal.split(" - ")[0];
      const qty = parseFloat(row.querySelector(".qty-input").value) || 0;
      const availQty = qtyLookup[itemCode] != null ? qtyLookup[itemCode] : 0;
      if (qty > availQty) {
        invalid = true;
        row.querySelector(".qty-input").classList.add("is-invalid");
      } else {
        row.querySelector(".qty-input").classList.remove("is-invalid");
      }
    });
    if (invalid) {
      frappe.show_alert({
        message: "❌ Accepted Quantity cannot exceed Available Quantity for any item.",
        indicator: "red"
      }, 7);
      return;
    }
    const itemsData = Array.from(rows).map(row => {
      const prodVal = row.querySelector(".product-input").value;
      const itemCode = prodVal.split(" - ")[0];
      return {
        item_code: itemCode,
        qty: parseFloat(row.querySelector(".qty-input").value) || 0,
        rate: parseFloat(row.querySelector(".rate-input").value) || 0
      };
    });
    frappe.show_alert({
      message: doc ? "Updating outward entry..." : "Submitting outward entry...",
      indicator: "blue"
    }, 5);
    const payloadObj = {
      doctype: "Stock Entry",
      posting_date: invoice_date,
      from_warehouse,
      to_warehouse,
      stock_entry_type: "Material Transfer",
      items: itemsData
    };
    if (doc) {
      try {
        await update_outward(payloadObj, doc.name);
        frappe.show_alert("✅ Stock Entry updated successfully!", "green", 5);
        render_outward_list();
      } catch (err) {
        frappe.msgprint("❌ Failed to update Stock Entry.");
        console.error(err);
      }
    } else {
      try {
        await submit_outward(payloadObj);
        frappe.show_alert("✅ Stock Entry created successfully!", "green", 5);
        render_outward_form();
      } catch (err) {
        frappe.msgprint("❌ Failed to create Stock Entry.");
        console.error(err);
      }
    }
  });
}
// This function submits the outward entry by creating a Stock Entry document with the provided items
async function submit_outward(payloadObj) {
  if (!payloadObj.items || payloadObj.items.length === 0) {
    frappe.msgprint("Please add at least one valid item before submitting.");
    return;
  }
  if (!payloadObj.from_warehouse || !payloadObj.to_warehouse || !payloadObj.posting_date) {
    frappe.msgprint("Please fill Source Warehouse, Target Warehouse and Invoice Date.");
    return;
  }

  // Ensure doctype property is present
  payloadObj.doctype = "Stock Entry";

  try {
    frappe.show_alert("Submitting outward entry...", 5);

    // Pass doc as an object, NOT a string!
    const response = await frappe.call({
      method: "frappe.client.insert",
      args: { doc: payloadObj }
    });

    frappe.show_alert(`✅ Outward Entry created successfully: ${response.message.name}`);

  } catch (error) {
    console.error("Error creating Stock Entry:", error);
    frappe.msgprint("❌ Failed to submit outward entry.");
  }
}
// Function to update existing outward entry
async function update_outward(payloadObj, docName) {
  try {
    // Fetch the current Stock Entry document
    const currentDocResp = await frappe.call({
      method: "frappe.client.get",
      args: {
        doctype: "Stock Entry",
        name: docName
      }
    });
    const currentDoc = currentDocResp.message;

    if (!currentDoc) {
      frappe.msgprint("Document not found.");
      return;
    }

    // Update document fields with new data
    currentDoc.posting_date = payloadObj.posting_date;
    currentDoc.from_warehouse = payloadObj.from_warehouse;
    currentDoc.to_warehouse = payloadObj.to_warehouse;

    // Update items (assuming payloadObj.items is an array of items)
    currentDoc.items = payloadObj.items.map(item => ({
      item_code: item.item_code,
      qty: item.qty,
      rate: item.rate
    }));

    // Save the updated document
    await frappe.call({
      method: "frappe.client.save",
      args: { doc: currentDoc }
    });

    frappe.show_alert("✅ Stock Entry updated successfully!");
  } catch (error) {
    frappe.msgprint("❌ Failed to update Stock Entry.");
    console.error(error);
    throw error;
  }
}
// This function initializes the asset movements page with tabs for asset valuation, asset movement list, and asset movement form
async function asset_movements() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div style="border-bottom: 1px solid #ccc; display: flex; gap: 40px; padding-bottom: 8px;">
      <span id="tab-list" style="cursor: pointer; padding-bottom: 4px; font-weight: bold; border-bottom: 3px solid black;">
        📄 Asset
      </span>
      <span id="tab-asset-movement" style="cursor: pointer; padding-bottom: 4px; color: #555;">
        📄 Asset Movement
      </span>
      <span id="tab-form" style="cursor: pointer; padding-bottom: 4px; color: #555;">
        ➕ Asset Movement Form
      </span>
      <span id="tab-form-create" style="cursor: pointer; padding-bottom: 4px; color: #555;">
        ➕ Asset creation
      </span>      
    </div>
    <div id="section-area" class="pt-3"></div>
  `;

  const tabList = document.getElementById("tab-list");
  const tabAssetMovement = document.getElementById("tab-asset-movement");
  const tabForm = document.getElementById("tab-form");
  const tabFormCreate = document.getElementById("tab-form-create");

  // Default load
  render_asset_valuation();

  // Tab click events
  tabList.addEventListener("click", () => {
    setActiveTab(tabList, [tabAssetMovement, tabForm, tabFormCreate]);
    render_asset_valuation();
  });

  tabAssetMovement.addEventListener("click", () => {
    setActiveTab(tabAssetMovement, [tabList, tabForm, tabFormCreate]);
    asset_movment_list();
  });

  tabForm.addEventListener("click", () => {
    setActiveTab(tabForm, [tabList, tabAssetMovement, tabFormCreate]);
    render_asset_movement_form();
  });

  tabFormCreate.addEventListener("click", () => {
    setActiveTab(tabFormCreate, [tabList, tabAssetMovement, tabForm]);
    render_asset_creation();  
  });
  function setActiveTab(activeTab, otherTabs) {
    // Active tab styles
    activeTab.style.fontWeight = "bold";
    activeTab.style.borderBottom = "3px solid black";
    activeTab.style.color = "black";

    // Inactive tabs styles
    otherTabs.forEach(tab => {
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
                      <th>Purchase Date</th>
                      <th>Available for Use Date</th>
                      <th>Gross Purchase Amount</th>
                    </tr>
                    <tr class="search-row">
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search Item Code"></th>
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search Asset Name"></th>
                      <th><input type="text" class="form-control form-control-sm" placeholder="Search Location"></th>
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
// This function fetches asset valuation data and renders it in a table
async function asset_movment_list() {
  const section = document.getElementById("section-area");
  section.innerHTML = `<p class="text-gray-500">Loading asset movements...</p>`;

  try {
    const res = await fetch(
      "/api/method/sahayog.api.stationery_api.get_asset_movements",
      { method: "GET" }
    );
    const data = await res.json();

    if (!data.message || data.message.length === 0) {
      section.innerHTML = `<p class="text-gray-500">No asset movement records found.</p>`;
      return;
    }

    let html = `<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">`;
    data.message.forEach(item => {
      html += `
        <div class="border rounded-lg p-4 shadow hover:shadow-lg transition bg-white">
          <h3 class="font-semibold text-lg text-gray-800 mb-1">${item.asset || "Unknown Asset"}</h3>
          <p class="text-sm text-gray-600">Company: ${item.company || "-"}</p>
          <p class="text-sm text-gray-600">Purpose: ${item.purpose || "-"}</p>
          <p class="text-sm text-gray-500 mt-2">Date: ${new Date(item.transaction_date).toLocaleString() || "-"}</p>
        </div>
      `;
    });
    html += `</div>`;

    section.innerHTML = html;
  } catch (error) {
    console.error("Error loading asset movements:", error);
    section.innerHTML = `<p class="text-red-500">Failed to load asset movement records.</p>`;
  }
}
// This function renders the asset movement form with options for purpose, assets, and locations
async function render_asset_movement_form(selectedPurpose = "") {
  const section = document.getElementById("section-area");

  // You may fetch these dynamically or set statically as needed
  const companyName = "Sahayog Multistate Credit Co-op Society Ltd"; // adjust if needed
  const currentDate = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  const pad = n => n.toString().padStart(2, "0");
  const dateString = `${pad(currentDate.getDate())}-${pad(currentDate.getMonth()+1)}-${currentDate.getFullYear()} ${pad(currentDate.getHours())}:${pad(currentDate.getMinutes())}:${pad(currentDate.getSeconds())}`;

  // Fetch assets, employees, and locations
  const purposes = ["Transfer", "Repair", "Sale", "Disposal"];

  const assets = await frappe.db.get_list("Asset", {
    fields: ["name", "asset_name", "item_code", "location"], // assuming 'location' field exists here
    limit: 1000
  });

  const employees = await frappe.db.get_list("Employee", {
    fields: ["name", "employee_name"],
    limit: 500
  });

  const locations = await frappe.db.get_list("Location", {
    fields: ["name"],
    limit: 500
  });

  // Build asset → location lookup for auto-fill
  const assetLocationLookup = {};
  assets.forEach(a => {
    assetLocationLookup[a.name] = a.location || "";
  });

  // Build options for select and datalist
  const purposeOptions = purposes.map(p =>
    `<option value="${p}" ${selectedPurpose === p ? "selected" : ""}>${p}</option>`
  ).join("");

  const assetOptions = assets.map(a =>
    `<option value="${a.name}">${a.name} - ${a.asset_name || ""} (${a.item_code || ""})</option>`
  ).join("");

  const employeeOptions = employees.map(emp =>
    `<option value="${emp.name}">${emp.employee_name || emp.name}</option>`
  ).join("");

  const locationOptions = locations.map(l =>
    `<option value="${l.name}">${l.name}</option>`
  ).join("");

  section.innerHTML = `
    <div class="card">
      <div class="card-body">
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">Company <span class="text-danger">*</span></label>
            <div class="form-control" readonly style="background:#f9f9fa; font-weight:600">${companyName}</div>
          </div>
          <div class="col-md-6">
            <label class="form-label">Transaction Date <span class="text-danger">*</span></label>
            <div class="form-control" readonly style="background:#f9f9fa; font-weight:600">${dateString}</div>
            <div style="font-size:10px; color:#888">${tz}</div>
          </div>
          <div class="col-md-4 mt-2">
            <label for="purpose" class="form-label">Purpose <span class="text-danger">*</span></label>
            <select class="form-control" id="purpose" required>
              <option value="">Select Purpose</option>
              ${purposeOptions}
            </select>
          </div>
        </div>

        <div style="overflow-x:auto; width:100%;">
          <table class="table table-bordered" id="asset-movement-table">
            <thead>
              <tr>
                <th><input type="checkbox" id="select-all"></th>
                <th>No.</th>
                <th>Asset</th>
                <th>Source Location</th>
                <th>From Employee</th>
                <th>Target Location</th>
                <th>To Employee</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-2">
          <button id="add-delete-btn" class="btn btn-sm btn-primary">➕ Add</button>
        </div>

        <div class="mt-3">
          <button id="submit-asset-movement" class="btn btn-success">Submit Asset Movement</button>
        </div>
      </div>
    </div>

    <datalist id="asset-list">${assetOptions}</datalist>
    <datalist id="location-list">${locationOptions}</datalist>
    <datalist id="employee-list">${employeeOptions}</datalist>
  `;

  const tbody = document.querySelector("#asset-movement-table tbody");
  const addDeleteBtn = document.getElementById("add-delete-btn");

  function addRow() {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" class="row-check"></td>
      <td></td>
      <td><input type="search" list="asset-list" class="form-control asset-input" placeholder="Search Asset" required /></td>
      <td><input type="search" list="location-list" class="form-control from-location" placeholder="Source Location" /></td>
      <td><input type="search" list="employee-list" class="form-control employee-from" placeholder="From Employee" /></td>
      <td><input type="search" list="location-list" class="form-control to-location" placeholder="Target Location" /></td>
      <td><input type="search" list="employee-list" class="form-control employee-to" placeholder="To Employee" /></td>
      <td><input type="number" class="form-control quantity" value="0" min="0" required /></td>
    `;
    tbody.appendChild(row);
    updateSrNumbers();
  }

  function updateSrNumbers() {
    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row, idx) => {
      row.cells[1].innerText = idx + 1;
    });
  }

  function toggleAddDelete() {
    const anyChecked = document.querySelectorAll(".row-check:checked").length > 0;
    addDeleteBtn.textContent = anyChecked ? "🗑 Delete" : "➕ Add";
    addDeleteBtn.className = anyChecked ? "btn btn-sm btn-danger" : "btn btn-sm btn-primary";
  }

  addDeleteBtn.addEventListener("click", () => {
    if (addDeleteBtn.textContent.includes("Delete")) {
      document.querySelectorAll(".row-check:checked").forEach(chk => chk.closest("tr").remove());
      updateSrNumbers();
      toggleAddDelete();
    } else {
      addRow();
    }
  });

  document.getElementById("select-all").addEventListener("change", function () {
    document.querySelectorAll(".row-check").forEach(chk => chk.checked = this.checked);
    toggleAddDelete();
  });

  tbody.addEventListener("change", e => {
    if (e.target.classList.contains("row-check")) {
      toggleAddDelete();
    }
    if (e.target.classList.contains("asset-input")) {
      const assetVal = e.target.value.trim();
      const row = e.target.closest("tr");
      if (assetLocationLookup[assetVal]) {
        row.querySelector(".from-location").value = assetLocationLookup[assetVal];
      }
    }
  });

  addRow();

  document.getElementById("submit-asset-movement").addEventListener("click", async () => {
    const purpose = document.getElementById("purpose").value;

    if (!purpose) {
      frappe.show_alert({ message: "⚠ Please select purpose.", indicator: "red" }, 5);
      return;
    }

    const rows = tbody.querySelectorAll("tr");
    if (rows.length === 0) {
      frappe.show_alert({ message: "⚠ Please add at least one asset row.", indicator: "red" }, 5);
      return;
    }

    const assetData = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const asset = row.querySelector(".asset-input").value.trim();
      const source_location = row.querySelector(".from-location").value.trim();
      const from_employee = row.querySelector(".employee-from").value.trim();
      const target_location = row.querySelector(".to-location").value.trim();
      let to_employee = row.querySelector(".employee-to").value.trim();
      const quantityStr = row.querySelector(".quantity").value.trim();
      const quantity = parseInt(quantityStr, 10);

      if (!asset) {
        frappe.show_alert({ message: `⚠ Row #${i + 1}: Asset is required.`, indicator: "red" }, 5);
        return;
      }

      if (!(source_location || from_employee)) {
        frappe.show_alert({ message: `⚠ Row #${i + 1}: Please fill Source Location or From Employee.`, indicator: "red" }, 5);
        return;
      }

      // For Transfer purpose, target_location is mandatory and to_employee disallowed
      if (purpose === "Transfer") {
        if (!target_location) {
          frappe.show_alert({ message: `⚠ Row #${i + 1}: Please enter Target Location for Transfer.`, indicator: "red" }, 5);
          return;
        }
        to_employee = null; // disallow to_employee for Transfer
      } else {
        // For other purposes, target_location or to_employee required
        if (!(target_location || to_employee)) {
          frappe.show_alert({ message: `⚠ Row #${i + 1}: Please fill Target Location or To Employee.`, indicator: "red" }, 5);
          return;
        }
      }

      if (!quantity || quantity <= 0) {
        frappe.show_alert({ message: `⚠ Row #${i + 1}: Quantity must be greater than zero.`, indicator: "red" }, 5);
        return;
      }

      assetData.push({
        asset: asset,
        source_location: source_location || null,
        from_employee: from_employee || null,
        target_location: target_location || null,
        to_employee: to_employee || null,
        quantity: quantity
      });
    }

    try {
      const res = await frappe.call({
        method: "frappe.client.insert",
        args: {
          doc: {
            doctype: "Asset Movement",
            company: companyName,
            transaction_date: currentDate.toISOString().slice(0, 19).replace("T", " "),
            purpose: purpose,
            assets: assetData
          }
        }
      });

      frappe.show_alert({ message: `Asset Movement <b>${res.message.name}</b> created successfully`, indicator: "green" }, 5);
      render_asset_movement_form(purpose);

    } catch (err) {
      console.error(err);
      frappe.show_alert({ message: "❌ Failed to submit Asset Movement", indicator: "red" }, 5);
    }
  });
}
// Render Asset Creation Form
async function render_asset_creation() {
  const container = document.getElementById("section-area");

  // Fetch all items and locations for the datalists
  const [items, locations] = await Promise.all([
    frappe.db.get_list("Item", {
      fields: ["item_code", "item_name"],
      limit: 1000
    }),
    frappe.db.get_list("Location", {
      fields: ["name"],
      limit: 500
    })
  ]);

  // Build options for item_code datalist
  const itemOptions = items.map(i =>
    `<option value="${i.item_code}">${i.item_code} - ${i.item_name}</option>`
  ).join("");

  // Build options for location datalist
  const locationOptions = locations.map(l =>
    `<option value="${l.name}"></option>`
  ).join("");

  container.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h4>Asset Creation</h4>

        <div class="row g-3 mb-3">
          <div class="col-md-3">
            <label for="item_code" class="form-label">Item Code</label>
            <input type="text" id="item_code" list="item-code-list" class="form-control" placeholder="Search Item Code" required>
            <datalist id="item-code-list">${itemOptions}</datalist>
          </div>

          <div class="col-md-3">
            <label for="asset_name" class="form-label">Asset Name</label>
            <input type="text" id="asset_name" class="form-control" placeholder="Enter Asset Name" required>
          </div>

          <div class="col-md-3">
            <label for="location" class="form-label">Location</label>
            <input type="text" id="location" list="location-list" class="form-control" placeholder="Enter Location" required>
            <datalist id="location-list">${locationOptions}</datalist>
          </div>

          <div class="col-md-3">
            <label for="purchase_date" class="form-label">Purchase Date</label>
            <input type="date" id="purchase_date" class="form-control" required>
          </div>
        </div>

        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="is_composite">
          <label class="form-check-label" for="is_composite">Is Composite Asset</label>
        </div>

        <div class="mt-3">
          <button id="submit_asset_btn" class="btn btn-success">Submit Asset</button>
        </div>
      </div>
    </div>
  `;

  // Create item_code → item_name map for autofill
  const itemMap = {};
  items.forEach(i => {
    itemMap[i.item_code] = i.item_name;
  });

  const itemCodeInput = document.getElementById("item_code");
  const assetNameInput = document.getElementById("asset_name");

  // Autofill asset name when item_code changes
  itemCodeInput.addEventListener("input", function () {
    const code = this.value.trim();
    if (itemMap[code]) {
      assetNameInput.value = itemMap[code];
    } else {
      assetNameInput.value = "";
    }
  });

  // Submission code remains unchanged
  document.getElementById("submit_asset_btn").addEventListener("click", async () => {
    const assetData = {
      item_code: itemCodeInput.value.trim(),
      asset_name: assetNameInput.value.trim(),
      location: document.getElementById("location").value.trim(),
      purchase_date: document.getElementById("purchase_date").value,
      is_composite: document.getElementById("is_composite").checked ? 1 : 0
    };

    if (!assetData.item_code || !assetData.asset_name || !assetData.location || !assetData.purchase_date) {
      frappe.show_alert(" Please fill all mandatory fields.");
      return;
    }

    try {
      await frappe.call({
        method: "sahayog.api.stationery_api.create_asset",
        args: { asset: assetData },
        callback: function (r) {
          if (r.message && r.message.name) {
            frappe.show_alert("✅ Asset Created Successfully! Asset ID: " + r.message.name);
            // Optionally clear the form here
          }
        },
        error: function (err) {
          frappe.show_alert("❌ Error while creating asset.");
          console.error(err);
        }
      });
    } catch (err) {
      console.error(err);
      frappe.show_alert("❌ Unexpected error while creating asset.");
    }
  });
}

};