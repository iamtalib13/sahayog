import frappe
from frappe.model.document import Document

FOLLOWUP_TYPES = ("Follow-up Required", "Call Back Later")
CHECKBOX_TYPES = ("Positive", "Negative")

class AgentActivationCallLog(Document):

    def before_insert(self):
        if not self.trainer:
            self.trainer = frappe.session.user
        self._validate_unique_assignment()

    def on_submit(self):
        if self.exited and self.agent:
            frappe.db.set_value("Agent", self.agent, "calling_status", "Exited")

    def _validate_unique_assignment(self):
        """One active SS must be assigned to only one trainer at a time."""
        existing_trainer = frappe.db.get_value(
            "Agent Activation Call Log",
            {
                "agent": self.agent,
                "trainer": ["!=", frappe.session.user],
                "docstatus": ["<", 2],
                "exited": 0,
            },
            "trainer",
        )
        if existing_trainer:
            trainer_name = frappe.db.get_value("User", existing_trainer, "full_name") or existing_trainer
            frappe.throw(
                f"This SS is already assigned to trainer <b>{trainer_name}</b>. "
                "An SS can only be assigned to one trainer at a time."
            )

    def before_save(self):
        phone = "".join(filter(str.isdigit, self.agent_phone_number or ""))
        if phone:
            phone = phone[-10:]  # strip country code if present
            if len(phone) != 10:
                frappe.throw("Agent Phone Number must be exactly 10 digits.")
            self.agent_phone_number = phone

        if self.amount:
            try:
                amt = float(self.amount)
            except ValueError:
                frappe.throw("Amount must be a valid number.")
            if not amt.is_integer() or amt <= 0:
                frappe.throw("Amount must be a positive integer.")

        if self.connected_status == "No":
            return

        self._validate_reply_logic()

    def before_submit(self):
        if self.connected_status == "No":
            return
        self._validate_reply_logic()

    def _validate_reply_logic(self):
        reply = self.reply_type

        # Follow-up types need a follow_up_date, no checkbox required
        if reply in FOLLOWUP_TYPES:
            if not self.follow_up_date:
                frappe.throw(f"Please set a Follow-up Date when Reply Type is '{reply}'.")
            return

        # Not Reachable — no checkbox or date required
        if reply == "Not Reachable":
            return

        # Positive / Negative — need at least one checkbox
        if reply in CHECKBOX_TYPES:
            if not (self.wants_to_stay or self.exited):
                frappe.throw(
                    "Please select at least one option — Wants to Stay or Exited."
                )
            if self.exited:
                self.wants_to_stay = 0
                if not self.date_of_exit:
                    frappe.throw("Please provide a Date of Exit when 'Exited' is selected.")
