import os
import re
import frappe
from frappe.model.document import Document
from frappe.utils import validate_email_address
from frappe import _

class AgentLead(Document):
	def validate(self):
		# 📱 1. Contact Number (Mobile) Validation
		if self.mobile_no:
			cleaned_mobile = re.sub(r"\D", "", str(self.mobile_no))
			if len(cleaned_mobile) != 10 or not re.match(r"^[6-9]\d{9}$", cleaned_mobile):
				frappe.throw(_("Contact Number must be strictly a 10-digit numeric mobile number starting with 6, 7, 8, or 9."))
			self.mobile_no = cleaned_mobile

		# 📞 2. Alternate Number Validation (Optional)
		if self.alternate_number:
			cleaned_alt = re.sub(r"\D", "", str(self.alternate_number))
			if len(cleaned_alt) != 10 or not re.match(r"^[6-9]\d{9}$", cleaned_alt):
				frappe.throw(_("Alternate Number must be strictly a 10-digit numeric mobile number starting with 6, 7, 8, or 9."))
			self.alternate_number = cleaned_alt

		# 📧 3. Email ID Validation (Optional)
		if self.email_id:
			self.email_id = str(self.email_id).strip()
			if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", self.email_id):
				frappe.throw(_("Email ID must be in a valid format e.g. name@domain.com"))
			validate_email_address(self.email_id, throw=True)

		# 📍 4. Area PIN Code Validation
		if self.pincode:
			cleaned_pin = re.sub(r"\D", "", str(self.pincode))
			if len(cleaned_pin) != 6 or not re.match(r"^[1-9]\d{5}$", cleaned_pin):
				frappe.throw(_("Area PIN Code must be strictly a 6-digit numeric PIN code."))
			self.pincode = cleaned_pin

		# 🎂 5. Age Validation (18 - 100)
		if self.age is not None and self.age != "":
			try:
				age_val = int(self.age)
				if age_val < 18 or age_val > 100:
					frappe.throw(_("Age must be a valid number between 18 and 100 years."))
			except ValueError:
				frappe.throw(_("Age must be a valid numeric integer."))

		# 🏢 6. Auto-assign branch or fetch location details from Sahayog Branch
		if self.branch:
			b_doc = frappe.db.get_value("Sahayog Branch", self.branch, ["state", "district"], as_dict=True)
			if b_doc:
				if not self.state and b_doc.get("state"): self.state = b_doc.get("state")
				if not self.city_district and b_doc.get("district"): self.city_district = b_doc.get("district")
		elif self.city_district:
			try:
				matching_branch = frappe.db.get_value("Sahayog Branch", {"district": ["like", f"%{self.city_district.strip()}%"]}, "name")
				if matching_branch:
					self.branch = matching_branch
			except Exception:
				pass

@frappe.whitelist(allow_guest=True)
def get_sahayog_locations():
	"""Fetches unique states, districts, and branch options from Sahayog Branch."""
	branches = frappe.get_all("Sahayog Branch", fields=["name", "sol_id", "branch", "district", "state"], order_by="branch asc")
	states = sorted(list(set([b.state for b in branches if b.get("state")])))
	districts = sorted(list(set([b.district for b in branches if b.get("district")])))
	return {
		"states": states,
		"districts": districts,
		"branches": [{"value": b.name, "label": f"{b.branch} ({b.sol_id or b.name})", "state": b.state, "district": b.district} for b in branches]
	}


@frappe.whitelist(allow_guest=True)
def ensure_qr_code():
	"""
	Generates QR Code PNG pointing to the public Agent Lead Registration Form (/agent-registration).
	Saved in public/files for easy download and inclusion in Ganesh Aarti Books and posters.
	"""
	file_path = frappe.get_site_path("public", "files", "agent_lead_qr.png")
	if not os.path.exists(file_path):
		os.makedirs(os.path.dirname(file_path), exist_ok=True)
		try:
			site_url = frappe.utils.get_url()
			qr_data = f"{site_url}/agent-registration"
			import qrcode
			qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
			qr.add_data(qr_data)
			qr.make(fit=True)
			img = qr.make_image(fill_color="black", back_color="white")
			img.save(file_path, format="PNG")
		except Exception as e:
			frappe.log_error(message=str(e), title="Agent Lead QR Generation Failed")

	return {
		"status": "success",
		"qr_url": "/files/agent_lead_qr.png",
		"target_url": f"{frappe.utils.get_url()}/agent-registration"
	}

@frappe.whitelist(allow_guest=True)
def submit_public_agent_lead(lead_data):
	"""
	Whitelisted method for guest/public submission of Agent Registration Form.
	Creates an 'Agent Lead' document cleanly.
	"""
	data = frappe.parse_json(lead_data) if isinstance(lead_data, str) else lead_data
	if not data.get("full_name") or not data.get("mobile_no"):
		frappe.throw(_("Full Name and Contact Number are mandatory fields."))

	doc = frappe.get_doc({
		"doctype": "Agent Lead",
		"full_name": data.get("full_name"),
		"mobile_no": data.get("mobile_no"),
		"alternate_number": data.get("alternate_number"),
		"email_id": data.get("email_id"),
		"state": data.get("state"),
		"city_district": data.get("city_district"),
		"pincode": data.get("pincode"),
		"occupation": data.get("occupation"),
		"resident_status": data.get("resident_status"),
		"age": data.get("age"),
		"gender": data.get("gender"),
		"marital_status": data.get("marital_status"),
		"highest_qualification": data.get("highest_qualification"),
		"preferred_working_hours": data.get("preferred_working_hours"),
		"resume": data.get("resume"),
		"lead_source": "WaFHa Campaign (QR)",
		"status": "New"
	})
	doc.insert(ignore_permissions=True)
	frappe.db.commit()

	return {
		"status": "success",
		"name": doc.name,
		"message": _("Thank you for registering! Our representative will contact you shortly.")
	}

@frappe.whitelist()
def get_agent_lead_dashboard_data(start=0, page_length=10):
	user = frappe.session.user
	roles = frappe.get_roles(user)
	is_admin = "System Manager" in roles or "MIS Admin" in roles or user == "Administrator"
	filters = {}

	try:
		start = int(start)
	except Exception:
		start = 0

	try:
		page_length = int(page_length)
	except Exception:
		page_length = 10

	stats_query = """
		SELECT
			COUNT(name) as total_leads,
			COALESCE(SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END), 0) as new_count,
			COALESCE(SUM(CASE WHEN status IN ('In Touch', 'Interested') THEN 1 ELSE 0 END), 0) as active_count,
			COALESCE(SUM(CASE WHEN status = 'Onboarded' THEN 1 ELSE 0 END), 0) as onboarded_count,
			COALESCE(SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END), 0) as rejected_count
		FROM `tabAgent Lead`
	"""
	stats_res = frappe.db.sql(stats_query, as_dict=True)[0]
	total_leads = int(stats_res.total_leads or 0)

	records = frappe.get_all(
		"Agent Lead",
		filters=filters,
		fields=[
			"name",
			"full_name",
			"mobile_no",
			"city_district",
			"occupation",
			"status",
			"creation",
		],
		order_by="creation desc",
		start=start,
		page_length=page_length,
	)

	return {
		"records": records,
		"stats": {
			"total_leads": total_leads,
			"new_count": int(stats_res.new_count or 0),
			"active_count": int(stats_res.active_count or 0),
			"onboarded_count": int(stats_res.onboarded_count or 0),
			"rejected_count": int(stats_res.rejected_count or 0),
		},
		"is_admin": is_admin,
		"total_count": total_leads
	}

