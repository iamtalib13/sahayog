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
    height: 48px;
    margin-bottom: 0px;
    padding: 0 1.5rem;
    border-radius: 12px;
    color: #256a69;
    background: #fff;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 2.8rem;
    cursor: default;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: fit-content;
    max-width: 320px;
    transition: transform 0.2s, box-shadow 0.2s;
}
.custom-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(37, 106, 105, 0.1);
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
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    margin-bottom: 24px;
    border: 1px solid #e5e7eb;
    overflow: hidden;
}
.table {
    font-size: 0.61rem;
    border-collapse: separate;
    background: #fff;
    border-radius: 0 0 12px 12px;
    width: 100%;
    min-width: 180px;
    table-layout: fixed;
}
.table thead th {
    font-size: 0.74rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    background: #256a69;
    color: #fff;
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 10px 8px;
}
.table th, .table td {
    padding: 8px;
    word-wrap: break-word;
    text-overflow: ellipsis;
    max-width: 120px;
}
.table td {
    color: #374151;
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
.table tbody tr {
    transition: background-color 0.2s;
}
.table tbody tr:hover {
    background-color: rgba(37, 106, 105, 0.05) !important;
}
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

/* Keyframe animations */
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

@keyframes liquid-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--glow-color);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(0, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
  }
}

.status-badge-liquid {
  transition: all 0.2s ease-in-out;
}
.status-badge-liquid:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--glow-color);
}

.counter {
  display: inline-block;
  font-size: 2.5rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-weight: 600;
  color: #256a69;
  animation: count-to 1s ease-in-out forwards;
}

.page-head.flex {
  display: none !important;
}

/* Glassmorphism for Dialog Modals */
.modal-content {
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 10px 40px 0 rgba(37, 106, 105, 0.15) !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}
.modal-backdrop.show {
  background-color: rgba(37, 106, 105, 0.2) !important;
  backdrop-filter: blur(6px) !important;
  -webkit-backdrop-filter: blur(6px) !important;
  transition: all 0.3s ease;
}

/* Filter Input and Action Buttons */
#sol-filter {
  padding: 8px 14px !important;
  border: 1px solid #d1d5db !important;
  border-radius: 8px !important;
  font-size: 0.85rem !important;
  width: 200px !important;
  transition: border-color 0.2s, box-shadow 0.2s !important;
  outline: none !important;
}
#sol-filter:focus {
  border-color: #256a69 !important;
  box-shadow: 0 0 0 3px rgba(37, 106, 105, 0.15) !important;
}
#apply-filter, #manual-refresh {
  margin-left: 6px !important;
  padding: 8px 16px !important;
  background: #256a69 !important;
  color: #fff !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 0.85rem !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: background-color 0.2s, transform 0.1s !important;
}
#apply-filter:hover, #manual-refresh:hover {
  background-color: #1e5554 !important;
}
#apply-filter:active, #manual-refresh:active {
  transform: scale(0.96) !important;
}
#clear-filter {
  margin-left: 6px !important;
  padding: 8px 16px !important;
  background: #f3f4f6 !important;
  color: #4b5563 !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  font-size: 0.85rem !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: background-color 0.2s, color 0.2s, transform 0.1s !important;
}
#clear-filter:hover {
  background-color: #e5e7eb !important;
  color: #1f2937 !important;
}
#clear-filter:active {
  transform: scale(0.96) !important;
}
</style>

<div style="text-align:center;margin-bottom:6px;font-size:1rem;font-weight:700;color:#256a69;">Sahayog Finacle Branches Status</div>

<!-- Batch Status Indicators -->
<div style="text-align:center; margin-top: 15px;">
    <span style="font-size: 0.75rem; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Batch Wise Progress</span>
    <div id="batch-buttons-container" style="display: flex; flex-wrap: nowrap; justify-content: center; gap: 4px; max-width: 100%; margin: 0 auto;"></div>
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
<div id="filter-message" style="text-align:center; font-size:0.8rem; color:#256a69; margin-bottom:4px;">
</div>

<!-- Last Refreshed Time -->
<div id="last-refresh-time" style="text-align:center; font-size:0.75rem; color:#6b7280; margin-bottom:12px; font-weight: 500;">
  Last Refreshed: --:-- --
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
    transHeaderRow.append($("<th>").text(col.label)),
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
      $("#filter-message").html(
        `<span style="color: grey;">SOL ID :</span> <span style="font-weight:bold; color: #256a69;">${sol.toUpperCase()}</span>`,
      );
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
            .text("No MVCD data available."),
        ),
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
            .text("No transaction data available."),
        ),
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
        (row.sol_id || "").toLowerCase().includes(sol),
      );
      transFiltered = transFiltered.filter((row) =>
        (row.dth_init_sol_id || "").toLowerCase().includes(sol),
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
      const allowedSols = batchData[batch] || [];
      const mvcdCount = currentMVCDData.filter((row) =>
        allowedSols.includes(String(row.sol_id)),
      ).length;
      const pendingTransCount = currentTransData.filter((row) =>
        allowedSols.includes(String(row.dth_init_sol_id)),
      ).length;
      const isClear = mvcdCount === 0 && pendingTransCount === 0;

      // "Liquid Glass" Theme Colors
      const glassBg = isClear
        ? "rgba(16, 185, 129, 0.15)"
        : "rgba(239, 68, 68, 0.15)";
      const accentColor = isClear ? "#10b981" : "#ef4444";
      const glowColor = isClear
        ? "rgba(16, 185, 129, 0.3)"
        : "rgba(239, 68, 68, 0.3)";
      const buttonText =
        mvcdCount > 0
          ? `${label.toUpperCase()} (${mvcdCount})`
          : label.toUpperCase();

      const $badge = $(`
        <div class="status-badge-liquid" style="
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
            background: ${glassBg};
            color: ${accentColor};
            border: 1px solid ${accentColor};
            cursor: pointer;
            min-width: 70px;
            flex-shrink: 1;
            justify-content: center;
            --glow-color: ${glowColor};
            animation: liquid-pulse 3s infinite;
        ">
            <div style="
                width: 6px; 
                height: 6px; 
                border-radius: 50%; 
                background: ${accentColor};
                box-shadow: 0 0 5px ${accentColor};
                flex-shrink: 0;
            "></div>
            <span style="white-space: nowrap; font-family: 'Inter', sans-serif;">${buttonText}</span>
        </div>
      `);

      // Hover effect for the badge
      $badge.hover(
        function () {
          $(this).css("transform", "scale(1.05)");
        },
        function () {
          $(this).css("transform", "scale(1)");
        },
      );

      // Combine pending SOL IDs from MVCD and pending transactions
      const pendingSolsMvcd = currentMVCDData.map((row) => String(row.sol_id));
      const pendingTransSols = currentTransData.map((row) =>
        String(row.dth_init_sol_id),
      );
      const combinedPending = [
        ...new Set([...pendingSolsMvcd, ...pendingTransSols]),
      ];
      $badge.on("click", () => {
        showClearedSolsModal(label.toUpperCase(), allowedSols, combinedPending);
      });

      $container.append($badge);
    });
  }

  function showClearedSolsModal(batchName, allSols, pendingSols) {
    const html = allSols
      .map((sol) => {
        const isPending = pendingSols.includes(sol);
        const color = isPending ? "#f3a6a6" : "#95f5b6"; // Solid red / green per SOL
        return `<li style="padding: 8px; margin: 2px; border-radius: 4px; background: ${color}; display: inline-block; width: calc(25% - 8px); text-align: center; font-size: 0.8rem; font-weight: 600; color: black;">${sol}</li>`;
      })
      .join("");

    const modalBg = pendingSols.length > 0 ? "#ffffff" : "#bbf7d0";

    const dialog = new frappe.ui.Dialog({
      title: `Batch Audit: ${batchName}`,
      fields: [
        {
          fieldname: "sol_list",
          fieldtype: "HTML",
          options: `<ul style="list-style: none; padding: 0; background: ${modalBg}; border-radius: 4px; padding: 5px;">${html}</ul>`,
        },
      ],
    });
    dialog.show();
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
    fetchDashboardData(true);
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

  function updateLastRefreshTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hoursStr = String(hours).padStart(2, "0");
    const timeStr = `${hoursStr}:${minutes} ${ampm}`;
    $("#last-refresh-time").html(`<span style="color: #6b7280;">Last Refreshed:</span> <span style="font-weight: 600; color: #256a69;">${timeStr}</span>`);
  }

  function fetchDashboardData(force = false) {
    if (DEBUG) {
      onMVCDDataLoaded(mvcdDummy);
      onTransactionDataLoaded(transDummy);
      updateLastRefreshTime();
    } else {
      frappe.call({
        method: "sahayog.sahayog.page.mvcd_status.mvcd.get_mvcd_dashboard_data",
        args: { force: force },
        callback: (r) => {
          if (r.message && r.message.status === "success") {
            onMVCDDataLoaded(r.message.mvcd_data || []);
            onTransactionDataLoaded(r.message.trans_data || []);
            updateLastRefreshTime();
          } else if (r.message && r.message.status === "error") {
            frappe.msgprint(__("Error fetching dashboard data: {0}", [r.message.message]));
          }
        }
      });
    }
  }

  fetchDashboardData();
  fetchBatches();

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
