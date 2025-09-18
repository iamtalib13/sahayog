import frappe
from erpnext.stock.report.stock_balance.stock_balance import execute

# sahayog/procurement/api/stock_balance_ledger.get_stock_balance_data
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
        _, data = execute(filters)
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