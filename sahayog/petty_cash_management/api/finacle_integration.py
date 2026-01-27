import frappe
import requests
import random
import xmltodict
import json
from datetime import datetime

# Disable SSL warnings (internal bank servers often have self-signed certs)
from requests.packages.urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

@frappe.whitelist()
def individual_finacle_fund_transfer_api(entry_name):
    """
    Submits a Journal Entry to Finacle.
    Triggered via Button on Journal Entry or Scheduled Job.
    """
    try:
        # 1. Fetch the specific Journal Entry record
        entry_doc = frappe.get_doc('Journal Entry', entry_name)

        if entry_doc.docstatus != 0:
            return {"status": "SKIPPED", "message": "Only draft Journal Entries can be processed."}

        # 2. Identify Debitor Account (The Bank GL Code to debit)
        debitor_account = None
        transaction_amount = 0
        
        for child in entry_doc.accounts:
            if child.debit_in_account_currency > 0:
                # Assuming 'account' field stores the GL Code or we fetch a custom field 'account_number'
                # Adjust 'account_number' below to match your actual Field Name in Account Doctype
                account_doc = frappe.get_doc('Account', child.account)
                debitor_account = account_doc.account_number if hasattr(account_doc, 'account_number') else child.account
                transaction_amount = child.debit_in_account_currency
                break

        if not debitor_account:
            frappe.throw("No valid debitor account found in Journal Entry.")

        # 3. Prepare Finacle Data
        current_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]
        guid = str(random.randint(1000000000, 9999999999))
        
        # XML Template with dynamic values
        # NOTE: Verify the Credit Account IDs (100001410010001, etc) are static or need to be dynamic too
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
                    <PartTrnRec>
                        <AcctId><AcctId>{debitor_account}</AcctId></AcctId>
                        <CreditDebitFlg>D</CreditDebitFlg>
                        <TrnAmt>
                            <amountValue>{transaction_amount}</amountValue>
                            <currencyCode>INR</currencyCode>
                        </TrnAmt>
                        <TrnParticulars>Petty Cash Transfer</TrnParticulars>
                        <ValueDt>{current_date}</ValueDt>
                    </PartTrnRec>
                    <!-- Credit Transaction (Destination) -->
                    <!-- WARNING: Hardcoded Account in your example. Make sure this is correct or make dynamic -->
                    <PartTrnRec>
                        <AcctId><AcctId>111401850080001</AcctId></AcctId>
                        <CreditDebitFlg>C</CreditDebitFlg>
                        <TrnAmt>
                            <amountValue>{transaction_amount}</amountValue>
                            <currencyCode>INR</currencyCode>
                        </TrnAmt>
                        <TrnParticulars>SHARE ACCOUNT</TrnParticulars>
                        <ValueDt>{current_date}</ValueDt>
                    </PartTrnRec>
                </XferTrnDetail>
            </XferTrnAddRq>
        </XferTrnAddRequest>
    </Body>
</FIXML>"""

        # 4. Send Request
        # Use the Internal IP if DNS fails again, but URL is preferred
        url = 'https://smcmig.sahayog.com:2950/FISERVLET/fihttp' 
        headers = {'Content-Type': 'application/xml'}

        # print(f"Sending Request for {entry_name}...") # Debug only
        
        response = requests.post(url, data=xml_data, headers=headers, verify=False, timeout=30)

        # 5. Process Response
        if response.status_code == 200:
            try:
                response_dict = xmltodict.parse(response.text)
                
                # Navigate XML safely
                fi_xml = response_dict.get('FIXML', {})
                status = fi_xml.get('Header', {}).get('ResponseHeader', {}).get('HostTransaction', {}).get('Status', '').strip()
                
                # Try to find TrnId in different possible locations (Finacle versions vary)
                rs_body = fi_xml.get('Body', {}).get('XferTrnAddResponse', {}).get('XferTrnAddRs', {})
                custom_trn_id = rs_body.get('TrnIdentifier', {}).get('TrnId', '')
                
                if not custom_trn_id:
                     # Fallback if structure is different on failure
                     custom_trn_id = "N/A"

                # Logic: SUCCESS vs FAILURE
                if status == "SUCCESS":
                    # Update & Submit Journal Entry
                    frappe.db.set_value('Journal Entry', entry_name, {
                        'docstatus': 1, # Submit
                        # 'custom_api_response': response.text[:1000], # Store first 1000 chars
                        # 'custom_finacle_transaction_id': custom_trn_id,
                        # 'custom_status': 'SUCCESS'
                        'cheque_no': custom_trn_id,
                        'cheque_date': datetime.now().date(),
                        'user_remark': f"Finacle Success: {custom_trn_id}" # Storing 
                        # 'user_remark': response.text[:1000], # Store first 1000 chars
                        # 'custom_status': 'SUCCESS'
                        # /////////////////////////////////
                        # 'cheque_no': custom_trn_id,  # Storing ID in Cheque No
                        # 'cheque_date': datetime.now().date(),
                        # 'user_remark': f"Finacle Success: {custom_trn_id}" # Storing 
                    })
                    frappe.db.commit()
                    return {"status": "SUCCESS", "trn_id": custom_trn_id}
                
                else:
                    # Business Logic Failure (e.g., Insufficient Funds)
                    error_info = rs_body.get('Error', {}).get('ErrorDetail', {}).get('ErrorDesc', 'Unknown Error')
                    frappe.db.set_value('Journal Entry', entry_name, {
                        'custom_api_response': str(response.text)[:1000],
                        'custom_status': 'FAILED'
                    })
                    frappe.db.commit()
                    return {"status": "FAILED", "message": error_info}

            except Exception as parse_error:
                frappe.log_error(title="Finacle XML Parse Error", message=f"{parse_error}\n\n{response.text}")
                return {"status": "ERROR", "message": "XML Parsing Failed. Check Error Log."}

        else:
            # HTTP Failure (500, 503, 404)
            frappe.log_error(title=f"Finacle HTTP {response.status_code}", message=response.text)
            return {"status": "ERROR", "message": f"HTTP {response.status_code} Error"}

    except Exception as e:
        frappe.log_error(title="Finacle Integration Error", message=frappe.get_traceback())
        return {"status": "ERROR", "message": str(e)}
