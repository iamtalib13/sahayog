# Copyright (c) 2025, Your Company and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now, getdate

class EmployeeMaterialRequest(Document):
    def validate(self):
        """Validate document before save"""
        self.validate_items()
        self.validate_dates()
        self.set_requested_by()
        self.validate_request_type_items()
    
    def before_workflow_action(self):
        """Called before workflow action"""
        self.update_approval_fields()
    
    def before_submit(self):
        """Validate before submit"""
        self.validate_final_approval()
        self.check_stock_availability()
    
    def on_submit(self):
        """Actions on submit"""
        self.db_set('status', 'Approved')
        self.send_approval_notification()
        frappe.msgprint(_("Material Request {0} has been approved").format(self.name))
    
    def on_cancel(self):
        """Actions on cancel"""
        self.validate_cancellation()
        self.cancel_linked_stock_entries()
        self.db_set('status', 'Cancelled')
        self.add_comment('Edit', 'Document cancelled')
    
    def validate_items(self):
        """Validate items in both tables"""
        has_asset_items = len(self.asset_items or []) > 0
        has_stock_items = len(self.stock_items or []) > 0
        
        if not has_asset_items and not has_stock_items:
            frappe.throw(_("Please add at least one item (Asset or Stock)"))
        
        # Validate individual items
        for item in (self.asset_items or []):
            self.validate_asset_item(item)
        
        for item in (self.stock_items or []):
            self.validate_stock_item(item)
    
    def validate_asset_item(self, item):
        """Validate individual asset item"""
        if self.request_type == "New":
            if not item.assigned_to_employee:
                frappe.throw(_("Row {0} (Asset): Please specify employee for assignment").format(item.idx))
        
        elif self.request_type == "Return":
            if not item.asset:
                frappe.throw(_("Row {0} (Asset): Please select asset to return").format(item.idx))
            
            # Validate asset is assigned
            asset_custodian = frappe.db.get_value("Asset", item.asset, "custodian")
            if not asset_custodian:
                frappe.throw(_("Row {0}: Asset {1} is not assigned to anyone").format(item.idx, item.asset))
    
    def validate_stock_item(self, item):
        """Validate individual stock item"""
        if self.request_type == "Issue":
            if not item.is_consumable:
                frappe.throw(_("Row {0} (Stock): Issue type only for consumable items").format(item.idx))
        
        # Set default warehouse if not set
        if not item.warehouse:
            item.warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")
    
    def validate_dates(self):
        """Validate dates"""
        if self.required_by_date and getdate(self.required_by_date) < getdate(self.request_date):
            frappe.throw(_("Required By Date cannot be before Request Date"))
    
    def set_requested_by(self):
        """Set requested by on first save"""
        if not self.requested_by:
            self.requested_by = frappe.session.user
            self.request_datetime = now()
    
    def validate_request_type_items(self):
        """Validate items match request type"""
        if self.request_type == "Issue":
            # Issue type should only have stock items
            if len(self.asset_items or []) > 0:
                frappe.throw(_("Issue type cannot have asset items. Please remove asset items."))
    
    def update_approval_fields(self):
        """Update approval fields based on workflow action"""
        current_user = frappe.session.user
        action = frappe.form_dict.get('action')
        
        # Reporting Person approval
        if self.workflow_state == "Pending Reporting Person Approval":
            if current_user == self.reporting_person:
                if "Approve" in action:
                    self.reporting_person_status = "Approved"
                    self.reporting_person_approval_date = now()
                elif "Reject" in action:
                    self.reporting_person_status = "Rejected"
                    self.reporting_person_approval_date = now()
        
        # Head Office Officer approval
        elif self.workflow_state == "Pending HO Approval":
            if frappe.has_permission(self.doctype, ptype="write", user=current_user):
                if "Final Approve" in action or "Approve" in action:
                    if not self.head_office_officer:
                        self.head_office_officer = current_user
                    self.ho_officer_status = "Approved"
                    self.ho_officer_approval_date = now()
                elif "Reject" in action:
                    if not self.head_office_officer:
                        self.head_office_officer = current_user
                    self.ho_officer_status = "Rejected"
                    self.ho_officer_approval_date = now()
    
    def validate_final_approval(self):
        """Validate all approvals before submit"""
        if self.reporting_person_status != "Approved":
            frappe.throw(_("Reporting Person approval is required before submission"))
        
        if self.ho_officer_status != "Approved":
            frappe.throw(_("Head Office Officer approval is required before submission"))
    
    def check_stock_availability(self):
        """Check stock availability before approval"""
        if self.request_type in ["New", "Issue"]:
            for item in (self.stock_items or []):
                available_qty = frappe.db.get_value(
                    "Bin",
                    {"item_code": item.item_code, "warehouse": item.warehouse},
                    "actual_qty"
                ) or 0
                
                if item.quantity > available_qty:
                    frappe.msgprint(
                        _("Row {0}: Insufficient stock. Available: {1}, Requested: {2}").format(
                            item.idx, available_qty, item.quantity
                        ),
                        indicator='orange',
                        alert=True
                    )
    
    def validate_cancellation(self):
        """Validate before cancellation"""
        completed_entries = 0
        
        for item in (self.asset_items or []):
            if item.stock_entry:
                se_status = frappe.db.get_value("Stock Entry", item.stock_entry, "docstatus")
                if se_status == 1:
                    completed_entries += 1
        
        for item in (self.stock_items or []):
            if item.stock_entry:
                se_status = frappe.db.get_value("Stock Entry", item.stock_entry, "docstatus")
                if se_status == 1:
                    completed_entries += 1
        
        if completed_entries > 0:
            frappe.msgprint(
                _("{0} items have completed stock entries. These will be cancelled.").format(completed_entries),
                indicator='orange'
            )
    
    def cancel_linked_stock_entries(self):
        """Cancel all linked stock entries"""
        for item in (self.asset_items or []):
            if item.stock_entry:
                cancel_stock_entry(item.stock_entry)
                item.db_set("stock_entry", None, update_modified=False)
        
        for item in (self.stock_items or []):
            if item.stock_entry:
                cancel_stock_entry(item.stock_entry)
                item.db_set("stock_entry", None, update_modified=False)
    
    def send_approval_notification(self):
        """Send notification after approval"""
        try:
            frappe.sendmail(
                recipients=[self.requested_by],
                subject=f"Material Request {self.name} Approved",
                message=f"""
                    <p>Dear User,</p>
                    <p>Your Material Request <b>{self.name}</b> has been approved.</p>
                    <p>Request Type: {self.request_type}</p>
                    <p>Approved by: {self.head_office_officer}</p>
                    <p><a href="{frappe.utils.get_url()}/app/employee-material-request/{self.name}">View Document</a></p>
                """,
                reference_doctype=self.doctype,
                reference_name=self.name
            )
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), "Material Request Notification Error")


# Helper Functions
def cancel_stock_entry(stock_entry_name):
    """Cancel a stock entry"""
    try:
        se = frappe.get_doc("Stock Entry", stock_entry_name)
        if se.docstatus == 1:
            se.add_comment("Edit", "Cancelled due to Material Request cancellation")
            se.cancel()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Error cancelling Stock Entry: {stock_entry_name}")


# API Methods
@frappe.whitelist()
def create_stock_entry_from_request(material_request, item_type='both'):
    """
    Create Stock Entry from Material Request
    item_type: 'asset', 'stock', or 'both'
    """
    mr = frappe.get_doc("Employee Material Request", material_request)
    
    if mr.docstatus != 1:
        frappe.throw(_("Only submitted requests can be processed"))
    
    # Determine entry type
    entry_type_map = {
        "New": "Material Issue",
        "Return": "Material Receipt",
        "Issue": "Material Consumption"
    }
    
    se = frappe.new_doc("Stock Entry")
    se.stock_entry_type = entry_type_map.get(mr.request_type, "Material Issue")
    se.custom_material_request = mr.name
    
    # Set warehouses
    if mr.request_type in ["New", "Issue"]:
        se.from_warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")
    elif mr.request_type == "Return":
        se.to_warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")
    
    # Add items
    items_added = 0
    
    if item_type in ['asset', 'both'] and mr.asset_items:
        for item in mr.asset_items:
            if item.status in ["Pending", "Approved"]:
                add_item_to_stock_entry(se, item, mr.request_type, 'asset')
                items_added += 1
    
    if item_type in ['stock', 'both'] and mr.stock_items:
        for item in mr.stock_items:
            if item.status in ["Pending", "Approved"]:
                add_item_to_stock_entry(se, item, mr.request_type, 'stock')
                items_added += 1
    
    if items_added == 0:
        frappe.throw(_("No items to process"))
    
    se.save()
    
    # Update status
    mr.db_set("status", "In Progress")
    
    return se.name


def add_item_to_stock_entry(se, item, request_type, item_category):
    """Add item to stock entry"""
    se_item = se.append("items", {})
    se_item.item_code = item.item_code
    se_item.qty = item.quantity
    se_item.uom = item.uom
    
    if request_type == "New":
        se_item.s_warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")
    elif request_type == "Return":
        se_item.t_warehouse = frappe.db.get_single_value("Stock Settings", "default_warehouse")
    elif request_type == "Issue":
        se_item.s_warehouse = item.warehouse if item_category == 'stock' else None
    
    # Link asset if applicable
    if item_category == 'asset' and hasattr(item, 'asset') and item.asset:
        se_item.asset = item.asset
