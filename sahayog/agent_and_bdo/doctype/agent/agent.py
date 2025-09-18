# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

class Agent(Document):
    def before_save(self):
        if self.agent_name:
            self.agent_name = self.agent_name.upper()

    @frappe.whitelist()
    def approve_allocation(self):
        """Approve allocation and set employee"""
        self.approved_by = frappe.session.user
        self.approved_on = frappe.utils.now_datetime()
        self.status = "Allocated"

        # Find Employee linked with requested_by user
        if self.requested_by:
            employee = frappe.db.get_value("Employee", {"user_id": self.requested_by}, "name")
            if employee:
                self.employee = employee
            else:
                frappe.throw(f"No Employee record found for user {self.requested_by}")

        self.save()
        return {"success": True, "message": "Agent Allocated Successfully"}

    @frappe.whitelist()
    def reject_allocation(self):
        """Reject allocation and clear request info"""
        self.requested_by = None
        self.requested_on = None
        self.status = "Unallocated"
        self.save()
        return {"success": True, "message": "Agent Allocation Rejected"}

    @frappe.whitelist()
    def unallocate_agent(self):
        """Unallocate agent and clear all mapping"""
        self.status = "Unallocated"
        self.requested_by = None
        self.requested_on = None
        self.approved_by = None
        self.approved_on = None
        self.employee = None
        self.save()
        return {"success": True, "message": "Agent Unallocated Successfully"}

    @frappe.whitelist()
    def allocation_request(self, approver_user_id=None):
        """Raise allocation request with selected approver"""
        doc = frappe.get_doc(self)
        
        # Validate approver_user_id
        if not approver_user_id:
            frappe.throw(_("Approver selection is required"))
        
        # Verify user exists and get employee details
        user_doc = frappe.get_doc("User", approver_user_id)
        if not user_doc.enabled:
            frappe.throw(_("Selected approver user is disabled"))
        
        # Get employee details for this user
        employee = frappe.db.get_value("Employee", 
            {"user_id": approver_user_id, "status": "Active"}, 
            ["name", "employee_name"], as_dict=True)
        
        if not employee:
            frappe.throw(_("No active employee found for selected approver"))
        
        # Verify this employee is a branch manager for this branch
        is_branch_manager = frappe.db.exists("Employee", {
            "name": employee.name,
            "sol_id": doc.branch_code,
            "designation": ["like", "%branch manager%"],
            "status": "Active"
        })
        
        if not is_branch_manager:
            frappe.throw(_("Selected user is not a Branch Manager for this branch"))
        
        # Set allocation request fields
        doc.requested_by = frappe.session.user
        doc.requested_on = frappe.utils.now_datetime()
        doc.status = "Pending"
        doc.approved_by = approver_user_id  # Only user_id as requested
        
        doc.save()
        
        return {
            "success": True, 
            "message": f"Allocation request sent to {employee.employee_name} for approval"
        }

@frappe.whitelist()
def bulk_unallocate(agent_names: list[str] | str = None):
    """Unallocate selected agents (bulk)"""
    if isinstance(agent_names, str):
        import json
        agent_names = json.loads(agent_names)

    if not agent_names:
        return {"success": False, "message": "No agents selected for unallocation"}

    for agent in agent_names:
        doc = frappe.get_doc("Agent", agent)
        doc.status = "Unallocated"
        doc.requested_by = None
        doc.requested_on = None
        doc.approved_by = None
        doc.approved_on = None
        doc.employee = None
        doc.save()

    return {
        "success": True,
        "count": len(agent_names),
        "message": f"{len(agent_names)} agent(s) unallocated successfully",
    }

@frappe.whitelist()
def bulk_transfer(agent_names: list[str] | str = None, to_employee: str = None):
    """Transfer selected agents to another employee"""
    if isinstance(agent_names, str):
        import json
        agent_names = json.loads(agent_names)

    if not agent_names:
        return {"success": False, "message": "No agents selected for transfer"}

    if not to_employee:
        return {"success": False, "message": "Target employee not provided"}

    for agent in agent_names:
        doc = frappe.get_doc("Agent", agent)
        doc.employee = to_employee
        doc.save()

    return {
        "success": True,
        "count": len(agent_names),
        "message": f"{len(agent_names)} agent(s) transferred to employee {to_employee} successfully",
    }


# Module level functions (outside the class)
@frappe.whitelist()
def get_branch_managers(branch_code):
    """Get all Branch Managers for given branch code"""
    if not branch_code:
        frappe.throw(_("Branch Code is required"))
    
    # Case insensitive search for designation containing 'branch manager'
    managers = frappe.db.sql("""
        SELECT 
            name, 
            employee_name, 
            user_id, 
            designation
        FROM `tabEmployee` 
        WHERE sol_id = %s 
        AND LOWER(designation) LIKE %s
        AND status = 'Active'
        ORDER BY employee_name
    """, (branch_code, "%branch manager%"), as_dict=True)
    
    # Filter out employees without user_id and add validation
    valid_managers = []
    for manager in managers:
        if manager.user_id:
            # Verify user exists and is enabled
            user_exists = frappe.db.get_value("User", manager.user_id, "enabled")
            if user_exists:
                valid_managers.append(manager)
    
    return valid_managers

# def send_approval_notification(doc, user_doc, employee):
#     """Send notification to selected approver"""
#     try:
#         subject = f"Allocation Request Approval Required - Agent {doc.name}"
#         message = f"""
#         <p>Dear {employee.employee_name},</p>
        
#         <p>You have received a new allocation request that requires your approval:</p>
        
#         <ul>
#             <li><strong>Agent ID:</strong> {doc.name}</li>
#             <li><strong>Branch Code:</strong> {doc.branch_code}</li>
#             <li><strong>Requested By:</strong> {doc.requested_by}</li>
#             <li><strong>Requested On:</strong> {frappe.format(doc.requested_on, 'Datetime')}</li>
#         </ul>
        
#         <p>Please login to the system to review and approve/reject this request.</p>
        
#         <p><a href="{frappe.utils.get_url()}/app/agent/{doc.name}" class="btn btn-primary">
#         View Request</a></p>
        
#         <p>Best regards,<br>System</p>
#         """
        
#         frappe.sendmail(
#             recipients=[user_doc.email],
#             subject=subject,
#             message=message,
#             reference_doctype=doc.doctype,
#             reference_name=doc.name
#         )
        
#         # Create notification log
#         notification = frappe.get_doc({
#             "doctype": "Notification Log",
#             "subject": subject,
#             "for_user": user_doc.name,
#             "type": "Alert",
#             "document_type": doc.doctype,
#             "document_name": doc.name,
#             "email_content": message
#         })
#         notification.insert(ignore_permissions=True)
        
#     except Exception as e:
#         frappe.log_error(f"Failed to send approval notification: {str(e)}")
#         # Don't fail the main process if notification fails
#         pass

@frappe.whitelist()
def get_approver_details(user_id):
    """Get employee details by user_id for approver display"""
    if not user_id:
        return None
    
    try:
        # First try to get employee details by user_id
        employee = frappe.db.get_value("Employee", 
            {"user_id": user_id, "status": "Active"}, 
            ["employee_name", "name", "designation", "branch"], 
            as_dict=True)
        
        if employee:
            return {
                "employee_name": employee.employee_name,
                "employee_id": employee.name,
                "designation": employee.designation,
                "branch": employee.branch,
                "display_name": employee.employee_name
            }
        
        # Fallback to User's full_name if employee not found
        user = frappe.db.get_value("User", user_id, 
            ["full_name", "email"], as_dict=True)
        
        if user:
            return {
                "employee_name": None,
                "employee_id": None,
                "designation": None,
                "branch": None,
                "display_name": user.full_name or user.email
            }
        
        return {
            "display_name": user_id
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting approver details: {str(e)}")
        return {
            "display_name": user_id
        }
    
@frappe.whitelist()
def get_employee_info(employee):
    """
    Fetch employee details safely
    """
    emp = frappe.get_all(
        "Employee",
        filters={"name": employee},
        fields=[
            "employee_number",
            "employee_name",
            "branch",
            "department",
            "designation"
        ],
        limit_page_length=1
    )

    if emp:
        return emp[0]
    else:
        return {}    