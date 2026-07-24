// sahayog/public/js/active_users_badge.js

(function () {
  // Prevent running for Guests
  if (typeof frappe === "undefined" || frappe.session.user === "Guest") return;

  // Inject Styles
  const style = document.createElement("style");
  style.innerHTML = `
    .active-users-count-badge {
      font-size: 10px;
      font-weight: 700;
      background-color: var(--green-500, #28a745);
      color: #fff;
      padding: 1px 5px;
      border-radius: 10px;
      position: absolute;
      top: 4px;
      right: -2px;
      line-height: 1;
      border: 1.5px solid var(--card-bg, #fff);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: transform 0.2s ease-in-out;
    }
    
    .active-users-pulse {
      display: inline-block;
      width: 6px;
      height: 6px;
      background-color: var(--green-500, #28a745);
      border-radius: 50%;
      position: absolute;
      bottom: 0px;
      right: -1px;
      box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
      animation: active-users-pulse-anim 1.8s infinite;
      border: 1px solid var(--card-bg, #fff);
    }
    
    @keyframes active-users-pulse-anim {
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
    
    .active-users-dropdown-menu {
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
      animation: active-users-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes active-users-fade-in {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    .active-users-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      margin-bottom: 12px;
    }
    
    .active-users-header-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-color, #1e293b);
    }
    
    .active-users-header-dot {
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
    
    .active-users-header-dot::before {
      content: "";
      display: inline-block;
      width: 6px;
      height: 6px;
      background-color: var(--green-500, #28a745);
      border-radius: 50%;
    }
    
    .active-users-body-list {
      max-height: 280px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--border-color, #cbd5e1) transparent;
    }
    
    .active-users-body-list::-webkit-scrollbar {
      width: 4px;
    }
    
    .active-users-body-list::-webkit-scrollbar-thumb {
      background-color: var(--border-color, #cbd5e1);
      border-radius: 4px;
    }
    
    .active-user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 10px;
      border-radius: 8px;
      transition: background-color 0.2s ease;
      margin-bottom: 4px;
    }
    
    .active-user-item:hover {
      background-color: var(--bg-color, #f8fafc);
      cursor: pointer;
    }
    
    .active-user-avatar {
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
    
    .active-user-avatar-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 8px;
      height: 8px;
      background-color: var(--green-500, #28a745);
      border: 1.5px solid var(--card-bg, #fff);
      border-radius: 50%;
    }
    
    .active-user-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    
    .active-user-name {
      font-weight: 500;
      font-size: 13px;
      color: var(--text-color, #1e293b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .active-user-email {
      font-size: 11px;
      color: var(--text-muted, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .active-user-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      color: var(--text-muted, #64748b);
      min-width: 60px;
    }
    
    .active-user-time {
      font-weight: 500;
    }
    
    .active-user-ip {
      opacity: 0.8;
      font-size: 9px;
      font-family: monospace;
    }
    
    .active-users-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 0;
      color: var(--text-muted, #64748b);
    }
  `;
  document.head.appendChild(style);

  // Helper: Get random HSL color based on string hash
  function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 60%, 45%)`;
  }

  // Helper: Get Initials
  function getInitials(name) {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length > 1 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }

  // Setup Navbar Badge
  function setupActiveUsersBadge() {
    // Wait until .navbar-nav exists and isn't already customized
    const checkInterval = setInterval(() => {
      const navbarNav = document.querySelector(".navbar-nav");
      if (navbarNav && !document.querySelector(".dropdown-active-users")) {
        clearInterval(checkInterval);
        injectBadge(navbarNav);
      }
    }, 100);

    // Timeout check after 10 seconds to prevent infinite polling if navbar doesn't exist
    setTimeout(() => clearInterval(checkInterval), 10000);
  }

  // Inject Badge into Navbar
  function injectBadge(navbarNav) {
    const badgeHTML = `
      <li class="nav-item dropdown dropdown-active-users dropdown-mobile" style="position: relative;">
        <button class="btn-reset nav-link active-users-icon text-muted" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" title="Active Users">
          <div style="position: relative; display: inline-block;">
            <svg class="es-icon icon-sm" style="stroke: currentColor; fill: none; vertical-align: middle;" viewBox="0 0 24 24" width="18" height="18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span class="active-users-pulse"></span>
          </div>
          <span class="active-users-count-badge" id="active-users-count-badge">0</span>
        </button>
        <div class="dropdown-menu active-users-dropdown-menu dropdown-menu-right" role="menu">
          <div class="active-users-header">
            <span class="active-users-header-title">Online Team Members</span>
            <span class="active-users-header-dot" id="active-users-header-dot">0 Online</span>
          </div>
          <div class="active-users-body-list" id="active-users-body-list">
            <div class="text-center text-muted py-3" style="font-size: 12px;">Loading active users...</div>
          </div>
        </div>
      </li>
    `;

    // Try to insert before notification dropdown or append
    const notificationsDropdown = navbarNav.querySelector(".dropdown-notifications");
    if (notificationsDropdown) {
      notificationsDropdown.insertAdjacentHTML("beforebegin", badgeHTML);
    } else {
      navbarNav.insertAdjacentHTML("beforeend", badgeHTML);
    }

    // Bind dropdown click event to refresh list immediately
    $(document).on("show.bs.dropdown", ".dropdown-active-users", function () {
      fetchActiveUsers(true);
    });

    // Run first load
    fetchActiveUsers(false);

    // Setup periodic polling every 45 seconds
    setInterval(() => {
      fetchActiveUsers(false);
    }, 45000);
  }

  // Fetch active users list
  function fetchActiveUsers(openDropdown = false) {
    frappe.call({
      method: "sahayog.api.custom_api.get_currently_logged_in_users",
      callback: function (r) {
        if (r.message && r.message.status === "success") {
          updateUI(r.message.total_logged_in_users, r.message.users);
        }
      },
      error: function () {
        console.error("Failed to fetch logged-in users.");
      }
    });
  }

  // Update UI Elements
  function updateUI(count, users) {
    const badge = document.getElementById("active-users-count-badge");
    const headerDot = document.getElementById("active-users-header-dot");
    const bodyList = document.getElementById("active-users-body-list");

    if (badge) badge.innerText = count;
    if (headerDot) headerDot.innerText = `${count} Online`;

    if (!bodyList) return;

    if (!users || users.length === 0) {
      bodyList.innerHTML = `
        <div class="active-users-empty-state">
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
        <div class="active-user-item" title="Last active at: ${user.lastupdate || 'N/A'}">
          <div class="active-user-avatar" style="background-color: ${avatarColor};">
            ${initials}
            <span class="active-user-avatar-indicator"></span>
          </div>
          <div class="active-user-info">
            <span class="active-user-name">${user.full_name}</span>
            <span class="active-user-email">${user.email}</span>
          </div>
          <div class="active-user-meta">
            <span class="active-user-time">${user.lastupdate || ""}</span>
            <span class="active-user-ip text-muted">${user.ipaddress || ""}</span>
          </div>
        </div>
      `;
    });

    bodyList.innerHTML = listHTML;
  }

  // Initialize
  $(document).ready(() => {
    setupActiveUsersBadge();
  });
})();
