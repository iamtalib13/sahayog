import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now, getdate, today, add_days

class EmployeeMaterialRequest(Document):
    def validate(self):
        """Main validation - runs before save"""
        self.validate_dates()  # Date validation first
        self.validate_items()
        self.set_requested_by()
        self.set_request_datetime_once()


        

            # Detect resubmission from Rejected → Pending Reporting Person
        is_resubmission = (self.get_db_value("status") == "Rejected" and 
                        self.status == "Pending Reporting Person")
        
        # Clear remarks ONLY on resubmission
        if is_resubmission:
            self.reporting_person_remarks = ""
            self.ho_officer_remarks = ""
            self.db_set("reporting_person_remarks", "")
            self.db_set("ho_officer_remarks", "")
            frappe.db.commit()  # Force DB update immediately

        # Always set fields at correct workflow stages
        # IT Executive submit: Set reporting_person_status to Pending, always
        if self.status == "Pending Reporting Person":
            self.reporting_person_status = "Pending"
        elif self.status == "Pending HO Approval":
            # Fix: Handle Skip as equivalent to Approved
            if self.reporting_person_status not in ["Approved", "Skip"]:
                self.reporting_person_status = "Approved"
        elif self.status == "Rejected" and not self.ho_officer_status:
            self.reporting_person_status = "Rejected"

        # Approver Approved/Skip: Set ho_officer_status to Pending, always
        if self.status == "Pending HO Approval":
            # Fix: Handle Skip as equivalent to Approved  
            if self.ho_officer_status not in ["Approved", "Skip"]:
                self.ho_officer_status = "Pending"
        elif self.status == "Approved":
            self.ho_officer_status = "Approved"
        # On Approver Reject: optionally clear HO officer status for proper badge
        elif self.status == "Rejected" and self.reporting_person_status == "Approved" or self.reporting_person_status == "Skip":
            self.ho_officer_status = "Rejected"

        # On Resubmit after Rejection: Reset statuses
        if self.status == "Pending Reporting Person":
            self.reporting_person_status = "Pending"
            self.ho_officer_status = ""

        # If HO is skipped, treat as final approval
        if self.ho_officer_status == "Skip" and self.status == "Pending HO Approval":
            self.status = "Approved"




    def set_request_datetime_once(self):        
        if self.status == "Pending Reporting Person" and not self.request_datetime:
            # Only set for new docs or freshly submitted ones transitioning from draft
            if self.is_new() or self.docstatus == 0:
                self.request_datetime = now()
        

    def before_submit(self):
        """Validate before document submission"""
        self.validate_final_approval()
        self.check_stock_availability()
        self.validate_dates()  # Revalidate dates before submit

            # Detect if this is a resubmission after rejection
        if self.get_db_value("status") == "Rejected" and self.status == "Pending Reporting Person":
            self.flags.is_resubmitting = True

        # Sync reporting_person_status if status is Pending HO Approval
        if self.status == "Pending HO Approval" and self.reporting_person_status == "Pending":
            self.reporting_person_status = "Approved"
        
        # Sync ho_officer_status if status Approved or Rejected
        if self.status == "Approved" and not self.ho_officer_status:
            self.ho_officer_status = "Approved"
        elif self.status == "Rejected" and not self.ho_officer_status:
            # Determine who rejected, set accordingly or reset
            pass
    
    def on_submit(self):
        """Actions after successful submission"""
        self.db_set('status', 'Approved')
        self.send_approval_notification()
    
    def on_cancel(self):
        """Actions when document is cancelled"""
        self.cancel_linked_stock_entries()
        self.db_set('status', 'Cancelled')
    
    def validate_dates(self):
        """
        Comprehensive date validation
        Validates:
        1. Request Date cannot be in future
        2. Required By Date is mandatory
        3. Required By Date cannot be in past
        4. Required By Date cannot be before Request Date
        """
        # Validate Request Date (should not be future)
        if self.request_date:
            if getdate(self.request_date) > getdate(today()):
                frappe.throw(
                    _("Request Date cannot be in the future. Maximum date: {0}").format(
                        frappe.format(today(), {'fieldtype': 'Date'})
                    ),
                    title=_("Invalid Request Date")
                )
        
        # Validate Required By Date is provided
        if not self.required_by_date:
            frappe.throw(
                _("Required By Date is mandatory"),
                title=_("Missing Required Field")
            )
        
        # Main Validation 1: Required By Date cannot be in past
        if getdate(self.required_by_date) < getdate(today()):
            frappe.throw(
                _("Required By Date cannot be in the past.<br><br>"
                  "<b>Selected Date:</b> {0}<br>"
                  "<b>Minimum Date:</b> {1} (Today)").format(
                    frappe.format(self.required_by_date, {'fieldtype': 'Date'}),
                    frappe.format(today(), {'fieldtype': 'Date'})
                ),
                title=_("Invalid Date - Past Date Not Allowed")
            )
        
        # Main Validation 2: Required By Date cannot be before Request Date
        if getdate(self.required_by_date) < getdate(self.request_date):
            frappe.throw(
                _("Required By Date cannot be before Request Date.<br><br>"
                  "<b>Request Date:</b> {0}<br>"
                  "<b>Required By Date:</b> {1}<br><br>"
                  "Please select a date equal to or after the Request Date.").format(
                    frappe.format(self.request_date, {'fieldtype': 'Date'}),
                    frappe.format(self.required_by_date, {'fieldtype': 'Date'})
                ),
                title=_("Invalid Date Range")
            )
        
        # Optional: Warning for far future dates (90+ days)
        days_ahead = frappe.utils.date_diff(self.required_by_date, today())
        if days_ahead > 90:
            frappe.msgprint(
                _("Notice: Required By Date is <b>{0} days</b> in the future.<br><br>"
                  "Selected Date: {1}<br><br>"
                  "Please verify if this is intentional.").format(
                    days_ahead,
                    frappe.format(self.required_by_date, {'fieldtype': 'Date'})
                ),
                indicator='orange',
                alert=True
            )
        
        # Optional: Validate reasonable date range (not more than 1 year)
        if days_ahead > 365:
            frappe.throw(
                _("Required By Date cannot be more than 1 year in the future.<br><br>"
                  "Selected Date: {0}<br>"
                  "Maximum Date: {1}").format(
                    frappe.format(self.required_by_date, {'fieldtype': 'Date'}),
                    frappe.format(add_days(today(), 365), {'fieldtype': 'Date'})
                ),
                title=_("Date Too Far in Future")
            )
    
    def validate_items(self):
        """Validate all items have category set"""
        if not self.items:
            frappe.throw(_("Please add at least one item"))
        
        for item in self.items:
            # Check if category is set
            if not item.item_category:
                frappe.throw(
                    _("Row {0}: Item Category not set. Please reselect the item.").format(item.idx)
                )
            
            # Validate based on category
            if item.item_category == "Asset":
                self.validate_asset_item(item)
            elif item.item_category == "Stock Item":
                self.validate_stock_item(item)
    
    def validate_asset_item(self, item):
        """Validate asset item"""
        # Verify item is actually an asset
        is_asset = frappe.db.get_value("Item", item.item_code, "is_fixed_asset")
        if not is_asset:
            frappe.throw(
                _("Row {0}: {1} is not an Asset item").format(item.idx, item.item_code)
            )
        
        if self.request_type == "New" and not item.assigned_to_employee:
            frappe.throw(
                _("Row {0}: Employee required for asset assignment").format(item.idx)
            )
        
        if self.request_type == "Return" and not item.asset:
            frappe.throw(
                _("Row {0}: Asset required for return").format(item.idx)
            )
        
        # Issue type not allowed for assets
        if self.request_type == "Issue":
            frappe.throw(
                _("Row {0}: Asset items cannot have Issue request type").format(item.idx)
            )
    
    def validate_stock_item(self, item):
        """Validate stock item"""
        # Verify item is actually a stock item
        item_details = frappe.db.get_value("Item", item.item_code, 
            ["is_stock_item", "is_fixed_asset"], as_dict=1)
        
        if not item_details or not item_details.is_stock_item or item_details.is_fixed_asset:
            frappe.throw(
                _("Row {0}: {1} is not a Stock item").format(item.idx, item.item_code)
            )
        
        if self.request_type == "Issue" and not item.is_consumable:
            frappe.throw(
                _("Row {0}: Issue type only for consumables").format(item.idx)
            )
    
    def set_requested_by(self):
        """Set requested by on first save"""
        if not self.requested_by:
            self.requested_by = frappe.session.user
            self.request_datetime = now()
    
    def update_approval_fields(self):
        current_user = frappe.session.user
        action = (frappe.form_dict.get('action') or "").lower()
        # Decision block for Reporting Person (Approver)
        if self.status == "Pending Reporting Person" and current_user == self.reporting_person:
            # Only these allowed
            if "approve" in action:
                self.reporting_person_status = "Approved"
            elif "reject" in action:
                self.reporting_person_status = "Rejected"
            elif "skip" in action:
                self.reporting_person_status = "Skip"
            self.reporting_person_approval_date = now()
            # Make sure to persist:
            self.db_set("reporting_person_status", self.reporting_person_status)
        # Decision block for HO Approver
        if self.status == "Pending HO Approval" and frappe.has_role("Head Office Officer"):
            if "approve" in action:
                self.ho_officer_status = "Approved"
            elif "reject" in action:
                self.ho_officer_status = "Rejected"
            elif "skip" in action:
                self.ho_officer_status = "Skip"
            self.ho_officer_approval_date = now()
            self.db_set("ho_officer_status", self.ho_officer_status)
    
    def validate_final_approval(self):
        """Validate all approvals before submit - FIXED for Skip functionality"""
        # Fix: Treat "Skip" as equivalent to "Approved" for workflow progression
        if self.reporting_person_status not in ["Approved", "Skip"]:
            frappe.throw(
                _("Reporting Person approval is required before submission"),
                title=_("Approval Required")
            )
        
        if self.ho_officer_status not in ["Approved", "Skip"]:
            frappe.throw(
                _("Head Office Officer approval is required before submission"),
                title=_("Approval Required")
            )

        if self.reporting_person_status not in ["Approved", "Skip"]:
            frappe.throw(_("Reporting Person approval is required before submission"),
                        title=_("Approval Required"))

        if self.ho_officer_status not in ["Approved", "Skip"]:
            frappe.throw(_("Head Office Officer approval is required before submission"),
                        title=_("Approval Required"))
    
    def check_stock_availability(self):
        """Check stock availability for stock items"""
        if self.request_type in ["New", "Issue"]:
            insufficient_items = []
            
            for item in self.items:
                if item.item_category == "Stock Item" and item.warehouse:
                    available = frappe.db.get_value("Bin", 
                        {"item_code": item.item_code, "warehouse": item.warehouse}, 
                        "actual_qty") or 0
                    
                    if item.quantity > available:
                        insufficient_items.append(
                            _("Row {0}: {1} - Available: {2}, Requested: {3}").format(
                                item.idx, item.item_code, available, item.quantity
                            )
                        )
            
            # Show all insufficient items in one message
            if insufficient_items:
                frappe.msgprint(
                    _("<b>Insufficient Stock for following items:</b><br><br>{0}").format(
                        "<br>".join(insufficient_items)
                    ),
                    indicator='orange',
                    alert=True,
                    title=_("Stock Warning")
                )
    
    def cancel_linked_stock_entries(self):
        """Cancel all linked stock entries"""
        cancelled_count = 0
        
        for item in self.items:
            if item.stock_entry:
                try:
                    se = frappe.get_doc("Stock Entry", item.stock_entry)
                    if se.docstatus == 1:
                        se.add_comment("Edit", 
                            f"Cancelled due to Material Request {self.name} cancellation")
                        se.cancel()
                        cancelled_count += 1
                    item.db_set("stock_entry", None, update_modified=False)
                except Exception as e:
                    frappe.log_error(
                        frappe.get_traceback(), 
                        f"Error cancelling Stock Entry: {item.stock_entry}"
                    )
        
        if cancelled_count > 0:
            frappe.msgprint(
                _("{0} linked Stock Entry(ies) have been cancelled").format(cancelled_count),
                indicator='orange',
                alert=True
            )
    
    def send_approval_notification(self):
        """Send email notification after approval"""
        try:
            # Count items by category
            asset_count = sum(1 for item in self.items if item.item_category == "Asset")
            stock_count = sum(1 for item in self.items if item.item_category == "Stock Item")
            
            category_info = []
            if asset_count > 0:
                category_info.append(f"{asset_count} Asset item(s)")
            if stock_count > 0:
                category_info.append(f"{stock_count} Stock item(s)")
            
            # Send email
            frappe.sendmail(
                recipients=[self.requested_by],
                subject=f"Material Request {self.name} Approved",
                message=f"""
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h3 style="color: #2ecc71;">Material Request Approved ✓</h3>
                        <p>Dear User,</p>
                        <p>Your Material Request <b>{self.name}</b> has been approved.</p>
                        
                        <table style="border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Request Type:</td>
                                <td style="padding: 8px;">{self.request_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Items:</td>
                                <td style="padding: 8px;">{', '.join(category_info)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Required By:</td>
                                <td style="padding: 8px;">{frappe.format(self.required_by_date, {'fieldtype': 'Date'})}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Approved By:</td>
                                <td style="padding: 8px;">{self.head_office_officer}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Approval Date:</td>
                                <td style="padding: 8px;">{frappe.format(self.ho_officer_approval_date, {'fieldtype': 'Datetime'})}</td>
                            </tr>
                        </table>
                        
                        <p>
                            <a href="{frappe.utils.get_url()}/app/employee-material-request/{self.name}" 
                               style="background: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                                View Document
                            </a>
                        </p>
                    </div>
                """,
                reference_doctype=self.doctype,
                reference_name=self.name
            )
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), "Material Request Notification Error")


    
    
    def before_workflow_action(self):
        """Fixed workflow action handling for Skip + Reject scenarios"""
        frappe.logger().info(f"before_workflow_action triggered for {self.name} ({self.status}) by {frappe.session.user}")
        
        current_user = frappe.session.user
        action = (frappe.form_dict.get("action") or "").lower()
        frappe.logger().info(f"User: {current_user}, Action: {action}")

        # Reporting Person actions (only when in their stage)
        if self.status == "Pending Reporting Person" and current_user == self.reporting_person:
            if action in ["approve", "skip"]:
                self.reporting_person_status = "Approved" if action == "approve" else "Skip"
            elif action == "reject":
                self.reporting_person_status = "Rejected"
            
            self.reporting_person_approval_date = now()
            self.db_set("reporting_person_status", self.reporting_person_status)
            frappe.db.commit()
            frappe.logger().info(f"Updated reporting_person_status to {self.reporting_person_status}")

        # HO Officer actions (only when in their stage)
        elif self.status == "Pending HO Approval" and frappe.has_role("Head Office Officer"):
            if action in ["approve", "skip"]:
                self.ho_officer_status = "Approved" if action == "approve" else "Skip"
            elif action == "reject":
                # Fix: When Reporting Person is skipped, HO reject goes to ho_officer_status
                self.ho_officer_status = "Rejected"
                # Keep reporting_person_status as "Skip" - don't override it
            
            self.ho_officer_approval_date = now()
            self.db_set("ho_officer_status", self.ho_officer_status)
            frappe.db.commit()
            frappe.logger().info(f"Updated ho_officer_status to {self.ho_officer_status}")
 


# Whitelisted API Methods

@frappe.whitelist()
def workflow_action_update_status(docname, action):
    doc = frappe.get_doc("Employee Material Request", docname)
    action = action.lower()

    if doc.status == "Pending Reporting Person" and frappe.session.user == doc.reporting_person:
        if action == "approve":
            new_status = "Pending HO Approval"
            reporting_status = "Approved"
        elif action == "reject":
            new_status = "Rejected"
            reporting_status = "Rejected"
        else:
            new_status = "Pending HO Approval"
            reporting_status = "Skip"

        frappe.db.set_value("Employee Material Request", docname, "reporting_person_status", reporting_status)
        frappe.db.set_value("Employee Material Request", docname, "status", new_status)
    
    elif doc.status == "Pending HO Approval" and frappe.has_role("Head Office Officer"):
        # Similar logic for HO officer status and workflow status update
        pass

    frappe.db.commit()



@frappe.whitelist()
def update_material_request_approval_status(docname, action):
    doc = frappe.get_doc("Employee Material Request", docname)
    action = action.lower()

    if doc.status == "Pending Reporting Person" and frappe.session.user == doc.reporting_person:
        reporting_status = {
            "approve": "Approved",
            "reject": "Rejected",
            "skip": "Skip"
        }.get(action, "Pending")
        frappe.db.set_value("Employee Material Request", docname, "reporting_person_status", reporting_status)
    
    elif doc.status == "Pending HO Approval" and frappe.has_role("Head Office Officer"):
        ho_status = {
            "approve": "Approved",
            "reject": "Rejected",
            "skip": "Skip"
        }.get(action, "Pending")
        frappe.db.set_value("Employee Material Request", docname, "ho_officer_status", ho_status)
    
    frappe.db.commit()



@frappe.whitelist()
def create_stock_entry_from_request(material_request):
    """
    Create stock entry from approved material request
    
    Args:
        material_request (str): Name of the Material Request document
    
    Returns:
        str: Name of created Stock Entry
    """
    mr = frappe.get_doc("Employee Material Request", material_request)
    
    # Validate request is approved
    if mr.docstatus != 1:
        frappe.throw(
            _("Only approved and submitted requests can be processed"),
            title=_("Invalid Request")
        )
    
    # Check if user has permission
    if not frappe.has_permission("Stock Entry", "create"):
        frappe.throw(
            _("You do not have permission to create Stock Entry"),
            frappe.PermissionError
        )
    
    # Map request type to stock entry type
    entry_type_map = {
        "New": "Material Issue",
        "Return": "Material Receipt",
        "Issue": "Material Consumption"
    }
    
    # Create new Stock Entry
    se = frappe.new_doc("Stock Entry")
    se.stock_entry_type = entry_type_map.get(mr.request_type)
    se.custom_material_request = mr.name
    se.company = mr.company if hasattr(mr, 'company') else frappe.defaults.get_user_default("Company")
    
    items_added = 0
    
    # Add items to stock entry
    for item in mr.items:
        if item.status in ["Pending", "Approved"]:
            se_item = se.append("items", {})
            se_item.item_code = item.item_code
            se_item.qty = item.quantity
            se_item.uom = item.uom
            
            # Set warehouses based on request type
            if mr.request_type == "New":
                se_item.s_warehouse = item.warehouse
            elif mr.request_type == "Return":
                se_item.t_warehouse = item.warehouse
            elif mr.request_type == "Issue":
                se_item.s_warehouse = item.warehouse
            
            # Link asset if applicable
            if item.item_category == "Asset" and item.asset:
                se_item.asset = item.asset
            
            items_added += 1
    
    if items_added == 0:
        frappe.throw(
            _("No items found to process. Please check item status."),
            title=_("No Items")
        )
    
    # Save stock entry
    se.save()
    
    # Update material request status
    mr.db_set("status", "In Progress")
    
    # Add comment to material request
    mr.add_comment("Edit", f"Stock Entry {se.name} created")
    
    frappe.msgprint(
        _("Stock Entry {0} created successfully with {1} items").format(se.name, items_added),
        indicator='green',
        alert=True
    )
    
    return se.name



@frappe.whitelist()
def validate_required_date(required_by_date, request_date=None):
    """
    Server-side validation for required by date (callable from client)
    
    Args:
        required_by_date (str): Required by date to validate
        request_date (str): Request date for comparison
    
    Returns:
        dict: Validation result with 'valid' and 'message' keys
    """
    try:
        if not required_by_date:
            return {
                "valid": False,
                "message": _("Required By Date is mandatory")
            }
        
        req_date = getdate(required_by_date)
        today_date = getdate(today())
        req_request_date = getdate(request_date) if request_date else today_date
        
        # Check past date
        if req_date < today_date:
            return {
                "valid": False,
                "message": _("Required By Date cannot be in the past")
            }
        
        # Check before request date
        if req_date < req_request_date:
            return {
                "valid": False,
                "message": _("Required By Date cannot be before Request Date")
            }
        
        return {
            "valid": True,
            "message": _("Date is valid")
        }
    
    except Exception as e:
        return {
            "valid": False,
            "message": str(e)
        }



# ==================================================================
# WHITELISTED API METHOD FOR INTRO DATA
# ==================================================================



@frappe.whitelist()
def get_material_request_intro_data(doc_name):
    """
    Fetch all intro data for Employee Material Request in a single server call
    This prevents frontend manipulation and improves security
    
    Args:
        doc_name (str): Name of Employee Material Request document
        
    Returns:
        dict: Dictionary containing all required data for intro display
    """
    try:
        # Get the main document
        doc = frappe.get_doc("Employee Material Request", doc_name)
        
        # Validate permissions - user must have read access
        if not frappe.has_permission("Employee Material Request", "read", doc_name):
            frappe.throw(_("You don't have permission to access this document"))
        
        # Get creator's employee record (who created this document)
        creator_employee = get_creator_employee(doc.owner)
        
        result = {
            "success": True,
            "data": {
                "employee": get_employee_data(doc.employee),
                "branch": get_branch_data(doc.target_warehouse),
                "requested_by": creator_employee,  # Creator's employee record
                "reporting_person": get_employee_by_user(doc.reporting_person),
                "ho_officer": get_employee_by_user(doc.head_office_officer),
                "doc_status": doc.docstatus,
                "reporting_person_status": doc.reporting_person_status,
                "ho_officer_status": doc.ho_officer_status,
                "request_datetime": doc.request_datetime,  # Send this field to frontend
                "status": doc.status,
                # ✅ ADD THESE REMARK FIELDS:
                "reporting_person_remarks": doc.reporting_person_remarks or "",
                "ho_officer_remarks": doc.ho_officer_remarks or "",
                "remark": doc.remark or ""
            }
        }
        
        return result
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Material Request Intro Data Error")
        return {
            "success": False,
            "error": str(e)
        }



def get_employee_data(employee_number):
    """
    Fetch employee details by employee number
    
    Args:
        employee_number (str): Employee number
        
    Returns:
        dict: Employee data or empty dict
    """
    if not employee_number:
        return {}
    
    try:
        employee = frappe.db.get_value(
            "Employee",
            {"employee_number": employee_number},
            ["employee_number", "employee_name", "cell_number"],
            as_dict=True
        )
        return employee or {}
    except Exception:
        return {}



def get_branch_data(sol_id):
    """
    Fetch branch details by SOL ID
    
    Args:
        sol_id (str): SOL ID from target warehouse
        
    Returns:
        dict: Branch data or empty dict
    """
    if not sol_id:
        return {}
    
    try:
        branch = frappe.db.get_value(
            "Sahayog Branch",
            {"sol_id": sol_id},
            ["branch", "district", "state_code"],
            as_dict=True
        )
        return branch or {}
    except Exception:
        return {}



def get_employee_by_user(user_id):
    """
    Fetch employee details by user ID (email)
    
    Args:
        user_id (str): User email/ID
        
    Returns:
        dict: Employee data or empty dict
    """
    if not user_id:
        return {}
    
    try:
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user_id},
            ["employee_number", "employee_name", "cell_number"],
            as_dict=True
        )
        return employee or {}
    except Exception:
        return {}



def get_creator_employee(user_id):
    """
    Fetch employee details of document creator by user ID
    Falls back to user's full name if employee record not found
    
    Args:
        user_id (str): User email/ID of document creator
        
    Returns:
        dict: Employee data or user info if employee not found
    """
    if not user_id:
        return {
            "employee_number": "N/A",
            "employee_name": "N/A",
            "cell_number": "N/A"
        }
    
    try:
        # First try to get employee by user_id
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user_id},
            ["employee_number", "employee_name", "cell_number"],
            as_dict=True
        )
        
        if employee:
            return employee
        
        # If no employee found, return user's full name
        user_name = frappe.db.get_value("User", user_id, "full_name")
        return {
            "employee_number": "N/A",
            "employee_name": user_name or user_id,
            "cell_number": "N/A"
        }
    except Exception:
        return {
            "employee_number": "N/A",
            "employee_name": user_id,
            "cell_number": "N/A"
        }
    

@frappe.whitelist()
def admin_skip_approver(docname, skip_current=0, skip_ho=0, new_reporting_person="", admin_remarks=""):
    """
    Admin/Store Manager method to skip approvers and change reporting person
    """
    # Permission check - only Admin or Store Manager
    if not (frappe.session.user == "Administrator" or frappe.has_role("Store Manager", frappe.session.user)):
        frappe.throw(_("Insufficient permissions. Only Administrator/Store Manager allowed."))
    
    doc = frappe.get_doc("Employee Material Request", docname)
    
    update_fields = {}
    messages = []
    
    # Handle Skip Current Approver
    if skip_current:
        if doc.status == "Pending Reporting Person":
            doc.reporting_person_status = "Skip"
            doc.status = "Pending HO Approval"
            messages.append("✅ Reporting Person skipped → Moved to HO Approval")
        elif doc.status == "Pending HO Approval":
            doc.ho_officer_status = "Skip"
            doc.status = "Approved"
            messages.append("✅ HO Officer skipped → Document Approved")
    
    # Handle Skip HO Officer (only from Reporting Person stage)
    if skip_ho and doc.status == "Pending Reporting Person":
        doc.ho_officer_status = "Skip"
        # If reporting person already approved/skipped, go directly to Approved
        if doc.reporting_person_status in ["Approved", "Skip"]:
            doc.status = "Approved"
            messages.append("✅ HO Officer skipped → Document Approved (Reporting Person already approved)")
        else:
            # Reporting person still pending, but HO skipped - stays at Reporting Person stage
            messages.append("✅ HO Officer skipped (Reporting Person still pending)")
    
    # Handle Change Reporting Person
    if new_reporting_person and new_reporting_person != doc.reporting_person:
        old_rp = doc.reporting_person
        doc.reporting_person = new_reporting_person
        doc.reporting_person_status = "Pending"  # Reset status
        doc.reporting_person_approval_date = None
        messages.append(f"🔄 Reporting Person changed: {old_rp} → {new_reporting_person}")
    
    # Add admin remarks
    if admin_remarks:
        doc.add_comment("Edit", f"Admin Action: {admin_remarks}")
    
    # Save changes
    doc.flags.ignore_validate = True  # Skip regular validations
    doc.save()
    
    frappe.db.commit()
    
    return {
        "success": True,
        "message": "<br>".join(messages),
        "new_status": doc.status,
        "reporting_person_status": doc.reporting_person_status,
        "ho_officer_status": doc.ho_officer_status
    }

@frappe.whitelist()
def admin_skip_approver(docname, skip_current=0, skip_ho=0, new_reporting_person="", admin_remarks=""):
    """
    Admin/Store Manager method to skip approvers - FIXED for workflow compatibility
    """
    # Permission check
    if not (frappe.session.user == "Administrator" or frappe.has_role("Store Manager")):
        frappe.throw(_("Insufficient permissions. Only Administrator/Store Manager allowed."))
    
    doc = frappe.get_doc("Employee Material Request", docname)
    update_fields = {}
    messages = []
    
    # Skip Current Approver
    if skip_current:
        if doc.status == "Pending Reporting Person":
            doc.reporting_person_status = "Skip"
            doc.status = "Pending HO Approval"
            messages.append("✅ Reporting Person skipped → Moved to HO Approval")
        elif doc.status == "Pending HO Approval":
            doc.ho_officer_status = "Skip"
            doc.status = "Approved"
            messages.append("✅ HO Officer skipped → Document Approved")
    
    # Skip HO Officer (only from Reporting Person stage)
    if skip_ho and doc.status == "Pending Reporting Person":
        doc.ho_officer_status = "Skip"
        if doc.reporting_person_status in ["Approved", "Skip"]:
            doc.status = "Approved"
            messages.append("✅ HO Officer skipped → Document Approved")
        else:
            messages.append("✅ HO Officer skipped (Reporting Person still pending)")
    
    # Change Reporting Person
    if new_reporting_person and new_reporting_person != doc.reporting_person:
        old_rp = doc.reporting_person
        doc.reporting_person = new_reporting_person
        doc.reporting_person_status = "Pending"
        doc.reporting_person_approval_date = None
        messages.append(f"🔄 Reporting Person: {old_rp} → {new_reporting_person}")
    
    # Admin remarks
    if admin_remarks:
        doc.add_comment("Edit", f"Admin: {admin_remarks}")
    
    # Save with validation bypass only for admin actions
    doc.flags.ignore_validate_update_after_submit = True
    doc.save()
    frappe.db.commit()
    
    return {"success": True, "message": "<br>".join(messages)}


@frappe.whitelist()
def admin_manage_approvers(docname, rp_skip=0, ho_skip=0,
                           rp_remark="", ho_remark="", new_reporting_person=""):
    """Admin/Store Manager: skip approvers + change reporting person."""
    if not (frappe.session.user == "Administrator" or frappe.has_role("Store Manager")):
        frappe.throw(_("Only Administrator or Store Manager can perform this action."))

    doc = frappe.get_doc("Employee Material Request", docname)

    rp_skip = int(rp_skip or 0)
    ho_skip = int(ho_skip or 0)

    # Server-side guard: Skip only if Not Received or Pending
    allowed_status = ("", None, "Not Received", "Pending")
    if rp_skip and doc.reporting_person_status not in allowed_status:
        frappe.throw(_("Reporting Person already decided. Cannot skip."))
    if ho_skip and doc.ho_officer_status not in allowed_status:
        frappe.throw(_("HO Officer already decided. Cannot skip."))

    messages = []

    # === Reporting Person skip ===
    # if rp_skip:
    #     if not rp_remark:
    #         frappe.throw(_("Remark is mandatory when skipping Reporting Person."))
    #     doc.reporting_person_status = "Skip"
    #     doc.reporting_person_remarks = rp_remark
    #     # Move to next workflow stage if currently at RP
    #     if doc.status == "Pending Reporting Person":
    #         doc.status = "Pending HO Approval"
    #     messages.append(_("Reporting Person skipped."))


    if rp_skip:
        if not rp_remark:
            frappe.throw(_("Remark is mandatory when skipping Reporting Person."))
        doc.reporting_person_status = "Skip"
        doc.reporting_person_remarks = rp_remark

        # move workflow to HO stage
        if doc.status == "Pending Reporting Person":
            doc.status = "Pending HO Approval"
            # ensure HO badge shows correctly
            if not doc.ho_officer_status or doc.ho_officer_status in ("", "Not Received", "Pending"):
                doc.ho_officer_status = "Pending"

    # === HO Officer skip ===
    # if ho_skip:
    #     if not ho_remark:
    #         frappe.throw(_("Remark is mandatory when skipping HO Officer."))
    #     doc.ho_officer_status = "Skip"
    #     doc.ho_officer_remarks = ho_remark
    #     # If at HO stage, move to Approved
    #     if doc.status == "Pending HO Approval":
    #         doc.status = "Approved"
    #     messages.append(_("HO Officer skipped."))

    if ho_skip:
        if not ho_remark:
            frappe.throw(_("Remark is mandatory when skipping HO Officer."))
        doc.ho_officer_status = "Skip"
        doc.ho_officer_remarks = ho_remark

        # if at HO stage, skip directly to Approved
        if doc.status == "Pending HO Approval":
            doc.status = "Approved"

    # === Change Reporting Person ===
    if new_reporting_person and new_reporting_person != doc.reporting_person:
        old = doc.reporting_person
        doc.reporting_person = new_reporting_person
        doc.reporting_person_status = "Pending"
        doc.reporting_person_approval_date = None
        # do not touch remarks here
        messages.append(_("Reporting Person changed from {0} to {1}.").format(old or "-", new_reporting_person))

    # Remarks as audit comment
    if rp_remark or ho_remark:
        remark_text = []
        if rp_remark:
            remark_text.append("RP Skip Remark: " + rp_remark)
        if ho_remark:
            remark_text.append("HO Skip Remark: " + ho_remark)
        doc.add_comment("Edit", " / ".join(remark_text))

    doc.flags.ignore_validate = True
    doc.save()
    frappe.db.commit()

    return {
        "success": True,
        "message": "<br>".join(messages) if messages else _("No changes applied."),
        "status": doc.status,
        "reporting_person_status": doc.reporting_person_status,
        "ho_officer_status": doc.ho_officer_status
    }



import frappe
from frappe.utils import now

@frappe.whitelist()
def self_approve_request(docname):
    """
    Admin / Store Manager shortcut:
    - Set reporting_person_status = 'Skip'
    - Set ho_officer_status = 'Skip'
    - Set status = 'Self Approved'
    - Apply similar validations as skip logic.
    """
    if not (frappe.session.user == "Administrator" or frappe.has_role("Store Manager")):
        frappe.throw(
            "Only Administrator or Store Manager can perform Self Approved.",
            frappe.PermissionError,
        )

    doc = frappe.get_doc("Employee Material Request", docname)

    # Basic guards: only on submitted / pending-like documents as per your needs
    if doc.status not in ["Pending Reporting Person", "Pending HO Approval", "Approved"]:
        frappe.throw(
            f"Self Approved is not allowed from status: {doc.status}",
            title="Invalid Status",
        )

    messages = []

    # Apply same kind of validation idea as your skip functions:
    # if already rejected, do not allow.
    if doc.reporting_person_status == "Rejected" or doc.ho_officer_status == "Rejected":
        frappe.throw(
            "Cannot Self Approve a request where any approver has already Rejected.",
            title="Approval Already Rejected",
        )

    # Set both to Skip
    if doc.reporting_person_status != "Skip":
        doc.reporting_person_status = "Skip"
        doc.reporting_person_approval_date = now()
        messages.append("Reporting Person marked as Skip.")

    if doc.ho_officer_status != "Skip":
        doc.ho_officer_status = "Skip"
        doc.ho_officer_approval_date = now()
        messages.append("HO Officer marked as Skip.")

    # Final status for document
    doc.status = "Self Approved"

    # Persist
    doc.flags.ignore_validate = True
    doc.flags.ignore_update_after_submit = True
    doc.save()
    frappe.db.commit()

    # Optional audit comment
    doc.add_comment(
        "Edit",
        "Request Self Approved by {0}. Both approvers skipped.".format(
            frappe.session.user
        ),
    )

    return {
        "success": True,
        "message": "<br>".join(messages) or "Self Approved successfully.",
        "status": doc.status,
        "reporting_person_status": doc.reporting_person_status,
        "ho_officer_status": doc.ho_officer_status,
    }



@frappe.whitelist()
def update_material_request_approval_status(docname, action, remark=""):
    """Save approval remark before workflow action"""
    doc = frappe.get_doc("Employee Material Request", docname)
    
    # Set remark based on current stage
    if doc.status == "Pending Reporting Person":
        doc.reporting_person_remarks = remark
    elif doc.status == "Pending HO Approval":
        doc.ho_officer_remarks = remark
    
    # Save remark to database
    doc.save()
    frappe.db.commit()
    
    frappe.logger().info(f"Remark saved for {docname}: {remark} by {action}")
    return {"success": True, "remark": remark}