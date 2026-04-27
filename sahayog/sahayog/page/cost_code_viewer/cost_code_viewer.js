frappe.provide('frappe.pages');

frappe.pages['cost-code-viewer'] = frappe.pages['cost-code-viewer'] || {};

frappe.pages['cost-code-viewer'].on_page_load = function(wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Employee Cost Code',
		single_column: true
	});

	page.start = 0;
	page.page_length = 20;

	// Header alignment
	page.$title_area.css({ "flex-wrap": "wrap", "display": "flex", "align-items": "baseline" });
	page.employee_info_area = $('<div class="employee-info-area" style="width: 100%; margin-top: 8px; font-size: 14px; color: #333; display: flex; gap: 15px;"></div>')
		.appendTo(page.$title_area);

	let search_field = page.add_field({
		label: 'Search',
		fieldtype: 'Data',
		fieldname: 'search',
		placeholder: 'Search by any field...'
	});

	let timeout = null;
	$(search_field.$wrapper).find('input').on('input', function() {
		let val = $(this).val();
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			page.start = 0; // Reset pagination on search
			render_table(page, val, true);
		}, 300);
	});

	render_table(page, "", true);
}

function render_table(page, search_term = "", reset = false) {
	let $body = $(page.body);
	if (!$body.find(".cost-code-wrapper").length) {
		$body.append('<div class="cost-code-wrapper" style="padding: 15px; overflow-x: auto;"></div>');
		$body.append('<div class="load-more-container" style="padding: 20px; text-align: center;"></div>');
	}
	
	let $container = $body.find(".cost-code-wrapper");
	let $load_more_btn_container = $body.find(".load-more-container");

	if (reset) {
		$container.empty();
		page.start = 0;
	}

	frappe.call({
		method: "sahayog.sahayog.page.cost_code_viewer.cost_code_viewer.get_cost_code_details",
		args: { 
			search_term: search_term,
			start: page.start,
			page_length: page.page_length
		},
		callback: function(r) {
			let { data, total_count, employee_name, employee_id } = r.message || { data: [], total_count: 0, employee_name: "", employee_id: "" };
			
			if (employee_id && reset) {
				page.employee_info_area.html(`<span><b>Employee:</b> ${employee_name}</span><span><b>ID:</b> ${employee_id}</span>`);
			}

			if (data && data.length > 0) {
				let rows_html = data.map(row => `
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
				`).join('');

				if (reset || !$container.find('table').length) {
					let table_html = `
						<table class="table table-bordered table-hover" style="background: #fff; font-size: 13px; min-width: 1100px;">
							<thead style="background: #f9f9f9; font-weight: bold;">
								<tr>
									<th>Employee Code</th><th>Role</th><th>Department</th><th>Sub-Department</th><th>Branch</th><th>District</th><th>Region</th><th>Zone</th><th>Cost Code</th>
								</tr>
							</thead>
							<tbody>${rows_html}</tbody>
						</table>
					`;
					$container.html(table_html);
				} else {
					$container.find('tbody').append(rows_html);
				}

				// Handle Load More Button
				page.start += data.length;
				if (page.start < total_count) {
					$load_more_btn_container.html(`<button class="btn btn-default btn-sm btn-load-more">Load More (${total_count - page.start} remaining)</button>`);
					$load_more_btn_container.find('.btn-load-more').on('click', function() {
						render_table(page, search_term, false);
					});
				} else {
					$load_more_btn_container.empty();
				}

			} else if (reset) {
				$container.html(`<div class="text-muted text-center" style="padding: 40px;">No results found.</div>`);
				$load_more_btn_container.empty();
			}
		}
	});
}
