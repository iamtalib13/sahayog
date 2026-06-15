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

        # Detect resubmission from Rejected -> Pending Reporting Person
        is_resubmission = (self.get_db_value("status") == "Rejected" and 
                        self.status == "Pending Reporting Person")
        
        # Clear remarks ONLY on resubmission
        if is_resubmission:
            self.reporting_person_remarks = ""
            self.ho_officer_remarks = ""
            self.db_set("reporting_person_remarks", "")
            self.db_set("ho_officer_remarks", "")
            frappe.db.commit()

        # Metadata management - keep secondary status fields in sync
        if self.status == "Pending Reporting Person":
            self.reporting_person_status = "Pending"
            self.ho_officer_status = ""
        elif self.status == "Pending HO Approval":
            self.ho_officer_status = "Pending"
        elif self.status == "Approved":
            self.reporting_person_status = "Approved"
            self.ho_officer_status = "Approved"
        elif self.status == "Rejected":
            # Determine who rejected it based on current stage
            pass 

    def set_request_datetime_once(self):        
        if self.status == "Pending Reporting Person" and not self.request_datetime:
            if self.is_new() or self.docstatus == 0:
                self.request_datetime = now()

    def before_submit(self):
        """Validate before document submission"""
        self.validate_final_approval()
        self.check_stock_availability()
        self.validate_dates()

    def on_submit(self):
        """Actions after successful submission"""
        self.db_set('status', 'Approved')
        self.send_approval_notification()

    def on_cancel(self):
        """Actions when document is cancelled"""
        self.cancel_linked_stock_entries()
        self.db_set('status', 'Cancelled')

    def validate_dates(self):
        if self.request_date:
            if getdate(self.request_date) > getdate(today()):
                frappe.throw(_("Request Date cannot be in the future."), title=_("Invalid Request Date"))
        
        if not self.required_by_date:
            frappe.throw(_("Required By Date is mandatory"), title=_("Missing Required Field"))
        
                # Only check if date is in the past during initial submission
        old_status = self.get_db_value("status")
        is_submitting = (self.status == "Pending Reporting Person" and old_status in ["Draft", "Rejected", None])
        if (self.status in ["Draft", "Rejected"] or is_submitting) and getdate(self.required_by_date) < getdate(today()):
            frappe.throw(_("Required By Date cannot be in the past."), title=_("Invalid Date"))
        
        if getdate(self.required_by_date) < getdate(self.request_date):
            frappe.throw(_("Required By Date cannot be before Request Date."), title=_("Invalid Date Range"))

    def validate_items(self):
        if not self.items:
            frappe.throw(_("Please add at least one item"))
        for item in self.items:
            if not item.item_code:
                frappe.throw(_("Row {0}: Item Code not set.").format(item.idx))
                
            # Fetch actual item data from DB to ensure backend consistency
            item_details = frappe.db.get_value("Item", item.item_code, ["is_stock_item", "is_fixed_asset"], as_dict=1)
            
            if not item_details:
                frappe.throw(_("Row {0}: {1} not found").format(item.idx, item.item_code))

            # Backend logic: prioritize Stock Item if it is a stock item
            if item_details.is_stock_item:
                self.validate_stock_item(item)
            elif item_details.is_fixed_asset:
                self.validate_asset_item(item)
            else:
                frappe.throw(_("Row {0}: {1} is neither a Stock item nor an Asset item").format(item.idx, item.item_code))

    def validate_asset_item(self, item):
        is_asset = frappe.db.get_value("Item", item.item_code, "is_fixed_asset")
        if not is_asset:
            frappe.throw(_("Row {0}: {1} is not an Asset item").format(item.idx, item.item_code))
        if self.request_type == "New" and not item.assigned_to_employee:
            frappe.throw(_("Row {0}: Employee required").format(item.idx))
        if self.request_type == "Return" and not item.asset:
            frappe.throw(_("Row {0}: Asset required").format(item.idx))
        if self.request_type == "Issue":
            frappe.throw(_("Row {0}: Asset items cannot have Issue request type").format(item.idx))

    def validate_stock_item(self, item):
        item_details = frappe.db.get_value("Item", item.item_code, ["is_stock_item", "is_fixed_asset"], as_dict=1)
        if not item_details or not item_details.is_stock_item or item_details.is_fixed_asset:
            frappe.throw(_("Row {0}: {1} is not a Stock item").format(item.idx, item.item_code))
        if self.request_type == "Issue" and not item.is_consumable:
            frappe.throw(_("Row {0}: Issue type only for consumables").format(item.idx))

    def set_requested_by(self):
        if not self.requested_by:
            self.requested_by = frappe.session.user
            self.request_datetime = now()

    def update_approval_fields(self):
        current_user = frappe.session.user
        action = (frappe.form_dict.get('action') or "").lower()
        if self.status == "Pending Reporting Person" and current_user == self.reporting_person:
            if "approve" in action: self.reporting_person_status = "Approved"
            elif "reject" in action: self.reporting_person_status = "Rejected"
            elif "skip" in action: self.reporting_person_status = "Skip"
            self.reporting_person_approval_date = now()
            self.db_set("reporting_person_status", self.reporting_person_status)
        if self.status == "Pending HO Approval" and ("Head Office Officer" in frappe.get_roles()):
            if "approve" in action: self.ho_officer_status = "Approved"
            elif "reject" in action: self.ho_officer_status = "Rejected"
            elif "skip" in action: self.ho_officer_status = "Skip"
            self.ho_officer_approval_date = now()
            self.db_set("ho_officer_status", self.ho_officer_status)

    def validate_final_approval(self):
        # Skip validation if it's already marked as Self Approved or Approved
        if self.status in ["Self Approved", "Approved"]:
            return

        if self.reporting_person_status not in ["Approved", "Skip"]:
            frappe.throw(_("Reporting Person approval is required before submission."), title=_("Approval Required"))
        
        if self.ho_officer_status not in ["Approved", "Skip"]:
            frappe.throw(_("Head Office Officer approval is required before submission."), title=_("Approval Required"))

    def check_stock_availability(self):
        if self.request_type in ["New", "Issue"]:
            insufficient_items = []
            for item in self.items:
                if item.item_category == "Stock Item" and item.warehouse:
                    available = frappe.db.get_value("Bin", {"item_code": item.item_code, "warehouse": item.warehouse}, "actual_qty") or 0
                    if item.quantity > available:
                        insufficient_items.append(_("{0} - Available: {1}, Requested: {2}").format(item.item_code, available, item.quantity))
            if insufficient_items:
                frappe.msgprint(_("Insufficient Stock: {0}").format(", ".join(insufficient_items)), indicator='orange', alert=True)

    def cancel_linked_stock_entries(self):
        for item in self.items:
            if item.stock_entry:
                try:
                    se = frappe.get_doc("Stock Entry", item.stock_entry)
                    if se.docstatus == 1: se.cancel()
                    item.db_set("stock_entry", None)
                except Exception: pass

    def send_approval_notification(self):
        try:
            frappe.sendmail(
                recipients=[self.requested_by],
                subject=f"Material Request {self.name} Approved",
                message=f"Your Material Request {self.name} has been approved.",
                reference_doctype=self.doctype, reference_name=self.name
            )
        except Exception: pass

    def before_workflow_action(self):
        current_user = frappe.session.user
        action = (frappe.form_dict.get("action") or "").lower()
        if self.status == "Pending Reporting Person" and current_user == self.reporting_person:
            if action in ["approve", "skip"]: self.reporting_person_status = "Approved" if action == "approve" else "Skip"
            elif action == "reject": self.reporting_person_status = "Rejected"
            self.reporting_person_approval_date = now()
            self.db_set("reporting_person_status", self.reporting_person_status)
            frappe.db.commit()
        elif self.status == "Pending HO Approval" and ("Head Office Officer" in frappe.get_roles()):
            if action in ["approve", "skip"]: self.ho_officer_status = "Approved" if action == "approve" else "Skip"
            elif action == "reject": self.ho_officer_status = "Rejected"
            self.ho_officer_approval_date = now()
            self.db_set("ho_officer_status", self.ho_officer_status)
            frappe.db.commit()

@frappe.whitelist()
def update_emr_item_status(docname, item_status_map):
    """
    Updates status and dispatch_detail for specific items in the EMR.
    item_status_map format: '{"item_child_row_name": {"status": "Dispatch", "dispatch_detail": "DD-001"}}'
    """
    if isinstance(item_status_map, str):
        item_status_map = frappe.parse_json(item_status_map)
        
    for row_name, data in item_status_map.items():
        if isinstance(data, dict):
            status = data.get("status")
            dispatch_detail = data.get("dispatch_detail")
            if status:
                frappe.db.set_value("Material Request Items", row_name, "status", status)
            if dispatch_detail:
                frappe.db.set_value("Material Request Items", row_name, "dispatch_detail", dispatch_detail)
        else:
            # Fallback for simple status string update
            frappe.db.set_value("Material Request Items", row_name, "status", data)
            
    frappe.db.commit()
    return {"success": True}

# Whitelisted API Methods

@frappe.whitelist()
def workflow_action_update_status(docname, action, remark=None):
    from frappe.model.workflow import apply_workflow
    
    doc = frappe.get_doc("Employee Material Request", docname)
    action_lower = action.lower()
    
    if remark:
        if doc.status == "Pending Reporting Person": doc.reporting_person_remarks = remark
        elif doc.status == "Pending HO Approval": doc.ho_officer_remarks = remark
    
    is_admin = frappe.session.user == "Administrator" or ("Store Manager" in frappe.get_roles())
    
    # Permission checks
    can_approve_rp = (doc.status == "Pending Reporting Person" and (frappe.session.user == doc.reporting_person or is_admin))
    can_approve_ho = (doc.status == "Pending HO Approval" and (frappe.session.user == doc.head_office_officer or "Head Office Officer" in frappe.get_roles() or is_admin))
    can_reject_approved = (action_lower == "reject" and doc.status == "Approved" and (frappe.session.user == doc.head_office_officer or "Head Office Officer" in frappe.get_roles() or is_admin))
    
    if not (can_approve_rp or can_approve_ho or can_reject_approved):
        frappe.throw(_("Not authorized to perform this action at the current stage."))

    # Map generic 'action' to actual Workflow Action labels if necessary
    # Usually the actions are 'Approve', 'Reject'
    workflow_action = action.capitalize() 

    # Update internal status fields before applying workflow action
    if can_approve_rp:
        if action_lower == "approve": doc.db_set("reporting_person_status", "Approved")
        elif action_lower == "reject": doc.db_set("reporting_person_status", "Rejected")
        else: doc.db_set("reporting_person_status", "Skip")
    
    elif can_approve_ho:
        if action_lower == "approve": doc.db_set("ho_officer_status", "Approved")
        elif action_lower == "reject": doc.db_set("ho_officer_status", "Rejected")
        else: doc.db_set("ho_officer_status", "Skip")
    
    elif can_reject_approved:
        # Just apply workflow, no need to update status fields for approval roles
        pass

    # Apply Workflow Action
    # This will handle status updates, docstatus changes, and validations defined in the Workflow
    try:
        apply_workflow(doc, workflow_action)
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("Workflow Error"))
        # Fallback for manual update if workflow fails or doesn't exist
        new_status = doc.status
        new_docstatus = doc.docstatus
        
        if action_lower == "approve":
            if doc.status == "Pending Reporting Person":
                new_status = "Pending HO Approval"
            elif doc.status == "Pending HO Approval":
                new_status = "Approved"
                new_docstatus = 1
        elif action_lower == "reject":
            new_status = "Rejected"
        
        # Use db_set to bypass Workflow validation in fallback
        doc.db_set("status", new_status)
        if new_docstatus != doc.docstatus:
            doc.db_set("docstatus", new_docstatus)
        
        frappe.db.commit()

@frappe.whitelist()
def create_stock_entry_from_request(material_request):
    mr = frappe.get_doc("Employee Material Request", material_request)
    if mr.docstatus != 1: frappe.throw(_("Only approved requests can be processed"))
    entry_type_map = {"New": "Material Issue", "Return": "Material Receipt", "Issue": "Material Consumption"}
    se = frappe.new_doc("Stock Entry")
    se.stock_entry_type = entry_type_map.get(mr.request_type)
    se.custom_material_request = mr.name
    items_added = 0
    for item in mr.items:
        if item.status in ["Pending", "Approved"]:
            se_item = se.append("items", {}); se_item.item_code = item.item_code; se_item.qty = item.quantity
            items_added += 1
    if items_added == 0: frappe.throw(_("No items found"))
    se.save(); mr.db_set("status", "In Progress"); return se.name

@frappe.whitelist()
def get_material_request_intro_data(doc_name):
    try:
        doc = frappe.get_doc("Employee Material Request", doc_name)
        return {
            "success": True,
            "data": {
                "employee": get_employee_data(doc.employee),
                "branch": get_branch_data(doc.target_warehouse),
                "requested_by": get_creator_employee(doc.owner),
                "reporting_person": get_employee_by_user(doc.reporting_person),
                "ho_officer": get_employee_by_user(doc.head_office_officer),
                "doc_status": doc.docstatus,
                "reporting_person_status": doc.reporting_person_status,
                "ho_officer_status": doc.ho_officer_status,
                "request_datetime": doc.request_datetime,
                "status": doc.status,
                "reporting_person_remarks": doc.reporting_person_remarks or "",
                "ho_officer_remarks": doc.ho_officer_remarks or "",
                "remark": doc.remark or ""
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_employee_data(employee_number):
    if not employee_number: return {}
    employee = frappe.db.get_value("Employee", {"employee_number": employee_number}, ["employee_number", "employee_name", "cell_number"], as_dict=True)
    return employee or {}

def get_branch_data(sol_id):
    if not sol_id: return {}
    branch = frappe.db.get_value("Sahayog Branch", {"sol_id": sol_id}, ["branch", "district", "state_code"], as_dict=True)
    return branch or {}

def get_employee_by_user(user_id):
    if not user_id: return {}
    employee = frappe.db.get_value("Employee", {"user_id": user_id}, ["employee_number", "employee_name", "cell_number"], as_dict=True)
    return employee or {}

def get_creator_employee(user_id):
    if not user_id: return {"employee_name": "N/A"}
    employee = frappe.db.get_value("Employee", {"user_id": user_id}, ["employee_number", "employee_name", "cell_number"], as_dict=True)
    if employee: return employee
    user_name = frappe.db.get_value("User", user_id, "full_name")
    return {"employee_name": user_name or user_id}

@frappe.whitelist()
def self_approve_request(docname):
    doc = frappe.get_doc("Employee Material Request", docname)
    is_owner = (frappe.session.user == doc.owner)
    is_admin_or_store_manager = (frappe.session.user == "Administrator" or ("Store Manager" in frappe.get_roles()))
    
    if not (is_owner or is_admin_or_store_manager):
        frappe.throw("Only Owner, Administrator or Store Manager can perform Self Approved.", frappe.PermissionError)
    
    doc.reporting_person_status = "Skip"
    doc.ho_officer_status = "Skip"
    doc.status = "Self Approved"; doc.docstatus = 1
    doc.flags.ignore_validate = True
    doc.save()
    frappe.db.commit()
    return {"success": True, "status": doc.status}

@frappe.whitelist()
def update_material_request_approval_status(docname, action, remark=""):
    doc = frappe.get_doc("Employee Material Request", docname)
    if doc.status == "Pending Reporting Person": frappe.db.set_value("Employee Material Request", docname, "reporting_person_remarks", remark)
    elif doc.status == "Pending HO Approval": frappe.db.set_value("Employee Material Request", docname, "ho_officer_remarks", remark)
    frappe.db.commit()
    return {"success": True}