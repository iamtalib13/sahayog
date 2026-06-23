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

        # Check if status transitions from Draft to Reporting Pending or Pending Reporting Person
        old_status = self.get_db_value("status") or "Draft"
        if old_status == "Draft" and self.status in ["Pending Reporting Person", "Reporting Pending"]:
            self.flags.send_notification_email = True

        # Check if status transitions to Pending HO Approval or HO Pending
        is_ho_transition = (old_status in ["Pending Reporting Person", "Reporting Pending", "Draft"] and 
                            self.status in ["Pending HO Approval", "HO Pending"])
        if is_ho_transition:
            self.flags.send_ho_notification_email = True

        # Check if status transitions to Approved
        is_approved_transition = (old_status in ["Pending HO Approval", "HO Pending"] and 
                                  self.status in ["Approved"])
        if is_approved_transition:
            self.flags.send_approved_notification_email = True

    def on_update(self):
        if self.flags.get("send_notification_email"):
            self.send_reporting_person_email()
            self.flags.send_notification_email = False
        if self.flags.get("send_ho_notification_email"):
            self.send_ho_officer_email()
            self.flags.send_ho_notification_email = False
        if self.flags.get("send_approved_notification_email"):
            self.send_approved_employee_email()
            self.flags.send_approved_notification_email = False

    def send_approved_employee_email(self):
        # 1. Check Sahayog Settings notification checkbox
        notification_enabled = frappe.db.get_single_value("Sahayog Settings", "notification")
        if not notification_enabled:
            return

        # 2. Get Employee's company email from Employee Doctype using self.employee
        employee_email = None
        if self.employee:
            # Employee field in EMR is a link to Employee Doctype, which is the Employee ID (EMP-XXXX)
            employee_email = frappe.db.get_value("Employee", self.employee, "company_email")

        if not employee_email:
            frappe.log_error(f"Could not find company email for employee: {self.employee}", "EMR Notification Email Error")
            return

        # 3. Fetch employee name if possible
        employee_name = frappe.db.get_value("Employee", self.employee, "employee_name") or ""
        employee_display = f"{self.employee} ({employee_name})" if employee_name else self.employee

        # 4. Construct URL
        site_url = frappe.utils.get_url()
        redirect_url = f"{site_url}/stockio#/requests/{self.name}"

        # 5. Build HTML message
        subject = f"Approved: Material Request {self.name}"
        
        # Format approval statuses
        rp_status = self.reporting_person_status or "Approved"
        ho_status = self.ho_officer_status or "Approved"

        message = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #48bb78; padding: 20px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Material Request Approved</h2>
            </div>
            
            <div style="padding: 24px; background-color: #ffffff;">
                <p>Hello,</p>
                <p>Your Material Request has been approved.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568; width: 180px;">Request ID:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Employee:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{employee_display}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Requested By:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.requested_by}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Required By Date:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.required_by_date or '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Department:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.department or '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Request Type:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.request_type or '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Remarks:</td>
                        <td style="padding: 10px 0; color: #2d3748; font-style: italic;">{self.ho_officer_remarks or self.reporting_person_remarks or '-'}</td>
                    </tr>
                </table>

                <h3 style="color: #4a5568; margin-top: 25px; border-bottom: 2px solid #48bb78; padding-bottom: 6px;">Approval Flow Status</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0; text-align: left;">
                    <thead>
                        <tr style="background-color: #f7fafc;">
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 13px;">Stage</th>
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 13px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold;">1. Draft Stage</td>
                            <td style="padding: 10px; border: 1px solid #edf2f7; color: #48bb78; font-weight: bold;">Completed</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold;">2. Reporting Person Status</td>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold; color: #48bb78;">{rp_status}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold;">3. HO Approval Status</td>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold; color: #48bb78;">{ho_status}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                    <a href="{redirect_url}" style="background-color: #48bb78; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(72, 187, 120, 0.2);">
                        View Request in StockIO
                    </a>
                </div>
            </div>
            
            <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
                This is an automated notification from Sahayog System.
            </div>
        </div>
        """

        # Send email using frappe.sendmail
        try:
            frappe.sendmail(
                recipients=[employee_email],
                subject=subject,
                message=message,
                reference_doctype=self.doctype,
                reference_name=self.name
            )
        except Exception as e:
            frappe.log_error(f"Failed to send email to {employee_email}: {str(e)}", "EMR Notification Email Error")

    def send_dispatch_notification_to_employee(self, transitioned_items):
        # 1. Check Sahayog Settings notification checkbox
        notification_enabled = frappe.db.get_single_value("Sahayog Settings", "notification")
        if not notification_enabled:
            return

        # 2. Get Employee's company email
        employee_email = None
        if self.employee:
            employee_email = frappe.db.get_value("Employee", self.employee, "company_email")

        if not employee_email:
            frappe.log_error(f"Could not find company email for employee: {self.employee}", "EMR Notification Email Error")
            return

        # 3. Construct URL
        site_url = frappe.utils.get_url()
        redirect_url = f"{site_url}/stockio#/requests/{self.name}"

        # 4. Build Table Rows of transitioned items
        rows_html = ""
        for item in transitioned_items:
            rows_html += f"""
            <tr style="border-bottom: 1px solid #edf2f7;">
                <td style="padding: 10px; border: 1px solid #edf2f7; font-size: 13px;">{item.item_code}</td>
                <td style="padding: 10px; border: 1px solid #edf2f7; font-size: 13px;">{item.item_name or '-'}</td>
                <td style="padding: 10px; border: 1px solid #edf2f7; font-size: 13px;">{item.item_category or '-'}</td>
                <td style="padding: 10px; border: 1px solid #edf2f7; font-size: 13px; text-align: center;">{item.quantity or 0}</td>
                <td style="padding: 10px; border: 1px solid #edf2f7; font-size: 13px; text-align: center;">{item.approved_quantity or 0}</td>
                <td style="padding: 10px; border: 1px solid #edf2f7; font-size: 13px; font-weight: bold; color: #3182ce;">{item.status}</td>
            </tr>
            """

        # 5. Build HTML message
        subject = f"Dispatched: Material Request {self.name}"
        
        message = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #3182ce; padding: 20px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Material Request Items Dispatched</h2>
            </div>
            
            <div style="padding: 24px; background-color: #ffffff;">
                <p>Hello,</p>
                <p>All items in your Material Request <strong>{self.name}</strong> have been successfully dispatched.</p>
                
                <h3 style="color: #4a5568; margin-top: 25px; border-bottom: 2px solid #3182ce; padding-bottom: 6px;">Dispatched Items Details</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0; text-align: left; border: 1px solid #edf2f7;">
                    <thead>
                        <tr style="background-color: #f7fafc;">
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 12px; text-transform: uppercase;">Item Code</th>
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 12px; text-transform: uppercase;">Item Name</th>
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 12px; text-transform: uppercase;">Category</th>
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 12px; text-transform: uppercase; text-align: center;">Req Qty</th>
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 12px; text-transform: uppercase; text-align: center;">App Qty</th>
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 12px; text-transform: uppercase;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows_html}
                    </tbody>
                </table>

                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                    <a href="{redirect_url}" style="background-color: #3182ce; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(49, 130, 206, 0.2);">
                        View Request in StockIO
                    </a>
                </div>
            </div>
            
            <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
                This is an automated notification from Sahayog System.
            </div>
        </div>
        """

        # Send email using frappe.sendmail
        try:
            frappe.sendmail(
                recipients=[employee_email],
                subject=subject,
                message=message,
                reference_doctype=self.doctype,
                reference_name=self.name
            )
        except Exception as e:
            frappe.log_error(f"Failed to send dispatch email to {employee_email}: {str(e)}", "EMR Notification Email Error")

    def send_ho_officer_email(self):
        # 1. Check Sahayog Settings notification checkbox
        notification_enabled = frappe.db.get_single_value("Sahayog Settings", "notification")
        if not notification_enabled:
            return

        # 2. Get HO Officer's email from Employee Doctype
        ho_officer_email = None
        if self.head_office_officer:
            # Try by user_id first
            emp_email = frappe.db.get_value("Employee", {"user_id": self.head_office_officer}, "company_email")
            if emp_email:
                ho_officer_email = emp_email
            else:
                # Try by Employee ID
                emp_email = frappe.db.get_value("Employee", self.head_office_officer, "company_email")
                if emp_email:
                    ho_officer_email = emp_email
                else:
                    # Fallback to head_office_officer itself if it contains @
                    if "@" in self.head_office_officer:
                        ho_officer_email = self.head_office_officer

        if not ho_officer_email:
            frappe.log_error(f"Could not find company email for HO officer: {self.head_office_officer}", "EMR Notification Email Error")
            return

        # 3. Fetch employee name if possible
        employee_name = frappe.db.get_value("Employee", self.employee, "employee_name") or ""
        employee_display = f"{self.employee} ({employee_name})" if employee_name else self.employee

        # 4. Construct URL
        site_url = frappe.utils.get_url()
        redirect_url = f"{site_url}/stockio#/requests/{self.name}"

        # 5. Build HTML message
        subject = f"Verification Required: Material Request {self.name}"
        
        # Format approval statuses
        rp_status = self.reporting_person_status or "Pending"
        ho_status = self.ho_officer_status or "Pending"

        message = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #369696; padding: 20px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Material Request Pending Approval</h2>
            </div>
            
            <div style="padding: 24px; background-color: #ffffff;">
                <p>Hello,</p>
                <p>A new Material Request has been submitted and is pending your review.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568; width: 180px;">Request ID:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Employee:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{employee_display}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Requested By:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.requested_by}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Required By Date:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.required_by_date or '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Department:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.department or '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Request Type:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.request_type or '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Remarks:</td>
                        <td style="padding: 10px 0; color: #2d3748; font-style: italic;">{self.ho_officer_remarks or self.reporting_person_remarks or '-'}</td>
                    </tr>
                </table>

                <h3 style="color: #4a5568; margin-top: 25px; border-bottom: 2px solid #369696; padding-bottom: 6px;">Approval Flow Status</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0; text-align: left;">
                    <thead>
                        <tr style="background-color: #f7fafc;">
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 13px;">Stage</th>
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 13px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold;">1. Draft Stage</td>
                            <td style="padding: 10px; border: 1px solid #edf2f7; color: #48bb78; font-weight: bold;">Completed</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold;">2. Reporting Person Status</td>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold; color: #48bb78;">{rp_status}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold;">3. HO Approval Status</td>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold; color: #dd6b20;">{ho_status}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                    <a href="{redirect_url}" style="background-color: #369696; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(54, 150, 150, 0.2);">
                        View Request in StockIO
                    </a>
                </div>
            </div>
            
            <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
                This is an automated notification from Sahayog System.
            </div>
        </div>
        """

        # Send email using frappe.sendmail
        try:
            frappe.sendmail(
                recipients=[ho_officer_email],
                subject=subject,
                message=message,
                reference_doctype=self.doctype,
                reference_name=self.name
            )
        except Exception as e:
            frappe.log_error(f"Failed to send email to {ho_officer_email}: {str(e)}", "EMR Notification Email Error")

    def send_reporting_person_email(self):
        # 1. Check Sahayog Settings notification checkbox
        notification_enabled = frappe.db.get_single_value("Sahayog Settings", "notification")
        if not notification_enabled:
            return

        # 2. Get Reporting Person's email from Employee Doctype
        reporting_person_email = None
        if self.reporting_person:
            # Try by user_id first
            emp_email = frappe.db.get_value("Employee", {"user_id": self.reporting_person}, "company_email")
            if emp_email:
                reporting_person_email = emp_email
            else:
                # Try by Employee ID
                emp_email = frappe.db.get_value("Employee", self.reporting_person, "company_email")
                if emp_email:
                    reporting_person_email = emp_email
                else:
                    # Fallback to reporting_person itself if it contains @
                    if "@" in self.reporting_person:
                        reporting_person_email = self.reporting_person

        if not reporting_person_email:
            frappe.log_error(f"Could not find company email for reporting person: {self.reporting_person}", "EMR Notification Email Error")
            return

        # 3. Fetch employee name if possible
        employee_name = frappe.db.get_value("Employee", self.employee, "employee_name") or ""
        employee_display = f"{self.employee} ({employee_name})" if employee_name else self.employee

        # 4. Construct URL
        site_url = frappe.utils.get_url()
        redirect_url = f"{site_url}/stockio#/requests/{self.name}"

        # 5. Build HTML message
        subject = f"Verification Required: Material Request {self.name}"
        
        # Format approval statuses
        rp_status = self.reporting_person_status or "Pending"
        ho_status = self.ho_officer_status or "Pending"

        message = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #369696; padding: 20px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Material Request Pending Approval</h2>
            </div>
            
            <div style="padding: 24px; background-color: #ffffff;">
                <p>Hello,</p>
                <p>A new Material Request has been submitted and is pending your review.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568; width: 180px;">Request ID:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Employee:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{employee_display}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Requested By:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.requested_by}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Required By Date:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.required_by_date or '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Department:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.department or '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Request Type:</td>
                        <td style="padding: 10px 0; color: #2d3748;">{self.request_type or '-'}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #edf2f7;">
                        <td style="padding: 10px 0; font-weight: bold; color: #4a5568;">Remarks:</td>
                        <td style="padding: 10px 0; color: #2d3748; font-style: italic;">{self.reporting_person_remarks or self.ho_officer_remarks or '-'}</td>
                    </tr>
                </table>

                <h3 style="color: #4a5568; margin-top: 25px; border-bottom: 2px solid #369696; padding-bottom: 6px;">Approval Flow Status</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0; text-align: left;">
                    <thead>
                        <tr style="background-color: #f7fafc;">
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 13px;">Stage</th>
                            <th style="padding: 10px; border: 1px solid #edf2f7; color: #718096; font-size: 13px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold;">1. Draft Stage</td>
                            <td style="padding: 10px; border: 1px solid #edf2f7; color: #48bb78; font-weight: bold;">Completed</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold;">2. Reporting Person Status</td>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold; color: #dd6b20;">{rp_status}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold;">3. HO Approval Status</td>
                            <td style="padding: 10px; border: 1px solid #edf2f7; font-weight: bold; color: #dd6b20;">{ho_status}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                    <a href="{redirect_url}" style="background-color: #369696; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(54, 150, 150, 0.2);">
                        View Request in StockIO
                    </a>
                </div>
            </div>
            
            <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7;">
                This is an automated notification from Sahayog System.
            </div>
        </div>
        """

        # Send email using frappe.sendmail
        try:
            frappe.sendmail(
                recipients=[reporting_person_email],
                subject=subject,
                message=message,
                reference_doctype=self.doctype,
                reference_name=self.name
            )
        except Exception as e:
            frappe.log_error(f"Failed to send email to {reporting_person_email}: {str(e)}", "EMR Notification Email Error") 

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
        
    doc = frappe.get_doc("Employee Material Request", docname)
    
    # Track which items are changing from 'Approved' to 'Dispatch'
    transitioned_items = []
    
    for item in doc.items:
        row_data = item_status_map.get(item.name)
        if row_data:
            new_status = row_data.get("status") if isinstance(row_data, dict) else row_data
            # If transitioning from Approved to Dispatch
            if item.status == "Approved" and new_status == "Dispatch":
                transitioned_items.append(item)
                
            # Perform update on the memory object so we can check the final state of all items
            if isinstance(row_data, dict):
                status = row_data.get("status")
                dispatch_detail = row_data.get("dispatch_detail")
                if status:
                    item.status = status
                if dispatch_detail:
                    item.dispatch_detail = dispatch_detail
            else:
                item.status = row_data

    # Save the document changes using doc.save() so standard hooks/validation/update run and DB is updated
    doc.save()
    frappe.db.commit()

    # Now check if ALL items in the child table have the status 'Dispatch'
    all_dispatched = all(item.status == "Dispatch" for item in doc.items)
    
    # If all items are Dispatched and we had items transitioning to Dispatch in this call
    if all_dispatched and transitioned_items:
        doc.send_dispatch_notification_to_employee(transitioned_items)

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