frappe.pages['mvcd-status'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '',
        single_column: true
    });

    const cardHtml = `
<style>
.container-flex {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: nowrap; /* No wrapping to keep side by side */
    overflow-x: auto; /* allow horizontal scroll if absolutely needed */
    padding-bottom: 10px;
    margin-top: 10px;
}

.column {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.custom-card {
    height: 36px;
    margin-bottom: 10px;
    padding: 0 1rem;
    border-radius: 12px;
    background: #0066f4;
    color: #fff;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: default;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
    width: fit-content; /* shrink to content */
    max-width: 320px;
}

.custom-card:hover {
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    transform: translateY(-2px);
}

h4 {
    margin: 10px 0 7px;
    font-weight: 600;
    text-align: center;
    font-size: 0.8rem;
}

table.table {
    font-size: 0.65rem;
    border-collapse: collapse;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-top: 04px;
    margin-bottom: 30px;
    width: max-content; /* shrink to fit content */
    min-width: 200px;
}

table thead th {
    fontsize: 0.80rem;
}
table thead th, table tbody td {
    
    white-space: wrap;
    overflow: display;
    word-wrap: break-word;
    text-overflow: ellipsis;
    max-width: 100px; /* maximum width per cell */
}

table thead th {
    background: #0066f4;
    color: #fff;
}

.table th, .table td {
    padding: 5px;
    
}

.no-data {
    padding: 15px;
    text-align: center;
    color: #555;
    font-size: 1rem;
}
</style>


<h4>Refresh in: <span id="refresh-timer">10</span> seconds</h4> <br> 
    <div class="container-flex">
    <div class="column">
        <div class="custom-card mvcd-card" id="mvcd-card">
            MVCD Pending Count: <span id="mvcd-count"> Loading...</span>
        </div>
        <h4>MVCD Status</h4>
        <table class="table" id="mvcd-table">
            <thead></thead>
            <tbody></tbody>
        </table>
    </div>
    
    <div class="column">
        <div class="custom-card transaction-card" id="transaction-card">
            Transaction Pending Count: <span id="transaction-count"> Loading...</span>
        </div>
        <h4>Pending Transactions</h4>
        <table class="table" id="transaction-table">
            <thead></thead>
            <tbody></tbody>
        </table>
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
        { key: "sol_desc", label: "Branch Description" }
    ];
    const $mvcdTable = $('#mvcd-table');
    const $mvcdThead = $mvcdTable.find('thead');
    const $mvcdTbody = $mvcdTable.find('tbody');
    const mvcdHeaderRow = $('<tr>');
    mvcdHeaderRow.append($('<th>').text('S. No.'));
    columnsMVCD.forEach(col => mvcdHeaderRow.append($('<th>').text(col.label)));
    $mvcdThead.append(mvcdHeaderRow);
    $mvcdTbody.append($('<tr>').append($('<td>').attr('colspan', columnsMVCD.length + 1).text('Loading MVCD data...').css('text-align', 'center')));

    // Prepare Transaction table headers
    const columnsTrans = [
        { key: "tran_id", label: "Transaction ID" },
        { key: "dth_init_sol_id", label: "Initial Branch ID" },
        { key: "sol_desc", label: "Branch Description" },
        { key: "tran_type", label: "Transaction Type" },
        { key: "tran_sub_type", label: "Transaction Sub-Type" },
        { key: "entry_user_id", label: "Entry User ID" }
    ];
    const $transTable = $('#transaction-table');
    const $transThead = $transTable.find('thead');
    const $transTbody = $transTable.find('tbody');
    const transHeaderRow = $('<tr>');
    transHeaderRow.append($('<th>').text('S. No.'));
    columnsTrans.forEach(col => transHeaderRow.append($('<th>').text(col.label)));
    $transThead.append(transHeaderRow);
    $transTbody.append($('<tr>').append($('<td>').attr('colspan', columnsTrans.length + 1).text('Loading Transaction data...').css('text-align', 'center')));

    // Fetch MVCD data and update
    frappe.call({
        method: 'sahayog.sahayog.page.mvcd_status.mvcd.get_mvcd_status',
        args: {},
        callback: function(r) {
            $mvcdTbody.empty();
            if (r.message && r.message.status === 'success' && r.message.data.length) {
                $('#mvcd-count').text(`${r.message.data.length}`);
                r.message.data.forEach((row, idx) => {
                    const tr = $('<tr>').appendTo($mvcdTbody);
                    tr.append($('<td>').text(idx + 1));
                    columnsMVCD.forEach(col => {
                        tr.append($('<td>').text(row[col.key] || ''));
                    });
                });
            } else {
                $('#mvcd-count').text('0');
                $mvcdTbody.append($('<tr>').append($('<td>').attr('colspan', columnsMVCD.length + 1).addClass('no-data').text('No MVCD data available.')));
            }
        }
    });


    setInterval(() => {
        frappe.call({
        method: 'sahayog.sahayog.page.mvcd_status.mvcd.get_mvcd_status',
        args: {},
        callback: function(r) {
            $mvcdTbody.empty();
            if (r.message && r.message.status === 'success' && r.message.data.length) {
                // console.log("Updating MVCD data...", r.message.data);
                $('#mvcd-count').text(`${r.message.data.length}`);
                r.message.data.forEach((row, idx) => {
                    const tr = $('<tr>').appendTo($mvcdTbody);
                    tr.append($('<td>').text(idx + 1));
                    columnsMVCD.forEach(col => {
                        tr.append($('<td>').text(row[col.key] || ''));
                    });
                });
            } else {
                $('#mvcd-count').text('0');
                $mvcdTbody.append($('<tr>').append($('<td>').attr('colspan', columnsMVCD.length + 1).addClass('no-data').text('No MVCD data available.')));
            }
        }
    });

    }, 10000);


    // Fetch Transaction data and update
    frappe.call({
        method: 'sahayog.sahayog.page.mvcd_status.mvcd.get_pending_transactions',
        args: {},
        callback: function(r) {
            $transTbody.empty();
            if (r.message && r.message.status === 'success' && r.message.data.length) {

                $('#transaction-count').text(`${r.message.data.length}`);
                r.message.data.forEach((row, idx) => {
                    const tr = $('<tr>').appendTo($transTbody);
                    tr.append($('<td>').text(idx + 1));
                    columnsTrans.forEach(col => {
                        tr.append($('<td>').text(row[col.key] || ''));
                    });
                });
            } else {
                $('#transaction-count').text('0');
                $transTbody.append($('<tr>').append($('<td>').attr('colspan', columnsTrans.length + 1).addClass('no-data').text('No transaction data available.')));
            }
        }
    });

    setInterval(() => {
         // Fetch Transaction data and update
    frappe.call({
        method: 'sahayog.sahayog.page.mvcd_status.mvcd.get_pending_transactions',
        args: {},
        callback: function(r) {
            $transTbody.empty();
            if (r.message && r.message.status === 'success' && r.message.data.length) {
                // console.log("Updating Transaction data...", r.message.data);
                $('#transaction-count').text(`${r.message.data.length}`);
                r.message.data.forEach((row, idx) => {
                    const tr = $('<tr>').appendTo($transTbody);
                    tr.append($('<td>').text(idx + 1));
                    columnsTrans.forEach(col => {
                        tr.append($('<td>').text(row[col.key] || ''));
                    });
                });
            } else {
                $('#transaction-count').text('0');
                $transTbody.append($('<tr>').append($('<td>').attr('colspan', columnsTrans.length + 1).addClass('no-data').text('No transaction data available.')));
            }
        }
    });

    }, 10000);
}


// Countdown timer setup
let refreshSeconds = 10;
$('#refresh-timer').text(refreshSeconds);

const countdownInterval = setInterval(() => {
    refreshSeconds--;
    if (refreshSeconds <= 0) {
        refreshSeconds = 10;  // Reset countdown
    }
    $('#refresh-timer').text(refreshSeconds < 10 ? '0' + refreshSeconds : refreshSeconds);
}, 1000);
