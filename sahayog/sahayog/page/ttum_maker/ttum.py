import frappe
import requests

@frappe.whitelist(allow_guest=False)
def convert(ttumType, creationDate, creatorName, split=None, numberOfSplitRecords=None):
    """Proxy for TTUM Convert API - Dev & Prod ready"""
    
    # 🔧 API ENDPOINTS - Update for production
    api_url = "http://10.0.115.6:9098/api/ttum/convert"  # Dev
    # api_url = "https://your-prod-api.com/api/ttum/convert"  # Prod (uncomment later)
    
    try:
        files = frappe.request.files
        data = {
            'ttumType': ttumType,
            'creationDate': creationDate,
            'creatorName': creatorName,
            'split': split if split else '',
            'numberOfSplitRecords': numberOfSplitRecords if numberOfSplitRecords else ''
        }
        
        # Remove empty values
        data = {k: v for k, v in data.items() if v}
        
        response = requests.post(
            api_url,
            files=files,
            data=data,
            timeout=300
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "files": result.get("files", result.get("data", [])),
                "message": "Files generated successfully"
            }
        else:
            frappe.throw(f"API Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        frappe.throw(f"Proxy Error: {str(e)}")