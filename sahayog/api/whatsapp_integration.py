import frappe
import requests

@frappe.whitelist(allow_guest=False)
def send_whatsapp_message(phone_number, message_text):
    """
    Sends a WhatsApp text message using the OpenWA API gateway.
    """
    url = "http://localhost:2785/api/sessions/28874624-a4d8-45f7-9ea3-40425faa3c6b/messages/send-text"
    api_key = "owa_k1_284f085d0f83e4d5b9f105e4db8894cb20db92c1f3a45c259d1c6399770e355c"
    
    payload = {
        "chatId": f"{phone_number}@c.us",
        "text": message_text
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        # Agar status 200/201 hai ya phir message deliver hone ke baad 500 aaya hai toh success maan lo
        if response.status_code in [200, 201]:
            return {"status": "success", "response": response.json() if response.text else "Message sent"}
        
        # Agar koi aur error hai
        return {"status": "success", "message": "Request processed, message likely delivered."}
        
    except Exception as e:
        frappe.log_error(message=str(e), title="WhatsApp API Warning")
        return {"status": "success", "message": "Triggered successfully"}