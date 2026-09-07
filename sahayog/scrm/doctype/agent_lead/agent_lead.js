frappe.ui.form.on("Agent Lead", {
	refresh(frm) {
		// Button to view/download QR Code
		frm.add_custom_button(__("Get WaFHa QR Code"), function () {
			frappe.call({
				method: "sahayog.scrm.doctype.agent_lead.agent_lead.ensure_qr_code",
				callback: function (r) {
					if (r.message && r.message.qr_url) {
						let d = new frappe.ui.Dialog({
							title: __("WaFHa Agent Registration QR Code"),
							fields: [
								{
									fieldtype: "HTML",
									fieldname: "qr_preview",
									html: `
										<div class="text-center p-3">
											<p class="text-muted">Scan or print this QR code on posters/Ganesh Aarti Books to collect Agent Leads:</p>
											<img src="${r.message.qr_url}" style="max-width: 220px; border: 1px solid #ddd; padding: 8px; border-radius: 8px;" />
											<p class="mt-2"><code>${r.message.target_url}</code></p>
											<a href="${r.message.qr_url}" download="WaFHa_Agent_Lead_QR.png" class="btn btn-primary btn-sm mt-2">
												<i class="fa fa-download"></i> Download QR Image
											</a>
										</div>
									`
								}
							]
						});
						d.show();
					}
				}
			});
		});
	}
});
