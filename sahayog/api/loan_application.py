# sahayog/api/loan_application.py
import frappe


@frappe.whitelist()
def get_loan_applications(fields=None, order_by="creation desc", limit_page_length=100):
    """Get list of loan applications with specified fields"""
    try:
        # Parse fields if provided as string
        if isinstance(fields, str):
            import json
            fields = json.loads(fields)

        # Default fields if not provided
        if not fields:
            fields = [
                "name",
                "customer_name",
                "loan_amount",
                "status",
                "creation",
                "total_net_weight",
                "ltv_percent",
                "final_payout",
                "mobile_number",
            ]

        # Get loan applications
        applications = frappe.get_list(
            "Loan Application",
            fields=fields,
            order_by=order_by,
            limit_page_length=limit_page_length,
        )

        return applications

    except Exception as e:
        frappe.log_error(f"Error getting loan applications: {str(e)}")
        return []


@frappe.whitelist()
def create_loan_application(**kwargs):
    """Create a new loan application"""
    try:
        doc = frappe.new_doc("Loan Application")
        
        # Map kwargs to doc fields
        for key, value in kwargs.items():
            if hasattr(doc, key):
                setattr(doc, key, value)
        
        doc.insert()
        frappe.db.commit()
        
        return {"name": doc.name, "status": "success"}

    except Exception as e:
        frappe.log_error(f"Error creating loan application: {str(e)}")
        frappe.throw(str(e))
        return None
