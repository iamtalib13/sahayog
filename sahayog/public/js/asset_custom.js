frappe.ui.form.on('Asset', {
	refresh: function(frm) {
		frm.toggle_display('naming_details_section', frm.is_new());

		if (frm.is_new()) {
			frm.set_value('is_existing_asset', 1);
			frm.set_value('asset_owner', 'Company');
			frm.trigger('preview_asset_id');
		}

		// Array of fieldnames that should only be visible to 'System Manager'
		const system_manager_only_fields = [
			'is_composite_asset',
			'depreciation_schedule_sb',
			'accounting_dimensions_section',
			'insurance_details',
			'asset_owner',
			'asset_owner_company'
		];

		const is_system_manager = frappe.user.has_role('System Manager');

		system_manager_only_fields.forEach(field => {
			frm.toggle_display(field, is_system_manager);
		});
	},

	asset_location_type: (frm) => frm.trigger('preview_asset_id'),
	zone: (frm) => frm.trigger('preview_asset_id'),
	state: (frm) => frm.trigger('preview_asset_id'),
	location: (frm) => frm.trigger('preview_asset_id'),
	branch_name: (frm) => frm.trigger('preview_asset_id'),
	division: (frm) => frm.trigger('preview_asset_id'),
	department: (frm) => frm.trigger('preview_asset_id'),
	item_name: (frm) => frm.trigger('preview_asset_id'),
	item_code: (frm) => frm.trigger('preview_asset_id'),
	brand: (frm) => frm.trigger('preview_asset_id'),

	preview_asset_id: function(frm) {
		if (!frm.is_new()) return;

		frm.set_intro("");

		let parts = ["SAHA"];

		// Zone
		if (frm.doc.zone) {
			let zone_digits = frm.doc.zone.match(/\d+/);
			parts.push(zone_digits ? "Z" + zone_digits[0] : frm.doc.zone.substring(0, 2).toUpperCase());
		} else {
			parts.push("[ZONE]");
		}

		// State Mapping
		const state_mapping = {
			"Andaman and Nicobar Islands": "AN", "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS",
			"Bihar": "BR", "Chandigarh": "CH", "Chhattisgarh": "CT", "Dadra and Nagar Haveli and Daman and Diu": "DN",
			"Delhi": "DL", "Goa": "GA", "Gujarat": "GJ", "Haryana": "HR", "Himachal Pradesh": "HP",
			"Jammu and Kashmir": "JK", "Jharkhand": "JH", "Karnataka": "KA", "Kerala": "KL", "Ladakh": "LA",
			"Lakshadweep": "LD", "Madhya Pradesh": "MP", "Maharashtra": "MH", "Manipur": "MN", "Meghalaya": "ML",
			"Mizoram": "MZ", "Nagaland": "NL", "Odisha": "OR", "Puducherry": "PY", "Punjab": "PB",
			"Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN", "Telangana": "TG", "Tripura": "TR",
			"Uttar Pradesh": "UP", "Uttarakhand": "UT", "West Bengal": "WB"
		};
		if (frm.doc.state && state_mapping[frm.doc.state]) {
			parts.push(state_mapping[frm.doc.state]);
		} else {
			parts.push("[STATE]");
		}

		// Location (Using branch_name)
		let loc_val = frm.doc.branch_name || frm.doc.location;
		if (loc_val) {
			parts.push(loc_val.substring(0, 3).toUpperCase());
		} else {
			parts.push("[LOC]");
		}

		parts.push(frm.doc.division ? frm.doc.division.toUpperCase() : "[DIVISION]");
		
		let asset_code = (frm.doc.item_name || frm.doc.item_code || "").substring(0, 3).toUpperCase();
		parts.push(asset_code || "[ASSET]");

		let brand_name = (frm.doc.brand || "").toUpperCase();
		parts.push(brand_name || "[BRAND]");

		let preview_id = parts.join("/") + "/[SERIAL NO]";

		let html = `
<div style="
	padding: 10px 12px;
	border-left: 4px solid #2980b9;
	background: #f5f9ff;
	border-radius: 6px;
	font-family: Inter, sans-serif;
">

	<div style="font-size: 14px; font-weight: 700; color: #2c3e50; margin-bottom: 12px;">
		Asset Identification & Naming
	</div>

	<div style="font-size: 12px; color: #666; margin-bottom: 6px;">
		Projected Asset ID
	</div>

	<div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
		${parts.map(p => `
			<span style="
				background:#e1ecff;
				color:#1f4e79;
				padding:3px 8px;
				border-radius: 14px;
				font-size: 12px;
				font-weight: 500;
				letter-spacing: 0.3px;
			">
				${p}
			</span>
		`).join("")}

		<span style="
			background:#dff7e6;
			color:#1e7e34;
			padding:3px 10px;
			border-radius: 14px;
			font-size: 12px;
			font-weight: 600;
		">
			Serial No
		</span>
	</div>

	<div style="
		margin-top:8px;
		font-size:13px;
		color:#2980b9;
		font-weight:600;
		word-break: break-all;
	">
		${preview_id}
	</div>

</div>
`;

		frm.set_intro(html);
	}
});
