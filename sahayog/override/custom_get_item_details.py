import json
import frappe
from erpnext.stock.get_item_details import get_item_details

@frappe.whitelist()
def custom_get_item_details(args, doc=None, for_validate=False, overwrite_warehouse=True):
    
    # Call the original get_item_details method
    response = get_item_details(args, doc, for_validate, overwrite_warehouse)

    # If the setting is enabled, remove the qty field from the response
    if response:
        response.pop("description", None)  

    return response