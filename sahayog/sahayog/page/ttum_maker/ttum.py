# import frappe
# import requests

# @frappe.whitelist(allow_guest=False)
# def convert(ttumType, creationDate, creatorName, split=None, numberOfSplitRecords=None):
#     """Proxy for TTUM Convert API - Dev & Prod ready"""
    
#     # 🔧 API ENDPOINTS - Update for production
#     api_url = "http://10.0.115.6:9098/api/ttum/convert"  # Dev
#     # api_url = "https://your-prod-api.com/api/ttum/convert"  # Prod (uncomment later)
    
#     try:
#         files = frappe.request.files
#         data = {
#             'ttumType': ttumType,
#             'creationDate': creationDate,
#             'creatorName': creatorName,
#             'split': split if split else '',
#             'numberOfSplitRecords': numberOfSplitRecords if numberOfSplitRecords else ''
#         }
        
#         # Remove empty values
#         data = {k: v for k, v in data.items() if v}
        
#         response = requests.post(
#             api_url,
#             files=files,
#             data=data,
#             timeout=300
#         )
        
#         if response.status_code == 200:
#             result = response.json()
#             return {
#                 "success": True,
#                 "files": result.get("files", result.get("data", [])),
#                 "message": "Files generated successfully"
#             }
#         else:
#             frappe.throw(f"API Error: {response.status_code} - {response.text}")
            
#     except Exception as e:
#         frappe.throw(f"Proxy Error: {str(e)}")


############################################################

import frappe
import requests

@frappe.whitelist()
def convert():
    """
    Transparent proxy for TTUM Convert API
    Sends EXACT multipart/form-data as received
    """

    api_url = "http://10.0.115.6:9098/api/ttum/convert"

    try:
        # ✅ Get uploaded file
        uploaded_file = frappe.request.files.get("file")
        if not uploaded_file:
            frappe.throw("File missing")

        # ✅ Get form fields EXACTLY as sent
        ttum = frappe.form_dict.get("ttum")
        split = frappe.form_dict.get("split", "0")
        numberOfSplitRecords = frappe.form_dict.get("numberOfSplitRecords", "0")

        # ✅ Rebuild multipart for requests
        files = {
            "file": (
                uploaded_file.filename,
                uploaded_file.stream,
                uploaded_file.mimetype
            )
        }

        data = {
            "ttum": ttum,
            "split": split,
            "numberOfSplitRecords": numberOfSplitRecords
        }

        response = requests.post(
            api_url,
            files=files,
            data=data,
            timeout=300
        )

        if response.status_code != 200:
            frappe.throw(
                f"TTUM API Error {response.status_code}: {response.text}"
            )

        return response.json()

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "TTUM Proxy Error")
        frappe.throw(str(e))
