import frappe

def execute():
    item_groups = [
        {"item_group_name": "Consumable Item", "parent_item_group": "All Item Groups"},
        {"item_group_name": "Returnable Item", "parent_item_group": "All Item Groups"},
    ]

    for item in item_groups:
        if not frappe.db.exists("Item Group", item["item_group_name"]):
            item_group = frappe.get_doc({
                "doctype": "Item Group",
                "item_group_name": item["item_group_name"],
                "parent_item_group": item["parent_item_group"],
                "is_group": 0,  # Set to 1 if you want it as a parent group
            })
            item_group.insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"Item Group '{item['item_group_name']}' created successfully.")
        else:
            print(f"Item Group '{item['item_group_name']}' already exists.")
