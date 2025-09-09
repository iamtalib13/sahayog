import frappe
import json
import frappe
from frappe.model.document import Document
from frappe import _
from erpnext.stock.report.stock_balance.stock_balance import execute


@frappe.whitelist()
def get_stock_ledger_entries(item_code=None, warehouse=None):
    filters = {}

    if item_code:
        filters["item_code"] = item_code
    if warehouse:
        filters["warehouse"] = warehouse

    entries = frappe.get_all(
        "Stock Ledger Entry",
        filters=filters,
        fields=[
            "posting_date", "posting_time", "item_code",
            "warehouse", "actual_qty", "voucher_type",
            "voucher_no", "stock_uom"
        ],
        order_by="posting_date desc, posting_time desc"
    )

    # ✅ Pure Python Table Print
    if entries:
        headers = [
            "Posting Date", "Posting Time", "Item Code", "Warehouse",
            "Actual Qty", "Voucher Type", "Voucher No", "Stock UOM"
        ]
        print("-" * 140)
        print("{:<15} {:<15} {:<20} {:<15} {:<10} {:<20} {:<25} {:<10}".format(*headers))
        print("-" * 140)

        for entry in entries:
            print("{:<15} {:<15} {:<20} {:<15} {:<10} {:<20} {:<25} {:<10}".format(
                str(entry["posting_date"]),
                str(entry["posting_time"]),
                entry["item_code"],
                entry["warehouse"],
                entry["actual_qty"],
                entry["voucher_type"],
                entry["voucher_no"],
                entry["stock_uom"]
            ))
        print("-" * 140)
    else:
        print("No entries found.")

    return entries

@frappe.whitelist()
def get_balance_from_sle(item_code=None, warehouse=None):
    # Build filters dynamically
    filters = []
    if item_code:
        filters.append(f"item_code='{item_code}'")
    if warehouse:
        filters.append(f"warehouse='{warehouse}'")
    
    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

    # SQL to get stock balance and latest valuation rate
    query = f"""
        SELECT 
            name,
            item_code,
            warehouse,
            SUM(actual_qty) AS actual_qty,
            (
                SELECT valuation_rate 
                FROM `tabStock Ledger Entry` sle2
                WHERE sle2.item_code = sle.item_code 
                  AND sle2.warehouse = sle.warehouse
                ORDER BY posting_date DESC, posting_time DESC, creation DESC
                LIMIT 1
            ) AS valuation_rate
        FROM `tabStock Ledger Entry` sle
        {where_clause}
        GROUP BY item_code, warehouse
    """
    
    return frappe.db.sql(query, as_dict=True)

#//api/method/sahayog.api.stationery_api.get_stock_balance_data
@frappe.whitelist(allow_guest=True)
def get_stock_balance_data(company=None, from_date=None, to_date=None, item_code=None, warehouse=None):
    """
    API to fetch Stock Balance Report records using Frappe's own report logic
    """

    # Convert to frappe._dict
    filters = frappe._dict({
        "company": company or frappe.defaults.get_user_default("Company"),
        "from_date": from_date or frappe.utils.add_days(frappe.utils.today(), -30),
        "to_date": to_date or frappe.utils.today()
    })

    if item_code:
        filters["item_code"] = item_code
    if warehouse:
        filters["warehouse"] = warehouse

    try:
        columns, data = execute(filters)
        return {
            "status": "success",
            "total_records": len(data),
            "data": data
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Stock Balance API Error")
        return {
            "status": "error",
            "message": str(e)
        }

# //api/method/sahayog.api.stationery_api.get_stock_entry_items
@frappe.whitelist()
def get_stock_entry_items():
    return frappe.db.sql("""
        SELECT sed.item_code, sed.item_name, sed.basic_rate, sed.t_warehouse,sed.qty
        FROM `tabStock Entry Detail` sed
        INNER JOIN `tabStock Entry` se ON se.name = sed.parent
        WHERE se.docstatus = 1
        ORDER BY se.creation DESC
        LIMIT 50
    """, as_dict=True)
# //api/method/sahayog.api.stationery_api.get_asset_entries
@frappe.whitelist()
def get_asset_entries(item_code=None, location=None):

    filters = {}
    if item_code:
        filters["item_code"] = item_code
    if location:
        filters["location"] = location

    entries = frappe.get_all(
        "Asset",
        filters=filters,
        fields=[
            "name",                     # Asset ID
            "item_code",               # Item Code
            "asset_name",              # Asset Name
            "location",                # Location
            "purchase_receipt",        # Purchase Receipt
            "purchase_invoice",        # Purchase Invoice
            "purchase_date",           # Purchase Date
            "available_for_use_date",  # Available-for-use Date
            "gross_purchase_amount"    # Net Purchase Amount (change if your field is named differently)
        ]
    )

    
    return entries

# //api/method/sahayog.api.stationery_api.get_asset_movements
@frappe.whitelist()
def get_asset_movements(company=None, asset=None, purpose=None):
    """
    Asset Movement records fetch karta hai specified filters ke saath.
    Optional filters: company, asset, purpose
    """
    # Master record filters
    master_filters = {}
    if company:
        master_filters["company"] = company
    if purpose:
        master_filters["purpose"] = purpose

    # Master table se records lo
    master_records = frappe.get_all(
        "Asset Movement",
        filters=master_filters,
        fields=["name", "company", "purpose", "transaction_date"],
        order_by="transaction_date desc"
    )

    results = []

    for record in master_records:
        # Child table fetch karo
        child_filters = {"parent": record.name}
        if asset:
            child_filters["asset"] = asset

        assets = frappe.get_all(
            "Asset Movement Item",
            filters=child_filters,
            fields=["asset"]
        )

        for a in assets:
            results.append({
                "company": record.company,
                "purpose": record.purpose,
                "transaction_date": record.transaction_date,
                "asset": a.asset
            })

    # Debug print
    if results:
        headers = ["Company", "Purpose", "Transaction Date", "Asset"]
        print("-" * 100)
        print("{:<25} {:<20} {:<20} {:<25}".format(*headers))
        print("-" * 100)
        for r in results:
            print("{:<25} {:<20} {:<20} {:<25}".format(
                r.get("company", ""),
                r.get("purpose", ""),
                str(r.get("transaction_date", "")),
                r.get("asset", "")
            ))
        print("-" * 100)
    else:
        print("No asset movements found.")

    return results

@frappe.whitelist()
def create_asset(asset):
    # If asset is received as string, convert to dict
    if isinstance(asset, str):
        asset = json.loads(asset)

    doc = frappe.new_doc("Asset")
    doc.item_code = asset.get("item_code")
    doc.asset_name = asset.get("asset_name")
    doc.location = asset.get("location")
    doc.purchase_date = asset.get("purchase_date")
    doc.is_composite_asset = int(asset.get("is_composite", 1))  # Match doctype field name
    doc.insert()
    frappe.db.commit()
    return {"name": doc.name}

# //api/method/sahayog.api.stationery_api.get_outward_entries
@frappe.whitelist()
def get_outward_entriess():
    # Fetch recent outward (Material Issue) entries
    entries = frappe.get_all(
        "Stock Entry",
        fields=["name", "stock_entry_type", "posting_date", "docstatus"],
        filters={"stock_entry_type": "Material Issue"},
        order_by="creation desc",
        limit=50
    )

    result = []
    for entry in entries:
        # Fetch child rows
        details = frappe.get_all(
            "Stock Entry Detail",
            fields=["item_code", "qty", "s_warehouse"],
            filters={"parent": entry.name}
        )

        # You can compute or fetch available qty here
        # For demo: use qty as "available qty"
        for d in details:
            d["available_qty"] = d.qty  # or your logic here

        result.append({
            "entry": entry,
            "items": details
        })

    return result

# //api/method/sahayog.api.stationery_api.get_inward_list
@frappe.whitelist()
def get_inward_list():
    receipts = frappe.get_list(
        "Purchase Receipt",
        fields=["name", "supplier", "posting_date", "status"],
        limit_page_length=50,
    )

    # Add qty manually
    for r in receipts:
        r["total_qty"] = frappe.db.sql(
            "SELECT SUM(qty) FROM `tabPurchase Receipt Item` WHERE parent=%s",
            r.name
        )[0][0] or 0

    return receipts

# // api/method/sahayog.api.stationery_api.get_user_warehouse
@frappe.whitelist()
def get_user_warehouse(user=None):
    """Return warehouse for the given user from Sahayog Settings child table"""

    if not user:
        user = frappe.session.user  # logged-in user email like 8466@gmail.com

    # Fetch settings (Single Doctype)
    settings = frappe.get_single("Sahayog Settings")

    # Loop through correct child table fieldname
    for row in settings.wh_dept_map:
        if row.user_id == user:
            return {
                "warehouse": row.warehouse,
                "item_department": row.item_department
            }

    return {
        "warehouse": None,
        "message": f"No warehouse assigned for user {user}"
    }

# // api/method/sahayog.api.stationery_api.get_stock_entry_submissions
@frappe.whitelist()
def get_outward_entries(company=None, from_date=None, to_date=None, submitted_only=False):
    """Fetch Stock Entry (parent) + Items (child) with optional filters + respect permission query."""

    user = frappe.session.user
    if user == "Administrator":
        allowed_departments = None  # no restriction
    else:
        allowed_departments = frappe.get_all(
            "Default Warehouse",
            filters={"parenttype": "Sahayog Settings", "user_id": user},
            pluck="item_department"
        )

        if not allowed_departments:
            return []  # user has no access

    # Build filters
    master_filters = {}
    if company:
        master_filters["company"] = company
    if from_date and to_date:
        master_filters["posting_date"] = ["between", [from_date, to_date]]
    elif from_date:
        master_filters["posting_date"] = [">=", from_date]
    elif to_date:
        master_filters["posting_date"] = ["<=", to_date]
    if submitted_only:
        master_filters["docstatus"] = 1
    if allowed_departments:
        master_filters["custom_department"] = ["in", allowed_departments]

    # Get parent records with ORM
    parents = frappe.get_all(
        "Stock Entry",
        filters=master_filters,
        fields=["name", "posting_date", "company", "purpose", "docstatus", "custom_department", "modified"],
        order_by="posting_date desc"
    )
    if not parents:
        return []

    parent_names = [p["name"] for p in parents]

    # Get child rows in one query
    children = frappe.get_all(
        "Stock Entry Detail",
        filters={"parent": ["in", parent_names]},
        fields=["parent", "s_warehouse", "t_warehouse", "item_code", "qty", "basic_rate"],
        order_by="idx"
    )

    # Attach children to parents
    child_map = {}
    for c in children:
        child_map.setdefault(c["parent"], []).append({
            "source_warehouse": c["s_warehouse"],
            "target_warehouse": c["t_warehouse"],
            "item_code": c["item_code"],
            "qty": c["qty"],
            "basic_rate": c["basic_rate"],
        })

    # Final response
    status_map = {0: "Draft", 1: "Submitted", 2: "Cancelled"}
    for p in parents:
        p["status"] = status_map.get(p["docstatus"], "Unknown")
        p["items"] = child_map.get(p["name"], [])
        p.pop("docstatus", None)

    return parents

# // api/method/sahayog.api.stationery_api.get_available_qty
@frappe.whitelist()
def get_available_qty(item_code, warehouse):
    # Sum actual_qty in Stock Ledger Entries for item and warehouse to get current stock balance
    qty = frappe.db.sql("""
        SELECT SUM(actual_qty)
        FROM `tabStock Ledger Entry`
        WHERE item_code=%s AND warehouse=%s
    """, (item_code, warehouse))

    return qty[0][0] or 0

# // api/method/sahayog.api.stationery_api.update_asset_state
@frappe.whitelist()
def update_asset_state(asset_name, new_state):
    asset = frappe.get_doc("Asset", asset_name)
    asset.lifecycle_state = new_state
    asset.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "success", "new_state": new_state}

# //api/method/sahayog.api.stationery_api.get_movements_for_asset  thsi is for the client script asset life cycle
@frappe.whitelist()
def get_movements_for_asset(asset_name):
    # Use system permissions to fetch all movements linked to this asset
    # This bypasses the user's limited permissions in client calls
    movements = frappe.db.sql("""
        SELECT am.name, am.purpose
        FROM `tabAsset Movement` am
        INNER JOIN `tabAsset Movement Item` ami ON ami.parent = am.name
        WHERE ami.asset = %s
        ORDER BY am.transaction_date DESC
        LIMIT 50
    """, asset_name, as_dict=True)
    
    return movements

# ac