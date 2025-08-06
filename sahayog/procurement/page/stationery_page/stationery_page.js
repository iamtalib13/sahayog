frappe.pages['stationery-page'].on_page_load = function(wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Stationery Management',
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
        <div id="content" class="p-3 bg-white shadow-sm border rounded">
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

  function setActiveTab(active, inactive) {
    active.style.fontWeight = "bold";
    active.style.borderBottom = "3px solid black";
    active.style.color = "black";

    inactive.style.fontWeight = "normal";
    inactive.style.borderBottom = "none";
    inactive.style.color = "#555";
  }
}
// Show stock balance on button click
async function render_stock_balance() {
  const section = document.getElementById("section-area");
  section.innerHTML = "<h4>Loading Stock Balance...</h4>";

  // Get stock balance from Bin
  const stock_data = await frappe.db.get_list("Bin", {
    fields: ["item_code", "warehouse", "actual_qty", "valuation_rate"],
    limit: 100
  });

  // Get item details
  const items = await frappe.db.get_list("Item", {
    fields: ["name", "item_name", "description", "stock_uom"],
    limit: 1000
  });

  const itemMap = Object.fromEntries(items.map(i => [i.name, i]));

  const rows = stock_data.map((bin, index) => {
    const item = itemMap[bin.item_code] || {};
    return `
      <tr class="stock-row" data-item-code="${bin.item_code}">
        <td>${index + 1}</td>
        <td>${bin.item_code}</td>
        <td>${item.item_name || "-"}</td>
        <td>${bin.warehouse}</td>
        <td>${bin.actual_qty}</td>
        <td>${bin.valuation_rate || "-"}</td>
      </tr>
    `;
  }).join("");

  section.innerHTML = `
    <div class="card mt-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title">Stock Balance Report</h5>
          <button id="refresh-stock" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">Refresh</button>
        </div>
        <table class="table table-bordered table-hover table-striped" id="stock-table">
          <thead>
            <tr>
              <th>Sr.no</th>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Warehouse</th>
              <th>Actual Qty</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <!-- Export Button at Bottom Right -->
        <div class="d-flex justify-content-end mt-3">
          <button id="export-stock" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">⬇ Export CSV</button>
        </div>
      </div>
    </div>
  `;

  // Refresh button handler
  document.getElementById("refresh-stock").addEventListener("click", render_stock_balance);

  // Export button handler
  document.getElementById("export-stock").addEventListener("click", function () {
    exportTableToCSV("stock_balance.csv");
  });

  // Row click to show item details
  document.querySelectorAll(".stock-row").forEach(row => {
    row.addEventListener("click", () => {
      const code = row.dataset.itemCode;
      const item = itemMap[code];

      if (item) {
        showItemDetails(item);
      } else {
        alert("Item details not found.");
      }
    });
  });
}
// Helper function: Export HTML Table to CSV
function exportTableToCSV(filename) {
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

    const rows = ledgerEntries.map(entry => `
      <tr>
        <td>${entry.posting_date}</td>
        <td>${entry.item_code}</td>
        <td>${entry.warehouse}</td>
        <td>${entry.actual_qty}</td>
        <td>${entry.voucher_type}</td>
      </tr>
    `).join("");

    section.innerHTML = `
      <div class="card mt-3">
        <div class="card-body">
         <div class="d-flex justify-content-between align-items-center mb-3"> 
          <h5 class="card-title">Recent Stock Ledger Entries</h5>
          <button id="refresh-stock" class="btn btn-sm btn-outline-primary" style="border: 1px solid #0f0f0f;">Refresh</button>
         </div>
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item Code</th>
                <th>Warehouse</th>
                <th>Qty</th>
                <th>Voucher Type</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
    document.getElementById("refresh-stock").addEventListener("click", render_stock_ledger);

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
    limit: 100
  });

  const statusStyles = {
    Draft: { text: "Draft", bg: "#FFF4E5", color: "#FF9800" ,border: "1px solid #FF9800" },       // Soft orange
    Submitted: { text: "Submitted", bg: "#E8F5E9", color: "#4CAF50" ,border: "1px solid #4caf50" }  // Soft green
  };

  const rows = receipts.map(r => {
    const style = statusStyles[r.status] || statusStyles.Submitted;
    return `
      <tr class="receipt-row" data-name="${r.name}">
        <td>${r.name}</td>
        <td>${r.supplier}</td>
        <td>${r.posting_date}</td>
        <td>
          <span style="
            background:${style.bg};
            color:${style.color};
            padding:3px 10px;
            border-radius:999px;
            font-size:0.85rem;
            font-weight:500;
          ">${style.text}</span>
        </td>
      </tr>
    `;
  }).join("");

  section.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">Recent Inward Entries</h5>
        <table class="table table-hover table-striped">
          <thead>
            <tr>
              <th>PR No</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  // Click handlers for details
  document.querySelectorAll(".receipt-row").forEach(row => {
    row.addEventListener("click", async () => {
      const name = row.dataset.name;
      const doc = await frappe.db.get_doc("Purchase Receipt", name);
      showPurchaseReceiptDetails(doc);
    });
  });
}
// This function shows purchase receipt details in a popup & It formats the items in a table and displays total quantities and amounts
function showPurchaseReceiptDetails(doc) {
  const itemsTable = doc.items.map(i => `
    <tr>
      <td>${i.item_code}</td>
      <td>${i.item_name}</td>
      <td>${i.qty}</td>
      <td>${i.rate}</td>
      <td>${i.amount}</td>
    </tr>
  `).join("");

  // Action buttons based on status
  let actionButtons = "";
  if (doc.docstatus === 0) {
    actionButtons = `<button class="btn btn-primary btn-sm" id="submit-pr-btn">🚀 Submit</button>`;
  } else if (doc.docstatus === 1) {
    actionButtons = `<button class="btn btn-danger btn-sm" id="cancel-pr-btn">🗑️ Cancel</button>`;
  }

const html = `
  <div class="row mb-2">
    <div class="col-6 border-end">
      <p><strong>PR No:</strong> ${doc.name}</p>
    </div>
    <div class="col-6">
      <p><strong>Date:</strong> ${doc.posting_date}</p>
    </div>
  </div>
  <div class="row mb-2">
    <div class="col-6 border-end">
      <p><strong>Supplier:</strong> ${doc.supplier}</p>
    </div>
    <div class="col-6">
      <p><strong>Status:</strong> ${doc.status}</p>
    </div>
  </div>
  <hr>
  <h5>Items:</h5>
  <table class="table table-bordered table-sm">
    <thead>
      <tr>
        <th>Item Code</th>
        <th>Name</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>${itemsTable}</tbody>
  </table>
  <p><strong>Total Qty:</strong> ${doc.total_qty}</p>
  <p><strong>Total Amount:</strong> ₹${doc.grand_total}</p>
  <hr>
  ${actionButtons}
`;

  frappe.msgprint({
    title: `Purchase Receipt: ${doc.name}`,
    message: html,
    wide: true,
    indicator: doc.docstatus === 1 ? 'green' : 'blue'
  });

  setTimeout(() => {
    const submitBtn = document.getElementById("submit-pr-btn");
    const cancelBtn = document.getElementById("cancel-pr-btn");

    // ✅ Handle Submit
if (submitBtn) {
  submitBtn.addEventListener("click", async () => {
    try {
      // 1. Get full doc first
      const prDoc = await frappe.db.get_doc("Purchase Receipt", doc.name);

      // 2. Submit the document
      await frappe.call({
        method: "frappe.client.submit",
        args: {
          doc: prDoc
        }
      });

      frappe.msgprint({
        message: "✅ Purchase Receipt submitted!",
        indicator: "green"
      });
      refreshPRList(); // 🔄 Refresh List
    } catch (err) {
      frappe.msgprint({ message: "❌ Failed to submit.", indicator: "red" });
      console.error(err);
    }
  });
}
    // 🗑️ Handle Cancel
if (cancelBtn) {
  cancelBtn.addEventListener("click", async () => {
    try {
      const prDoc = await frappe.db.get_doc("Purchase Receipt", doc.name);
      await frappe.call({
        method: "frappe.client.cancel",
        args: {
          doc: prDoc
        }
      });

      frappe.msgprint({
        message: "❌ Purchase Receipt cancelled!",
        indicator: "orange"
      });
      refreshPRList(); // 🔄 Refresh List
    } catch (err) {
      frappe.show_alert({ message: "❌ Failed to cancel.", indicator: "red" }, 5);
    }
  });
}
  }, 200);
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

  // Fetch Stock Entry records with type "Material Issue"
  const stockEntries = await frappe.db.get_list("Stock Entry", {
    fields: ["name", "stock_entry_type", "posting_date", "docstatus"],
    filters: { stock_entry_type: "Material Issue" },
    order_by: "creation desc",
    limit: 100
  });

  const rows = stockEntries.map(entry => {
    // Determine status label and badge color
    let displayStatus = entry.docstatus === 0 ? "Draft" : "Submitted";
    let badgeClass = entry.docstatus === 0 ? "secondary" : "success";

    return `
      <tr class="stock-entry-row" data-name="${entry.name}">
        <td>${entry.name}</td>
        <td>${entry.stock_entry_type}</td>
        <td>${entry.posting_date}</td>
        <td><span class="badge bg-${badgeClass}">${displayStatus}</span></td>
      </tr>
    `;
  }).join("");

  section.innerHTML = `
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">Recent Outward Entries</h5>
        <table class="table table-hover table-striped table-bordered">
          <thead>
            <tr>
              <th>Stock Entry No</th>
              <th>Type</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  // Click to view details
  document.querySelectorAll(".stock-entry-row").forEach(row => {
    row.addEventListener("click", async () => {
      const name = row.dataset.name;
      const doc = await frappe.db.get_doc("Stock Entry", name);
      showStockEntryDetails(doc);
    });
  });
}

async function render_outward_form() {
  const content = document.getElementById("outward-section");

  const suppliers = await frappe.db.get_list("Supplier", { fields: ["name"] });
  const items = await frappe.db.get_list("Item", { fields: ["name"] });

  const supplierOptions = suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  const itemOptions = items.map(i => `<option value="${i.name}">${i.name}</option>`).join("");

  const typeOptions = `
    <option value="Purchase Order" selected>Purchase Order</option>
    <option value="Work Order">Work Order</option>
  `;

  const requestForOptions = `
    <option value="Branch" selected>Branch</option>
    <option value="Project">Project</option>
    <option value="Store Use">Store</option>
  `;

  content.innerHTML = `
    <h4>Stock Outward Entry</h4>

    <div class="row g-3 mb-3">
      <div class="col-md-2">
        <input type="text" class="form-control" id="invoice_no" placeholder="Invoice No." required />
      </div>
      <div class="col-md-2">
        <input type="date" class="form-control" id="invoice_date" value="${new Date().toISOString().split('T')[0]}" required />
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-md-3">
        <select class="form-control" id="supplier" required>
          <option value="">Select Supplier</option>
          ${supplierOptions}
        </select>
      </div>
      <div class="col-md-3">
        <select class="form-control" id="type" required>
          <option value="">Select Type</option>
          ${typeOptions}
        </select>
      </div>
      <div class="col-md-3">
        <select class="form-control" id="request_for" required>
          ${requestForOptions}
        </select>
      </div>
    </div>

    <table class="table table-bordered" id="inward-table">
      <thead>
        <tr>
          <th>Sr.no</th>
          <th>Product</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>

    <form id="inward-form" class="row g-3 mb-3">
      <div class="col-md-3">
        <select class="form-control" id="product" required>
          <option value="">Select Product</option>
          ${itemOptions}
        </select>
      </div>
      <div class="col-md-2">
        <input type="number" class="form-control" placeholder="Qty" id="quantity" required />
      </div>
      <div class="col-md-2">
        <input type="number" class="form-control" placeholder="Rate" id="rate" required />
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
  document.getElementById("inward-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const product = document.getElementById("product").value;
    const quantity = parseFloat(document.getElementById("quantity").value);
    const rate = parseFloat(document.getElementById("rate").value);
    const total = quantity * rate;

    const row = `
      <tr>
        <td>${counter++}</td>
        <td>${product}</td>
        <td>${quantity}</td>
        <td>${rate}</td>
        <td>${total}</td>
      </tr>
    `;

    document.querySelector("#inward-table tbody").insertAdjacentHTML("beforeend", row);
    this.reset();
  });

  // 🔁 Submit button logic changed to call custom submit_outward function
  document.getElementById("submit_outward").addEventListener("click", submit_outward);

}
// SUBMIT OUTWARD FUNCTION & This function collects all data and submits the outward entry
async function submit_outward() {
  const supplier = document.getElementById("supplier").value;
  const type = document.getElementById("type").value;
  const requestFor = document.getElementById("request_for").value;
  const invoice_no = document.getElementById("invoice_no").value;
  const invoice_date = document.getElementById("invoice_date").value;
  const rows = document.querySelectorAll("#inward-table tbody tr");

  if (!supplier || !type || !requestFor || !invoice_no || !invoice_date) {
    alert("Please fill all header fields before submitting.");
    return;
  }

  if (rows.length === 0) {
    alert("Please add at least one product row.");
    return;
  }

  const items = Array.from(rows).map(row => {
    const cells = row.querySelectorAll("td");
    return {
      item_code: cells[1].innerText,
      qty: parseFloat(cells[2].innerText),
      basic_rate: parseFloat(cells[3].innerText)
    };
  });

  try {
    const res = await frappe.call({
      method: "frappe.client.insert",
      args: {
        doc: {
          doctype: "Stock Entry",
          purpose: "Material Issue",
          posting_date: invoice_date,
          custom_bill_no: invoice_no,
          custom_po_wo: type,
          custom_request_for: requestFor,
          custom_supplier: supplier,
          items: items
        }
      }
    });

    frappe.msgprint(`✅ Stock Entry <b>${res.message.name}</b> created successfully`);
    document.getElementById("content").innerHTML = ""; // clear form
  } catch (err) {
    console.error(err);
    frappe.msgprint("❌ Failed to submit Outward Entry");
  }
}

};