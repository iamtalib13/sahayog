import frappe
from frappe.model.document import Document

class ExpenseCategory(Document):

    def validate(self):
        self.set_category_name_from_items()

    def set_category_name_from_items(self):
        category_names = []

        # 🔴 use actual child table fieldname
        for row in self.table_nezx:
            if row.category_name:
                category_names.append(row.category_name.strip())

        # remove duplicates (order preserved)
        category_names = list(dict.fromkeys(category_names))

        self.category_name = ", ".join(category_names)
