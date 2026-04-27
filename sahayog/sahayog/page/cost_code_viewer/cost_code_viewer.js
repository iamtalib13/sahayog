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
			page.start = 0;
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
		args: { search_term: search_term, start: page.start, page_length: page.page_length },
		callback: function(r) {
			let { data, total_count, employee_name, employee_id } = r.message || { data: [], total_count: 0, employee_name: "", employee_id: "" };
			
			if (employee_id && reset) {
				page.employee_info_area.html(`<span><b>Employee:</b> ${employee_name}</span><span><b>ID:</b> ${employee_id}</span>`);
			}

			if (data && data.length > 0) {
				let rows_html = data.map(row => `
					<tr style="background-color: #fff;">
						<td style="color: #1a73e8; font-weight: bold; padding: 12px 15px; border-bottom: 1px solid #f1f1f1;">${row.employee_code || ''}</td>
						<td style="color: #444; padding: 12px 15px; border-bottom: 1px solid #f1f1f1;">${row.role || ''}</td>
						<td style="color: #444; padding: 12px 15px; border-bottom: 1px solid #f1f1f1;">${row.department || ''}</td>
						<td style="color: #666; font-size: 12px; padding: 12px 15px; border-bottom: 1px solid #f1f1f1;">${row.sub_department || ''}</td>
						<td style="padding: 12px 15px; border-bottom: 1px solid #f1f1f1;"><span class="label label-default" style="background-color: #f0f4f7; color: #555;">${row.branch || ''}</span></td>
						<td style="color: #666; padding: 12px 15px; border-bottom: 1px solid #f1f1f1;">${row.district_name || ''}</td>
						<td style="color: #666; padding: 12px 15px; border-bottom: 1px solid #f1f1f1;">${row.region || ''}</td>
						<td style="color: #666; padding: 12px 15px; border-bottom: 1px solid #f1f1f1;">${row.zone || ''}</td>
						<td style="padding: 12px 15px; border-bottom: 1px solid #f1f1f1;">
							<span style="background: #e7f3ff; color: #1a73e8; padding: 4px 10px; border-radius: 4px; font-weight: bold; border: 1px solid #c2e0ff;">
								${row.cost_code || ''}
							</span>
						</td>
					</tr>
				`).join('');

				if (reset || !$container.find('table').length) {
					let table_html = `
						<table class="table" style="background: #fff; font-size: 13px; min-width: 1100px; border-collapse: separate; border-spacing: 0; border: 1px solid #d1d8dd; border-radius: 8px; overflow: hidden;">
							<thead style="background: linear-gradient(180deg, #343a40 0%, #23272b 100%);">
								<tr>
									${['Employee Code', 'Role', 'Department', 'Sub-Dept', 'Branch', 'District', 'Region', 'Zone', 'Cost Code'].map(h => `
										<th style="color: #ffffff; padding: 16px 15px; font-size: 11px; text-transform: uppercase; font-weight: 700; border: none; letter-spacing: 0.8px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">${h}</th>
									`).join('')}
								</tr>
							</thead>
							<tbody>${rows_html}</tbody>
						</table>
						<style>.table tbody tr:hover { background-color: #f8fbff !important; }</style>
					`;
					$container.html(table_html);
				} else {
					$container.find('tbody').append(rows_html);
				}

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
				$container.html('<div class="text-muted text-center" style="padding: 40px;">No results found.</div>');
				$load_more_btn_container.empty();
			}
		}
	});
}
