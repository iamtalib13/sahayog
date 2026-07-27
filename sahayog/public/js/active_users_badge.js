// sahayog/public/js/active_users_badge.js

(function () {
  // Prevent running for Guests
  if (typeof frappe === "undefined" || frappe.session.user === "Guest") return;

  // Inject Isolated Styles with 'sahayog-au-' prefix
  const style = document.createElement("style");
  style.innerHTML = `
    .sahayog-au-svg-icon {
      stroke: currentColor !important;
      fill: none !important;
      stroke-width: 2.2px;
      stroke-linecap: round;
      stroke-linejoin: round;
      width: 18px;
      height: 18px;
      display: inline-block;
      vertical-align: middle;
    }

    .sahayog-au-count-badge {
      font-size: 9px;
      font-weight: 700;
      background-color: var(--green-500, #28a745);
      color: #fff;
      padding: 1px 4px;
      border-radius: 10px;
      position: absolute;
      top: 6px;
      right: 4px;
      line-height: 1;
      border: 1.5px solid var(--card-bg, #fff);
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: transform 0.2s ease-in-out;
    }
    
    .sahayog-au-pulse {
      display: inline-block;
      width: 6px;
      height: 6px;
      background-color: var(--green-500, #28a745);
      border-radius: 50%;
      position: absolute;
      bottom: 0px;
      right: -1px;
      box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
      animation: sahayog-au-pulse-anim 1.8s infinite;
      border: 1px solid var(--card-bg, #fff);
    }
    
    @keyframes sahayog-au-pulse-anim {
      0% {
        box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
      }
      70% {
        box-shadow: 0 0 0 4px rgba(40, 167, 69, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
      }
    }
    
    .sahayog-au-dropdown-menu {
      min-width: 320px;
      max-width: 360px;
      padding: 16px;
      border-radius: 12px;
      box-shadow: var(--shadow-lg, 0 10px 30px -10px rgba(0, 0, 0, 0.15));
      border: 1px solid var(--border-color, #e2e8f0);
      background-color: var(--card-bg, #fff);
      margin-top: 8px;
      backdrop-filter: blur(8px);
      background-color: rgba(var(--card-bg-rgb, 255, 255, 255), 0.95);
      transform-origin: top right;
      animation: sahayog-au-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes sahayog-au-fade-in {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    .sahayog-au-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      margin-bottom: 12px;
    }
    
    .sahayog-au-header-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-color, #1e293b);
    }
    
    .sahayog-au-header-dot {
      font-size: 11px;
      font-weight: 600;
      color: var(--green-600, #166534);
      background-color: var(--green-50, #f0fdf4);
      padding: 2px 8px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .sahayog-au-header-dot::before {
      content: "";
      display: inline-block;
      width: 6px;
      height: 6px;
      background-color: var(--green-500, #28a745);
      border-radius: 50%;
    }

    .sahayog-au-cpu-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      transition: all 0.3s ease;
    }
    
    .sahayog-au-cpu-badge.low {
      color: var(--green-600, #166534);
      background-color: var(--green-50, #f0fdf4);
    }
    
    .sahayog-au-cpu-badge.medium {
      color: var(--orange-600, #9a3412);
      background-color: var(--orange-50, #fff7ed);
    }
    
    .sahayog-au-cpu-badge.high {
      color: var(--red-600, #991b1b);
      background-color: var(--red-50, #fef2f2);
    }
    
    .sahayog-au-body-list {
      max-height: 280px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--border-color, #cbd5e1) transparent;
    }
    
    .sahayog-au-body-list::-webkit-scrollbar {
      width: 4px;
    }
    
    .sahayog-au-body-list::-webkit-scrollbar-thumb {
      background-color: var(--border-color, #cbd5e1);
      border-radius: 4px;
    }
    
    .sahayog-au-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 10px;
      border-radius: 8px;
      transition: background-color 0.2s ease;
      margin-bottom: 4px;
    }
    
    .sahayog-au-item:hover {
      background-color: var(--bg-color, #f8fafc);
      cursor: pointer;
    }
    
    .sahayog-au-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: var(--primary-color, #4f46e5);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      position: relative;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    
    .sahayog-au-avatar-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 8px;
      height: 8px;
      background-color: var(--green-500, #28a745);
      border: 1.5px solid var(--card-bg, #fff);
      border-radius: 50%;
    }
    
    .sahayog-au-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    
    .sahayog-au-name {
      font-weight: 500;
      font-size: 13px;
      color: var(--text-color, #1e293b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .sahayog-au-email {
      font-size: 11px;
      color: var(--text-muted, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .sahayog-au-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      color: var(--text-muted, #64748b);
      min-width: 60px;
    }
    
    .sahayog-au-time {
      font-weight: 500;
    }
    
    .sahayog-au-ip {
      opacity: 0.8;
      font-size: 9px;
      font-family: monospace;
    }
    
    .sahayog-au-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 0;
      color: var(--text-muted, #64748b);
    }
  `;
  document.head.appendChild(style);

  // Helper: Get avatar background color using HSL string hashing
  function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash % 360)}, 60%, 45%)`;
  }

  // Helper: Get Initials from full name
  function getInitials(name) {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length > 1 && parts[0] && parts[1]
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name[0].toUpperCase();
  }

  // Setup Navbar Badge
  function setupActiveUsersBadge() {
    const checkInterval = setInterval(() => {
      const navbarNav = document.querySelector(".navbar-collapse .navbar-nav");
      if (navbarNav && !document.querySelector(".dropdown-active-users")) {
        clearInterval(checkInterval);
        injectBadge(navbarNav);
      }
    }, 100);

    setTimeout(() => clearInterval(checkInterval), 10000);
  }

  // Inject Badge and Dropdown into Navbar
  function injectBadge(navbarNav) {
    const badgeHTML = `
      <li class="nav-item dropdown dropdown-active-users dropdown-mobile" style="position: relative;">
        <button class="btn-reset nav-link active-users-icon text-muted" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" title="Active Users" style="position: relative; display: flex; align-items: center; justify-content: center; height: 40px; width: 40px; padding: 0;">
          <svg class="sahayog-au-svg-icon" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span class="sahayog-au-pulse"></span>
          <span class="sahayog-au-count-badge" id="active-users-count-badge" style="display: none;">0</span>
        </button>
        <div class="dropdown-menu sahayog-au-dropdown-menu dropdown-menu-right" role="menu">
          <div class="sahayog-au-header">
            <span class="sahayog-au-header-title">Online Users</span>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span class="sahayog-au-header-dot" id="active-users-header-dot">0 Online</span>
              <span class="sahayog-au-cpu-badge low" id="server-status-cpu-badge">CPU: 0%</span>
            </div>
          </div>
          <div class="sahayog-au-body-list" id="active-users-body-list">
            <div class="text-center text-muted py-3" style="font-size: 12px;">Loading active users...</div>
          </div>
        </div>
      </li>
    `;

    const notificationsDropdown = navbarNav.querySelector(".dropdown-notifications");
    if (notificationsDropdown) {
      notificationsDropdown.insertAdjacentHTML("afterend", badgeHTML);
    } else {
      navbarNav.insertAdjacentHTML("beforeend", badgeHTML);
    }

    $(document).on("show.bs.dropdown", ".dropdown-active-users", () => fetchActiveUsers());
  }

  // Fetch active users list and CPU usage
  function fetchActiveUsers() {
    frappe.call({
      method: "sahayog.api.custom_api.get_currently_logged_in_users",
      callback: (r) => {
        if (r.message && r.message.status === "success") {
          updateUI(
            r.message.total_logged_in_users,
            r.message.users,
            r.message.has_cxo_access,
            r.message.cpu_usage
          );
        }
      },
      error: () => console.error("Failed to fetch logged-in users.")
    });
  }

  // Update UI Elements with scoped updates
  function updateUI(count, users, hasCxoAccess, cpuUsage = 0) {
    const badge = document.getElementById("active-users-count-badge");
    const headerDot = document.getElementById("active-users-header-dot");
    const bodyList = document.getElementById("active-users-body-list");
    const cpuBadge = document.getElementById("server-status-cpu-badge");

    if (badge) {
      badge.innerText = count;
      badge.style.display = "inline-block";
    }
    if (headerDot) headerDot.innerText = `${count} Online`;

    // Update CPU Badge as rounded integer
    if (cpuBadge) {
      const roundedCpu = Math.round(cpuUsage);
      cpuBadge.innerText = `CPU: ${roundedCpu}%`;
      cpuBadge.className = "sahayog-au-cpu-badge"; // Reset classes

      if (roundedCpu < 60) {
        cpuBadge.classList.add("low");
      } else if (roundedCpu < 85) {
        cpuBadge.classList.add("medium");
      } else {
        cpuBadge.classList.add("high");
      }
    }

    if (!bodyList) return;

    // Restricted access handling
    if (!hasCxoAccess) {
      bodyList.innerHTML = `
        <div class="sahayog-au-empty-state" style="padding: 24px 16px; text-align: center;">
          <svg class="es-icon icon-md mb-2" style="width: 24px; height: 24px; stroke: var(--text-muted, #64748b); fill: none;" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <div style="font-size: 12px; font-weight: 600; color: var(--text-color, #1e293b);">Access Restricted</div>
          <div style="font-size: 10.5px; color: var(--text-muted, #64748b); margin-top: 4px; line-height: 1.4;">Only CXO level users can view active member details.</div>
        </div>
      `;
      return;
    }

    if (!users || users.length === 0) {
      bodyList.innerHTML = `
        <div class="sahayog-au-empty-state">
          <svg class="es-icon icon-md text-muted mb-2" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div style="font-size: 12px;">No active sessions found</div>
        </div>
      `;
      return;
    }

    let listHTML = "";
    users.forEach((user) => {
      const initials = getInitials(user.full_name);
      const avatarColor = getAvatarColor(user.email);
      listHTML += `
        <div class="sahayog-au-item" title="Last active at: ${user.lastupdate || 'N/A'}">
          <div class="sahayog-au-avatar" style="background-color: ${avatarColor};">
            ${initials}
            <span class="sahayog-au-avatar-indicator"></span>
          </div>
          <div class="sahayog-au-info">
            <span class="sahayog-au-name">${user.full_name}</span>
            <span class="sahayog-au-email">${user.email}</span>
          </div>
          <div class="sahayog-au-meta">
            <span class="sahayog-au-time">${user.lastupdate || ""}</span>
            <span class="sahayog-au-ip text-muted">${user.ipaddress || ""}</span>
          </div>
        </div>
      `;
    });

    bodyList.innerHTML = listHTML;
  }

  // Initialize
  $(document).ready(() => setupActiveUsersBadge());
})();
