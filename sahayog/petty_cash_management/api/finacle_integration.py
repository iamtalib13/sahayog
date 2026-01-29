import frappe
import requests
import random
import xmltodict
import json
from datetime import datetime

# Disable SSL warnings
from requests.packages.urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

@frappe.whitelist()
def individual_finacle_fund_transfer_api(entry_name):
    """
    Submits a Journal Entry to Finacle.
    Supports Multiple Debits and Multiple Credits.
    Production Ready Version: 2.0 (Multi-Leg Transaction)
    """
    
    # ================= CONFIGURATION =================
    FINACLE_PRODUCTION_URL = 'https://finacle.sahayog.com:PORT/FISERVLET/fihttp' 
    FINACLE_UAT_URL = 'https://smcmig.sahayog.com:2950/FISERVLET/fihttp'
    
    # SET ACTIVE URL
    ACTIVE_URL = FINACLE_UAT_URL 
    # =================================================

    try:
        # 1. Fetch the Journal Entry
        entry_doc = frappe.get_doc('Journal Entry', entry_name)

        if entry_doc.docstatus != 0:
            return {"status": "SKIPPED", "message": "Only draft Journal Entries can be processed."}

        # 2. Smart Date Logic
        if "smcmig" in ACTIVE_URL or "uat" in ACTIVE_URL.lower():
            # UAT Fix: Force Date to Match Server Time (Jan 26)
            current_date = "2026-01-26T10:00:00.000"
        else:
            # Production: Use Real-Time
            current_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]

        # 3. Build Transaction Parts (The Multi-Leg Logic)
        part_trn_xml_list = []
        total_debit = 0.0
        total_credit = 0.0
        
        for child in entry_doc.accounts:
            # Get Account Number (Custom Field or Fallback)
            account_doc = frappe.get_doc('Account', child.account)
            finacle_account_id = account_doc.account_number if hasattr(account_doc, 'account_number') else child.account
            
            # Determine Flag and Amount
            if child.debit_in_account_currency > 0:
                flg = 'D'
                amt = child.debit_in_account_currency
                total_debit += amt
            elif child.credit_in_account_currency > 0:
                flg = 'C'
                amt = child.credit_in_account_currency
                total_credit += amt
            else:
                continue # Skip rows with 0 amount

            # Create XML Block for this Row
            part_xml = f"""
                    <PartTrnRec>
                        <AcctId><AcctId>{finacle_account_id}</AcctId></AcctId>
                        <CreditDebitFlg>{flg}</CreditDebitFlg>
                        <TrnAmt>
                            <amountValue>{amt}</amountValue>
                            <currencyCode>INR</currencyCode>
                        </TrnAmt>
                        <TrnParticulars>JE: {entry_name}</TrnParticulars>
                        <ValueDt>{current_date}</ValueDt>
                    </PartTrnRec>"""
            part_trn_xml_list.append(part_xml)

        # 4. Validation Checks
        if not part_trn_xml_list:
            frappe.throw("No valid accounts with amounts found in Journal Entry.")
            
        if abs(total_debit - total_credit) > 0.01: # allow tiny rounding diff
            frappe.throw(f"Debit ({total_debit}) and Credit ({total_credit}) totals do not match!")

        # Join all parts into one string
        all_parts_xml = "".join(part_trn_xml_list)
        guid = str(random.randint(1000000000, 9999999999))

        # 5. Final XML Construction
        xml_data = f"""<?xml version="1.0" encoding="UTF-8"?>
<FIXML xsi:schemaLocation="http://www.finacle.com/fixml XferTrnAdd.xsd" xmlns="http://www.finacle.com/fixml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <Header>
        <RequestHeader>
            <MessageKey>
                <RequestUUID>{guid}</RequestUUID>
                <ServiceRequestId>XferTrnAdd</ServiceRequestId>
                <ServiceRequestVersion>10.2</ServiceRequestVersion>
                <ChannelId>COR</ChannelId>
            </MessageKey>
            <RequestMessageInfo>
                <BankId>01</BankId>
                <MessageDateTime>{current_date}</MessageDateTime>
            </RequestMessageInfo>
        </RequestHeader>
    </Header>
    <Body>
        <XferTrnAddRequest>
            <XferTrnAddRq>
                <XferTrnHdr>
                    <TrnType>T</TrnType>
                    <TrnSubType>CI</TrnSubType>
                </XferTrnHdr>
                <XferTrnDetail>
                    {all_parts_xml}
                </XferTrnDetail>
            </XferTrnAddRq>
        </XferTrnAddRequest>
    </Body>
</FIXML>"""

        # 6. Send Request
        headers = {'Content-Type': 'application/xml'}
        response = requests.post(ACTIVE_URL, data=xml_data, headers=headers, verify=False, timeout=45)

        # 7. Process Response
        if response.status_code == 200:
            try:
                response_dict = xmltodict.parse(response.text)
                fi_xml = response_dict.get('FIXML', {})
                status = fi_xml.get('Header', {}).get('ResponseHeader', {}).get('HostTransaction', {}).get('Status', '').strip()
                
                if status == "SUCCESS":
                    rs_body = fi_xml.get('Body', {}).get('XferTrnAddResponse', {}).get('XferTrnAddRs', {})
                    custom_trn_id = rs_body.get('TrnIdentifier', {}).get('TrnId', 'N/A').strip()

                    frappe.db.set_value('Journal Entry', entry_name, {
                        'docstatus': 1, 
                        'custom_finacle_response': response.text[:1000], 
                        'custom_finacle_transaction_id': custom_trn_id,
                        'custom_petty_cash_date': datetime.now().date(),
                        'custom_petty_cash_remarks': f"Finacle Success: {custom_trn_id}",
                        # 'custom_status': 'SUCCESS'
                    })
                    frappe.db.commit()
                    return {"status": "SUCCESS", "trn_id": custom_trn_id}
                
                else:
                    body_node = fi_xml.get('Body', {})
                    error_node = body_node.get('Error', {}).get('FIBusinessException', {})
                    error_details = error_node.get('ErrorDetail', [])

                    error_info = "Unknown Finacle Error"
                    if isinstance(error_details, list) and len(error_details) > 0:
                        error_info = error_details[0].get('ErrorDesc', error_info)
                    elif isinstance(error_details, dict):
                        error_info = error_details.get('ErrorDesc', error_info)

                    frappe.db.set_value('Journal Entry', entry_name, {
                        'custom_finacle_response': str(response.text)[:1000],
                        # 'custom_status': 'FAILED' # REMOVED to avoid crash if field missing
                    })
                    frappe.db.commit()
                    return {"status": "FAILED", "message": error_info}

            except Exception as parse_error:
                frappe.log_error(title="Finacle XML Parse Error", message=f"{parse_error}\n\n{response.text}")
                return {"status": "ERROR", "message": "XML Parsing Failed. Check Error Log."}

        else:
            frappe.log_error(title=f"Finacle HTTP {response.status_code}", message=response.text)
            return {"status": "ERROR", "message": f"HTTP {response.status_code} Error"}

    except Exception as e:
        frappe.log_error(title="Finacle Integration Error", message=frappe.get_traceback())
        return {"status": "ERROR", "message": str(e)}
