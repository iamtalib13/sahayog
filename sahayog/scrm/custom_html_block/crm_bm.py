import frappe


def execute():
    # Insert a new Custom HTML Block document named 'Sahayog Project'
    html_content = """  <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Branch Manager Dashboard</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="css/dashboard.css">
     <script src="https://cdn.jsdelivr.net/npm/frappe-charts@1.6.0/dist/frappe-charts.min.iife.js"></script>
     
</head>
<body>

<div class="container">
    <div class="row align-items-center">
  <div class="col d-flex justify-content-between">
    <h3>CRM-Branch Manager</h3>
    <a
      href="/crm/leads/view"
      class="crm-portal-button"
      target="_blank"
      style="text-decoration: none; color: #007bff; font-weight: bold; color:rgb(77 113 151);"
    >
      CRM Portal
      <span class="redirect-icon">🔗</span>
    </a>
  </div>
</div>

    <div class="row">
        <div class="col-md-3">
            <div class="dashboard-card bg-total">
                <h5>Total Leads</h5>
                <h3 id="total_leads">0</h3>
            </div>
        </div>
        <div class="col-md-3">
            <div class="dashboard-card bg-converted">
                <h5>Converted Leads</h5>
                <h3 id="converted_leads">0</h3>
            </div>
        </div>
        <div class="col-md-3">
            <div class="dashboard-card bg-assigned">
                <h5>Assigned Leads</h5>
                <h3 id="assigned_leads">0</h3>
            </div>
        </div>
        <div class="col-md-3">
            <div class="dashboard-card bg-rate">
                <h5>Conversion Rate (%)</h5>
                <h3 id="conversion_rate">0%</h3>
            </div>
        </div>
    </div>

    <!-- Status-wise Breakdown -->
    <div class="mt-4">
        <h4>Status-wise Breakdown</h4>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody id="status_wise_table">
                <tr>
                    <td colspan="2">No data available</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Escalated Leads -->
    <div class="mt-4">
        <h4>Escalated Leads</h4>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Lead Name</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="escalated_leads_table">
                <tr>
                    <td colspan="2">No escalated leads found</td>
                </tr>
            </tbody>
        </table>
    </div>
     <!-- User-wise Leads Chart -->
   <div class="d-flex align-items-center justify-content-between mt-4">
  <h4 id="user-wise-heading">User-wise Leads</h4>
  <a href="#" id="view-report-link" style="display:none; text-decoration:none; font-weight:bold; color:rgb(77 113 151);">
    View Report 🔗
  </a>
</div>

<div id="user-wise-chart" style="height: 300px;"></div>

</div>

<script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>


</body>
</html>

    

    """

    css_content = """ 

/* Dashboard Card Styles */
.dashboard-card {
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    color: white;
    text-align: center;
}

.bg-total {
    background-color: #7d9fc3;
}

.bg-converted {
    background-color: #71b781;
}

.bg-assigned {
    background-color: #c1ae75;
    color: black;
}

.bg-rate {
    background-color: #6a9fa7;
}
    
        """

    js_content = """  // 🔄 Get all the elements from root_element (provided by Frappe)
const totalLeadsElement = root_element.querySelector('#total_leads');
const convertedLeadsElement = root_element.querySelector('#converted_leads');
const assignedLeadsElement = root_element.querySelector('#assigned_leads');
const conversionRateElement = root_element.querySelector('#conversion_rate');
const statusWiseTable = root_element.querySelector('#status_wise_table');
const escalatedLeadsTable = root_element.querySelector('#escalated_leads_table');
const userWiseChartContainer = root_element.querySelector('#user-wise-chart'); // ✅ Correct way to access the chart container
const userWiseHeading = root_element.querySelector('#user-wise-heading');
const viewReportLink = root_element.querySelector('#view-report-link');  // The link element for redirect


// 🌐 Fetch Data from Server
frappe.call({
    method: "sahayog.scrm.api.branch_manager_dashboard.get_branch_manager_dashboard",
}).then(response => {
    const data = response.message;
    console.log(data);

    // 🔄 Update the UI elements
    totalLeadsElement.textContent = data.total_leads;
    convertedLeadsElement.textContent = data.converted_leads;
    assignedLeadsElement.textContent = data.assigned_leads;
    conversionRateElement.textContent = `${data.conversion_rate}%`;

    // 🔄 Populate Status-wise Breakdown Table
    statusWiseTable.innerHTML = ''; // Clear existing content
    if (data.status_wise.length > 0) {
        data.status_wise.forEach((status) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${status.status}</td>
                <td>${status.count}</td>
            `;
            statusWiseTable.appendChild(row);
        });
    } else {
        statusWiseTable.innerHTML = `<tr><td colspan="2">No data available</td></tr>`;
    }

    // 🔄 Populate Escalated Leads Table
    escalatedLeadsTable.innerHTML = ''; // Clear existing content
    if (data.escalated_leads.length > 0) {
        let rows = '';
        data.escalated_leads.forEach(lead => {
            rows += `
                <tr>
                    <td>${lead.name}</td>
                    <td>${lead.status}</td> 
                </tr>
            `;
        });
        escalatedLeadsTable.innerHTML = rows;
    } else {
        escalatedLeadsTable.innerHTML = `
            <tr>
                <td colspan="2">No escalated leads found</td>
            </tr>
        `;
    }
    
    // 🌟 Update the heading with the branch name AND show the report link
    if (data.branch) {
        userWiseHeading.textContent = `User-wise Leads for ${data.branch}`;

        // Show and set the redirect link
        if (viewReportLink) {
            viewReportLink.style.display = 'inline';  // Show the link
            viewReportLink.href = `/app/query-report/Branch%20User-wise%20Leads`;
            viewReportLink.target = "_blank"; // open report in a new tab
        }
    } else {
        // Hide the link if no branch info
        if (viewReportLink) {
            viewReportLink.style.display = 'none';
        }
    }

    
    // =============================
    // 🚀 User-wise Leads Chart
    // =============================
    if (data.user_wise_leads && data.user_wise_leads.length > 0) {
        // Extract data for the chart
        const userNames = data.user_wise_leads.map(item => item.lead_owner);
        const convertedCounts = data.user_wise_leads.map(item => item.converted_lead_count);  // Assumed field for converted leads
        const nonConvertedCounts = data.user_wise_leads.map(item => item.non_converted_lead_count);  // Assumed field for non-converted leads

        // 💡 Ensure the container is found before creating the chart
        if (userWiseChartContainer) {
            new frappe.Chart(userWiseChartContainer, {
                type: 'bar',  // Type of chart (bar chart)
                title: "User-wise Leads",  // Chart title
                data: {
                    labels: userNames,  // User names as labels
                    datasets: [
                        {
                            name: "Converted Leads",  // Dataset for converted leads
                            values: convertedCounts  // Converted lead counts for each user
                        },
                        {
                            name: "Non-Converted Leads",  // Dataset for non-converted leads
                            values: nonConvertedCounts  // Non-converted lead counts for each user
                        }
                    ]
                },
                height: 300,  // Chart height
                colors: ['#71b781', '#d78c91'],  // Colors for converted and non-converted leads
                axisOptions: {
                    xAxisMode: 'tick',  // Mode for the x-axis
                    xAxisFormat: 'string'  // Format for x-axis labels (user names)
                },
                barOptions: {
                    stacked: true  // Enable stacked bars for better visualization
                }
            });
        } else {
            console.error("Chart container not found");
        }
    } else {
        console.log("No data available for user-wise leads.");
    }
}).catch(error => {
    console.error("Error fetching dashboard data: ", error);
});



"""


    # Check if Custom HTML Block already exists
    custom_block = frappe.db.exists('Custom HTML Block', 'CRM-BM')
    if custom_block:
        doc = frappe.get_doc('Custom HTML Block', 'CRM-BM')
        doc.html = html_content
        doc.style = css_content
        doc.script = js_content
        doc.save()
        print("Updated Custom HTML Block: CRM-BM")
    else:
        frappe.get_doc({
            'doctype': 'Custom HTML Block',
            'name': 'CRM-BM',
            'html': html_content,
            'style': css_content,
            'script': js_content
        }).insert()
        print("Created Custom HTML Block: CRM-BM")
        
    frappe.db.commit()







