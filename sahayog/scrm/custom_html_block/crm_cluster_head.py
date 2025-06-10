import frappe


def execute():
    # Insert a new Custom HTML Block document named 'Sahayog Project'
    html_content = """ 
     <iframe src="/crm_cluster_dashboard" width="100%" height="500px" style="border: none;"></iframe>
    """

    css_content = """ """

    js_content = """ """


    # Check if Custom HTML Block already exists
    custom_block = frappe.db.exists('Custom HTML Block', 'CRM-Cluster Head')
    if custom_block:
        doc = frappe.get_doc('Custom HTML Block', 'CRM-Cluster Head')
        doc.html = html_content
        doc.style = css_content
        doc.script = js_content
        doc.save()
        print("Updated Custom HTML Block: CRM-Cluster Head")
    else:
        frappe.get_doc({
            'doctype': 'Custom HTML Block',
            'name': 'CRM-Cluster Head',
            'html': html_content,
            'style': css_content,
            'script': js_content
        }).insert()
        print("Created Custom HTML Block: CRM-Cluster Head")
        
    frappe.db.commit()







