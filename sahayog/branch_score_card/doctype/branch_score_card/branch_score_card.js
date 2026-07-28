frappe.ui.form.on("Branch Score Card", {
	refresh(frm) {
		frm.trigger("render_widget");
	},

	render_widget(frm) {
		let wrapper = frm.get_field("branch_score_widget").$wrapper;

		frappe.db.get_single_value("Website Settings", "favicon").then(favicon => {
			let logo_html = favicon ? `<img src="${favicon}" style="height: 35px; margin-right: 15px; vertical-align: middle;" />` : `<span style="font-size: 30px; margin-right: 15px; background: white; color: #016362; border-radius: 50%; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; font-family: serif;">S</span>`;

			let html = `
				<style>
					.bsc-widget {
						font-family: Arial, sans-serif;
						border-collapse: collapse;
						width: 100%;
						font-size: 12px;
						margin-top: 15px;
						color: black;
						border: 2px solid #000;
					}
					.bsc-widget th, .bsc-widget td {
						border: 2px solid #000;
						padding: 6px 4px;
						text-align: center;
						vertical-align: middle;
					}
					.bsc-header-row {
						background-color: #016362 !important;
						color: white !important;
						font-weight: bold;
						font-size: 18px;
						text-align: left !important;
						padding-left: 15px !important;
						border-bottom: 2px solid #000;
					}
					.bsc-title-row {
						background-color: #F8B195 !important;
						font-weight: bold;
						font-size: 15px;
						text-align: center;
					}
					.bsc-yellow-cell {
						background-color: #FFFF00 !important;
						font-weight: bold;
					}
					.bsc-white-cell {
						background-color: #FFFFFF !important;
						font-weight: bold;
					}
					.bsc-column-headers td {
						background-color: #F8B195 !important;
						font-weight: bold;
					}
					.bsc-function-cell {
						background-color: #016362 !important;
						color: white !important;
						font-weight: bold;
					}
					.bsc-light-grey {
						background-color: #EAEAEA !important;
					}
					.bsc-light-blue {
						background-color: #D9E1F2 !important;
					}
				</style>
				<table class="bsc-widget">
					<tr>
						<td colspan="6" class="bsc-header-row">
							<div style="display: flex; align-items: center; justify-content: flex-start;">
								${logo_html}
								SAHAYOG MULTISTATE CREDIT CO-OPERATIVE SOCIETY LTD
							</div>
						</td>
					</tr>
					<tr>
						<td colspan="6" class="bsc-title-row">
							BRANCH HEALTH SCORECARD FOR THE MONTH OF May 2026
						</td>
					</tr>
					<tr>
						<td class="bsc-yellow-cell" width="15%">122</td>
						<td class="bsc-white-cell" colspan="2" width="35%">1107</td>
						<td class="bsc-yellow-cell" colspan="2" width="25%">Regional / Zonal Head</td>
						<td class="bsc-white-cell" width="25%">Sebastian Franklin</td>
					</tr>
					<tr>
						<td class="bsc-yellow-cell">Branch Name</td>
						<td class="bsc-white-cell" colspan="2">MALAD BRANCH</td>
						<td class="bsc-yellow-cell" colspan="2">CH/DH/ADH</td>
						<td class="bsc-white-cell">Brian Dsilva</td>
					</tr>
					<tr>
						<td class="bsc-yellow-cell">Date of Branch Open</td>
						<td class="bsc-white-cell" colspan="2">20-Feb-24</td>
						<td class="bsc-yellow-cell" colspan="2">Regional Operations Manager</td>
						<td class="bsc-white-cell">Ravi Lalwani</td>
					</tr>
					<tr>
						<td class="bsc-yellow-cell">Zone</td>
						<td class="bsc-white-cell" colspan="2">ZONE-2(MH)</td>
						<td class="bsc-yellow-cell" colspan="2">Cluster Operations Manager</td>
						<td class="bsc-white-cell">Dattatray Mundale</td>
					</tr>
					<tr class="bsc-column-headers">
						<td width="15%">Functions</td>
						<td width="20%">Parameter</td>
						<td width="10%">Weightage</td>
						<td width="25%">Scoring Methodology</td>
						<td width="15%"></td>
						<td width="15%">Score Obtained</td>
					</tr>

					<!-- Section 1 -->
					<tr>
						<td rowspan="3" class="bsc-function-cell">CRL Monitoring and Branch Opening / Closing<br>(20)</td>
						<td class="bsc-light-grey" style="font-weight:bold;">CRL monitoring</td>
						<td class="bsc-light-grey">10</td>
						<td class="bsc-light-grey">0-5 Instances - 10,<br>6-8 Instances - 5,<br>More than 8 - 0</td>
						<td class="bsc-light-grey">Published by CPC team</td>
						<td class="bsc-light-grey">10</td>
					</tr>
					<tr>
						<td class="bsc-light-blue" style="font-weight:bold;">Delay In Branch Opening Entry</td>
						<td class="bsc-light-blue">5</td>
						<td class="bsc-light-blue">MVCD Opening -Before 10 am,<br>0-3 Instances - 5,<br>3-6 Instances - 2,<br>more than 6 - 0.</td>
						<td class="bsc-light-blue">Finacle data</td>
						<td class="bsc-light-blue">5</td>
					</tr>
					<tr>
						<td class="bsc-light-grey" style="font-weight:bold;">Delay In Branch Closing Entry</td>
						<td class="bsc-light-grey">5</td>
						<td class="bsc-light-grey">MVCD Closing -After 5.30 Pm,<br>0-3 Instances - 5,<br>3-6 Instances - 2,<br>more than 6 - 0</td>
						<td class="bsc-light-grey">Finacle data</td>
						<td class="bsc-light-grey">5</td>
					</tr>

					<!-- Section 2 -->
					<tr>
						<td rowspan="2" class="bsc-function-cell">Account Opening Operations<br>(35)</td>
						<td class="bsc-light-blue" style="font-weight:bold;">Account Opening FTNR</td>
						<td class="bsc-light-blue">15</td>
						<td class="bsc-light-blue">FTNR &lt;= 20% - 15<br>&lt;= 25% - 10<br>&lt;= 30% - 5<br>&gt; 30% -0</td>
						<td class="bsc-light-blue">Published by AO team</td>
						<td class="bsc-light-blue">15</td>
					</tr>
					<tr>
						<td class="bsc-light-grey" style="font-weight:bold;">Account opened without approval in KYC portal</td>
						<td class="bsc-light-grey">10</td>
						<td class="bsc-light-grey">NIL Instances - 10,<br>1 Instance - 5,<br>&gt;= 2 - 0</td>
						<td class="bsc-light-grey">Published by AO team</td>
						<td class="bsc-light-grey">10</td>
					</tr>

					<!-- Section 3 -->
					<tr>
						<td rowspan="2" class="bsc-function-cell">Miscellaneous (10)</td>
						<td class="bsc-light-blue" style="font-weight:bold;">Discrepancies identified in Bank reconciliation</td>
						<td class="bsc-light-blue">10</td>
						<td class="bsc-light-blue">Nil Diffrences - 10<br>1 - Diffrence - 5<br>&gt;= 2 diffrence - 0</td>
						<td class="bsc-light-blue">Published by recon team</td>
						<td class="bsc-light-blue">10</td>
					</tr>
					<tr>
						<td class="bsc-light-grey" style="font-weight:bold;">Errors in data entry reported by HO/ COM</td>
						<td class="bsc-light-grey">5</td>
						<td class="bsc-light-grey">0 errors - 5,<br>1-2 errors - 2, More than 2 -0</td>
						<td class="bsc-light-grey">Published by AO team</td>
						<td class="bsc-light-grey">5</td>
					</tr>

					<!-- Section 4 -->
					<tr>
						<td rowspan="4" class="bsc-function-cell">Audit and Compliance<br>(40)</td>
						<td class="bsc-light-blue" style="font-weight:bold;">Most Recent IAD Audit score</td>
						<td class="bsc-light-blue">15</td>
						<td class="bsc-light-blue">Low Risk - 15, Medium Risk = 10, High Risk = 0</td>
						<td class="bsc-light-blue">Latest IAD score shared by audit team</td>
						<td class="bsc-light-blue">10</td>
					</tr>
					<tr>
						<td class="bsc-light-grey" style="font-weight:bold;">IAD Audit compliance closure within TAT</td>
						<td class="bsc-light-grey">5</td>
						<td class="bsc-light-grey">Audit compliance done within 15 days = 5,<br>closed within 15-20 days = 2, More than 20 days = 0</td>
						<td class="bsc-light-grey">Data shared by audit team</td>
						<td class="bsc-light-grey">5</td>
					</tr>
					<tr>
						<td class="bsc-light-blue" style="font-weight:bold;">COM visit score for the month</td>
						<td class="bsc-light-blue">15</td>
						<td class="bsc-light-blue">Excellent - 15, Good = 10, Satisfactory = 5,<br>Needs Improvement = 0</td>
						<td class="bsc-light-blue">Latest COM Report</td>
						<td class="bsc-light-blue">10</td>
					</tr>
					<tr>
						<td class="bsc-light-grey" style="font-weight:bold;">COM visit compliance within</td>
						<td class="bsc-light-grey">5</td>
						<td class="bsc-light-grey">COM report closed within 7 days = 5, closed...</td>
						<td class="bsc-light-grey">Data shared by COM</td>
						<td class="bsc-light-grey">5</td>
					</tr>
				</table>
			`;

			wrapper.html(html);
		});
	}
});