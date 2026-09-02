import frappe, json

def execute():
    path = '/home/suraiyya/frappe-bench/apps/sahayog/sahayog/hrms/print_format/ex_parte_enquiry/ex_parte_enquiry.json'
    with open(path) as f:
        d = json.load(f)
    
    frappe.db.set_value('Print Format', 'Ex Parte Enquiry', 'css', d['css'])
    frappe.db.set_value('Print Format', 'Ex Parte Enquiry', 'html', d['html'])
    
    fix_path = '/home/suraiyya/frappe-bench/apps/sahayog/sahayog/fixtures/print_format.json'
    with open(fix_path) as f:
        fix_data = json.load(f)
    for item in fix_data:
        if item['name'] == 'Ex Parte Enquiry':
            item['css'] = d['css']
            item['html'] = d['html']
            break
    with open(fix_path, 'w') as f:
        json.dump(fix_data, f, indent=2)
    
    frappe.db.commit()
    print('Done')
