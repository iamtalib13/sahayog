import frappe
import requests
import uuid
import xmltodict
from datetime import datetime

# Disable SSL warnings
from requests.packages.urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# HELPER: Safely get first item if it's a list, or the dict itself
def get_xml_dict(obj):
    if isinstance(obj, list):
        return obj[0] if obj else {}
    return obj if isinstance(obj, dict) else {}

@frappe.whitelist()
def create_finacle_loan_account():
    try:
        # Fetch Finacle Settings
        finacle_settings = frappe.get_single("Finacle Settings")
        
        # URL Handling (Fallback included)
        mig_url = None
        if hasattr(finacle_settings, 'mig_url') and finacle_settings.mig_url:
            mig_url = finacle_settings.mig_url
        elif hasattr(finacle_settings, 'url') and finacle_settings.url:
            mig_url = finacle_settings.url
        elif hasattr(finacle_settings, 'finacle_url') and finacle_settings.finacle_url:
            mig_url = finacle_settings.finacle_url
        else:
            mig_url = "https://smcmig.sahayog.com:2950/FISERVLET/fihttp"
            frappe.log_error("Finacle Warning", "Using hardcoded URL. Add 'mig_url' to Finacle Settings.")

        if not mig_url:
             return {"status": "ERROR", "message": "No Finacle URL found."}

        # Generate Request UUID
        request_uuid = str(uuid.uuid4())
        
        # Transaction Date (MIG Compatibility)
        if hasattr(finacle_settings, 'transaction_date') and finacle_settings.transaction_date:
            message_date = datetime.strptime(str(finacle_settings.transaction_date), '%Y-%m-%d')
        else:
            message_date = datetime.now()
        
        formatted_message_date = message_date.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]
        
        # EXACT XML REQUEST
        xml_request = f'''<?xml version="1.0" encoding="UTF-8"?>
<FIXML xsi:schemaLocation="http://www.finacle.com/fixml LoanAcctAdd.xsd" xmlns="http://www.finacle.com/fixml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <Header>
        <RequestHeader>
            <MessageKey>
                <RequestUUID>{request_uuid}</RequestUUID>
                <ServiceRequestId>LoanAcctAdd</ServiceRequestId>
                <ServiceRequestVersion>10.2</ServiceRequestVersion>
                <ChannelId>COR</ChannelId>
                <LanguageId></LanguageId>
            </MessageKey>
            <RequestMessageInfo>
                <BankId>01</BankId>
                <TimeZone></TimeZone>
                <EntityId></EntityId>
                <EntityType></EntityType>
                <ArmCorrelationId></ArmCorrelationId>
                <MessageDateTime>{formatted_message_date}</MessageDateTime>
            </RequestMessageInfo>
            <Security>
                <Token>
                    <PasswordToken>
                        <UserId></UserId>
                        <Password></Password>
                    </PasswordToken>
                </Token>
                <FICertToken></FICertToken>
                <RealUserLoginSessionId></RealUserLoginSessionId>
                <RealUser></RealUser>
                <RealUserPwd></RealUserPwd>
                <SSOTransferToken></SSOTransferToken>
            </Security>
        </RequestHeader>
    </Header>
    <Body>
        <LoanAcctAddRequest>
            <LoanAcctAddRq>
                <CustId>
                    <CustId>400024494</CustId>
                </CustId>
                <LoanAcctId>
                <AcctOpenDt>2026-01-15T00:00:00.000</AcctOpenDt> 
                    <AcctType>
                        <SchmCode>3010</SchmCode>
                    </AcctType>
                    <AcctCurr>INR</AcctCurr>
                    <BankInfo>
                        <BranchId>1000</BranchId>
                    </BankInfo>
                </LoanAcctId>
                <LoanAcctGenInfo>
                    <AcctStmtMode>N</AcctStmtMode>
                    <DespatchMode>N</DespatchMode>
                    
                </LoanAcctGenInfo>
                <LoanGenDetails>
                    <LoanPeriodMonths>24</LoanPeriodMonths>
                    <LoanPeriodDays>0</LoanPeriodDays>
                    <RePmtMethod>N</RePmtMethod>
                    <OperAcctId>
                        <AcctId>100110020034025</AcctId>
                    </OperAcctId>
                       <HoldInOperAcctFlg>N</HoldInOperAcctFlg>
                    <PmtPlan>
                        <EqInstallDetails>
                            <EqInstallFlg>Y</EqInstallFlg>
                            <EqInstallType>R</EqInstallType>
                            <EqInstallFormula>P</EqInstallFormula>
                        </EqInstallDetails>
                        
                        <RepmtRec>
                            <InstallmentId>EIDEM</InstallmentId>
                            <InstallStartDt>2026-02-14T00:00:00.000</InstallStartDt>
                            <InstallFreq>
                                <Type>M</Type>
                                <StartDt>14</StartDt>
                                <HolStat>N</HolStat>
                            </InstallFreq>
                            <IntFreq>
                                <Type>M</Type>
                                <StartDt>14</StartDt>
                                <HolStat>N</HolStat>
                            </IntFreq>
                            <NoOfInstall>24</NoOfInstall>
                            <IntStartDt>2026-02-14T00:00:00.000</IntStartDt>
                        </RepmtRec>
                        <NumOfAdvInst>0</NumOfAdvInst>
                    </PmtPlan>
                    <LoanAmt>
                        <amountValue>100000</amountValue>
                        <currencyCode>INR</currencyCode>
                    </LoanAmt>
                </LoanGenDetails>
                <AdvanceEICollFlg>R</AdvanceEICollFlg>
                <AdvNoEiInstallments>0</AdvNoEiInstallments>
                <TotalInstallments>24</TotalInstallments>
            </LoanAcctAddRq>
        </LoanAcctAddRequest>
    </Body>
</FIXML>'''

        # Log Request
        frappe.log_error(title=f"Finacle Request {request_uuid}", message=xml_request)

        # Send Request
        headers = {'Content-Type': 'application/xml'}
        response = requests.post(
            mig_url,
            data=xml_request,
            headers=headers,
            verify=False,
            timeout=30
        )

        # Log Response
        frappe.log_error(title=f"Finacle Response {response.status_code}", message=response.text)

        if response.status_code == 200:
            try:
                response_dict = xmltodict.parse(response.text)
                fixml = get_xml_dict(response_dict.get('FIXML'))
                body = get_xml_dict(fixml.get('Body'))
                
                # CHECK FOR ERROR (Handle both List and Dict cases)
                if 'Error' in body:
                    error_node = get_xml_dict(body['Error'])
                    exception_node = get_xml_dict(error_node.get('FIBusinessException'))
                    error_detail = get_xml_dict(exception_node.get('ErrorDetail'))
                    
                    return {
                        "status": "FAILED",
                        "message": f"{error_detail.get('ErrorCode')}: {error_detail.get('ErrorDesc')}",
                        "full_response": response.text  # <--- Shows full XML
                    }
                
                # CHECK SUCCESS
                header = get_xml_dict(fixml.get('Header'))
                response_header = get_xml_dict(header.get('ResponseHeader'))
                host_transaction = get_xml_dict(response_header.get('HostTransaction'))
                
                if host_transaction.get('Status') == 'SUCCESS':
                    add_response = get_xml_dict(body.get('LoanAcctAddResponse'))
                    rs = get_xml_dict(add_response.get('LoanAcctAddRs'))
                    acct_id = get_xml_dict(rs.get('AcctId'))
                    
                    return {
                        "status": "SUCCESS",
                        "account_id": acct_id.get('AcctId'),
                        "message": "Loan Account Created Successfully",
                        "full_response": response.text,
                        "request_sent": xml_request  # <--- ADD THIS LINE
                    }
                else:
                    return {
                        "status": "FAILED", 
                        "message": "Host Transaction Failed (Unknown Error)", 
                        "full_response": response.text
                    }

            except Exception as e:
                return {
                    "status": "ERROR", 
                    "message": f"Parsing Logic Error: {str(e)}", 
                    "full_response": response.text
                }
        else:
            return {
                "status": "ERROR", 
                "message": f"HTTP {response.status_code}", 
                "full_response": response.text
            }

    except Exception as e:
        frappe.log_error(title="Finacle Code Error", message=frappe.get_traceback())
        return {"status": "ERROR", "message": str(e)}

# Wrapper for Postman testing
@frappe.whitelist()
def test_create_loan_account():
    return create_finacle_loan_account()



@frappe.whitelist()
def disburse_finacle_loan_account(loan_account_id, amount, operative_account_id, 
                                disbursement_date=None, remarks="Loan Disbursement"):
    try:
        # 1. Fetch Finacle Settings & URL
        finacle_settings = frappe.get_single("Finacle Settings")
        
        mig_url = None
        if hasattr(finacle_settings, 'mig_url') and finacle_settings.mig_url:
            mig_url = finacle_settings.mig_url
        elif hasattr(finacle_settings, 'url') and finacle_settings.url:
            mig_url = finacle_settings.url
        elif hasattr(finacle_settings, 'finacle_url') and finacle_settings.finacle_url:
            mig_url = finacle_settings.finacle_url
        else:
            # return {"status": "ERROR", "message": "No Finacle URL found in settings."}
            mig_url = "https://smcmig.sahayog.com:2950/FISERVLET/fihttp"
            frappe.log_error("Finacle Warning", "Using hardcoded URL. Add 'mig_url' to Finacle Settings.")

        # 2. Logic for Dates and IDs
        # Extract SOL ID (first 4 digits) as per your comments
        loan_sol_id = loan_account_id[:4] 
        oper_sol_id = operative_account_id[:4]

        # Handle Disbursement Date (Value Date provided by Finance Team)
        if disbursement_date:
            val_date_obj = datetime.strptime(str(disbursement_date), '%Y-%m-%d')
        else:
            val_date_obj = datetime.now()
        
        formatted_val_date = val_date_obj.strftime('%Y-%m-%dT00:00:00.000')

        # Handle Transaction Date (Finacle System Date)
        if hasattr(finacle_settings, 'transaction_date') and finacle_settings.transaction_date:
            txn_date_obj = datetime.strptime(str(finacle_settings.transaction_date), '%Y-%m-%d')
        else:
            txn_date_obj = datetime.now()
            
        formatted_txn_date = txn_date_obj.strftime('%Y-%m-%dT00:00:00.000')
        
        # Message Date (Timestamp for Header)
        msg_date_str = datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]

        request_uuid = str(uuid.uuid4())

        # 3. Construct XML
#         xml_request = f'''<?xml version="1.0" encoding="UTF-8"?>
# <FIXML xmlns="http://www.finacle.com/fixml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.finacle.com/fixml loanDisbursement.xsd">
#   <Header>
#     <RequestHeader>
#       <MessageKey>
#         <RequestUUID>{request_uuid}</RequestUUID>
#         <ServiceRequestId>loanDisbursement</ServiceRequestId>
#         <ServiceRequestVersion>10.2</ServiceRequestVersion>
#         <ChannelId>COR</ChannelId>
#         <LanguageId></LanguageId>
#       </MessageKey>
#       <RequestMessageInfo>
#         <BankId>01</BankId>
#         <TimeZone></TimeZone>
#         <EntityId></EntityId>
#         <EntityType></EntityType>
#         <ArmCorrelationId></ArmCorrelationId>
#         <MessageDateTime>{msg_date_str}</MessageDateTime>
#       </RequestMessageInfo>
#       <Security>
#         <Token>
#           <PasswordToken>
#             <UserId></UserId>
#             <Password></Password>
#           </PasswordToken>
#         </Token>
#         <FICertToken></FICertToken>
#         <RealUserLoginSessionId></RealUserLoginSessionId>
#         <RealUser></RealUser>
#         <RealUserPwd></RealUserPwd>
#         <SSOTransferToken></SSOTransferToken>
#       </Security>
#     </RequestHeader>
#   </Header>
#   <Body>
#     <loanDisbursementRequest>
#       <LoanDisbursementStruct>
#         <acctDisburseTranLA>
#           <dealerContribution></dealerContribution>
#           <deductOvduDmds>N</deductOvduDmds>
#           <disburseAmt>
#             <amountValue>{amount}</amountValue>
#             <currencyCode>INR</currencyCode>
#           </disburseAmt>
#           <finalDisbFlg>Y</finalDisbFlg>
#           <firstDisbFlg>N</firstDisbFlg>
#           <grossNetDisbt>N</grossNetDisbt>
#           <isDetailsEntered>1</isDetailsEntered>
#           <laAcct>
#             <crncyCode>INR</crncyCode>
#             <foracid>{loan_account_id}</foracid>
#             <solId>{loan_sol_id}</solId>
#           </laAcct>
#           <oPartTranLL>
#             <crValueDate>{formatted_val_date}</crValueDate>
#             <delFlg>N</delFlg>
#             <laAmtCrncy>
#               <amountValue>{amount}</amountValue>
#               <currencyCode>INR</currencyCode>
#             </laAmtCrncy>
#             <modeOfDisb>A</modeOfDisb>
#             <crAcctForAcid>{operative_account_id}</crAcctForAcid>
#              <solId>
#              <solId>{oper_sol_id}</solId>
#           </solId>
#           </oPartTranLL>
#           <tranDate>{formatted_txn_date}</tranDate>
#           <tranMode>A</tranMode>
#           <tranType>T</tranType>
#           <valueDate>{formatted_val_date}</valueDate>
#           <tranRemarks>{remarks}</tranRemarks>
#         </acctDisburseTranLA>
#         <crDrInd>D</crDrInd>
#         <tranMesg>
#           <tranDetail>
#             <tranIdentifier>
#               <TrnId></TrnId>
#             </tranIdentifier>
#           </tranDetail>
#         </tranMesg>
#       </LoanDisbursementStruct>
#     </loanDisbursementRequest>
#   </Body>
# </FIXML>'''

                # 3. Construct XML
        # 3. Construct XML (CORRECTED - REMOVED NESTING)
        xml_request = f'''<?xml version="1.0" encoding="UTF-8"?>
<FIXML xmlns="http://www.finacle.com/fixml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.finacle.com/fixml loanDisbursement.xsd">
  <Header>
    <RequestHeader>
      <MessageKey>
        <RequestUUID>{request_uuid}</RequestUUID>
        <ServiceRequestId>loanDisbursement</ServiceRequestId>
        <ServiceRequestVersion>10.2</ServiceRequestVersion>
        <ChannelId>COR</ChannelId>
        <LanguageId></LanguageId>
      </MessageKey>
      <RequestMessageInfo>
        <BankId>01</BankId>
        <TimeZone></TimeZone>
        <EntityId></EntityId>
        <EntityType></EntityType>
        <ArmCorrelationId></ArmCorrelationId>
        <MessageDateTime>{msg_date_str}</MessageDateTime>
      </RequestMessageInfo>
      <Security>
        <Token>
          <PasswordToken>
            <UserId></UserId>
            <Password></Password>
          </PasswordToken>
        </Token>
        <FICertToken></FICertToken>
        <RealUserLoginSessionId></RealUserLoginSessionId>
        <RealUser></RealUser>
        <RealUserPwd></RealUserPwd>
        <SSOTransferToken></SSOTransferToken>
      </Security>
    </RequestHeader>
  </Header>
  <Body>
    <loanDisbursementRequest>
      <LoanDisbursementStruct>
        <acctDisburseTranLA>
          <dealerContribution></dealerContribution>
          <deductOvduDmds>N</deductOvduDmds>
          <disburseAmt>
            <amountValue>{amount}</amountValue>
            <currencyCode>INR</currencyCode>
          </disburseAmt>
          <finalDisbFlg>Y</finalDisbFlg>
          <firstDisbFlg>N</firstDisbFlg>
          <grossNetDisbt>N</grossNetDisbt>
          <isDetailsEntered>1</isDetailsEntered>
          <laAcct>
            <crncyCode>INR</crncyCode>
            <foracid>{loan_account_id}</foracid>
            <solId>{loan_sol_id}</solId>
          </laAcct>
          <oPartTranLL>
            <crValueDate>{formatted_val_date}</crValueDate>
            <delFlg>N</delFlg>
            <laAmtCrncy>
              <amountValue>{amount}</amountValue>
              <currencyCode>INR</currencyCode>
            </laAmtCrncy>
            <modeOfDisb>A</modeOfDisb>
            <crAcctForAcid>{operative_account_id}</crAcctForAcid>
            <solId>{oper_sol_id}</solId>
          </oPartTranLL>
          <solId>{loan_sol_id}</solId>
          <tranDate>{formatted_txn_date}</tranDate>
          <tranMode>A</tranMode>
          <tranType>T</tranType>
          <valueDate>{formatted_val_date}</valueDate>
          <tranRemarks>{remarks}</tranRemarks>
        </acctDisburseTranLA>
        <crDrInd>D</crDrInd>
        <tranMesg>
          <tranDetail>
            <tranIdentifier>
              <TrnId></TrnId>
            </tranIdentifier>
          </tranDetail>
        </tranMesg>
      </LoanDisbursementStruct>
    </loanDisbursementRequest>
  </Body>
</FIXML>'''


        # 4. Log & Send
        frappe.log_error(title=f"Finacle Disbursement Req {request_uuid}", message=xml_request)

        headers = {'Content-Type': 'application/xml'}
        response = requests.post(mig_url, data=xml_request, headers=headers, verify=False, timeout=30)

        frappe.log_error(title=f"Finacle Disbursement Res {response.status_code}", message=response.text)

        # 5. Parse Response
        if response.status_code == 200:
            try:
                response_dict = xmltodict.parse(response.text)
                fixml = get_xml_dict(response_dict.get('FIXML'))
                body = get_xml_dict(fixml.get('Body'))

                # CHECK FOR ERROR
                if 'Error' in body:
                    error_node = get_xml_dict(body['Error'])
                    exception_node = get_xml_dict(error_node.get('FIBusinessException'))
                    error_detail = get_xml_dict(exception_node.get('ErrorDetail'))
                    return {
                        "status": "FAILED",
                        "message": f"{error_detail.get('ErrorCode')}: {error_detail.get('ErrorDesc')}",
                        "full_response": response.text
                    }

                # CHECK SUCCESS
                header = get_xml_dict(fixml.get('Header'))
                response_header = get_xml_dict(header.get('ResponseHeader'))
                host_transaction = get_xml_dict(response_header.get('HostTransaction'))

                if host_transaction.get('Status') == 'SUCCESS':
                    disb_res = get_xml_dict(body.get('loanDisbursementResponse'))
                    output_struct = get_xml_dict(disb_res.get('LoanDisbursementOutputStruct'))
                    tran_msg = get_xml_dict(output_struct.get('tranMesgOutput'))
                    tran_id_node = get_xml_dict(tran_msg.get('tranIdentifier'))
                    
                    return {
                        "status": "SUCCESS",
                        "tran_id": tran_id_node.get('TrnId'),
                        "tran_date": tran_id_node.get('TrnDt'),
                        "message": "Loan Disbursed Successfully",
                        "full_response": response.text,
                        "request_sent": xml_request
                    }
                else:
                    return {
                        "status": "FAILED",
                        "message": "Host Transaction Failed (Unknown Status)",
                        "full_response": response.text
                    }

            except Exception as e:
                return {"status": "ERROR", "message": f"Parsing Error: {str(e)}", "full_response": response.text}
        else:
            return {"status": "ERROR", "message": f"HTTP {response.status_code}", "full_response": response.text}

    except Exception as e:
        frappe.log_error(title="Finacle Disbursement Error", message=frappe.get_traceback())
        return {"status": "ERROR", "message": str(e)}

# Wrapper for Postman testing
@frappe.whitelist()
def test_disburse_loan():
    # Example usage based on your sample data
    return disburse_finacle_loan_account(
        loan_account_id="100030100020146",
        amount="100000",
        operative_account_id="100110020034025",
        disbursement_date="2026-01-19",
        remarks="Test Disbursement from test api"
    )
