import frappe

def terms_conditions_auto_increment(doc, method):
    """Auto-increment custom_sequence based on the last value."""
    last_seq = frappe.db.get_value("Terms and Conditions", {}, "custom_sequence", order_by="custom_sequence DESC")
    doc.custom_sequence = (last_seq or 0) + 1  # If no record, start from 1
