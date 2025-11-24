// Copyright (c) 2025, Developer Team and contributors
// For license information, please see license.txt

frappe.query_reports["Crm Active and Inactive Employee Report"] = {
  filters: [
    {
      fieldname: "sol_id",
      label: __("Sol ID"),
      fieldtype: "Select",
      options: [""],
    },
    {
      fieldname: "zone",
      label: __("Zone"),
      fieldtype: "Select",
      options: [""],
    },
    {
      fieldname: "region",
      label: __("Region"),
      fieldtype: "Select",
      options: [""],
    },
    {
      fieldname: "branch",
      label: __("Branch"),
      fieldtype: "Select",
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

        r.message.forEach((row) => {
          if (row.sol_id) sol_ids.add(row.sol_id);
          if (row.zone) zones.add(row.zone);
          if (row.region) regions.add(row.region);
          if (row.branch) branches.add(row.branch);
        });

        function update_select(fieldname, values) {
          let field = frappe.query_report.get_filter(fieldname);
          if (!field) return;

          field.df.options = ["", ...values];

          const control = field.$input;
          control.empty();
          field.df.options.forEach((opt) => {
            control.append(`<option value="${opt}">${opt}</option>`);
          });
        }

        update_select("sol_id", Array.from(sol_ids).sort());
        update_select("zone", Array.from(zones).sort());
        update_select("region", Array.from(regions).sort());
        update_select("branch", Array.from(branches).sort());
        // ===============================
        // 🔥 READONLY CONTROL LOGIC
        // ===============================

        // disable region & branch at start
        frappe.query_report
          .get_filter("region")
          .$wrapper.find("select")
          .prop("disabled", true);
        frappe.query_report
          .get_filter("branch")
          .$wrapper.find("select")
          .prop("disabled", true);

        // When ZONE changes → enable REGION
        frappe.query_report.get_filter("zone").$input.on("change", function () {
          let zone_val = frappe.query_report.get_filter_value("zone");

          if (zone_val) {
            frappe.query_report
              .get_filter("region")
              .$wrapper.find("select")
              .prop("disabled", false);
          } else {
            frappe.query_report
              .get_filter("region")
              .$wrapper.find("select")
              .prop("disabled", true);
            frappe.query_report
              .get_filter("branch")
              .$wrapper.find("select")
              .prop("disabled", true);
          }
        });

        // When REGION changes → enable BRANCH
        frappe.query_report
          .get_filter("region")
          .$input.on("change", function () {
            let region_val = frappe.query_report.get_filter_value("region");

            if (region_val) {
              frappe.query_report
                .get_filter("branch")
                .$wrapper.find("select")
                .prop("disabled", false);
            } else {
              frappe.query_report
                .get_filter("branch")
                .$wrapper.find("select")
                .prop("disabled", true);
            }
          });

        // ==============================
        // 🔥 Restrict Selection Logic
        // ==============================

        // Block REGION until ZONE selected
        frappe.query_report
          .get_filter("region")
          .$input.on("click", function (e) {
            let zone_val = frappe.query_report.get_filter_value("zone");
            if (!zone_val) {
              frappe.msgprint("Please select <b>Zone</b> first.");
              e.preventDefault();
              return false;
            }
          });

        // Block BRANCH until REGION selected
        frappe.query_report
          .get_filter("branch")
          .$input.on("click", function (e) {
            let region_val = frappe.query_report.get_filter_value("region");
            if (!region_val) {
              frappe.msgprint("Please select <b>Region</b> first.");
              e.preventDefault();
              return false;
            }
          });
      },
    });

    // ============================
    //  EXISTING CARD + CHART CODE
    //  (Unmodified – Your logic stays intact)
    // ============================

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
