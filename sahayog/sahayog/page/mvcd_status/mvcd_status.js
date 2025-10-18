frappe.pages["mvcd-status"].on_page_load = function (wrapper) {
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
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
}

.column {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 50%; /* Exactly half page each on desktop */
    min-width: 0;
}

/* Responsive: stack columns if screen <900px */
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
    font-size: 1.8rem;
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
    /* Prevent horizontal scrolling on desktop/web */
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

.table tbody tr:nth-child(odd) {
    background-color: #f5f8f7;
}
.table tbody tr:nth-child(even) {
    background-color: #eaf1f0;
}

.no-data {
    padding: 13px;
    text-align: center;
    color: #555;
    font-size: 0.8rem;
}

.page-head {
  display: none;
}


/* Scrollbar styling for .table tbody (Chrome, Edge, Safari) */
.table tbody::-webkit-scrollbar {
    width: 8px;
}

.table tbody::-webkit-scrollbar-thumb {
    background-color: #256a69;
    border-radius: 8px;
}

.table tbody::-webkit-scrollbar-track {
    background-color: #f1f1f1;
}

/* Scrollbar styling for Firefox */
.table tbody {
    scrollbar-color: #256a69 #f1f1f1;
    scrollbar-width: thin;
}




</style>

<div style="text-align:center;margin-bottom:6px;font-size:1rem;font-weight:700;color:#256a69;">Sahayog Finacle Branches Status</div>

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

  // Prepare MVCD table headers
  const columnsMVCD = [
    { key: "sol_id", label: "SOL ID" },
    { key: "acct_name", label: "Account Name" },
    { key: "foracid", label: "For Account ID" },
    { key: "clr_bal_amt", label: "Clear Balance Amount" },
    { key: "sol_desc", label: "Branch Description" },
  ];
  const $mvcdTable = $("#mvcd-table");
  const $mvcdThead = $mvcdTable.find("thead");
  const $mvcdTbody = $mvcdTable.find("tbody");
  const mvcdHeaderRow = $("<tr>");
  mvcdHeaderRow.append($("<th>").text("S. No."));
  columnsMVCD.forEach((col) => mvcdHeaderRow.append($("<th>").text(col.label)));
  $mvcdThead.append(mvcdHeaderRow);
  $mvcdTbody.append(
    $("<tr>").append(
      $("<td>")
        .attr("colspan", columnsMVCD.length + 1)
        .text("Loading MVCD data...")
        .css("text-align", "center")
    )
  );

  // Prepare Transaction table headers
  const columnsTrans = [
    { key: "tran_id", label: "Transaction ID" },
    { key: "dth_init_sol_id", label: "Initial Branch ID" },
    { key: "sol_desc", label: "Branch Description" },
    { key: "tran_type", label: "Transaction Type" },
    { key: "tran_sub_type", label: "Transaction Sub-Type" },
    { key: "entry_user_id", label: "Entry User ID" },
  ];
  const $transTable = $("#transaction-table");
  const $transThead = $transTable.find("thead");
  const $transTbody = $transTable.find("tbody");
  const transHeaderRow = $("<tr>");
  transHeaderRow.append($("<th>").text("S. No."));
  columnsTrans.forEach((col) =>
    transHeaderRow.append($("<th>").text(col.label))
  );
  $transThead.append(transHeaderRow);
  $transTbody.append(
    $("<tr>").append(
      $("<td>")
        .attr("colspan", columnsTrans.length + 1)
        .text("Loading Transaction data...")
        .css("text-align", "center")
    )
  );

  // Fetch MVCD data and update
  frappe.call({
    method: "sahayog.sahayog.page.mvcd_status.mvcd.get_mvcd_status",
    args: {},
    callback: function (r) {
      $mvcdTbody.empty();
      if (
        r.message &&
        r.message.status === "success" &&
        r.message.data.length
      ) {
        $("#mvcd-count").text(`${r.message.data.length}`);
        r.message.data.forEach((row, idx) => {
          const tr = $("<tr>").appendTo($mvcdTbody);
          tr.append($("<td>").text(idx + 1));
          columnsMVCD.forEach((col) => {
            tr.append($("<td>").text(row[col.key] || ""));
          });
        });
      } else {
        $("#mvcd-count").text("0");
        $mvcdTbody.append(
          $("<tr>").append(
            $("<td>")
              .attr("colspan", columnsMVCD.length + 1)
              .addClass("no-data")
              .text("No MVCD data available.")
          )
        );
      }
    },
  });

  setInterval(() => {
    frappe.call({
      method: "sahayog.sahayog.page.mvcd_status.mvcd.get_mvcd_status",
      args: {},
      callback: function (r) {
        $mvcdTbody.empty();
        if (
          r.message &&
          r.message.status === "success" &&
          r.message.data.length
        ) {
          console.log("Updating MVCD data...", r.message.data);
          $("#mvcd-count").text(`${r.message.data.length}`);
          r.message.data.forEach((row, idx) => {
            const tr = $("<tr>").appendTo($mvcdTbody);
            tr.append($("<td>").text(idx + 1));
            columnsMVCD.forEach((col) => {
              tr.append($("<td>").text(row[col.key] || ""));
            });
          });
        } else {
          $("#mvcd-count").text("0");
          $mvcdTbody.append(
            $("<tr>").append(
              $("<td>")
                .attr("colspan", columnsMVCD.length + 1)
                .addClass("no-data")
                .text("No MVCD data available.")
            )
          );
        }
      },
    });
  }, 10000);

  // Fetch Transaction data and update
  frappe.call({
    method: "sahayog.sahayog.page.mvcd_status.mvcd.get_pending_transactions",
    args: {},
    callback: function (r) {
      $transTbody.empty();
      if (
        r.message &&
        r.message.status === "success" &&
        r.message.data.length
      ) {
        $("#transaction-count").text(`${r.message.data.length}`);
        r.message.data.forEach((row, idx) => {
          const tr = $("<tr>").appendTo($transTbody);
          tr.append($("<td>").text(idx + 1));
          columnsTrans.forEach((col) => {
            tr.append($("<td>").text(row[col.key] || ""));
          });
        });
      } else {
        $("#transaction-count").text("0");
        $transTbody.append(
          $("<tr>").append(
            $("<td>")
              .attr("colspan", columnsTrans.length + 1)
              .addClass("no-data")
              .text("No transaction data available.")
          )
        );
      }
    },
  });

  setInterval(() => {
    // Fetch Transaction data and update
    frappe.call({
      method: "sahayog.sahayog.page.mvcd_status.mvcd.get_pending_transactions",
      args: {},
      callback: function (r) {
        $transTbody.empty();
        if (
          r.message &&
          r.message.status === "success" &&
          r.message.data.length
        ) {
          console.log("Updating Transaction data...", r.message.data);
          $("#transaction-count").text(`${r.message.data.length}`);
          r.message.data.forEach((row, idx) => {
            const tr = $("<tr>").appendTo($transTbody);
            tr.append($("<td>").text(idx + 1));
            columnsTrans.forEach((col) => {
              tr.append($("<td>").text(row[col.key] || ""));
            });
          });
        } else {
          $("#transaction-count").text("0");
          $transTbody.append(
            $("<tr>").append(
              $("<td>")
                .attr("colspan", columnsTrans.length + 1)
                .addClass("no-data")
                .text("No transaction data available.")
            )
          );
        }
      },
    });
  }, 10000);
};

// Countdown timer setup
// let refreshSeconds = 10;
// $("#refresh-timer").text(refreshSeconds);

// const countdownInterval = setInterval(() => {
//   refreshSeconds--;
//   if (refreshSeconds <= 0) {
//     refreshSeconds = 10; // Reset countdown
//   }
//   $("#refresh-timer").text(
//     refreshSeconds < 10 ? "0" + refreshSeconds : refreshSeconds
//   );
// }, 1000);

//             frappe.call({
//   method: "sahayog.sahayog.page.mvcd_status.mvcd.check_user_access",
//   callback: function(r) {
//     if (!r.message || !r.message.allowed) {
//       frappe.msgprint(__("You are not authorized to access this page."));
//       frappe.set_route('desk'); // or any other route
//     } else {
//       // User is authorized; continue with page setup
//       render_mvcd_status_page();
//     }
//   }
// });

// function render_mvcd_status_page() {
//   // Your existing code for setting up the page
//   // Move all the code from on_page_load here
// }
