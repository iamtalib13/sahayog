frappe.provide('frappe.pages');

frappe.pages['cost-code-details'].on_page_load = function(wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Cost Code Details',
		single_column: true
	});

	// UI Setup
	let search_field = page.add_field({
		label: 'Search',
		fieldtype: 'Data',
		fieldname: 'search',
		placeholder: 'Partial search (e.g. "opers" for Operations)...'
	});

	// Dynamic Search with Debounce (300ms)
	let timeout = null;
	$(search_field.$wrapper).find('input').on('input', function() {
		let val = $(this).val();
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			render_table(page, val);
		}, 300);
	});

	// Initial Load
	render_table(page);
}

function render_table(page, search_term = "") {
	let $body = $(page.body);
	if (!$body.find(".cost-code-wrapper").length) {
		$body.append('<div class="cost-code-wrapper" style="padding: 15px; overflow-x: auto;"></div>');
	}
	let $container = $body.find(".cost-code-wrapper");

	frappe.call({
		method: "sahayog.sahayog.page.cost_code_details.cost_code_details.get_cost_code_details",
		args: { search_term: search_term },
		callback: function(r) {
			let data = r.message || [];
			if (data.length > 0) {
				let table_html = `
					<table class="table table-bordered table-hover" style="background: #fff; font-size: 13px; min-width: 1100px;">
						<thead style="background: #f9f9f9; font-weight: bold;">
							<tr>
								<th>Employee Code</th>
								<th>Role</th>
								<th>Department</th>
								<th>Sub-Department</th>
								<th>Branch</th>
								<th>District</th>
								<th>Region</th>
								<th>Zone</th>
								<th>Cost Code</th>
							</tr>
						</thead>
						<tbody>
							${data.map(row => `
								<tr>
									<td><b>${row.employee_code || ''}</b></td>
									<td>${row.role || ''}</td>
									<td>${row.department || ''}</td>
									<td>${row.sub_department || ''}</td>
									<td>${row.branch || ''}</td>
									<td>${row.district_name || ''}</td>
									<td>${row.region || ''}</td>
									<td>${row.zone || ''}</td>
									<td style="color: #007bff; font-weight: bold;">${row.cost_code || ''}</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
				`;
				$container.html(table_html);
			} else {
				$container.html(`<div class="text-muted text-center" style="padding: 40px;">No results found for "${search_term}"</div>`);
			}
		}
	});
}
