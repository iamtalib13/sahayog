import frappe
import requests

@frappe.whitelist(allow_guest=False)
def send_whatsapp_message(phone_number, message_text):
    """
    Sends a WhatsApp text message using the OpenWA API gateway.
    
    Args:
        phone_number (str): Recipient's phone number with country code (e.g., '919876543210').
        message_text (str): The body of the message to send.
        
    Returns:
        dict: Status and response from the OpenWA gateway or error details.
    """
    try:
        # Fetch configurations from the single DocType "Whatsapp Settings"
        session_id = frappe.db.get_single_value("Whatsapp Settings", "session_id")
        gateway_url = frappe.db.get_single_value("Whatsapp Settings", "gateway_url")
        
        # Securely get password/API Key in Frappe using get_password()
        settings = frappe.get_doc("Whatsapp Settings")
        api_key = settings.get_password("api_key")

        url = f"{gateway_url.rstrip('/')}/api/sessions/{session_id}/messages/send-text"
        
        # Construct the payload with proper WhatsApp chatId formatting
        payload = {
            "chatId": f"{phone_number}@c.us",
            "text": message_text
        }
        
        # Set up request headers
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": api_key
        }

        # Send the HTTP POST request using requests library
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        # Parse and return the response
        result = response.json()
        return {"status": "success", "response": result}
        
    except Exception as e:
        # Log the error in Frappe Error Log and return failure status
        frappe.log_error(message=str(e), title="WhatsApp API Integration Error")
        return {"status": "error", "message": str(e)}