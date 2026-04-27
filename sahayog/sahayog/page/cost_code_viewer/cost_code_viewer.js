frappe.provide('frappe.pages');

frappe.pages['cost-code-viewer'].on_page_load = function(wrapper) {
	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Employee Cost Code',
		single_column: true
	});

// Create employee info area BELOW header (not inside flex row)
// 1. Title area ke flex-wrap ko enable karna taaki next line possible ho
  page.$title_area.css({
    "flex-wrap": "wrap",
    "display": "flex",
    "align-items": "baseline"
  });

  // 2. Employee Info Area ko width 100% dena taaki wo Title ke niche aa jaye
  page.employee_info_area = $(`
    <div class="employee-info-area"
        style="width: 100%; 
               margin-top: 8px; 
               font-size: 14px; 
               color: #333; 
               display: flex; 
               gap: 15px;">
    </div>
  `).appendTo(page.$title_area);

	let search_field = page.add_field({
		label: 'Search',
		fieldtype: 'Data',
		fieldname: 'search',
		placeholder: 'Search by any field (e.g. opers)...'
	});

	let timeout = null;
	$(search_field.$wrapper).find('input').on('input', function() {
		let val = $(this).val();
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			render_table(page, val);
		}, 300);
	});

	render_table(page);
}

function render_table(page, search_term = "") {
	let $body = $(page.body);
	if (!$body.find(".cost-code-wrapper").length) {
		$body.append('<div class="cost-code-wrapper" style="padding: 15px; overflow-x: auto;"></div>');
	}
	let $container = $body.find(".cost-code-wrapper");

	frappe.call({
		method: "sahayog.sahayog.page.cost_code_viewer.cost_code_viewer.get_cost_code_details",
		args: { search_term: search_term },
		callback: function(r) {
			let { data, employee_name, employee_id } = r.message || { data: [], employee_name: "", employee_id: "" };
			
			// Set Employee Info horizontally in the new line area
			if (employee_id) {
				page.employee_info_area.html(`
					<span style="margin-right: 20px;"><b>Employee:</b> ${employee_name}</span>
					<span><b>ID:</b> ${employee_id}</span>
				`);
			}

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
