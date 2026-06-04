import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname

class CustomSerialAndBatchBundle(Document):
    def autoname(self):
        """
        Custom naming for Serial and Batch Bundle:
        BATCH-.YYYY.-{self.item_code}-.#####
        """
        series = f"BATCH-.YYYY.-{self.item_code}-.#####"
        self.name = make_autoname(series)
