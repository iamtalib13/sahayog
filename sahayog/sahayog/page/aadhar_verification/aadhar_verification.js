frappe.pages["aadhar-verification"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Aadhaar Verification"),
		single_column: true,
	});

	frappe.call({
		method: "sahayog.sahayog.page.aadhar_verification.aadhar_verification.can_access",
		callback(r) {
			if (r.message) return;
			page.clear_primary_action();
			page.clear_inner_toolbar();
			page.main.html(`
				<div class="frappe-card" style="padding: 20px;">
					<h4>${__("Not Permitted")}</h4>
					<p>${__("You are not permitted to use Aadhaar Verification.")}</p>
				</div>
			`);
		},
	});

	page.set_primary_action(__("Verify Aadhaar"), () => verify_aadhaar(page));
	page.add_inner_button(__("Refresh"), () => reset_form(page));

	page.main.html(`
		<div class="aadhaar-verification-page">
			<style>
				.aadhaar-input-wrap { position: relative; }
				.aadhaar-input-wrap .form-control { padding-right: 40px; }
				.aadhaar-eye-toggle {
					position: absolute;
					top: 50%;
					right: 12px;
					transform: translateY(-50%);
					cursor: pointer;
					color: var(--text-muted);
					display: flex;
					align-items: center;
					user-select: none;
				}
				.aadhaar-eye-toggle:hover { color: var(--text-color); }
			</style>
			<div class="frappe-card" style="padding: 20px; margin-bottom: 20px;">
				<h4>${__("Aadhaar Verification")}</h4>
				<div class="row">
					<div class="col-md-6">
						<div class="form-group">
							<label>${__("Full Name")} <span style="color: var(--red-500, red);">*</span></label>
							<input type="text" class="form-control" id="aadhaar-user-name"
								maxlength="200" autocomplete="off">
							<p class="help-box">${__("Enter your full name exactly as mentioned on your Aadhaar card.")}</p>
						</div>
						<div class="form-group">
							<label>${__("Case ID")}</label>
							<input type="text" class="form-control" id="aadhaar-case-id" readonly>
						</div>
						<div class="form-group">
							<label>${__("Aadhaar Number")} <span style="color: var(--red-500, red);">*</span></label>
							<div class="aadhaar-input-wrap">
								<input type="password" class="form-control" id="aadhaar-number"
									maxlength="12" inputmode="numeric" autocomplete="off">
								<span class="aadhaar-eye-toggle" id="aadhaar-eye-toggle"
									role="button" tabindex="0"
									title="${__("Show / Hide")}" aria-label="${__("Show / Hide")}">
									<svg class="eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none"
										stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
										<circle cx="12" cy="12" r="3"></circle>
									</svg>
									<svg class="eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none"
										stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
										style="display:none;">
										<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
										<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
										<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
										<line x1="1" y1="1" x2="23" y2="23"></line>
									</svg>
								</span>
							</div>
							<p class="help-box">${__("Enter the 12-digit Aadhaar number.")}</p>
						</div>
						<div class="checkbox">
							<label>
								<input type="checkbox" id="aadhaar-consent">
								${__("Aadhaar holder has given consent")}
							</label>
						</div>
					</div>
					<div class="col-md-6">
						<div class="form-group">
							<label>${__("User ID")}</label>
							<input type="text" class="form-control" id="aadhaar-user-id" readonly>
						</div>
						<div class="form-group">
							<label>${__("Date & Time")}</label>
							<input type="text" class="form-control" id="aadhaar-datetime" readonly>
						</div>
					</div>
				</div>
			</div>

			<div class="frappe-card" style="padding: 20px;">
				<h4>${__("Verification Result")}</h4>
				<div class="row">
					<div class="col-md-6">
						<div class="form-group">
							<label>${__("Status")}</label>
							<input type="text" class="form-control" id="aadhaar-status" readonly>
						</div>
						<div class="form-group">
							<label>${__("Is Issued")}</label>
							<input type="text" class="form-control" id="aadhaar-is-issued" readonly>
						</div>
						<div class="form-group">
							<label>${__("Mobile (Masked)")}</label>
							<input type="text" class="form-control" id="aadhaar-mobile" readonly>
						</div>
					</div>
					<div class="col-md-6">
						<div class="form-group">
							<label>${__("Gender")}</label>
							<input type="text" class="form-control" id="aadhaar-gender" readonly>
						</div>
						<div class="form-group">
							<label>${__("State")}</label>
							<input type="text" class="form-control" id="aadhaar-state" readonly>
						</div>
						<div class="form-group">
							<label>${__("Age Band")}</label>
							<input type="text" class="form-control" id="aadhaar-age-band" readonly>
						</div>
					</div>
				</div>
			</div>
		</div>
	`);

	const $main = $(page.main);
	$main.find("#aadhaar-user-id").val(frappe.session.user);

	$main.find("#aadhaar-number").on("input", function () {
		const value = this.value.replace(/\D/g, "").slice(0, 12);
		this.value = value;
		clear_result(page);
		$main.find("#aadhaar-datetime").val(
			value ? frappe.datetime.now_datetime() : ""
		);
	});

	const $aadhaar = $main.find("#aadhaar-number");
	const $eye = $main.find("#aadhaar-eye-toggle");

	const toggle_aadhaar_visibility = () => {
		const show = $aadhaar.attr("type") === "password";
		$aadhaar.attr("type", show ? "text" : "password");
		$eye.find(".eye-open").toggle(!show);
		$eye.find(".eye-closed").toggle(show);
	};

	$eye.on("click", toggle_aadhaar_visibility);
	$eye.on("keydown", function (e) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			toggle_aadhaar_visibility();
		}
	});

	$main.find("#aadhaar-user-name, #aadhaar-consent").on("input change", function () {
		clear_result(page);
	});

	$main.find("#aadhaar-user-name, #aadhaar-case-id, #aadhaar-number, #aadhaar-consent")
		.on("input change", function () {
			clear_result(page);
		});

	if (frappe.user.has_role("System Manager")) {
		page.add_inner_button(__("View Logs"), () => {
			frappe.set_route("List", "Aadhaar Verification Log");
		});
	}
};

function clear_result(page) {
	const $main = $(page.main);
	[
		"#aadhaar-case-id",
		"#aadhaar-status",
		"#aadhaar-is-issued",
		"#aadhaar-mobile",
		"#aadhaar-gender",
		"#aadhaar-state",
		"#aadhaar-age-band",
	].forEach((selector) => $main.find(selector).val(""));
}

function reset_form(page) {
	const $main = $(page.main);
	[
		"#aadhaar-user-name",
		"#aadhaar-case-id",
		"#aadhaar-number",
		"#aadhaar-datetime",
		"#aadhaar-status",
		"#aadhaar-is-issued",
		"#aadhaar-mobile",
		"#aadhaar-gender",
		"#aadhaar-state",
		"#aadhaar-age-band",
	].forEach((selector) => $main.find(selector).val(""));

	$main.find("#aadhaar-consent").prop("checked", false);
	$main.find("#aadhaar-number").attr("type", "password");
	$main.find("#aadhaar-eye-toggle .eye-open").show();
	$main.find("#aadhaar-eye-toggle .eye-closed").hide();
	$main.find("#aadhaar-user-id").val(frappe.session.user);
}

function verify_aadhaar(page) {
	const $main = $(page.main);
	const user_name = ($main.find("#aadhaar-user-name").val() || "").trim();
	const aadhaar_number = ($main.find("#aadhaar-number").val() || "").trim();
	const consent = $main.find("#aadhaar-consent").is(":checked");

	const errors = [];

	if (user_name.length < 3 || user_name.length > 200) {
		errors.push(__("Full Name must be between 3 and 200 characters."));
	}
	if (!/^[2-9]\d{11}$/.test(aadhaar_number)) {
		errors.push(__("Aadhaar Number must be exactly 12 digits and cannot start with 0 or 1."));
	}
	if (!consent) {
		errors.push(__("Consent of the Aadhaar holder is mandatory."));
	}

	if (errors.length) {
		frappe.msgprint({
			title: __("Validation Error"),
			indicator: "red",
			message: "<ul><li>" + errors.join("</li><li>") + "</li></ul>",
		});
		return;
	}

	page.set_primary_action(__("Verifying..."), null);
	frappe.call({
		method: "sahayog.sahayog.page.aadhar_verification.aadhar_verification.verify",
		args: {
			user_name,
			aadhaar_number,
			consent: consent ? 1 : 0,
		},
		freeze: true,
		freeze_message: __("Verifying Aadhaar..."),
		callback(r) {
			const d = r.message;
			if (!d) return;

			$main.find("#aadhaar-user-id").val(d.user_id || "");
			$main.find("#aadhaar-case-id").val(d.case_id || "");
			$main.find("#aadhaar-datetime").val(d.verification_datetime || "");
			$main.find("#aadhaar-status").val(d.status || "");
			$main.find("#aadhaar-is-issued").val(d.is_issued || "");
			$main.find("#aadhaar-mobile").val(d.mobile || "");
			$main.find("#aadhaar-gender").val(d.gender || "");
			$main.find("#aadhaar-state").val(d.state || "");
			$main.find("#aadhaar-age-band").val(d.age_band || "");

			frappe.show_alert({
				message: __("Aadhaar verification completed"),
				indicator: "green",
			});
		},
		error() {
			frappe.show_alert({
				message: __("Aadhaar verification failed"),
				indicator: "red",
			});
		},
		always() {
			page.set_primary_action(__("Verify Aadhaar"), () => verify_aadhaar(page));
		},
	});
}
