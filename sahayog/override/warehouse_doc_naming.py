import frappe
from erpnext.stock.doctype.warehouse.warehouse import Warehouse

class CustomWarehouse(Warehouse):
    def autoname(self):
        """
        Overrides ERPNext's autoname method for Warehouse.
        Removes the default suffix (- S) and ensures correct naming format.
        """
        self.name = self.warehouse_name  # Directly set name as warehouse_name (no suffix)

