import frappe


def execute():
    # Insert a new Custom HTML Block document named 'Sahayog Project'
    html_content = """ 
    <div class="chart-container">
    <div class="chart-header">
        <h2>Zone vs Region Breakdown</h2>
    </div>
    <div id="zone-region-chart" class="chart"></div>  <!-- Chart container -->
    </div>
    """

    css_content = """ """

    js_content = """ 
frappe.call({
    method: "sahayog.scrm.api.sahayog_crm_dashboard.get_zone_region_data_lead",
    callback: function(r) {
        console.log("Full API Response:", r.message);

        if (typeof root_element === "undefined" || !root_element) {
            console.error("Error: root_element is not available.");
            return;
        }

        let chartContainer = root_element.querySelector("#zone-region-chart");
        if (!chartContainer) {
            console.error("Error: Chart container is missing in the DOM.");
            return;
        }

        if (r.message && r.message.labels && r.message.datasets) {
            // Clear any previous charts
            chartContainer.innerHTML = "";

            // Render the chart with optimized light colors
            new frappe.Chart(chartContainer, {
                title: "Zone-wise Region Distribution",
                data: r.message,
                type: "bar",
                height: 400,
                colors: [
                    "#76c7c0",  // Soft Teal
                    "#a4d4ae",  // Soft Green
                    "#f7b267",  // Soft Orange
                    "#f28b82",  // Soft Red
                    "#d7aefb"   // Soft Purple
                ],
                barOptions: {
                    stacked: true
                },
                axisOptions: {
                    xIsSeries: true
                }
            });

            console.log("Stacked Bar Chart successfully rendered with improved light colors.");
        } else {
            console.error("Invalid chart data:", r.message);
        }
    }
});
"""


    # Check if Custom HTML Block already exists
    custom_block = frappe.db.exists('Custom HTML Block', 'L-Zone and Region wise Data')
    if custom_block:
        doc = frappe.get_doc('Custom HTML Block', 'L-Zone and Region wise Data')
        doc.html = html_content
        doc.style = css_content
        doc.script = js_content
        doc.save()
        print("Updated Custom HTML Block: L-Zone and Region wise Data")
    else:
        frappe.get_doc({
            'doctype': 'Custom HTML Block',
            'name': 'L-Zone and Region wise Data',
            'html': html_content,
            'style': css_content,
            'script': js_content
        }).insert()
        print("Created Custom HTML Block: L-Zone and Region wise Data")
        
    frappe.db.commit()







