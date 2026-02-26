import frappe
from frappe import _

@frappe.whitelist()
def bulk_submit_requests(docnames):
    if isinstance(docnames, str):
        docnames = frappe.parse_json(docnames)
    
    completed = 0
    errors = []
    
    for name in docnames:
        try:
            doc = frappe.get_doc("Employee Material Request", name)
            
            if doc.status == "Draft":
                doc.status = "Pending Reporting Person"
                doc.save()
                frappe.db.commit()
                completed += 1
            else:
                errors.append(_("{0} is not in Draft status").format(name))
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), _("Bulk Submit Error for {0}").format(name))
            errors.append(_("Error submitting {0}: {1}").format(name, str(e)))
            
    return {
        "completed": completed,
        "errors": errors
    }

@frappe.whitelist()
def get_available_serial_nos(doctype, txt, searchfield, start, page_len, filters):
    # Get all serial numbers used in any Asset record (including cancelled ones)
    used_serial_nos = frappe.get_all("Asset", 
        fields=["serial_no"],
        pluck="serial_no"
    )
    
    # Clean None/empty values and get unique set
    used_serial_nos = list(set([s for s in used_serial_nos if s]))
    
    # Build query
    if used_serial_nos:
        return frappe.db.sql(f"""
            select name from `tabSerial No`
            where name not in ({', '.join(['%s'] * len(used_serial_nos))})
            and name like %s
            order by name asc
            limit %s, %s
        """, (*used_serial_nos, f"%{txt}%", start, page_len))
    else:
        return frappe.db.sql("""
            select name from `tabSerial No`
            where name like %s
            order by name asc
            limit %s, %s
        """, (f"%{txt}%", start, page_len))

@frappe.whitelist()
def create_asset_movement_custom(doc_data):
    if isinstance(doc_data, str):
        doc_data = frappe.parse_json(doc_data)
    
    # Create Asset Movement
    doc = frappe.get_doc(doc_data)
    doc.insert()
    
    update_asset_custodians(doc.name)
    return doc.name

@frappe.whitelist()
def create_asset_movement_from_emmr_custom(emmr, assets):
    from sahayog.procurement.api.stock_balance_ledger import create_asset_movement_from_emmr
    
    if isinstance(assets, str):
        assets = frappe.parse_json(assets)
        
    am_name = create_asset_movement_from_emmr(emmr, assets)
    
    if am_name:
        update_asset_custodians(am_name)
        
    return am_name

def update_asset_custodians(am_name):
    doc = frappe.get_doc("Asset Movement", am_name)
    # Support both 'assets' and 'items' child table names
    items = doc.get("assets") or doc.get("items") or []
    for item in items:
        # Check both common field names for employee recipient
        recipient = item.get("to_employee") or item.get("employee")
        if item.get("asset") and recipient:
            asset = frappe.get_doc("Asset", item.asset)
            if not asset.custodian:
                asset.custodian = recipient
                asset.save(ignore_permissions=True)
                frappe.db.commit()

@frappe.whitelist()
def get_assets_with_movements():
    """Returns a list of unique asset names that appear in any SUBMITTED Asset Movement."""
    return frappe.db.sql_list("""
        SELECT DISTINCT ami.asset 
        FROM `tabAsset Movement Item` ami
        JOIN `tabAsset Movement` am ON ami.parent = am.name
        WHERE am.docstatus = 1
    """)
