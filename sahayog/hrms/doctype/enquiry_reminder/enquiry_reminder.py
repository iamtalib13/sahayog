import frappe
from frappe.model.document import Document

class EnquiryReminder(Document):
    def autoname(self):
        if self.case_id:
            # Count how many Enquiry Reminder records already exist for this case
            count = frappe.db.count("Enquiry Reminder", {"case_id": self.case_id}) + 1
            # Name pattern: <CaseID>-ENQREM-<count in 2 digits>
            self.name = f"{self.case_id}-ENQREM-{count:02d}"
        else:
            # Fallback autoname if case_id not provided
            self.name = frappe.model.naming.make_autoname("ENQREM-.#####")

        """Auto-fetch fields from latest Domestic Enquiry for the same case_id"""     
    def before_insert(self):
      
        if self.case_id:
            de_list = frappe.get_all(
                "Domestic Enquiry",
                filters={"case_id": self.case_id},
                order_by="creation desc",
                fields=["name", "domestic_enquiry", "status_of_response", "date_of_enquiry",
                        "place_of_enquiry", "enquiry_officer_name", ]
            )
            if de_list:
                de = de_list[0]  # latest Domestic Enquiry
                # ✅ Fetch "Yes" / "No" from Domestic Enquiry field
                self.domestic_enquiry = de.domestic_enquiry
                self.status_of_response = de.status_of_response
                self.date_of_enquiry = de.date_of_enquiry
                self.place_of_enquiry = de.place_of_enquiry
                self.enquiry_officer_name = de.enquiry_officer_name
              
       