import frappe, json

def execute():
    path = '/home/suraiyya/frappe-bench/apps/sahayog/sahayog/hrms/print_format/office_order_termination_of_services/office_order_termination_of_services.json'
    with open(path) as f:
        d = json.load(f)
    
    frappe.db.set_value('Print Format', 'Office Order Termination of Services', 'css', d['css'])
    frappe.db.set_value('Print Format', 'Office Order Termination of Services', 'html', d['html'])
    
    fix_path = '/home/suraiyya/frappe-bench/apps/sahayog/sahayog/fixtures/print_format.json'
    with open(fix_path) as f:
        fix_data = json.load(f)
    for item in fix_data:
        if item['name'] == 'Office Order Termination of Services':
            item['css'] = d['css']
            item['html'] = d['html']
            break
    with open(fix_path, 'w') as f:
        json.dump(fix_data, f, indent=2)
    
    frappe.db.commit()
    print('Done')
