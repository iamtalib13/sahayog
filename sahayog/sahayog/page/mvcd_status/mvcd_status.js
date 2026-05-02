frappe.pages["mvcd-status"].on_page_load = function (wrapper) {
  const DEBUG = false; // Set true to use dummy data

  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "",
    single_column: true,
  });

  const cardHtml = `
<style>
body, .page-container {background: #fafbfc !important;}
.container-flex {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: nowrap;
    margin-top: 10px;
    width: 100%;
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
}

.column {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 50%;
    min-width: 0;
}

@media (max-width: 900px) {
    .container-flex {flex-direction: column;align-items: stretch;}
    .column {width: 100%;margin-bottom: 12px;}
}

.custom-card {
    height: 32px;
    margin-bottom: 0px;
    padding: 0 1rem;
    border-radius: 9px;
    color: #256a69;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    font-size: 2.5rem;
    cursor: default;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: fit-content;
    max-width: 320px;
}

h4 {
    margin: 8px 0 6px;
    font-weight: 600;
    text-align: center;
    font-size: 0.77rem;
    color: #256a69;
}

.table-wrap {
    width: 100%;
    background: #fff;
    border-radius: 9px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.04);
    margin-bottom: 24px;
    border: 1px solid #ececec;
    overflow-x: hidden;
}
.table {
    font-size: 0.61rem;
    border-collapse: separate;
    background: #fff;
    border-radius: 0 0 9px 9px;
    width: 100%;
    min-width: 180px;
    table-layout: fixed;
}
.table thead th {
    font-size: 0.74rem;
    background: #256a69;
    color: #fff;
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 7px 4px;
}
.table th, .table td {
    padding: 5px;
    word-wrap: break-word;
    text-overflow: ellipsis;
    max-width: 120px;
}
.table tbody {
    display: block;
    min-height: 328px;
    max-height: 328px;
    overflow-y: auto;
    width: 100%;
    scroll-behavior: smooth;
}
.table thead, .table tbody tr {display: table; width: 100%; table-layout: fixed;}
.table tbody tr:nth-child(odd) {background-color: #f5f8f7;}
.table tbody tr:nth-child(even) {background-color: #eaf1f0;}
.no-data {padding: 13px;text-align: center;color: #555;font-size: 0.8rem;}

.table tbody::-webkit-scrollbar {width: 8px;}
.table tbody::-webkit-scrollbar-thumb {background-color: #256a69;border-radius: 8px;}
.table tbody::-webkit-scrollbar-track {background-color: #f1f1f1;}
.table tbody {scrollbar-color: #256a69 #f1f1f1;scrollbar-width: thin;}
#mvcd-table th:first-child,
#mvcd-table td:first-child,
#transaction-table th:first-child,
#transaction-table td:first-child {
  width: 40px;
  max-width: 40px;
  white-space: nowrap;
}

/* Keyframe animation for counting */
@keyframes count-to {
  0% {
    transform: scale(0.9);
    opacity: 0.3;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.counter {
  display: inline-block;
  font-size: 2.5rem; /* Adjust this based on your design */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-weight: 600;
  color: #256a69;
  animation: count-to 1s ease-in-out forwards;
}
</style>

<div style="text-align:center;margin-bottom:6px;font-size:1rem;font-weight:700;color:#256a69;">Sahayog Finacle Branches Status</div>

<!-- Batch Status Indicators -->
<div id="batch-buttons-container" style="text-align:center; margin: 10px 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
</div>

<!-- SOL ID Filter -->
<div style="text-align:center;margin:10px 0;">
  <input type="text" id="sol-filter" placeholder="Enter SOL ID to filter"
         style="padding:6px 10px;border:1px solid #ccc;border-radius:6px;font-size:0.8rem;width:180px;">
  <button id="apply-filter"
          style="margin-left:6px;padding:6px 10px;background:#256a69;color:#fff;border:none;border-radius:6px;font-size:0.8rem;cursor:pointer;">
    Apply
  </button>
  <button id="clear-filter"
          style="margin-left:6px;padding:6px 10px;background:#eee;color:#333;border:none;border-radius:6px;font-size:0.8rem;cursor:pointer;">
    Clear
  </button>
  <button id="manual-refresh"
          style="margin-left:6px;padding:6px 10px;background:#256a69;color:#fff;border:none;border-radius:6px;font-size:0.8rem;cursor:pointer;">
    Refresh
  </button>
</div>

<!-- Filter applied message -->
<div id="filter-message" style="text-align:center; font-size:0.8rem; color:#256a69; margin-bottom:12px;">
</div>

<div class="container-flex">
  <div class="column">
    <div class="custom-card mvcd-card" id="mvcd-card">
      <span id="mvcd-count"> Loading...</span>
    </div>
    <h4>Pending MVCD</h4>
    <div class="table-wrap">
      <table class="table" id="mvcd-table">
        <thead></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
  <div class="column">
    <div class="custom-card transaction-card" id="transaction-card">
      <span id="transaction-count"> Loading...</span>
    </div>
    <h4>Pending Transactions</h4>
    <div class="table-wrap">
      <table class="table" id="transaction-table">
        <thead></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
</div>
`;

  $(page.body).append(cardHtml);

  const columnsMVCD = [
    { key: "sol_id", label: "SOL ID" },
    { key: "sol_desc", label: "Branch" },
    { key: "acct_name", label: "Account Name" },
    { key: "foracid", label: "For Account ID" },
    { key: "clr_bal_amt", label: "Clear Balance Amount" },
  ];
  const $mvcdTable = $("#mvcd-table");
  const $mvcdTbody = $mvcdTable.find("tbody");
  const $mvcdThead = $mvcdTable.find("thead");
  const mvcdHeaderRow = $("<tr>");
  mvcdHeaderRow.append($("<th>").text("S. No."));
  columnsMVCD.forEach((col) => mvcdHeaderRow.append($("<th>").text(col.label)));
  $mvcdThead.append(mvcdHeaderRow);

  const columnsTrans = [
    { key: "tran_id", label: "Transaction ID" },
    { key: "dth_init_sol_id", label: "SOL ID" },
    { key: "sol_desc", label: "Branch" },
    { key: "tran_type", label: "Transaction Type" },
    { key: "tran_sub_type", label: "Transaction Sub-Type" },
    { key: "entry_user_id", label: "Entry User ID" },
  ];
  const $transTable = $("#transaction-table");
  const $transTbody = $transTable.find("tbody");
  const $transThead = $transTable.find("thead");
  const transHeaderRow = $("<tr>");
  transHeaderRow.append($("<th>").text("S. No."));
  columnsTrans.forEach((col) =>
    transHeaderRow.append($("<th>").text(col.label))
  );
  $transThead.append(transHeaderRow);

  // Dummy data for testing (20 records each)
  const mvcdDummy = Array.from({ length: 20 }, (_, i) => ({
    sol_id: `SOL${100 + i}`,
    acct_name: `Account ${i + 1}`,
    foracid: `FAC${200 + i}`,
    clr_bal_amt: `${(1000 + i * 50).toFixed(2)}`,
    sol_desc: `Branch ${100 + i}`,
  }));

  // Use DG prefix format for tran_id here
  const transDummy = Array.from({ length: 20 }, (_, i) => ({
    tran_id: `DG${5734 + i}`,
    dth_init_sol_id: `SOL${100 + (i % 20)}`,
    sol_desc: `Branch ${100 + (i % 20)}`,
    tran_type: i % 2 === 0 ? "Deposit" : "Withdrawal",
    tran_sub_type: i % 3 === 0 ? "Cash" : "Cheque",
    entry_user_id: `user${i + 1}`,
  }));

  let currentMVCDData = [];
  let currentTransData = [];
  let batchData = {};
  let mvcdFirstLoad = true;
  let transFirstLoad = true;

  // Load filter from storage
  let cachedFilter = localStorage.getItem("mvcd_sol_filter") || "";
  $("#sol-filter").val(cachedFilter);

  function updateFilterMessage(sol) {
    if (sol && sol.trim() !== "") {
      $("#filter-message").html(`<span style="color: grey;">SOL ID :</span> <span style="font-weight:bold; color: #256a69;">${sol.toUpperCase()}</span>`);
    } else {
      $("#filter-message").html("");
    }
  }

  function renderMVCD(data) {
    $mvcdTbody.empty();
    if (data && data.length) {
      data.forEach((row, idx) => {
        const tr = $("<tr>");
        tr.append($("<td>").text(idx + 1));
        columnsMVCD.forEach((col) => {
          tr.append($("<td>").text(row[col.key] || ""));
        });
        $mvcdTbody.append(tr);
      });
    } else {
      $mvcdTbody.append(
        $("<tr>").append(
          $("<td>")
            .attr("colspan", columnsMVCD.length + 1)
            .addClass("no-data")
            .text("No MVCD data available.")
        )
      );
    }
  }

  function renderTransaction(data) {
    $transTbody.empty();
    if (data && data.length) {
      data.forEach((row, idx) => {
        const tr = $("<tr>");
        tr.append($("<td>").text(idx + 1));
        columnsTrans.forEach((col) => {
          tr.append($("<td>").text(row[col.key] || ""));
        });
        $transTbody.append(tr);
      });
    } else {
      $transTbody.append(
        $("<tr>").append(
          $("<td>")
            .attr("colspan", columnsTrans.length + 1)
            .addClass("no-data")
            .text("No transaction data available.")
        )
      );
    }
  }

  function applyFilter() {
    const sol = $("#sol-filter").val().trim().toLowerCase();
    localStorage.setItem("mvcd_sol_filter", sol);

    let mvcdFiltered = currentMVCDData;
    let transFiltered = currentTransData;

    // Filter by SOL ID input
    if (sol) {
      mvcdFiltered = mvcdFiltered.filter((row) =>
        (row.sol_id || "").toLowerCase().includes(sol)
      );
      transFiltered = transFiltered.filter((row) =>
        (row.dth_init_sol_id || "").toLowerCase().includes(sol)
      );
    }

    renderMVCD(mvcdFiltered);
    updateMVCDCount(mvcdFiltered.length);

    renderTransaction(transFiltered);
    updateTransactionCount(transFiltered.length);

    updateFilterMessage(sol);
  }

  function fetchBatches() {
    frappe.call({
      method: "sahayog.sahayog.page.mvcd_status.mvcd.get_batch_data",
      callback: (r) => {
        batchData = r.message || {};
        renderBatchButtons();
        applyFilter();
      },
    });
  }

  function renderBatchButtons() {
    const $container = $("#batch-buttons-container");
    $container.empty();

    const batches = Object.keys(batchData).sort((a, b) => {
      return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    batches.forEach((batch) => {
      const label = batch.replace(/EOD/i, "batch-");
      
      // Calculate if batch has pending records (Checking MVCD table only)
      const allowedSols = batchData[batch] || [];
      const mvcdCount = currentMVCDData.filter(row => allowedSols.includes(String(row.sol_id))).length;
      const isClear = mvcdCount === 0;

      const $btn = $(
        `<div style="padding: 4px 12px; border-radius: 4px; font-size: 0.75rem; cursor: default; transition: all 0.2s; font-weight: 600; border: 1px solid transparent;"></div>`
      );

      // Styling Logic (Status Only)
      if (isClear) {
        // Success Green for All Clear
        $btn.css({ 
          background: "#28a745", 
          color: "#fff", 
          borderColor: "#28a745"
        });
      } else {
        // Danger Red for Pending
        $btn.css({ 
          background: "#dc3545", 
          color: "#fff", 
          borderColor: "#dc3545"
        });
      }

      $btn.text(label.toUpperCase());
      $container.append($btn);
    });
  }

  $("#apply-filter").on("click", applyFilter);
  $("#sol-filter").on("keyup", function (e) {
    if (e.key === "Enter") applyFilter();
  });
  $("#clear-filter").on("click", function () {
    $("#sol-filter").val("");
    localStorage.removeItem("mvcd_sol_filter");
    renderBatchButtons();
    applyFilter();
  });

  $("#manual-refresh").on("click", function () {
    fetchRenderMVCD();
    fetchRenderTransaction();
    fetchBatches();
  });

  function onMVCDDataLoaded(data) {
    currentMVCDData = data || [];
    renderBatchButtons(); // Refresh button colors
    applyFilter();
    updateMVCDCount(currentMVCDData.length);
  }
  function onTransactionDataLoaded(data) {
    currentTransData = data || [];
    renderBatchButtons(); // Refresh button colors
    applyFilter();
    updateTransactionCount(currentTransData.length);
  }

  function fetchRenderMVCD() {
    if (DEBUG) {
      onMVCDDataLoaded(mvcdDummy);
    } else {
      frappe.call({
        method: "sahayog.sahayog.page.mvcd_status.mvcd.get_mvcd_status",
        args: {},
        callback: (r) => onMVCDDataLoaded(r.message?.data || []),
      });
    }
  }

  function fetchRenderTransaction() {
    if (DEBUG) {
      onTransactionDataLoaded(transDummy);
    } else {
      frappe.call({
        method:
          "sahayog.sahayog.page.mvcd_status.mvcd.get_pending_transactions",
        args: {},
        callback: (r) => onTransactionDataLoaded(r.message?.data || []),
      });
    }
  }

  fetchRenderMVCD();
  fetchRenderTransaction();
  fetchBatches();
  setInterval(fetchRenderMVCD, 10000);
  setInterval(fetchRenderTransaction, 10000);

  applyFilter();

  // Animate number smoothly from current value to target
  function animateNumber(element, target) {
    // Get current value from element, default to 0 if not a number
    let current = parseInt(element.textContent) || 0;
    if (current === target) return;

    const start = current;
    const duration = 1500; // ms
    const startTime = performance.now();

    // Stop previous animation if still running
    if (element._counterAnimationFrame) {
      cancelAnimationFrame(element._counterAnimationFrame);
    }

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad function
      const ease = progress * (2 - progress);
      const nextValue = Math.floor(start + (target - start) * ease);
      
      element.textContent = nextValue;

      if (progress < 1) {
        element._counterAnimationFrame = requestAnimationFrame(update);
      } else {
        element.textContent = target;
        element._counterAnimationFrame = null;
      }
    }

    element._counterAnimationFrame = requestAnimationFrame(update);
  }

  // Update MVCD count
  function updateMVCDCount(count) {
    const el = document.getElementById("mvcd-count");
    if (!el) return;

    if (mvcdFirstLoad) {
      // Set to 0 initially for the very first animation
      el.textContent = "0";
      animateNumber(el, count);
      mvcdFirstLoad = false;
    } else {
      // Direct update for subsequent refreshes
      el.textContent = count;
    }
  }

  // Update Transaction count
  function updateTransactionCount(count) {
    const el = document.getElementById("transaction-count");
    if (!el) return;

    if (transFirstLoad) {
      // Set to 0 initially for the very first animation
      el.textContent = "0";
      animateNumber(el, count);
      transFirstLoad = false;
    } else {
      // Direct update for subsequent refreshes
      el.textContent = count;
    }
  }
};
