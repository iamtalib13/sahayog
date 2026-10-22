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
        
        # Use update to correctly handle child tables and fields
        doc.update(kwargs)
        
        doc.insert()
        frappe.db.commit()
        
        return {"name": doc.name, "status": "success"}

    except Exception as e:
        frappe.log_error(f"Error creating loan application: {str(e)}")
        frappe.throw(str(e))
        return None


@frappe.whitelist()
def update_loan_application(name, **kwargs):
    """Update an existing loan application"""
    try:
        doc = frappe.get_doc("Loan Application", name)

        if doc.status != "Draft":
            # After approval, only Credit/CPC team may update documents
            allowed_roles = {"Credit Loan User", "CPC Loan User", "Administrator", "System Manager"}
            if not allowed_roles.intersection(set(frappe.get_roles(frappe.session.user))):
                frappe.throw("Only Credit / CPC team can upload documents after approval.")

            kwargs = {k: v for k, v in kwargs.items() if k == "kyc_documents"}
            if not kwargs:
                frappe.throw("Only documents can be updated after approval.")

            doc.flags.ignore_validate = True
            doc.flags.ignore_validate_update_after_submit = True
            doc.flags.ignore_permissions = True

        doc.update(kwargs)
        doc.save()
        frappe.db.commit()

        return {"name": doc.name, "status": "success"}

    except Exception as e:
        frappe.log_error(f"Error updating loan application {name}: {str(e)}")
        frappe.throw(str(e))
        return None


@frappe.whitelist()
def can_manage_loan_docs():
    """True if the logged-in user can upload documents after approval."""
    allowed_roles = {"Credit Loan User", "CPC Loan User", "Administrator", "System Manager"}
    return bool(allowed_roles.intersection(set(frappe.get_roles(frappe.session.user))))


@frappe.whitelist()
def get_loan_application(name):
    """Get single loan application details"""
    try:
        return frappe.get_doc("Loan Application", name)
    except Exception as e:
        frappe.log_error(f"Error getting loan application {name}: {str(e)}")
        return None
