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
    # Define the OpenWA API endpoint (replace 'my-bot' with your actual session name/ID)
    url = "http://localhost:2785/api/sessions/my-bot/messages/send-text"
    
    # Your OpenWA API key generated during setup
    api_key = "owa_k1_284f085d0f83e4d5b9f105e4db8894cb20db92c1f3a45c259d1c6399770e355c"
    
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
    
    try:
        # Send the HTTP POST request using requests library
        response = requests.post(url, json=payload, headers=headers)
        
        # Parse and return the response
        result = response.json()
        return {"status": "success", "response": result}
        
    except Exception as e:
        # Log the error in Frappe Error Log and return failure status
        frappe.log_error(message=str(e), title="WhatsApp API Integration Error")
        return {"status": "error", "message": str(e)}
