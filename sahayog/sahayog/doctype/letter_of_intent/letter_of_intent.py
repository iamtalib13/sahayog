# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
import re
from frappe import _
import unicodedata
from frappe.model.document import Document


class LetterofIntent(Document):
	  
	def validate(self):
		# Check if docstatus is changing from 0 to 1
		if self.docstatus == 1 and self.get_doc_before_save() and self.get_doc_before_save().docstatus == 0:
			self.validate_aadhar_number()
			self.validate_mobile_number()
			self.validate_pan_number()

	def validate_aadhar_number(self):
		#"""Validate Aadhar Number format (XXXX XXXX XXXX)."""
		aadhar_number = self.aadhar_number

		if not aadhar_number:
			frappe.throw(_("Aadhar number is required."))

		if not re.match(r'^[2-9]\d{3} \d{4} \d{4}$', aadhar_number):
			frappe.throw(_("Aadhar number should have 12 digits in the format 'XXXX XXXX XXXX' and should not start with 0 or 1."))

	def validate_mobile_number(self):
		#"""Validate Mobile Number format (10 digits, starts with 6-9)."""
		mobile_number = self.mobile_number

		if not mobile_number:
			frappe.throw(_("Mobile number is required."))

		if not re.match(r'^[6789]\d{9}$', mobile_number):
			frappe.throw(_("Mobile number should be exactly 10 digits and start with 6, 7, 8, or 9."))

	
	def validate_pan_number(self):
		# Convert to string and remove spaces
		pan_number = str(self.pan_number).strip()

		# Remove hidden Unicode characters
		pan_number = ''.join(c for c in pan_number if unicodedata.category(c)[0] != 'C')

		# Convert to uppercase
		pan_number = pan_number.upper()

		# Define the regex for PAN number validation
		regex = r'^[A-Z]{5}\d{4}[A-Z]$'

		if not pan_number:  # Check if the PAN number is empty
			frappe.throw(_("PAN number is required."))  # Throw an error if PAN is empty

		# Validate the PAN number using the regex
		if not re.match(regex, pan_number):
			frappe.throw(_("PAN number should be in the format 'ABCDE1234F' (5 uppercase letters, 4 digits, 1 uppercase letter, no spaces)."))
