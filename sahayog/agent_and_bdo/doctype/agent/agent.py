# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class Agent(Document):
	def before_save(self):
		if self.agent_name:
			self.agent_name = self.agent_name.upper()
