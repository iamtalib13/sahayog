// apps/sahayog/sahayog/sahayog/page/permission_config/permission_config.js

frappe.pages["permission-config"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "Permission Configuration",
    single_column: true,
  });

  // Full width
  $(wrapper).find(".page-content").css({ padding: "0", maxWidth: "none" });
  $(wrapper).find(".layout-main-section").css({ maxWidth: "none" });

  frappe.require("/assets/sahayog/js/petite-vue.iife.js", () => {
    page.main.html(`
      <style>
        #permission-config-root { background: var(--bg-light); }
        .pc-wrap { display: grid; grid-template-columns: 380px 1fr; gap: 16px; padding: 16px; min-height: calc(100vh - 140px); }
        .pc-card { background: #fff; border: 1px solid var(--border-color); border-radius: 14px; box-shadow: 0 1px 2px rgba(16,24,40,.06); }
        .pc-card-h { padding: 14px 14px 0 14px; font-weight: 700; color: var(--text-color); }
        .pc-card-b { padding: 14px; }
        .pc-sticky { position: sticky; top: 16px; align-self: start; }
        .pc-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .pc-subtle { color: var(--text-muted); font-size: 12px; }
        .pc-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 10px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 999px; font-size: 12px; }
        .pc-divider { height: 1px; background: var(--border-color); margin: 12px 0; }
        .pc-group { margin-top: 14px; }
        .pc-glabel { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; font-size: 12px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: .04em; }
        .pc-action { font-size: 12px; font-weight: 600; color: var(--primary); cursor: pointer; user-select:none; }
        .pc-action:hover { text-decoration: underline; }
        .pc-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
        .pc-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .pc-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .pc-opt { display:flex; align-items:center; justify-content:center; gap: 8px; padding: 10px 8px; border-radius: 12px;
                  background: #f8fafc; border: 1px solid #e5e7eb; cursor: pointer; user-select:none; }
        .pc-opt:hover { background:#f1f5f9; }
        .pc-opt.sel { background:#dbeafe; border-color:#3b82f6; }
        .pc-opt input { margin: 0; }
        .pc-opt span { font-size: 13px; color: #0f172a; font-weight: 600; }
        .pc-main { padding: 16px; }
        .pc-kv { display:grid; grid-template-columns: 160px 1fr; gap: 8px; font-size: 13px; }
        .pc-kv b { color:#111827; }
        .pc-skel { padding: 10px; border: 1px dashed var(--border-color); border-radius: 12px; background: #fafafa; color: var(--text-muted); }
        @media (max-width: 1200px) { .pc-wrap { grid-template-columns: 1fr; } .pc-sticky { position: static; } }
      </style>

      <div id="permission-config-root" v-scope @vue:mounted="init()">
        <div class="pc-wrap">

          <!-- Sidebar -->
          <div class="pc-card pc-sticky">
            <div class="pc-card-h">Context</div>
            <div class="pc-card-b">
              <div class="pc-row">
                <div class="pc-subtle">User + report type drives all filters</div>
                <div class="pc-chip">
                  <span>[[ full_name || user || "No user" ]]</span>
                  <span class="pc-subtle">[[ report_type || "No type" ]]</span>
                </div>
              </div>

              <div class="pc-divider"></div>

              <div class="pc-group">
                <div class="pc-glabel"><span>User</span></div>
                <div class="pc-control-user"></div>
              </div>

              <div class="pc-group">
                <div class="pc-glabel"><span>Report Type</span></div>
                <div class="pc-control-report-type"></div>
              </div>

              <div class="pc-divider"></div>

              <div class="pc-group">
                <div class="pc-glabel">
                  <span>Zone</span>
                  <span class="pc-action" @click="toggle_all('zone')">[[ is_all_selected('zone') ? "Deselect" : "Select" ]] all</span>
                </div>
                <div class="pc-grid">
                  <div v-for="(o, idx) in options.zone" :key="o.value"
                    class="pc-opt" :class="{sel: selected.zone.includes(o.value)}"
                    @click="toggle('zone', o.value)">
                    <input type="checkbox" :checked="selected.zone.includes(o.value)" @click.stop="toggle('zone', o.value)">
                    <span>[[ zone_label(o, idx) ]]</span>
                  </div>
                </div>
              </div>

              <div class="pc-group">
                <div class="pc-glabel">
                  <span>Region</span>
                  <span class="pc-action" @click="toggle_all('region')">[[ is_all_selected('region') ? "Deselect" : "Select" ]] all</span>
                </div>
                <div class="pc-grid pc-grid-4">
                  <div v-for="(o, idx) in options.region" :key="o.value"
                    class="pc-opt" :class="{sel: selected.region.includes(o.value)}"
                    @click="toggle('region', o.value)">
                    <input type="checkbox" :checked="selected.region.includes(o.value)" @click.stop="toggle('region', o.value)">
                    <span>[[ region_label(o, idx) ]]</span>
                  </div>
                </div>
              </div>

              <div class="pc-group">
                <div class="pc-glabel">
                  <span>State</span>
                  <span class="pc-action" @click="toggle_all('state')">[[ is_all_selected('state') ? "Deselect" : "Select" ]] all</span>
                </div>
                <div class="pc-grid pc-grid-3">
                  <div v-for="o in options.state" :key="o.value"
                    class="pc-opt" :class="{sel: selected.state.includes(o.value)}"
                    @click="toggle('state', o.value)">
                    <input type="checkbox" :checked="selected.state.includes(o.value)" @click.stop="toggle('state', o.value)">
                    <span>[[ o.label ]]</span>
                  </div>
                </div>
              </div>

              <div class="pc-group">
                <div class="pc-glabel">
                  <span>District</span>
                  <span class="pc-action" @click="toggle_all('district')">[[ is_all_selected('district') ? "Deselect" : "Select" ]] all</span>
                </div>
                <div class="pc-grid pc-grid-3">
                  <div v-for="o in options.district" :key="o.value"
                    class="pc-opt" :class="{sel: selected.district.includes(o.value)}"
                    @click="toggle('district', o.value)">
                    <input type="checkbox" :checked="selected.district.includes(o.value)" @click.stop="toggle('district', o.value)">
                    <span>[[ o.label ]]</span>
                  </div>
                </div>
              </div>

              <div class="pc-group">
                <div class="pc-glabel">
                  <span>Sol ID</span>
                  <span class="pc-action" @click="toggle_all('sol_id')">[[ is_all_selected('sol_id') ? "Deselect" : "Select" ]] all</span>
                </div>
                <div class="pc-grid pc-grid-3">
                  <div v-for="o in options.sol_id" :key="o.value"
                    class="pc-opt" :class="{sel: selected.sol_id.includes(o.value)}"
                    @click="toggle('sol_id', o.value)">
                    <input type="checkbox" :checked="selected.sol_id.includes(o.value)" @click.stop="toggle('sol_id', o.value)">
                    <span>[[ o.label ]]</span>
                  </div>
                </div>
              </div>

              <div class="pc-group">
                <div class="pc-glabel">
                  <span>Product</span>
                  <span class="pc-action" @click="toggle_all('product')">[[ is_all_selected('product') ? "Deselect" : "Select" ]] all</span>
                </div>
                <div class="pc-grid pc-grid-3">
                  <div v-for="o in options.product" :key="o.value"
                    class="pc-opt" :class="{sel: selected.product.includes(o.value)}"
                    @click="toggle('product', o.value)">
                    <input type="checkbox" :checked="selected.product.includes(o.value)" @click.stop="toggle('product', o.value)">
                    <span>[[ o.label ]]</span>
                  </div>
                </div>
              </div>

              <div class="pc-group">
                <div class="pc-glabel">
                  <span>Source</span>
                  <span class="pc-action" @click="toggle_all('source')">[[ is_all_selected('source') ? "Deselect" : "Select" ]] all</span>
                </div>
                <div class="pc-grid pc-grid-3">
                  <div v-for="o in options.source" :key="o.value"
                    class="pc-opt" :class="{sel: selected.source.includes(o.value)}"
                    @click="toggle('source', o.value)">
                    <input type="checkbox" :checked="selected.source.includes(o.value)" @click.stop="toggle('source', o.value)">
                    <span>[[ o.label ]]</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Main -->
          <div class="pc-card">
            <div class="pc-card-h">Main content</div>
            <div class="pc-main">
              <div v-if="!user" class="pc-skel">Select a user to load associated options/preferences.</div>

              <div v-else class="pc-card pc-card-b" style="border:none; box-shadow:none; padding:0;">
                <div class="pc-kv">
                  <b>User</b><div>[[ user ]]</div>
                  <b>Full name</b><div>[[ full_name || "-" ]]</div>
                  <b>Report type</b><div>[[ report_type || "-" ]]</div>
                  <b>Zone</b><div>[[ selected.zone.length ? selected.zone.join(", ") : "-" ]]</div>
                  <b>Region</b><div>[[ selected.region.length ? selected.region.join(", ") : "-" ]]</div>
                  <b>State</b><div>[[ selected.state.length ? selected.state.join(", ") : "-" ]]</div>
                  <b>District</b><div>[[ selected.district.length ? selected.district.join(", ") : "-" ]]</div>
                  <b>Sol ID</b><div>[[ selected.sol_id.length ? selected.sol_id.join(", ") : "-" ]]</div>
                  <b>Product</b><div>[[ selected.product.length ? selected.product.join(", ") : "-" ]]</div>
                  <b>Source</b><div>[[ selected.source.length ? selected.source.join(", ") : "-" ]]</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    `);

    PetiteVue.createApp({
      $delimiters: ["[[", "]]"],

      // context
      user: "",
      full_name: "",
      report_type: "",

      // options
      options: {
        zone: [],
        region: [],
        state: [],
        district: [],
        sol_id: [],
        product: [],
        source: [],
      },

      // selected values (store "value" tokens)
      selected: {
        zone: [],
        region: [],
        state: [],
        district: [],
        sol_id: [],
        product: [],
        source: [],
      },

      init() {
        this.make_controls(); // standard Frappe controls via make_control [web:28]
      },

      make_controls() {
        // User (Link)
        const user_ctrl = frappe.ui.form.make_control({
          parent: $(page.main).find(".pc-control-user"),
          df: {
            fieldtype: "Link",
            fieldname: "user",
            label: "User",
            options: "User",
            reqd: 1,
            onchange: () => {
              const v = user_ctrl.get_value();
              this.on_user_change(v);
            },
          },
          render_input: true,
        });

        // Report Type (Select)
        const report_ctrl = frappe.ui.form.make_control({
          parent: $(page.main).find(".pc-control-report-type"),
          df: {
            fieldtype: "Select",
            fieldname: "report_type",
            label: "Report Type",
            options: ["", "Finacle", "Lead"].join("\n"),
            onchange: () => {
              const v = report_ctrl.get_value();
              this.report_type = v || "";
              this.load_bundle();
            },
          },
          render_input: true,
        });

        // Keep references if you want later
        this._user_ctrl = user_ctrl;
        this._report_ctrl = report_ctrl;
      },

      on_user_change(user) {
        this.user = user || "";
        this.full_name = "";
        this.clear_selected();
        if (!this.user) return;

        // Fetch full_name like Report Preference User link display expects [web:23]
        frappe.call({
          method: "frappe.client.get_value",
          args: { doctype: "User", filters: { name: this.user }, fieldname: ["full_name"] },
          callback: (r) => {
            this.full_name = r?.message?.full_name || "";
          },
        });

        this.load_bundle();
      },

      load_bundle() {
        if (!this.user) return;

        frappe.call({
          method: "sahayog.sahayog.page.permission_config.permission_config.get_user_bundle",
          args: { user: this.user, report_type: this.report_type || null },
          callback: (r) => {
            const msg = r.message || {};
            const opt = msg.options || {};
            this.options.zone = opt.zone || [];
            this.options.region = opt.region || [];
            this.options.state = opt.state || [];
            this.options.district = opt.district || [];
            this.options.sol_id = opt.sol_id || [];
            this.options.product = opt.product || [];
            this.options.source = opt.source || [];

            // If preference doc exists, map it to selected arrays (best-effort; child row schema may vary)
            if (msg.preference) this.apply_preference(msg.preference);
          },
        });
      },

      apply_preference(pref) {
        const pluck = (rows, keys) => {
          if (!Array.isArray(rows)) return [];
          for (const k of keys) {
            const vals = rows.map(r => r?.[k]).filter(Boolean);
            if (vals.length) return vals;
          }
          // fallback: if rows are just strings
          const direct = rows.filter(v => typeof v === "string");
          return direct;
        };

        // Table MultiSelect stores multiple values (link+table behavior) [page:1]
        this.selected.zone = pluck(pref.zone, ["zone", "value", "name", "item", "link_name"]);
        this.selected.region = pluck(pref.region, ["region", "value", "name", "item", "link_name"]);
        this.selected.state = pluck(pref.state, ["state", "value", "name", "item", "link_name"]);
        this.selected.district = pluck(pref.district, ["district", "value", "name", "item", "link_name"]);
        this.selected.sol_id = pluck(pref.sol_id, ["sol_id", "value", "name", "item", "link_name"]);
        this.selected.product = pluck(pref.product, ["product", "value", "name", "item", "link_name"]);
        this.selected.source = pluck(pref.source, ["source", "value", "name", "item", "link_name"]);
      },

      clear_selected() {
        Object.keys(this.selected).forEach(k => (this.selected[k] = []));
      },

      toggle(group, value) {
        const arr = this.selected[group] || (this.selected[group] = []);
        const i = arr.indexOf(value);
        if (i >= 0) arr.splice(i, 1);
        else arr.push(value);
      },

      is_all_selected(group) {
        const all = this.options[group] || [];
        const sel = this.selected[group] || [];
        return all.length > 0 && sel.length === all.length;
      },

      toggle_all(group) {
        const all = (this.options[group] || []).map(o => o.value);
        this.selected[group] = this.is_all_selected(group) ? [] : all;
      },

      zone_label(o, idx) {
        // prefer "1..6" look; if label already numeric use it, else fallback to idx+1
        const m = String(o.label || o.value || "").match(/(\d+)/);
        return m ? m[1] : String(idx + 1);
      },

      region_label(o, idx) {
        const m = String(o.label || o.value || "").match(/(\d+)/);
        return m ? m[1] : String(idx + 1);
      },
    }).mount("#permission-config-root");
  });
};
