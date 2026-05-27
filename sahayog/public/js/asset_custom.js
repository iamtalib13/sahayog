const ASSET_STATUS = Object.freeze({
	DRAFT: "Draft",
	AVAILABLE: "Available",
	ASSIGNED: "Assigned",
	IN_REPAIR: "In Repair",
	SCRAPPED: "Scrapped",
	SUBMITTED: "Submitted",
	CANCELLED: "Cancelled"
});

function get_asset_status(frm) {
	return (frm.doc.status || "").trim();
}

async function update_asset_intro(frm) {
	if (frm.is_new()) {
		frm.trigger('preview_asset_id');
		return;
	}

	if (frm.doc.custodian && get_asset_status(frm) === ASSET_STATUS.ASSIGNED) {
		try {
			const employee = await frappe.db.get_doc('Employee', frm.doc.custodian);
			const details = [
				{ label: __('ID'), value: employee.name },
				{ label: __('Employee'), value: `${employee.employee_name} (${employee.designation})` },
				{ label: __('Branch'), value: employee.branch || frm.doc.branch_name },
			];

			const all_statuses = ['Available', 'Assigned', 'In Repair', 'Scrapped'];
			const current_status = frm.doc.status || 'Available';
			
			const status_html = all_statuses.map(s => {
				const isActive = (s === current_status);
				return `<div style="
					font-size: 10px;
					padding: 2px 8px;
					border-radius: 4px;
					${isActive ? 'background: #dcfce7; color: #166534; font-weight: 700; box-shadow: 0 0 8px #86efac;' : 'background: #f3f4f6; color: #9ca3af;'}
				">${s}</div>`;
			}).join('');

			const html = `
<div style="
	padding: 8px 12px;
	border-left: 4px solid #15803d;
	background: #f0fdf4;
	border-radius: 4px;
	font-family: Inter, sans-serif;
	display: flex;
	justify-content: space-between;
	align-items: center;
">
	<div style="display: flex; gap: 16px;">
		${details.filter(row => row.value).map(row => `
			<div>
				<div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">${row.label}</div>
				<div style="font-size: 12px; font-weight: 600; color: #111827;">${row.value}</div>
			</div>
		`).join('')}
	</div>
	<div style="display: flex; gap: 6px;">
		${status_html}
	</div>
</div>`;

			frm.set_intro(html);
			return;
		} catch (error) {
			console.error('Failed to load custodian details:', error);
		}
	}

	frm.set_intro('');
}

function add_asset_action_buttons(frm) {
	if (frm.is_new() || frm.doc.docstatus === 2) {
		return;
	}

	const status = get_asset_status(frm);
	const actions_group = __('Actions');

	if ([ASSET_STATUS.DRAFT, ASSET_STATUS.SUBMITTED, ASSET_STATUS.AVAILABLE, ""].includes(status)) {
		frm.add_custom_button(__('Assign'), () => frm.trigger('assign_custodian'), actions_group);
		frm.add_custom_button(__('Send For Repair'), () => frm.trigger('send_for_repair'), actions_group);
		frm.add_custom_button(__('Scrap'), () => frm.trigger('scrap_asset'), actions_group);
		return;
	}

	if (status === ASSET_STATUS.ASSIGNED) {
		frm.add_custom_button(__('Transfer'), () => frm.trigger('transfer_asset'), actions_group);
		frm.add_custom_button(__('Return'), () => frm.trigger('return_asset'), actions_group);
		frm.add_custom_button(__('Send For Repair'), () => frm.trigger('send_for_repair'), actions_group);
		frm.add_custom_button(__('Scrap'), () => frm.trigger('scrap_asset'), actions_group);
		return;
	}

	if (status === ASSET_STATUS.IN_REPAIR) {
		frm.add_custom_button(__('Assign'), () => frm.trigger('assign_custodian'), actions_group);
		frm.add_custom_button(__('Mark Available'), () => frm.trigger('mark_available'), actions_group);
		frm.add_custom_button(__('Scrap'), () => frm.trigger('scrap_asset'), actions_group);
		return;
	}

	if (status === ASSET_STATUS.SCRAPPED) {
		frm.add_custom_button(__('Assign'), () => frm.trigger('assign_custodian'), actions_group);
		frm.add_custom_button(__('Restore to Previous'), () => frm.trigger('restore_to_previous'), actions_group);
		frm.add_custom_button(__('Mark Available'), () => frm.trigger('mark_available'), actions_group);
	}
}

async function run_asset_action(frm, action, args = {}) {
	const response = await frappe.call({
		method: 'sahayog.procurement.api.asset_actions.apply_asset_action',
		args: {
			asset_name: frm.doc.name,
			action,
			...args
		}
	});

	await frm.reload_doc();
	const result = response.message || {};
	const status = result.status || frm.doc.status || '';
	frappe.show_alert({
		message: __('Asset updated successfully. Current status: {0}', [status]),
		indicator: 'green'
	});
}


frappe.ui.form.on('Asset', {
	refresh: function(frm) {
		// Aggressively override render_graph to prevent any chart-related errors
		if (frm.dashboard) {
			frm.dashboard.render_graph = function() { return; };
		}

		frm.toggle_display('naming_details_section', frm.is_new());

		if (frm.is_new()) {
			frm.set_value('is_existing_asset', 1);
			frm.set_value('asset_owner', 'Company');
		}

		const system_manager_only_fields = [
			'is_composite_asset',
			'depreciation_schedule_sb',
			'accounting_dimensions_section',
			'section_break_31',
			'section_break_23',
			'insurance_details',
			'asset_owner',
			'asset_owner_company'
		];

		const is_system_manager = frappe.user.has_role('System Manager');

		system_manager_only_fields.forEach(field => {
			frm.toggle_display(field, is_system_manager);
		});

		add_asset_action_buttons(frm);
		update_asset_intro(frm);
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
	custodian: (frm) => update_asset_intro(frm),

	assign_custodian: function(frm) {
		const draft_notice = frm.doc.docstatus === 0
			? '<div class="text-muted">Assigning a draft asset will also submit it.</div>'
			: '';

		const dialog = new frappe.ui.Dialog({
			title: __('Assign Asset'),
			fields: [
				{
					fieldname: 'assign_notice',
					fieldtype: 'HTML',
					options: draft_notice
				},
				{
					label: __('Custodian'),
					fieldname: 'custodian',
					fieldtype: 'Link',
					options: 'Employee',
					reqd: 1,
					default: frm.doc.custodian || ''
				},
				{
					label: __('Branch / Location'),
					fieldname: 'location',
					fieldtype: 'Link',
					options: 'Sahayog Branch',
					reqd: 1,
					default: frm.doc.location || ''
				}
			],
			primary_action_label: frm.doc.docstatus === 0 ? __('Assign & Submit') : __('Assign'),
			primary_action: async (values) => {
				await run_asset_action(frm, 'assign', values);
				dialog.hide();
			}
		});

		dialog.show();
	},

	transfer_asset: function(frm) {
		const dialog = new frappe.ui.Dialog({
			title: __('Transfer Asset'),
			fields: [
				{
					label: __('New Custodian'),
					fieldname: 'custodian',
					fieldtype: 'Link',
					options: 'Employee',
					reqd: 1,
					default: frm.doc.custodian || ''
				},
				{
					label: __('New Branch / Location'),
					fieldname: 'location',
					fieldtype: 'Link',
					options: 'Sahayog Branch',
					reqd: 1,
					default: frm.doc.location || ''
				}
			],
			primary_action_label: __('Transfer'),
			primary_action: async (values) => {
				await run_asset_action(frm, 'transfer', values);
				dialog.hide();
			}
		});

		dialog.show();
	},

	return_asset: function(frm) {
		const dialog = new frappe.ui.Dialog({
			title: __('Return Asset'),
			fields: [
				{
					label: __('Return Branch / Location'),
					fieldname: 'location',
					fieldtype: 'Link',
					options: 'Sahayog Branch',
					reqd: 1,
					default: frm.doc.location || ''
				}
			],
			primary_action_label: __('Return'),
			primary_action: async (values) => {
				await run_asset_action(frm, 'return', values);
				dialog.hide();
			}
		});

		dialog.show();
	},

	send_for_repair: function(frm) {
		const dialog = new frappe.ui.Dialog({
			title: __('Send Asset For Repair'),
			fields: [
				{
					label: __('Repair Branch / Location'),
					fieldname: 'location',
					fieldtype: 'Link',
					options: 'Sahayog Branch',
					default: frm.doc.location || ''
				}
			],
			primary_action_label: __('Update Status'),
			primary_action: async (values) => {
				await run_asset_action(frm, 'send_for_repair', values);
				dialog.hide();
			}
		});

		dialog.show();
	},

	mark_available: function(frm) {
		const dialog = new frappe.ui.Dialog({
			title: __('Mark Asset Available'),
			fields: [
				{
					label: __('Available Branch / Location'),
					fieldname: 'location',
					fieldtype: 'Link',
					options: 'Sahayog Branch',
					reqd: 1,
					default: frm.doc.location || ''
				}
			],
			primary_action_label: __('Mark Available'),
			primary_action: async (values) => {
				await run_asset_action(frm, 'mark_available', values);
				dialog.hide();
			}
		});

		dialog.show();
	},

	scrap_asset: function(frm) {
		const dialog = new frappe.ui.Dialog({
			title: __('Scrap Asset'),
			fields: [
				{
					fieldname: 'scrap_notice',
					fieldtype: 'HTML',
					options: '<div class="text-muted">This will mark the asset as Scrapped and clear the custodian.</div>'
				}
			],
			primary_action_label: __('Scrap'),
			primary_action: async () => {
				await run_asset_action(frm, 'scrap');
				dialog.hide();
			}
		});

		dialog.show();
	},

	restore_to_previous: async function(frm) {
		const response = await frappe.call({
			method: 'sahayog.procurement.api.asset_actions.get_previous_custodian',
			args: { asset_name: frm.doc.name }
		});

		if (response.message) {
			const { to_employee, target_location } = response.message;
			frappe.confirm(
				__('Are you sure you want to restore this asset to {0} at {1}?', [to_employee, target_location]),
				async () => {
					await run_asset_action(frm, 'assign', {
						custodian: to_employee,
						location: target_location
					});
				}
			);
		} else {
			frappe.msgprint(__('No previous custodian found in history for this asset.'));
		}
	},

	preview_asset_id: function(frm) {
		if (!frm.is_new()) return;

		frm.set_intro('');

		let parts = ['SAHA'];

		if (frm.doc.zone) {
			let zone_digits = frm.doc.zone.match(/\d+/);
			parts.push(zone_digits ? 'Z' + zone_digits[0] : frm.doc.zone.substring(0, 2).toUpperCase());
		} else {
			parts.push('[ZONE]');
		}

		const state_mapping = {
			'Andaman and Nicobar Islands': 'AN', 'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS',
			'Bihar': 'BR', 'Chandigarh': 'CH', 'Chhattisgarh': 'CT', 'Dadra and Nagar Haveli and Daman and Diu': 'DN',
			'Delhi': 'DL', 'Goa': 'GA', 'Gujarat': 'GJ', 'Haryana': 'HR', 'Himachal Pradesh': 'HP',
			'Jammu and Kashmir': 'JK', 'Jharkhand': 'JH', 'Karnataka': 'KA', 'Kerala': 'KL', 'Ladakh': 'LA',
			'Lakshadweep': 'LD', 'Madhya Pradesh': 'MP', 'Maharashtra': 'MH', 'Manipur': 'MN', 'Meghalaya': 'ML',
			'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OR', 'Puducherry': 'PY', 'Punjab': 'PB',
			'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN', 'Telangana': 'TG', 'Tripura': 'TR',
			'Uttar Pradesh': 'UP', 'Uttarakhand': 'UT', 'West Bengal': 'WB'
		};
		if (frm.doc.state && state_mapping[frm.doc.state]) {
			parts.push(state_mapping[frm.doc.state]);
		} else {
			parts.push('[STATE]');
		}

		let loc_val = frm.doc.branch_name || frm.doc.location;
		if (loc_val) {
			parts.push(loc_val.substring(0, 3).toUpperCase());
		} else {
			parts.push('[LOC]');
		}

		parts.push(frm.doc.division ? frm.doc.division.toUpperCase() : '[DIVISION]');

		let asset_code = (frm.doc.item_name || frm.doc.item_code || '').substring(0, 3).toUpperCase();
		parts.push(asset_code || '[ASSET]');

		let brand_name = (frm.doc.brand || '').toUpperCase();
		parts.push(brand_name || '[BRAND]');

		let preview_id = parts.join('/') + '/[SERIAL NO]';

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
		`).join('')}

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
