import frappe
import json
import pandas as pd
from frappe.utils.file_manager import get_file_path

# Relative Import
from .finOpsApi import (
    create_finacle_loan_account,
    disburse_finacle_loan_account,
    create_finacle_retail_customer
)

def format_date_str(date_val):
    """ Converts Excel timestamps or messy strings to YYYY-MM-DD """
    if not date_val:
        return ""
    s_val = str(date_val).strip()
    if " " in s_val:
        s_val = s_val.split(" ")[0]
    return s_val

def get_col_val(row, potential_keys):
    """ Helper to find a value by checking multiple possible column names """
    for key in potential_keys:
        # Check exact key
        if key in row:
            return row[key]
        # Check cleaned key (lowercase, stripped)
        clean_key = key.lower().strip()
        for row_k in row.keys():
            if row_k.lower().strip() == clean_key:
                return row[row_k]
    return ""

@frappe.whitelist()
def create_loan_account(file_url, operation_type):
    try:
        records = read_file_data(file_url)
        if not records:
            return {"status": "ERROR", "message": "File is empty or could not be read."}

        success_count = 0
        results = []

        for index, row in enumerate(records):
            try:
                # 1. MAP EXCEL COLUMNS TO VARIABLES
                # We check multiple variations for each field
                cust_id = get_col_val(row, ['customer_id', 'Customer Id', 'Cust Id'])
                schm_code = get_col_val(row, ['scheme_code', 'scheme code', 'scheme code '])
                branch = get_col_val(row, ['branch_id', 'branch Id', 'branch Id '])
                amt = get_col_val(row, ['loan_amount', 'Loan Amount'])
                period = get_col_val(row, ['loan_period_months', 'Loan period', 'Loan period '])
                
                # Dates need special handling with keys + formatting
                raw_inst_date = get_col_val(row, ['installment_start_date', 'Installment Start date'])
                inst_date = format_date_str(raw_inst_date)
                
                num_inst = get_col_val(row, ['num_installments', 'Number of Installment'])
                oper_acct = get_col_val(row, ['operative_account_id', 'Operative Account Number'])
                
                raw_open_date = get_col_val(row, ['account_open_date', 'Account Open Date'])
                open_date = format_date_str(raw_open_date)

                # 2. CALL API
                api_response = create_finacle_loan_account(
                    customer_id=str(cust_id),
                    scheme_code=str(schm_code),
                    branch_id=str(branch),
                    loan_amount=str(amt),
                    loan_period_months=str(period),
                    installment_start_date=inst_date,
                    num_installments=str(num_inst),
                    operative_account_id=str(oper_acct),
                    account_open_date=open_date
                )

                # 3. APPEND RESULT
                row_result = row.copy()
                row_result['status'] = api_response.get('status')
                row_result['message'] = api_response.get('message')
                row_result['account_id'] = api_response.get('account_id', '')
                results.append(row_result)

                if api_response.get('status') == 'SUCCESS':
                    success_count += 1

            except Exception as e:
                row_result = row.copy()
                row_result['status'] = 'ERROR'
                row_result['message'] = str(e)
                results.append(row_result)

        return {
            "status": "SUCCESS",
            "data": results,
            "message": f"Processed {len(records)} records. {success_count} Successful."
        }

    except Exception as e:
        frappe.log_error("FinOps Loan Creation Error", frappe.get_traceback())
        return {"status": "ERROR", "message": str(e)}

@frappe.whitelist()
def process_loan_disbursement(file_url, operation_type):
    """
    Reads Excel/CSV, iterates rows, and calls disburse_finacle_loan_account.
    Expected Columns:
    - loan_account_id, amount, operative_account_id, disbursement_date, remarks
    """
    try:
        records = read_file_data(file_url)
        if not records:
            return {"status": "ERROR", "message": "File is empty or could not be read."}

        success_count = 0
        results = []

        for index, row in enumerate(records):
            try:
                api_response = disburse_finacle_loan_account(
                    loan_account_id=str(row.get('loan_account_id', '')),
                    amount=str(row.get('amount', '')),
                    operative_account_id=str(row.get('operative_account_id', '')),
                    disbursement_date=str(row.get('disbursement_date', '')),
                    remarks=str(row.get('remarks', 'Disbursement'))
                )

                row_result = row.copy()
                row_result['status'] = api_response.get('status')
                row_result['message'] = api_response.get('message')
                row_result['tran_id'] = api_response.get('tran_id', '')
                results.append(row_result)

                if api_response.get('status') == 'SUCCESS':
                    success_count += 1

            except Exception as e:
                row_result = row.copy()
                row_result['status'] = 'ERROR'
                row_result['message'] = str(e)
                results.append(row_result)

        return {
            "status": "SUCCESS",
            "data": results,
            "message": f"Processed {len(records)} records. {success_count} Successful."
        }

    except Exception as e:
        frappe.log_error("FinOps Disbursement Error", frappe.get_traceback())
        return {"status": "ERROR", "message": str(e)}


@frappe.whitelist()
def create_cif(file_url, operation_type):
    """
    Reads Excel/CSV, iterates rows, and calls create_finacle_retail_customer.
    Expected Columns:
    - first_name, last_name, date_of_birth, gender, salutation, mobile_number...
    """
    try:
        records = read_file_data(file_url)
        if not records:
            return {"status": "ERROR", "message": "File is empty or could not be read."}

        success_count = 0
        results = []

        for index, row in enumerate(records):
            try:
                # Map Excel columns to API arguments
                # Using .get() with defaults avoids KeyErrors for optional columns
                api_response = create_finacle_retail_customer(
                    first_name=str(row.get('first_name', '')),
                    last_name=str(row.get('last_name', '')),
                    date_of_birth=str(row.get('date_of_birth', '')),
                    gender=str(row.get('gender', '')),
                    salutation=str(row.get('salutation', '')),
                    pref_name=str(row.get('pref_name', '')) if row.get('pref_name') else None,
                    language=str(row.get('language', 'India (English)')),
                    tax_deduction_table=str(row.get('tax_deduction_table', 'ZERO')),
                    addr_line1=str(row.get('addr_line1', '')),
                    addr_line2=str(row.get('addr_line2', '')),
                    city=str(row.get('city', '.')),
                    state=str(row.get('state', 'MH')),
                    postal_code=str(row.get('postal_code', '000000')),
                    country=str(row.get('country', 'IN')),
                    mobile_number=str(row.get('mobile_number', '')),
                    email=str(row.get('email', '')) if row.get('email') else None,
                    doc_code=str(row.get('doc_code', '2')),
                    doc_reference_num=str(row.get('doc_reference_num', '')),
                    doc_type_code=str(row.get('doc_type_code', '1')),
                    mother_maiden_name=str(row.get('mother_maiden_name', '')),
                    primary_sol_id=str(row.get('primary_sol_id', '1000')),
                    marital_status=str(row.get('marital_status', 'MARR')),
                    nationality=str(row.get('nationality', 'INDIAN')),
                    caste=str(row.get('caste', 'OTH')),
                    employment_status=str(row.get('employment_status', 'Employed'))
                )

                row_result = row.copy()
                row_result['status'] = api_response.get('status')
                row_result['message'] = api_response.get('message')
                row_result['cif_id'] = api_response.get('cif_id', '')
                results.append(row_result)

                if api_response.get('status') == 'SUCCESS':
                    success_count += 1

            except Exception as e:
                row_result = row.copy()
                row_result['status'] = 'ERROR'
                row_result['message'] = str(e)
                results.append(row_result)

        return {
            "status": "SUCCESS",
            "data": results,
            "message": f"Processed {len(records)} records. {success_count} Successful."
        }

    except Exception as e:
        frappe.log_error("FinOps CIF Creation Error", frappe.get_traceback())
        return {"status": "ERROR", "message": str(e)}


def read_file_data(file_url):
    """
    Helper to read Excel/CSV from Frappe File URL
    """
    try:
        file_path = get_file_path(file_url.split('/')[-1])
        
        if file_url.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        elif file_url.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            return None
            
        # Convert NaN to None/Empty string and return list of dicts
        return df.fillna('').to_dict('records')
    except Exception as e:
        frappe.log_error("FinOps File Read Error", str(e))
        return None
