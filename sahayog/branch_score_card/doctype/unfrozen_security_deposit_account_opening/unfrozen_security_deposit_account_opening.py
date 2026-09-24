from frappe.model.document import Document


class UnfrozenSecurityDepositAccountOpening(Document):

    def autoname(self):
        # Fully dynamic fields se values uthayega bina kisi hardcoding ke
        sol = getattr(self, "sol_id", "")
        month = getattr(self, "month", "")

        # Agar year field hai toh wahan se lein, warna date field se automatically extract karein
        year = getattr(self, "year", None)
        if not year and hasattr(self, "date") and self.date:
            year = str(self.date).split("-")[0]

        # Format: sol_id - month - year (jaise: 1001-08-2026)
        if sol and month and year:
            self.name = f"{sol}-{month}-{year}"