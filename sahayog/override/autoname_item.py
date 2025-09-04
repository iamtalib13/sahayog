import frappe
from erpnext.stock.doctype.item.item import Item
from frappe import _

class CustomItem(Item):
    def autoname(self):
        """
        Custom autoname for Item:
        - If item_code is already provided (e.g., via Excel import), use it directly.
        - Else, generate code using: 4-letter prefix from item_group + 3-digit serial (e.g., PROD001).
        """

        # If item_code is already provided, keep it
        if self.item_code:
            self.name = self.item_code
            return

        if not self.item_group:
            frappe.throw(_("Item Group is required to generate Item Code."))

        # Generate prefix (first 4 letters of Item Group, padded with 'X' if shorter)
        prefix = self.item_group.upper().replace(" ", "")[:4].ljust(4, 'X')
        series_num = 1
        max_tries = 10

        while series_num <= max_tries:
            name_candidate = f"{prefix}{series_num:03d}"  # e.g., PROD001
            if not frappe.db.exists("Item", name_candidate):
                self.name = name_candidate
                self.item_code = name_candidate
                return
            series_num += 1

        frappe.throw(_("Unable to generate unique Item Code after {0} attempts").format(max_tries))
    