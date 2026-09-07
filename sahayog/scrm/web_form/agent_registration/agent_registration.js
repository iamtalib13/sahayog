frappe.ready(function() {
	// Add custom styling for mandatory red labels
	$("<style>")
		.prop("type", "text/css")
		.html(`
			.web-form-page .reqd,
			.web-form-page label.reqd::after {
				color: #dc2626 !important;
				font-weight: bold;
			}
			.web-form-page .btn-primary {
				background-color: #05a15d !important;
				border-color: #05a15d !important;
				font-weight: 600;
				padding: 10px 24px;
				font-size: 14px;
				border-radius: 6px;
			}
			.web-form-page .form-section {
				background: #ffffff;
				padding: 15px;
				border-radius: 8px;
				border: 1px solid #e5e7eb;
				margin-bottom: 15px;
			}
		`)
		.appendTo("head");

	// Mobile number 10-digit validation
	frappe.web_form.on('mobile_no', (field, value) => {
		if (value) {
			let cleaned = str(value).replace(/\D/g, '');
			if (cleaned.length < 10) {
				frappe.msgprint(__('Please enter a valid 10-digit mobile number.'));
			}
		}
	});

	// Auto success handling on form submit
	frappe.web_form.after_save = function() {
		frappe.msgprint({
			title: __('Application Submitted!'),
			indicator: 'green',
			message: __('Thank you for applying for the WaFHa Agent Program. Our representative will contact you shortly.')
		});
	};
});
