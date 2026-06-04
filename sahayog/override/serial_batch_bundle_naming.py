import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname

class CustomSerialAndBatchBundle(Document):
    def autoname(self):
        """
        Custom naming for Serial and Batch Bundle:
        {ITEM_CODE}-BATCH-.YYYY.-.#####
        """
        series = f"{self.item_code}-BATCH-.YYYY.-.#####"
        self.name = make_autoname(series)
