import frappe
from frappe.model.document import Document
from frappe.utils import getdate

class GoldRate(Document):
	def autoname(self):
		# Date ko yyyy-mm-dd format mein convert karna
		date_str = getdate(self.date).strftime("%Y-%m-%d")

		# Format: ref_id-date-karat-rate (e.g., MKT01-2026-03-16-18K-1500)
		# rate_per_gram use kiya gaya hai jaisa JSON mein hai
		self.name = f"{self.reference_id}-{date_str}-{self.gold_karat}-{int(self.rate_per_gram)}"

	def validate(self):
		# Agar ye naya rate 'Active' mark kiya gaya hai...
		if self.is_active:
			# Is specific Karat ke baaki saare records ko Inactive kar do
			frappe.db.sql("""
				update `tabGold Rate`
				set is_active = 0
				where gold_karat = %s and name != %s
			""", (self.gold_karat, self.name))
