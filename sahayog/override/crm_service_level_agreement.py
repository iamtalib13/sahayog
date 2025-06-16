from crm.fcrm.doctype.crm_service_level_agreement.crm_service_level_agreement import CRMServiceLevelAgreement

class CustomCRMServiceLevelAgreement(CRMServiceLevelAgreement):
    def handle_sla_status(self, doc):
        if not doc.first_responded_on:
            doc.sla_status = "First Response Due"
        else:
            doc.sla_status = "Fulfilled"

