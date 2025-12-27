# apps/sahayog/sahayog/sahayog/sahayog/api/ttum.py
import frappe
import requests

# @frappe.whitelist(allow_guest=False)
# def convert():
#     """Proxy request to 10.0.115.6:9098/api/ttum/convert preserving multipart form-data"""

#     target_url = "http://10.0.115.6:9098/api/ttum/convert"

#     try:
#         # Files and fields received from browser
#         files = frappe.request.files or {}
#         form = frappe.form_dict or {}

#         # Build files dict for requests
#         # Expecting key 'file' only (like Postman)
#         file_payload = {}
#         if 'file' in files:
#             f = files['file']
#             file_payload['file'] = (f.filename, f.stream, f.mimetype)
#             frappe.logger().info(f"File size: {len(file_payload['file'][1])}")


#         # Build data dict for requests: split, numberOfSplitRecords, ttum
#         data_payload = {}
#         for key in ('split', 'numberOfSplitRecords', 'ttum'):
#             if key in form:
#                 data_payload[key] = form.get(key)

#         # Log the payload being sent
#         frappe.logger().info(f"TTUM proxy → files: {list(file_payload.keys())}, data: {data_payload}")

#         # Prepare headers
#         headers = {
#     "Accept": "application/json"
#         }

#         # Forward EXACTLY as multipart/form-data
#         resp = requests.post(
#             target_url,
#             files=file_payload if file_payload else None,
#             data=data_payload,
#             timeout=300
#         )

#         frappe.logger().info(f"TTUM proxy response {resp.status_code}: {resp.text[:500]}")

#         # Pass through the JSON from the external service
#         try:
#             json_resp = resp.json()
#         except Exception:
#             json_resp = {"raw": resp.text}

#         frappe.response.status_code = resp.status_code
#         frappe.response["message"] = json_resp
#         return json_resp

#     except Exception as e:
#         frappe.logger().error(f"TTUM proxy error: {e}")
#         frappe.response.status_code = 500
#         frappe.response["message"] = {"error": str(e)}
#         return {"error": str(e)}


@frappe.whitelist(allow_guest=False)
def convert():
    target_url = "http://10.0.115.6:9098/api/ttum/convert"

    try:
        files = frappe.request.files or {}
        form = frappe.form_dict or {}

        file_payload = {}
        if 'file' in files:
            f = files['file']

            # 🔥 CRITICAL FIX
            file_bytes = f.stream.read()

            file_payload['file'] = (
                f.filename,
                file_bytes,
                f.mimetype
            )

            # ✅ Safe logging
            frappe.logger().info(
                f"TTUM proxy → file name: {f.filename}, size: {len(file_bytes)} bytes"
            )

        data_payload = {}
        for key in ('split', 'numberOfSplitRecords', 'ttum'):
            if key in form:
                data_payload[key] = form.get(key)

        frappe.logger().info(f"TTUM proxy → data: {data_payload}")

        headers = {
            "Accept": "application/json"
        }

        resp = requests.post(
            target_url,
            files=file_payload if file_payload else None,
            data=data_payload,
            headers=headers,
            timeout=300
        )

        frappe.logger().info(
            f"TTUM proxy → response {resp.status_code}: {resp.text[:300]}"
        )

        try:
            json_resp = resp.json()
        except Exception:
            json_resp = {"raw": resp.text}

        frappe.response.status_code = resp.status_code
        frappe.response["message"] = json_resp
        return json_resp

    except Exception as e:
        frappe.logger().error(f"TTUM proxy error: {e}")
        frappe.response.status_code = 500
        frappe.response["message"] = {"error": str(e)}
        return {"error": str(e)}


@frappe.whitelist(allow_guest=False)
def download_file(filename):
    """Download TTUM file from external API"""
    api_url = f"http://10.0.115.6:9098/api/ttum/download/{filename}"
    
    try:
        response = requests.get(api_url, timeout=60, verify=False)
        if response.status_code == 200:
            frappe.response.filename = filename
            frappe.response.filecontent = response.content
            frappe.response.type = "download"
        else:
            frappe.throw(f"File not found: {filename}")
    except Exception as e:
        frappe.throw(f"Download failed: {str(e)}")