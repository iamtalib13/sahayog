# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class TrainingTitle(Document):
    """Master list of training titles offered in the L&D calendar."""

    def before_save(self):
        if self.training_title:
            self.training_title = self.training_title.strip()
