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
def create_finacle_loan_account(customer_id, scheme_code, branch_id, loan_amount, 
                                loan_period_months, installment_start_date, 
                                num_installments, operative_account_id, 
                                account_open_date=None):
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
            mig_url = "https://smcmig.sahayog.com:2950/FISERVLET/fihttp"
            frappe.log_error("Finacle Warning", "Using hardcoded URL. Add 'mig_url' to Finacle Settings.")

        if not mig_url:
             return {"status": "ERROR", "message": "No Finacle URL found."}

        # 2. Logic for Dates and Format
        request_uuid = str(uuid.uuid4())
        
        # Message Date (Timestamp for Header)
        if hasattr(finacle_settings, 'transaction_date') and finacle_settings.transaction_date:
            msg_date_obj = datetime.strptime(str(finacle_settings.transaction_date), '%Y-%m-%d')
        else:
            msg_date_obj = datetime.now()
        
        formatted_message_date = msg_date_obj.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]

        # Handle Account Open Date
        acct_open_dt_tag = ""
        if account_open_date:
            try:
                open_dt_obj = datetime.strptime(str(account_open_date), '%Y-%m-%d')
                formatted_open_date = open_dt_obj.strftime('%Y-%m-%dT00:00:00.000')
                acct_open_dt_tag = f"<AcctOpenDt>{formatted_open_date}</AcctOpenDt>"
            except ValueError:
                return {"status": "ERROR", "message": "Invalid account_open_date format. Use YYYY-MM-DD"}

        # Handle Installment Start Date
        try:
            inst_start_dt_obj = datetime.strptime(str(installment_start_date), '%Y-%m-%d')
            formatted_inst_date = inst_start_dt_obj.strftime('%Y-%m-%dT%H:%M:%S.000')
        except ValueError:
            return {"status": "ERROR", "message": "Invalid installment_start_date format. Use YYYY-MM-DD"}

        # 3. Construct XML
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
                    <CustId>{customer_id}</CustId>
                </CustId>
                <LoanAcctId>
                    {acct_open_dt_tag} 
                    <AcctType>
                        <SchmCode>{scheme_code}</SchmCode>
                    </AcctType>
                    <AcctCurr>INR</AcctCurr>
                    <BankInfo>
                        <BranchId>{branch_id}</BranchId>
                    </BankInfo>
                </LoanAcctId>
                <LoanAcctGenInfo>
                    <AcctStmtMode>N</AcctStmtMode>
                    <DespatchMode>N</DespatchMode>
                </LoanAcctGenInfo>
                <LoanGenDetails>
                    <LoanPeriodMonths>{loan_period_months}</LoanPeriodMonths>
                    <LoanPeriodDays>0</LoanPeriodDays>
                    <RePmtMethod>N</RePmtMethod>
                    <OperAcctId>
                        <AcctId>{operative_account_id}</AcctId>
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
                            <InstallStartDt>{formatted_inst_date}</InstallStartDt>
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
                            <NoOfInstall>{num_installments}</NoOfInstall>
                            <IntStartDt>{formatted_inst_date}</IntStartDt>
                        </RepmtRec>
                        <NumOfAdvInst>0</NumOfAdvInst>
                    </PmtPlan>
                    <LoanAmt>
                        <amountValue>{loan_amount}</amountValue>
                        <currencyCode>INR</currencyCode>
                    </LoanAmt>
                </LoanGenDetails>
                <AdvanceEICollFlg>R</AdvanceEICollFlg>
                <AdvNoEiInstallments>0</AdvNoEiInstallments>
                <TotalInstallments>{num_installments}</TotalInstallments>
            </LoanAcctAddRq>
        </LoanAcctAddRequest>
    </Body>
</FIXML>'''

        # 4. Log & Send
        frappe.log_error(title=f"Finacle Loan Creation Req {request_uuid}", message=xml_request)

        headers = {'Content-Type': 'application/xml'}
        response = requests.post(mig_url, data=xml_request, headers=headers, verify=False, timeout=30)

        frappe.log_error(title=f"Finacle Loan Creation Res {response.status_code}", message=response.text)

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
                        "full_response": response.text,
                        "request_sent": xml_request
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
                        "open_date": rs.get('AcctOpenDt'),
                        "message": "Loan Account Created Successfully",
                        "full_response": response.text,
                        "request_sent": xml_request
                    }
                else:
                    return {
                        "status": "FAILED", 
                        "message": "Host Transaction Failed (Unknown Error)", 
                        "full_response": response.text,
                        "request_sent": xml_request
                    }
            except Exception as e:
                return {
                    "status": "ERROR", 
                    "message": f"Parsing Logic Error: {str(e)}", 
                    "full_response": response.text,
                    "request_sent": xml_request
                }
        else:
            return {
                "status": "ERROR", 
                "message": f"HTTP {response.status_code}", 
                "full_response": response.text,
                "request_sent": xml_request
            }

    except Exception as e:
        frappe.log_error(title="Finacle Code Error", message=frappe.get_traceback())
        return {"status": "ERROR", "message": str(e)}

@frappe.whitelist()
def disburse_finacle_loan_account(loan_account_id, amount, operative_account_id, 
                                disbursement_date=None, remarks="Loan Disbursement"):
    try:
        finacle_settings = frappe.get_single("Finacle Settings")
        mig_url = getattr(finacle_settings, 'mig_url', None) or "https://smcmig.sahayog.com:2950/FISERVLET/fihttp"

        loan_sol_id = loan_account_id[:4] 
        oper_sol_id = operative_account_id[:4]

        # if disbursement_date:
        #     val_date_obj = datetime.strptime(str(disbursement_date), '%Y-%m-%d')
        # else:
        #     val_date_obj = datetime.now()

        if disbursement_date:
            # CLEAN THE DATE STRING: Remove time part " 00:00:00" if present
            clean_date_str = str(disbursement_date).split(" ")[0].strip()
            val_date_obj = datetime.strptime(clean_date_str, '%Y-%m-%d')
        else:
            val_date_obj = datetime.now()
        
        formatted_val_date = val_date_obj.strftime('%Y-%m-%dT00:00:00.000')

        if hasattr(finacle_settings, 'transaction_date') and finacle_settings.transaction_date:
            txn_date_obj = datetime.strptime(str(finacle_settings.transaction_date), '%Y-%m-%d')
        else:
            txn_date_obj = datetime.now()
            
        formatted_txn_date = txn_date_obj.strftime('%Y-%m-%dT00:00:00.000')
        msg_date_str = datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]
        request_uuid = str(uuid.uuid4())

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

        frappe.log_error(title=f"Finacle Disbursement Req {request_uuid}", message=xml_request)
        headers = {'Content-Type': 'application/xml'}
        response = requests.post(mig_url, data=xml_request, headers=headers, verify=False, timeout=30)
        frappe.log_error(title=f"Finacle Disbursement Res {response.status_code}", message=response.text)

        if response.status_code == 200:
            try:
                response_dict = xmltodict.parse(response.text)
                fixml = get_xml_dict(response_dict.get('FIXML'))
                body = get_xml_dict(fixml.get('Body'))

                if 'Error' in body:
                    error_node = get_xml_dict(body['Error'])
                    exception_node = get_xml_dict(error_node.get('FIBusinessException'))
                    error_detail = get_xml_dict(exception_node.get('ErrorDetail'))
                    return {
                        "status": "FAILED",
                        "message": f"{error_detail.get('ErrorCode')}: {error_detail.get('ErrorDesc')}",
                        "full_response": response.text
                    }

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

@frappe.whitelist()
def create_finacle_retail_customer(
    first_name="Palash", last_name="Shende", date_of_birth="1990-01-01", gender="M",
    salutation="MR.", pref_name=None, language="India (English)", tax_deduction_table="ZERO", 
    addr_line1=None, addr_line2=None, city=".", state="MH", postal_code=None, country="IN",
    mobile_number=None, email=None, doc_code="2", doc_reference_num="123412341234", doc_type_code="1",
    mother_maiden_name=None, primary_sol_id="1000", marital_status="MARR", nationality="INDIAN",
    caste="OTH", employment_status="Employed", is_minor="N", is_staff="N", relationship_opening_date=None,
    manager="UBSADMIN", region="East", segmentation_class="CLSA", sub_segment="Sub Class A",
    customer_rating="SAT", risk_rating="3", free_text_label=None, free_code2="BE", free_code3="OTH",
    free_code6="F60", free_code8="10483"
):
    try:
        finacle_settings = frappe.get_single("Finacle Settings")
        mig_url = getattr(finacle_settings, 'mig_url', None) or "https://smcmig.sahayog.com:2950/FISERVLET/fihttp"

        dob_obj = datetime.strptime(str(date_of_birth), '%Y-%m-%d')
        formatted_dob = dob_obj.strftime('%Y-%m-%dT00:00:00.000')
        birth_dt = dob_obj.strftime('%d')
        birth_month = dob_obj.strftime('%b').upper()
        birth_year = dob_obj.strftime('%Y')
        
        if relationship_opening_date:
            rel_open_obj = datetime.strptime(str(relationship_opening_date), '%Y-%m-%d')
        else:
            rel_open_obj = datetime.now()
        formatted_rel_open = rel_open_obj.strftime('%Y-%m-%dT00:00:00.000')
        
        msg_date_str = datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]
        addr_start_date = rel_open_obj.strftime('%Y-%m-%dT00:00:00.000')
        phone_start_date = addr_start_date
        phone_end_date = "2099-12-31T00:00:00.000"
        
        tax_start_date = f"{rel_open_obj.year}-04-01T00:00:00.000"
        tax_end_date = f"{rel_open_obj.year + 1}-03-31T00:00:00.000"
        tds_submit_date = rel_open_obj.strftime('%d-%m-%Y')
        
        doc_issue_date = formatted_rel_open
        rating_date = formatted_rel_open
        request_uuid = str(uuid.uuid4())
        
        if not pref_name: pref_name = first_name
        if not free_text_label: free_text_label = addr_line2 or addr_line1 or "."
        
        tax_table_xml = ""
        if tax_deduction_table:
            tax_table_xml = f"<TaxDeductionTable>{tax_deduction_table}</TaxDeductionTable>"

        phone_section = ""
        if mobile_number:
            phone_section = f"""
                  <PhoneEmailDtls>
                     <PhoneNumCountryCode>91</PhoneNumCountryCode>
                     <PhoneNumCityCode />
                     <PhoneNumLocalCode>{mobile_number}</PhoneNumLocalCode>
                     <PhoneNum>{mobile_number}</PhoneNum>
                     <PhoneEmailType>CELLPH</PhoneEmailType>
                     <PhoneOrEmail>PHONE</PhoneOrEmail>
                     <PrefFlag>Y</PrefFlag>
                  </PhoneEmailDtls>
                  <EndDt>{phone_end_date}</EndDt>
                  <StartDt>{phone_start_date}</StartDt>"""
        
        email_section = ""
        if email:
            email_section = f"""
               <PhoneEmailDtls>
                  <PhoneEmailDtls>
                     <EmailId>{email}</EmailId>
                     <PhoneEmailType>EMLOFC</PhoneEmailType>
                     <PhoneOrEmail>EMAIL</PhoneOrEmail>
                     <PrefFlag>N</PrefFlag>
                  </PhoneEmailDtls>
                  <EndDt>{phone_end_date}</EndDt>
                  <StartDt>{phone_start_date}</StartDt>
               </PhoneEmailDtls>"""

        xml_request = f'''<?xml version="1.0" encoding="UTF-8"?>
<FIXML xmlns="http://www.finacle.com/fixml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.finacle.com/fixml RetCustAdd.xsd">
   <Header>
      <RequestHeader>
         <MessageKey>
            <RequestUUID>{request_uuid}</RequestUUID>
            <ServiceRequestId>RetCustAdd</ServiceRequestId>
            <ServiceRequestVersion>10.2</ServiceRequestVersion>
            <ChannelId>CRM</ChannelId>
            <LanguageId />
         </MessageKey>
         <RequestMessageInfo>
            <BankId>01</BankId>
            <TimeZone />
            <EntityId />
            <EntityType />
            <ArmCorrelationId />
            <MessageDateTime>{msg_date_str}</MessageDateTime>
         </RequestMessageInfo>
         <Security>
            <Token>
               <PasswordToken>
                  <UserId />
                  <Password />
               </PasswordToken>
            </Token>
            <FICertToken />
            <RealUserLoginSessionId />
            <RealUser />
            <RealUserPwd />
            <SSOTransferToken />
         </Security>
      </RequestHeader>
   </Header>
   <Body>
      <RetCustAddRequest>
         <RetCustAddRq>
            <CustDtls>
               <CustData>
                  <AddrDtls>
                     <AddrCategory>Mailing</AddrCategory>
                     <AddrLine1>{addr_line1 or "."}</AddrLine1>
                     <AddrLine2>{addr_line2 or "."}</AddrLine2>
                     <City>{city}</City>
                     <Country>{country}</Country>
                     <State>{state}</State>
                     <PostalCode>{postal_code or "000000"}</PostalCode>
                     <StartDt>{addr_start_date}</StartDt>
                     <PrefAddr>Y</PrefAddr>
                     <HoldMailFlag>N</HoldMailFlag>
                     <FreeTextLabel>{free_text_label}</FreeTextLabel>
                     <ResidentialStatus />
                     <PrefFormat>FREE_TEXT_FORMAT</PrefFormat>
                  </AddrDtls>
                  <DefaultAddrType>Mailing</DefaultAddrType>
                  <AutoApproval>Y</AutoApproval>
                  <FirstName>{first_name}</FirstName>
                  <LastName>{last_name}</LastName>
                  <PrefName>{pref_name}</PrefName>
                  <DateOfBirth>{formatted_dob}</DateOfBirth>
                  <BirthDt>{birth_dt}</BirthDt>
                  <BirthMonth>{birth_month}</BirthMonth>
                  <BirthYear>{birth_year}</BirthYear>
                  <Language>{language}</Language>
                  <Gender>{gender}</Gender>
                  <Salutation>{salutation}</Salutation>
                  <MaidenNameOfMother>{mother_maiden_name or ""}</MaidenNameOfMother>
                  <ratingdate>{rating_date}</ratingdate>
                  <RatingDt>{rating_date}</RatingDt>
                  <IsMinor>{is_minor}</IsMinor>
                  <IsDocReceived>Y</IsDocReceived>
                  <NativeLanguageCode>INFENG</NativeLanguageCode>
                  <CreatedBySystemId>FIVUSR</CreatedBySystemId>
                  <Manager>{manager}</Manager>
                  <RatingCode>{customer_rating}</RatingCode>
                  <ratingcode>{customer_rating}</ratingcode>
                  <rating></rating>
                  <customer_rating>{customer_rating}</customer_rating>
                  <customer_rating_code>{customer_rating}</customer_rating_code>
                  <riskRating>{risk_rating}</riskRating>
                  <riskCategory>{risk_rating}</riskCategory>
                  <Region>{region}</Region>
                  <RelationshipOpeningDt>{formatted_rel_open}</RelationshipOpeningDt>
                  {tax_table_xml}
                  <TradeFinFlag>N</TradeFinFlag>
                  <IsSMSBankingEnabled>N</IsSMSBankingEnabled>
                  <IsEbankingEnabled>N</IsEbankingEnabled>
                  <PrimarySolId>{primary_sol_id}</PrimarySolId>
                  <SegmentationClass>{segmentation_class}</SegmentationClass>
                  <SubSegment>{sub_segment}</SubSegment>
                  <Community></Community>
                  <CustType>NA</CustType>
                  <customer_type>NA</customer_type>
                  <Cust_Type_Code>NA</Cust_Type_Code>
                  <custTypeCode>NA</custTypeCode>
                  <CustTypeCode>NA</CustTypeCode>
                  <CustStatus>GEN</CustStatus>
                  <Status>ACTVE</Status>
                  <Status_code>GEN</Status_code>
                  <PurgeRemarks></PurgeRemarks>
                  <IsCustNRE>N</IsCustNRE>
                  <StaffFlag>{is_staff}</StaffFlag>
                  <PhoneEmailDtls>{phone_section}
               </PhoneEmailDtls>{email_section}
               </CustData>
            </CustDtls>
            <RelatedDtls>
               <DemographicData>
                  <CustCaste>{caste}</CustCaste>
                  <Caste>{caste}</Caste>
                  <EmploymentStatus>{employment_status}</EmploymentStatus>
                  <MaritalStatus>{marital_status}</MaritalStatus>
                  <Nationality>{nationality}</Nationality>
                  <Tax_Rate_Table_Code></Tax_Rate_Table_Code>
                  <Tax_Exmpt_Start_Date>{tax_start_date}</Tax_Exmpt_Start_Date>
                  <tds_exmpt_end_date>{tax_end_date}</tds_exmpt_end_date>
                  <tdsexcemptsubmitdate>{tds_submit_date}</tdsexcemptsubmitdate>
                  <tds_exmpt_submit_date>{tds_submit_date}</tds_exmpt_submit_date>
                  <TDSExcemptSubmitDate>{tds_submit_date}</TDSExcemptSubmitDate>
                  <tDSExcemptSubmitDate>{tds_submit_date}</tDSExcemptSubmitDate>
               </DemographicData>
               <EntityDoctData>
                  <CountryOfIssue>{country}</CountryOfIssue>
                  <DocCode>{doc_code}</DocCode>
                  <IssueDt>{doc_issue_date}</IssueDt>
                  <TypeCode>{doc_type_code}</TypeCode>
                  <EntityType>CIFRetCust</EntityType>
                  <PlaceOfIssue>.</PlaceOfIssue>
                  <countryOfIssue>{country}</countryOfIssue>
                  <ReferenceNum>{doc_reference_num or ""}</ReferenceNum>
                  <IsScanReqd>N</IsScanReqd>
                  <preferredUniqueId>Y</preferredUniqueId>
               </EntityDoctData>
               <PsychographicData>
                  <PsychographMiscData>
                     <StrText10>INR</StrText10>
                     <Type>CURRENCY</Type>
                  </PsychographMiscData>
                  <preferred_Locale>en_US</preferred_Locale>
               </PsychographicData>
               <CoreInterfaceInfo>
                  <FreeText1>D/O</FreeText1>
                  <FreeText3>NA</FreeText3>
                  <FreeText5>{doc_reference_num or ""}</FreeText5>
                  <FreeCode2>{free_code2}</FreeCode2>
                  <FreeCode3>{free_code3}</FreeCode3>
                  <FreeCode6>{free_code6}</FreeCode6>
                  <FreeCode8>{free_code8}</FreeCode8>
               </CoreInterfaceInfo>
            </RelatedDtls>
         </RetCustAddRq>
      </RetCustAddRequest>
   </Body>
</FIXML>'''

        frappe.log_error(title=f"Finacle RetCust Req {request_uuid}", message=xml_request)
        headers = {'Content-Type': 'application/xml'}
        response = requests.post(mig_url, data=xml_request, headers=headers, verify=False, timeout=30)
        frappe.log_error(title=f"Finacle RetCust Res {response.status_code}", message=response.text)

        if response.status_code == 200:
            try:
                response_dict = xmltodict.parse(response.text)
                fixml = get_xml_dict(response_dict.get('FIXML'))
                body = get_xml_dict(fixml.get('Body'))
                
                if 'Error' in body:
                    error_node = get_xml_dict(body['Error'])
                    exception_node = get_xml_dict(error_node.get('FIBusinessException'))
                    error_detail = get_xml_dict(exception_node.get('ErrorDetail'))
                    return {
                        "status": "FAILED",
                        "message": f"{error_detail.get('ErrorCode')}: {error_detail.get('ErrorDesc')}",
                        "full_response": response.text,
                        "request_sent": xml_request
                    }
                
                header = get_xml_dict(fixml.get('Header'))
                response_header = get_xml_dict(header.get('ResponseHeader'))
                host_transaction = get_xml_dict(response_header.get('HostTransaction'))
                
                if host_transaction.get('Status') == 'SUCCESS':
                    ret_cust_response = get_xml_dict(body.get('RetCustAddResponse'))
                    ret_cust_rs = get_xml_dict(ret_cust_response.get('RetCustAddRs'))
                    return {
                        "status": "SUCCESS",
                        "cif_id": ret_cust_rs.get('CustId'),
                        "description": ret_cust_rs.get('Desc'),
                        "message": f"Customer created successfully with CIF ID: {ret_cust_rs.get('CustId')}",
                        "full_response": response.text,
                        "request_sent": xml_request
                    }
                else:
                    return {
                        "status": "FAILED", 
                        "message": "Host Transaction Failed", 
                        "full_response": response.text,
                        "request_sent": xml_request
                    }
                    
            except Exception as e:
                return {"status": "ERROR", "message": f"Parsing Error: {str(e)}", "full_response": response.text, "request_sent": xml_request}
        else:
            return {"status": "ERROR", "message": f"HTTP {response.status_code}", "full_response": response.text, "request_sent": xml_request}
            
    except Exception as e:
        frappe.log_error(title="Finacle RetCust Creation Error", message=frappe.get_traceback())
        return {"status": "ERROR", "message": str(e)}
