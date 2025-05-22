import frappe
from frappe.utils import now_datetime
from frappe.utils import strip_html  # Import strip_html to remove HTML tags
from frappe.model.naming import make_autoname

def create_purchase_receipt(doc, method):
    """Create a draft Purchase Receipt when a Purchase Order is submitted."""
    
    # Create a new Purchase Receipt
    pr = frappe.new_doc("Purchase Receipt")
    pr.supplier = doc.supplier
    pr.purchase_order = doc.name  # Link to the submitted Purchase Order
    pr.set_warehouse = doc.set_warehouse
    pr.custom_grn_srn = doc.custom_grn_srn
    pr.custom_request_for = doc.custom_request_for
    pr.custom_branch = doc.custom_branch
    pr.custom_project = doc.custom_project
    pr.project = doc.project
    
    # Copy items from PO to PR
    for item in doc.items:
        pr.append("items", {
            "item_code": item.item_code,
            "item_name": item.item_name,
            "description": item.description,
            "qty": item.qty,
            "uom": item.uom,
            "stock_uom": item.stock_uom,
            "conversion_factor": item.conversion_factor,
            "rate": item.rate,
            "amount": item.amount,
            "warehouse": item.warehouse,
            "purchase_order": doc.name  # Linking to PO item

        })
    
    # Save PR as Draft
    pr.insert()
    frappe.msgprint(f"Purchase Receipt {pr.name} created in Draft status.", alert=True)

def fetch_terms_conditions(doc, method):
    """Populate custom_terms_table with Terms and Conditions if it's empty. Logs success and errors."""

    try:
        if doc.get("custom_terms_table"):
            return  # Already populated, skip

        terms_conditions = frappe.get_all(
            "Terms and Conditions",
            fields=["title", "terms"],
        )

        for tc in terms_conditions:
            doc.append("custom_terms_table", {
                "title": strip_html(tc.title or ""),
                "terms": strip_html(tc.terms or ""),
                "show_tc": 1
            })

    except Exception as e:
        frappe.msgprint(f"Error fetching terms and conditions: {str(e)}", alert=True)

def get_short_fiscal_year():
    """Return the current Indian fiscal year in short format (YY-YY)."""
    today = now_datetime()
    start_year = today.year if today.month >= 4 else today.year - 1
    short_start = str(start_year)[-2:]  # Get last two digits of the start year
    short_end = str(start_year + 1)[-2:]  # Get last two digits of the next year
    return f"{short_start}-{short_end}"

def purchase_order_autoname(doc, method):
    """Set custom naming series for Purchase Order based on GRN or SRN."""
    fiscal_year = get_short_fiscal_year()  # Get dynamically calculated short fiscal year

    if doc.custom_po_wo == "Purchase Order":
        doc.name = make_autoname(f"SB/PO/{fiscal_year}/.#####")
    elif doc.custom_po_wo == "Work Order":
        doc.name = make_autoname(f"SB/WO/{fiscal_year}/.#####")

def get_po_progress_status_html(doc, method):
    html_content = frappe.render_template("sahayog/public/html/po_progress_status.html", {})
    return html_content  # No escaping here



def sync_project_field(doc, method):
    """
    Before Save: Sync custom_project value to project field
    """
    if doc.custom_project:
        doc.project = doc.custom_project
        frappe.logger().info(f"✅ Synced custom_project to project for {doc.name}")
    else:
        doc.project = None  # Optional: clear project if custom_project is empty
        frappe.logger().info(f"ℹ️ Cleared project for {doc.name} as custom_project is empty")

    
# def show_status_messages(doc, method):
#     """
#     Show status messages based on custom_sahayog_status
#     """
#     if doc.custom_sahayog_status == "Draft":
#         frappe.msgprint("This document is in Draft status.")
#     elif doc.custom_sahayog_status == "Pending From Purchase Manager":
#         frappe.msgprint("Successfully sent to Purchase Manager.")
#     elif doc.custom_sahayog_status == "Pending From CFO":
#         frappe.msgprint("Successfully sent to CFO.")
#     elif doc.custom_sahayog_status == "Approved":
#         frappe.msgprint("Successfully Approved.")
#     else:
#         frappe.msgprint("This document is in an unknown status.")


def on_cancel(doc, method):
    """
    On Cancel: Show a message when a document is cancelled
    """
    frappe.set_value(doc.doctype, doc.name, "custom_sahayog_status", "Cancelled")     


def validate_store_incharge_po(doc, method):
    """Validate Store Incharge based on the selected Branch."""

    if doc.custom_sahayog_status == "Pending From Purchase Manager" and not doc.custom_store_incharge:
        frappe.throw("Store Incharge is mandatory.")  

    if doc.custom_sahayog_status == "Pending Form CFO" and not doc.custom_store_incharge:
        frappe.throw("Store Incharge is mandatory.")