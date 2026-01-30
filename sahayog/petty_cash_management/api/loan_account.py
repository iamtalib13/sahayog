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
