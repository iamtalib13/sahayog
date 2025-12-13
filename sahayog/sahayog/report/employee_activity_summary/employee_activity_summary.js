// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Employee Activity Summary"] = {
  filters: [
    // {
    //   fieldname: "from_date",
    //   label: __("From Date"),
    //   fieldtype: "Date",
    //   default: frappe.datetime.get_today(),
    // },
    // {
    //   fieldname: "to_date",
    //   label: __("To Date"),
    //   fieldtype: "Date",
    //   default: frappe.datetime.get_today(),
    // },
    {
      fieldname: "selected_date", // ← CHANGED from "from_date"
      label: __("Select Date"), // ← CHANGED label
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
    },
    {
      fieldname: "zone",
      label: __("Zone"),
      fieldtype: "Autocomplete",
      options: [""],
    },
    {
      fieldname: "region",
      label: __("Region"),
      fieldtype: "Autocomplete",
      options: [""],
    },
    // SEARCHABLE AUTOCOMPLETE FIELDS
    {
      fieldname: "sol_id",
      label: __("Sol ID"),
      fieldtype: "Autocomplete",
      options: [""],
    },
    {
      fieldname: "branch",
      label: __("Branch"),
      fieldtype: "Autocomplete",
      options: [""],
    },

    {
      fieldname: "status",
      label: __("Status"),
      fieldtype: "Select",
      options: ["", "Active", "Non-Active"],
    },
  ],

  onload(report) {
    // HIDE REGION & BRANCH INITIALLY
    frappe.query_report.get_filter("region").toggle(false);
    frappe.query_report.get_filter("branch").toggle(false);

    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Sahayog Branch",
        fields: ["sol_id", "zone", "region", "branch"],
        limit_page_length: 2000,
      },

      callback(r) {
        if (!r.message) return;

        let sol_ids = new Set();
        let zones = new Set();
        let regions = new Set();
        let branches = new Set();

        let zone_region_map = {};
        let region_branch_map = {};
        let sol_map = {};

        r.message.forEach((row) => {
          if (row.sol_id) sol_ids.add(row.sol_id);
          if (row.zone) zones.add(row.zone);
          if (row.region) regions.add(row.region);
          if (row.branch) branches.add(row.branch);

          if (row.zone && row.region) {
            if (!zone_region_map[row.zone])
              zone_region_map[row.zone] = new Set();
            zone_region_map[row.zone].add(row.region);
          }

          if (row.region && row.branch) {
            if (!region_branch_map[row.region])
              region_branch_map[row.region] = new Set();
            region_branch_map[row.region].add(row.branch);
          }

          sol_map[row.sol_id] = {
            zone: row.zone,
            region: row.region,
            branch: row.branch,
          };
        });

        // Works with Autocomplete
        function update_select(fieldname, values) {
          let field = frappe.query_report.get_filter(fieldname);
          if (!field) return;

          field.set_data(["", ...values]);
        }

        update_select("sol_id", Array.from(sol_ids).sort());
        update_select("zone", Array.from(zones).sort());
        update_select("region", Array.from(regions).sort());
        update_select("branch", Array.from(branches).sort());

        frappe.query_report.get_filter("region").$input.prop("disabled", true);
        frappe.query_report.get_filter("branch").$input.prop("disabled", true);

        // ====================================================
        // ZONE → FILTER REGIONS & SHOW REGION
        // ====================================================
        frappe.query_report.get_filter("zone").$input.on("change", function () {
          let zone_val = frappe.query_report.get_filter_value("zone");

          frappe.query_report.set_filter_value("region", "");
          frappe.query_report.set_filter_value("branch", "");

          if (zone_val) {
            let filtered_regions = Array.from(
              zone_region_map[zone_val] || []
            ).sort();

            update_select("region", filtered_regions);

            frappe.query_report
              .get_filter("region")
              .$input.prop("disabled", false);
            frappe.query_report
              .get_filter("branch")
              .$input.prop("disabled", true);

            // SHOW region
            frappe.query_report.get_filter("region").toggle(true);
            frappe.query_report.get_filter("branch").toggle(false);
          } else {
            frappe.query_report
              .get_filter("region")
              .$input.prop("disabled", true);
            frappe.query_report
              .get_filter("branch")
              .$input.prop("disabled", true);

            // HIDE region & branch
            frappe.query_report.get_filter("region").toggle(false);
            frappe.query_report.get_filter("branch").toggle(false);
          }
        });

        // ====================================================
        // REGION → FILTER BRANCHES & SHOW BRANCH
        // ====================================================
        frappe.query_report
          .get_filter("region")
          .$input.on("change", function () {
            let region_val = frappe.query_report.get_filter_value("region");

            frappe.query_report.set_filter_value("branch", "");

            if (region_val) {
              let filtered_branches = Array.from(
                region_branch_map[region_val] || []
              ).sort();

              update_select("branch", filtered_branches);
              frappe.query_report
                .get_filter("branch")
                .$input.prop("disabled", false);

              // SHOW branch
              frappe.query_report.get_filter("branch").toggle(true);
            } else {
              frappe.query_report
                .get_filter("branch")
                .$input.prop("disabled", true);

              // HIDE branch
              frappe.query_report.get_filter("branch").toggle(false);
            }
          });

        // ====================================================
        // SOL → AUTO-FILL
        // ====================================================
        frappe.query_report
          .get_filter("sol_id")
          .$input.on("change", function () {
            let sol_val = frappe.query_report.get_filter_value("sol_id");

            if (!sol_val || !sol_map[sol_val]) {
              frappe.query_report.set_filter_value("zone", "");
              frappe.query_report.set_filter_value("region", "");
              frappe.query_report.set_filter_value("branch", "");

              frappe.query_report.get_filter("region").toggle(false);
              frappe.query_report.get_filter("branch").toggle(false);
              return;
            }

            let { zone, region, branch } = sol_map[sol_val];

            frappe.query_report.set_filter_value("zone", zone);

            let filtered_regions = Array.from(
              zone_region_map[zone] || []
            ).sort();
            update_select("region", filtered_regions);
            frappe.query_report
              .get_filter("region")
              .$input.prop("disabled", false);
            frappe.query_report.set_filter_value("region", region);

            let filtered_branches = Array.from(
              region_branch_map[region] || []
            ).sort();
            update_select("branch", filtered_branches);
            frappe.query_report
              .get_filter("branch")
              .$input.prop("disabled", false);
            frappe.query_report.set_filter_value("branch", branch);

            // SHOW both
            frappe.query_report.get_filter("region").toggle(true);
            frappe.query_report.get_filter("branch").toggle(true);
          });
      },
    });

    // ===================================================================
    // CARD & CHART LOGIC (UNCHANGED)
    // ===================================================================

    function render_emp_status_cards(
      active_count,
      non_active_count,
      branch_name
    ) {
      $("#emp-status-card-container").remove();

      var card_html = `
        <div id="emp-status-card-container" style="margin-bottom:12px; background:#fff; padding:12px; border-radius:6px; border:1px solid #e2e2e2;">
          <div style="display:flex; align-items:center; gap:20px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:12px; height:12px; background:#62B58F; border-radius:2px;"></div>
              <span style="font-size:13px; color:#666;">Active:</span>
              <span style="font-size:14px; color:#62B58F; font-weight:600;">${active_count}</span>
            </div>
            <div style="height:20px; width:1px; background:#e2e2e2;"></div>
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:12px; height:12px; background:#F18F01; border-radius:2px;"></div>
              <span style="font-size:13px; color:#666;">Non-Active:</span>
              <span style="font-size:14px; color:#F18F01; font-weight:600;">${non_active_count}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; margin-left:auto;">
              <span style="font-size:13px; color:#666;">Total:</span>
              <span style="font-size:14px; color:#333; font-weight:600;">
                ${active_count + non_active_count}
              </span>
            </div>
          </div>
        </div>
      `;

      let $target = $(".frappe-query-report");
      if ($target.length === 0) $target = $(".page-content .report-wrapper");
      if ($target.length === 0) $target = $(".layout-main-section");

      if ($target.length > 0) $target.prepend(card_html);
    }

    function render_region_chart(data, zone_name) {
      $("#region-chart-container").remove();

      let region_status_users = {};

      data.forEach((row) => {
        let region = row.region || "Unknown Region";
        let status = row.status || "Unknown";
        let emp_id = row.emp_id;

        if (!emp_id) return;

        if (!region_status_users[region]) {
          region_status_users[region] = {
            Active: new Set(),
            "Non-Active": new Set(),
          };
        }

        if (status === "Active")
          region_status_users[region]["Active"].add(emp_id);
        else if (status === "Non-Active")
          region_status_users[region]["Non-Active"].add(emp_id);
      });

      let regions = Object.keys(region_status_users).sort();
      let active_counts = regions.map(
        (r) => region_status_users[r]["Active"].size
      );
      let non_active_counts = regions.map(
        (r) => region_status_users[r]["Non-Active"].size
      );

      let chart_html = `
        <div id="region-chart-container" style="margin-bottom:15px; background:#fff; padding:20px; border-radius:8px; border:1px solid #d1d8dd;">
          <h3 style="margin:0 0 15px 0; color:#333; font-size:16px; font-weight:600;">Region-wise Employee Distribution - ${zone_name}</h3>
          <div id="region-chart" style="height:300px;"></div>
        </div>
      `;

      let $target = $(".frappe-query-report");
      if ($target.length === 0) $target = $(".page-content .report-wrapper");
      if ($target.length === 0) $target = $(".layout-main-section");

      if ($target.length > 0) {
        $target.prepend(chart_html);

        setTimeout(() => {
          new frappe.Chart("#region-chart", {
            data: {
              labels: regions,
              datasets: [
                {
                  name: "Active Users",
                  values: active_counts,
                  chartType: "bar",
                },
                {
                  name: "Non-Active Users",
                  values: non_active_counts,
                  chartType: "bar",
                },
              ],
            },
            type: "bar",
            height: 280,
            colors: ["#62B58F", "#F18F01"],
          });
        }, 100);
      }
    }

    let original_refresh = report.refresh;

    report.refresh = function () {
      original_refresh.call(report);

      let zone = report.get_filter_value("zone");
      let region = report.get_filter_value("region");
      let branch = report.get_filter_value("branch");

      if (branch) {
        setTimeout(() => {
          let data = report.data || [];
          let active = data.filter((x) => x.status === "Active").length;
          let non_active = data.filter((x) => x.status === "Non-Active").length;
          render_emp_status_cards(active, non_active, branch);
        }, 400);
      } else if (zone && !region) {
        setTimeout(() => {
          let data = report.data || [];
          render_region_chart(data, zone);
        }, 400);

        $("#emp-status-card-container").remove();
      } else {
        $("#emp-status-card-container").remove();
        $("#region-chart-container").remove();
      }
    };
  },
};
