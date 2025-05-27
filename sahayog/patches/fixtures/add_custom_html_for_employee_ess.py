import frappe

def execute():
    html_content="""<iframe src="/employee_ess?embedded=1" width="100%" height="500px" style="border: none;"></iframe>"""

    custom_block = frappe.db.exists('Custom HTML Block', 'Employee ESS')
    if custom_block:
        # Update the existing Custom HTML Block
        doc = frappe.get_doc('Custom HTML Block', 'Employee ESS')
        doc.html = html_content
        doc.save()
        print("✅ Updated Custom HTML Block: Employee ESS")

    else:
        # Create a new Custom HTML Block if it doesn't exist
        frappe.get_doc({
            'doctype': 'Custom HTML Block',
            'name': 'Employee ESS',
            'html': html_content,
        }).insert()
        
        print("✅ Created Custom HTML Block: Employee ESS")

