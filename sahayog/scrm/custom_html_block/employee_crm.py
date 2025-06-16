import frappe

def execute():
    html_content="""<iframe src="/crm-portal" width="100%" height="610px" style="border: none;"></iframe>"""

    custom_block = frappe.db.exists('Custom HTML Block', 'Employee CRM')
    if custom_block:
        # Update the existing Custom HTML Block
        doc = frappe.get_doc('Custom HTML Block', 'Employee CRM')
        doc.html = html_content
        doc.save()
        print("✅ Updated Custom HTML Block: Employee CRM")

    else:
        # Create a new Custom HTML Block if it doesn't exist
        frappe.get_doc({
            'doctype': 'Custom HTML Block',
            'name': 'Employee CRM',
            'html': html_content,
        }).insert()
        
        print("✅ Created Custom HTML Block: Employee CRM")

