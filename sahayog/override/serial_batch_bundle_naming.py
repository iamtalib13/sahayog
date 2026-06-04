import frappe
from erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle import SerialandBatchBundle
from frappe.model.naming import make_autoname

class CustomSerialAndBatchBundle(SerialandBatchBundle):
    def autoname(self):
        """
        Custom naming for Serial and Batch Bundle:
        BATCH-.YYYY.-{self.item_code}-.#####
        """
        series = f"BATCH-.YYYY.-{self.item_code}-.#####"
        self.name = make_autoname(series)

    def set_serial_and_batch_values(self, *args, **kwargs):
        """Ensure the method exists by calling it on the superclass."""
        return super().set_serial_and_batch_values(*args, **kwargs)
