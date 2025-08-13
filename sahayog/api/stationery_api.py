import frappe

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

from frappe import _
from erpnext.stock.report.stock_balance.stock_balance import execute

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
        SELECT sed.item_code, sed.item_name, sed.basic_rate
        FROM `tabStock Entry Detail` sed
        INNER JOIN `tabStock Entry` se ON se.name = sed.parent
        WHERE se.docstatus = 1
        ORDER BY se.creation DESC
        LIMIT 50
    """, as_dict=True)


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