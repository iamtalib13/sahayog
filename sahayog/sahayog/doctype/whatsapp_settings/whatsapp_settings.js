// Copyright (c) 2026, Developer Team and contributors
// For license information, please see license.txt

frappe.ui.form.on("Whatsapp Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Send Message"), () => {
			let dialog = new frappe.ui.Dialog({
				title: __("Send WhatsApp Message"),
				fields: [
					{
						fieldname: "phone_number",
						fieldtype: "Data",
						label: __("Mobile Number"),
						reqd: 1,
						description: __("Enter 10-digit mobile number (e.g., 9876543210)")
					},
					{
						fieldname: "message_text",
						fieldtype: "Text Editor",
						label: __("Message Text"),
						reqd: 1
					}
				],
				primary_action_label: __("Send"),
				primary_action(values) {
					let phone = (values.phone_number || "").trim().replace(/\D/g, "");
					if (phone.length !== 10) {
						frappe.msgprint({
							title: __("Validation Error"),
							message: __("Please enter a valid 10-digit mobile number."),
							indicator: "orange"
						});
						return;
					}

					let formatted_phone = "91" + phone;

					dialog.disable_primary_action();
					frappe.call({
						method: "sahayog.api.whatsapp_integration.send_whatsapp_message",
						args: {
							phone_number: formatted_phone,
							message_text: values.message_text
						},
						callback: function(r) {
							dialog.enable_primary_action();
							if (r.message && r.message.status === "success") {
								frappe.show_alert({
									message: __("WhatsApp message triggered successfully!"),
									indicator: "green"
								});
								dialog.hide();
							} else {
								frappe.msgprint({
									title: __("Error"),
									message: (r.message && r.message.message) || __("An error occurred"),
									indicator: "red"
								});
							}
						}
					});
				}
			});
			dialog.show();
		});
	}
});
