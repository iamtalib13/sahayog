frappe.pages['mvcd-status'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'MVCD Status',
        single_column: true
    });

    const cardHtml = `
    <style>
    /* [Same improved CSS from before here...] */
    .card {
        width: 220px;
        height: 160px;
        border-radius: 20px;
        background: linear-gradient(145deg, #f0f4ff, #d9e2ff);
        position: relative;
        padding: 2rem 2.2rem;
        border: 1.5px solid #a8b1d6;
        box-shadow: 0 8px 20px rgba(0, 140, 248, 0.15);
        transition: all 0.4s ease;
        overflow: visible;
        cursor: pointer;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin-bottom: 20px;
    }
    .card:hover {
        border-color: #0066f4;
        box-shadow: 0 15px 30px rgba(0, 115, 255, 0.3);
        transform: translateY(-5px);
    }
    .card-details {
        color: #1a1a1a;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 0.75em;
    }
    .text-title {
        font-size: 1.75em;
        font-weight: 700;
        color: #0047b3;
        letter-spacing: 0.02em;
        margin: 0;
    }
    .text-body {
        font-size: 1em;
        line-height: 1.5;
        color: #505766;
        margin: 0;
    }
    .card-button {
        position: absolute;
        left: 50%;
        bottom: 1.5rem;
        width: 65%;
        padding: 0.6rem 0;
        border-radius: 1.25rem;
        border: none;
        background: #0066f4;
        color: #fff;
        font-size: 1.1rem;
        font-weight: 600;
        transform: translate(-50%, 125%);
        opacity: 0;
        transition: all 0.35s ease;
        box-shadow: 0 4px 12px rgba(0, 102, 244, 0.4);
        cursor: pointer;
    }
    .card:hover .card-button {
        transform: translate(-50%, 60%);
        opacity: 1;
        box-shadow: 0 6px 18px rgba(0, 102, 244, 0.6);
    }
    .card-button:hover {
        background: #004bb5;
        box-shadow: 0 8px 22px rgba(0, 75, 181, 0.75);
    }
    table.table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
    }
    table.table thead th {
        background-color: #0066f4;
        color: white;
        padding: 10px;
        text-align: left;
    }
    table.table tbody td {
        padding: 8px 10px;
        border-bottom: 1px solid #ddd;
    }
    .no-data {
        padding: 20px;
        text-align: center;
        color: #888;
        font-size: 1.1em;
    }
    </style>

    <div class="card">
        <div class="card-details">
            <p class="text-title">MVCD Status Overview</p>
            <p class="text-body">Latest data from backend API.</p>
        </div>
    </div>
    `;


	
    // Append card HTML with styles to page body
    $(page.body).append(cardHtml);

    // Handler to test DB connection
	frappe.call({
    method: "sahayog.sahayog.page.mvcd_status.mvcd.test_db_connection",  // Replace with the correct path to your method
    callback: function(response) {
        const r = response.message;
        if(r.success) {
            frappe.msgprint({
                title: __('Success'),
                indicator: 'green',
                message: r.message
            });
        } else {
            frappe.msgprint({
                title: __('Error'),
                indicator: 'red',
                message: r.message
            });
        }
    }
});


    // Create container and table skeleton
    const container = $('<div>').appendTo(page.body);
    const table = $('<table class="table table-bordered">').appendTo(container);
    const thead = $('<thead>').appendTo(table);
    const headerRow = $('<tr>').appendTo(thead);

    const columns = ['sol_id', 'acct_name', 'foracid', 'clr_bal_amt', 'sol_desc'];

    columns.forEach(col => {
        headerRow.append($('<th>').text(col));
    });

    const tbody = $('<tbody>').appendTo(table);

    // Show loading text while fetching
    const loadingRow = $('<tr>').append(
        $('<td>').attr('colspan', columns.length).text('Loading data...').css('text-align', 'center')
    ).appendTo(tbody);

    // Fetch data from backend Frappe method
    frappe.call({
        method: 'sahayog.sahayog.page.mvcd_status.mvcd.get_mvcd_status',
        args: {}, // pass tran_date if needed
        callback: function(r) {
            tbody.empty(); // Clear loading row
            if (r.message && r.message.status === 'success' && r.message.data.length) {
                console.log(`   Data fetched:`, r.message.data);
                r.message.data.forEach(row => {
                    const tr = $('<tr>').appendTo(tbody);
                    columns.forEach(col => {
                        tr.append($('<td>').text(row[col] || ''));
                    });
                });
            } else {
                // Show no data message
                const noDataRow = $('<tr>').append(
                    $('<td>').attr('colspan', columns.length).addClass('no-data').text('No data available for the selected date.')
                ).appendTo(tbody);
            }
        },
        error: function() {
            tbody.empty();
            $('<tr>').append(
                $('<td>').attr('colspan', columns.length).addClass('no-data').text('Failed to load data from server.')
            ).appendTo(tbody);
        }
    });


}
