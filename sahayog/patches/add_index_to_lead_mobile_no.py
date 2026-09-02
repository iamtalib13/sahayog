import frappe
from frappe.custom.doctype.property_setter.property_setter import make_property_setter


def execute():
    """
    Add database indexes on mobile_no for tabLead and tabContact.
    This resolves severe bottleneck where duplicate lead checks scan 800k+ rows
    causing row locks on tabSeries.
    """
    # 1. Add DB index on tabLead.mobile_no if not present
    try:
        if not frappe.db.has_index("tabLead", "mobile_no"):
            frappe.db.sql("""
                ALTER TABLE `tabLead`
                ADD INDEX IF NOT EXISTS `mobile_no` (`mobile_no`)
            """)
    except Exception:
        frappe.log_error(title="Failed to add index on tabLead.mobile_no", message=frappe.get_traceback())

    # 2. Add DB index on tabContact.mobile_no if not present
    try:
        if not frappe.db.has_index("tabContact", "mobile_no"):
            frappe.db.sql("""
                ALTER TABLE `tabContact`
                ADD INDEX IF NOT EXISTS `mobile_no` (`mobile_no`)
            """)
    except Exception:
        frappe.log_error(title="Failed to add index on tabContact.mobile_no", message=frappe.get_traceback())

    # 3. Set Property Setter so future bench migrations preserve the index
    try:
        make_property_setter(
            doctype="Lead",
            fieldname="mobile_no",
            property="search_index",
            value="1",
            property_type="Check",
            for_doctype=False,
            validate_fields_for_doctype=False,
        )
    except Exception:
        frappe.log_error(title="Failed to set search_index property setter on Lead", message=frappe.get_traceback())

    try:
        make_property_setter(
            doctype="Contact",
            fieldname="mobile_no",
            property="search_index",
            value="1",
            property_type="Check",
            for_doctype=False,
            validate_fields_for_doctype=False,
        )
    except Exception:
        frappe.log_error(title="Failed to set search_index property setter on Contact", message=frappe.get_traceback())

    frappe.clear_cache(doctype="Lead")
    frappe.clear_cache(doctype="Contact")
