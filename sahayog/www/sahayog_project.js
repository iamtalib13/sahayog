/**
 * Project Management SPA - Fixed Task URL Restore + Simple Loading + Always Show Progress + Always Select Project + Keep Task Highlight
 * Author: Enhanced by AI
 * Date: August 15, 2025
 */

"use strict";

/* ======================== CONSTANTS ======================== */
const CONSTANTS = {
  STORAGE_KEY: "pm_spa_data_v1",
  API_ENDPOINTS: {
    ALL_PROJECTS:
      "/api/method/sahayog.patches.fixtures.get_projects_and_tasks.get_all_projects",
    PROJECT_TASKS:
      "/api/method/sahayog.patches.fixtures.get_projects_and_tasks.get_all_tasks",
    TASK_DETAILS:
      "/api/method/sahayog.patches.fixtures.get_projects_and_tasks.get_specific_task",
  },
  VIEWS: {
    PROJECT: "project",
    TASK: "task",
  },
  DEBOUNCE_DELAY: 150,
};

const USERS = [
  { id: 1, name: "Rajesh Kumar", role: "Project Manager" },
  { id: 2, name: "Priya Sharma", role: "Site Engineer" },
  { id: 3, name: "Amit Patel", role: "Safety Officer" },
  { id: 4, name: "Sunita Singh", role: "Supervisor" },
  { id: 5, name: "Vikram Gupta", role: "Admin Staff" },
];

/* ======================== ENHANCED CACHING SYSTEM ======================== */
class CacheManager {
  constructor() {
    this.CACHE_VERSION = "1.0";
    this.CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
  }

  set(key, data) {
    const cacheData = {
      version: this.CACHE_VERSION,
      timestamp: Date.now(),
      data: data,
    };

    try {
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`✅ Cached: ${key}`);
      return true;
    } catch (error) {
      console.error("❌ Cache set error:", error);
      return false;
    }
  }

  get(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);

      if (cacheData.version !== this.CACHE_VERSION) {
        console.log(`🔄 Cache version mismatch for ${key}`);
        localStorage.removeItem(key);
        return null;
      }

      if (Date.now() - cacheData.timestamp > this.CACHE_EXPIRY) {
        console.log(`⏰ Cache expired for ${key}`);
        localStorage.removeItem(key);
        return null;
      }

      console.log(`✅ Cache hit: ${key}`);
      return cacheData.data;
    } catch (error) {
      console.error("❌ Cache get error:", error);
      localStorage.removeItem(key);
      return null;
    }
  }

  invalidate(key) {
    localStorage.removeItem(key);
    console.log(`🗑️ Cache cleared: ${key}`);
  }
}

/* ======================== STATE MANAGEMENT ======================== */
class StateManager {
  constructor() {
    this.state = {
      data: { projects: [] },
      currentView: CONSTANTS.VIEWS.PROJECT,
      selectedProjectName: null,
      selectedTaskName: null,
      loading: false,
      initialized: false,
      filters: {
        zone: "",
        state: "",
        status: "",
        search: "",
        taskSearch: "",
      },
    };

    this.listeners = new Set();
    this.isUpdatingFromURL = false;
    this.pendingURLState = this.parseURLState();

    window.addEventListener("popstate", this.handlePopState.bind(this));
  }

  parseURLState() {
    const params = new URLSearchParams(window.location.search);
    return {
      currentView: params.get("view") || CONSTANTS.VIEWS.PROJECT,
      selectedProjectName: params.get("project") || null,
      selectedTaskName: params.get("task") || null,
      filters: {
        zone: params.get("zone") || "",
        state: params.get("state") || "",
        status: params.get("status") || "",
        search: params.get("search") || "",
        taskSearch: params.get("taskSearch") || "",
      },
    };
  }

  applyPendingURLState() {
    if (this.pendingURLState && this.state.data.projects.length > 0) {
      console.log("🔄 Applying URL state:", this.pendingURLState);
      this.isUpdatingFromURL = true;
      this.setState(this.pendingURLState, false);

      setTimeout(() => {
        console.log("📡 Restoring UI from URL...");
        if (this.state.currentView === CONSTANTS.VIEWS.TASK) {
          UIManager.switchToTaskView();
        } else {
          UIManager.switchToProjectView();
        }

        if (this.state.selectedProjectName) {
          const project = this.state.data.projects.find(
            (p) => p.name === this.state.selectedProjectName
          );
          if (project) {
            console.log("📂 Restoring project:", project.name);
            UIManager.selectProject(project);

            if (this.state.selectedTaskName) {
              setTimeout(() => {
                console.log("📝 Restoring task:", this.state.selectedTaskName);

                let foundTask = null;
                for (const proj of this.state.data.projects) {
                  if (proj.tasks) {
                    foundTask = proj.tasks.find(
                      (t) => (t.name || t.id) === this.state.selectedTaskName
                    );
                    if (foundTask) break;
                  }
                }

                if (foundTask) {
                  UIManager.selectTask(foundTask);
                }

                if (this.state.currentView === CONSTANTS.VIEWS.PROJECT) {
                  UIManager.renderTasksPanel();
                } else {
                  UIManager.renderAllTasks();
                }
              }, 200);
            }
          }
        }

        this.isUpdatingFromURL = false;
      }, 100);

      this.pendingURLState = null;
    }
  }

  markAsInitialized() {
    this.setState({ initialized: true }, false);
    this.applyPendingURLState();

    // Always select first project if none selected
    if (
      !this.state.selectedProjectName &&
      this.state.data.projects.length > 0
    ) {
      this.state.selectedProjectName = this.state.data.projects[0].name;
    }

    this.updateURL();
  }

  updateURL(replaceState = true) {
    if (this.isUpdatingFromURL || !this.state.initialized) return;

    const params = new URLSearchParams();

    if (this.state.currentView !== CONSTANTS.VIEWS.PROJECT) {
      params.set("view", this.state.currentView);
    }

    if (this.state.selectedProjectName) {
      params.set("project", this.state.selectedProjectName);
    }

    if (this.state.selectedTaskName) {
      params.set("task", this.state.selectedTaskName);
    }

    Object.entries(this.state.filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const newURL = `${window.location.pathname}${
      params.toString() ? "?" + params.toString() : ""
    }`;

    if (replaceState) {
      window.history.replaceState(this.state, "", newURL);
    } else {
      window.history.pushState(this.state, "", newURL);
    }
  }

  handlePopState(event) {
    if (event.state) {
      this.isUpdatingFromURL = true;
      this.setState(event.state, false);
      this.isUpdatingFromURL = false;
    } else {
      const urlState = this.parseURLState();
      this.isUpdatingFromURL = true;
      this.setState(urlState, false);
      this.isUpdatingFromURL = false;
    }
  }

  setState(updates, updateURL = true) {
    const prevState = { ...this.state };

    if (updates.filters) {
      this.state.filters = { ...this.state.filters, ...updates.filters };
      delete updates.filters;
    }

    this.state = { ...this.state, ...updates };

    if (updateURL && !this.isUpdatingFromURL && this.state.initialized) {
      this.updateURL();
    }

    this.notifyListeners(prevState);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(prevState) {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state, prevState);
      } catch (error) {
        console.error("State listener error:", error);
      }
    });
  }

  get currentView() {
    return this.state.currentView;
  }

  get selectedProjectName() {
    return this.state.selectedProjectName;
  }

  get selectedTaskName() {
    return this.state.selectedTaskName;
  }

  get filters() {
    return this.state.filters;
  }

  get data() {
    return this.state.data;
  }

  get loading() {
    return this.state.loading;
  }

  get initialized() {
    return this.state.initialized;
  }
}

/* ======================== UTILITIES ======================== */
const Utils = {
  $(selector) {
    return document.querySelector(selector);
  },

  $$(selector) {
    return document.querySelectorAll(selector);
  },

  createElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.innerHTML) element.innerHTML = options.innerHTML;
    if (options.id) element.id = options.id;
    if (options.style) element.style.cssText = options.style;
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    return element;
  },

  formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch (error) {
      return dateStr;
    }
  },

  timeAgo(dateStr) {
    if (!dateStr) return "just now";

    try {
      const now = Date.now();
      const past = new Date(dateStr).getTime();
      const diffInSeconds = Math.floor((now - past) / 1000);

      const timeUnits = [
        { unit: "year", seconds: 31536000 },
        { unit: "month", seconds: 2592000 },
        { unit: "day", seconds: 86400 },
        { unit: "hour", seconds: 3600 },
        { unit: "minute", seconds: 60 },
      ];

      for (const { unit, seconds } of timeUnits) {
        const interval = Math.floor(diffInSeconds / seconds);
        if (interval >= 1) {
          return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
        }
      }

      return "just now";
    } catch (error) {
      return "just now";
    }
  },

  debounce(func, wait = CONSTANTS.DEBOUNCE_DELAY) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func, limit = 100) {
    let lastFunc;
    let lastRan;
    return function (...args) {
      const context = this;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  },

  batchDOMUpdates(callback) {
    requestAnimationFrame(() => {
      callback();
    });
  },
};

/* ======================== GLOBAL INSTANCES ======================== */
const cacheManager = new CacheManager();
const stateManager = new StateManager();

/* ======================== ERROR HANDLER ======================== */
const ErrorHandler = {
  showNotification(message, type = "info") {
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((n) => n.remove());

    const notification = Utils.createElement("div", {
      className: `notification ${type}`,
      innerHTML: `
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            `,
    });

    if (!document.querySelector("#notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--surface, #fff);
                    border: 1px solid var(--outline, #ccc);
                    border-radius: 8px;
                    padding: 12px 16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    max-width: 300px;
                    animation: slideIn 0.3s ease-out;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .notification.success { border-left: 4px solid #4caf50; }
                .notification.error { border-left: 4px solid #f44336; }
                .notification.warning { border-left: 4px solid #ff9800; }
                .notification.info { border-left: 4px solid #2196f3; }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                }
            `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = "slideOut 0.3s ease-in";
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 4000);

    notification
      .querySelector(".notification-close")
      .addEventListener("click", () => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      });
  },

  handleAPIError(error) {
    console.error("API Error:", error);
    if (error.message === "Request timeout") {
      this.showNotification(
        "Request timed out. Please check your connection.",
        "warning"
      );
    } else {
      this.showNotification(
        "Unable to connect to server. Please try again.",
        "error"
      );
    }
  },
};

/* ======================== API SERVICE ======================== */
const APIService = {
  async request(endpoint, options = {}) {
    try {
      stateManager.setState({ loading: true });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      ErrorHandler.handleAPIError(error);
      throw error;
    } finally {
      stateManager.setState({ loading: false });
    }
  },

  async getAllProjects() {
    try {
      const response = await this.request(CONSTANTS.API_ENDPOINTS.ALL_PROJECTS);
      return response.message || [];
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      return [];
    }
  },

  async getProjectTasks(projectName) {
    try {
      const response = await this.request(
        `${
          CONSTANTS.API_ENDPOINTS.PROJECT_TASKS
        }?project_name=${encodeURIComponent(projectName)}`
      );
      return response.message || [];
    } catch (error) {
      console.error("Failed to fetch tasks for project:", projectName, error);
      return [];
    }
  },

  async getTaskDetails(taskName) {
    try {
      const response = await this.request(
        `${CONSTANTS.API_ENDPOINTS.TASK_DETAILS}?name=${encodeURIComponent(
          taskName
        )}`
      );
      return response.message;
    } catch (error) {
      console.error("Failed to fetch task details:", taskName, error);
      return null;
    }
  },
};

/* ======================== DATA MANAGER ======================== */
const DataManager = {
  async loadData() {
    try {
      console.log("🚀 Loading data...");
      stateManager.setState({ loading: true });

      // Try cache first
      const cachedData = cacheManager.get(CONSTANTS.STORAGE_KEY);
      if (cachedData && cachedData.projects && cachedData.projects.length > 0) {
        console.log("📦 Using cached data");
        stateManager.setState({ data: cachedData }, false);
        UIManager.renderProjects();
        UIManager.renderProjectFilters();
      }

      // Fetch fresh data
      await this.fetchAllProjects();
      await this.fetchTasksForAllProjects();

      stateManager.markAsInitialized();
      console.log("✅ Data loading completed");
    } catch (error) {
      console.error("❌ Data loading failed:", error);
      ErrorHandler.showNotification(
        "Failed to load fresh data. Using cached version.",
        "warning"
      );
      stateManager.markAsInitialized();
    } finally {
      stateManager.setState({ loading: false });
    }
  },

  async fetchAllProjects() {
    try {
      console.log("📡 Fetching projects...");
      const projects = await APIService.getAllProjects();

      if (!projects || projects.length === 0) {
        console.warn("⚠️ No projects returned");
        return;
      }

      const data = {
        projects: projects.map((p, index) => ({
          id: index + 1,
          project_name: p.project_name || p.name || "Untitled Project",
          name: p.name || p.project_name || `project-${index + 1}`,
          zone: p.custom_zone || p.zone || "-",
          state: p.custom_region || p.state || "-",
          status: p.custom_branch_status || p.status || "Not Started",
          tasks: [],
        })),
      };

      stateManager.setState({ data }, false);
      this.saveData();
      console.log(`✅ Loaded ${data.projects.length} projects`);
    } catch (error) {
      console.error("❌ Error fetching projects:", error);
      throw error;
    }
  },

  async fetchTasksForAllProjects() {
    try {
      const projects = stateManager.data.projects;
      if (!projects || projects.length === 0) {
        console.log("⚠️ No projects for task fetching");
        return;
      }

      console.log(`📡 Fetching tasks for ${projects.length} projects...`);

      const taskPromises = projects.map(async (project) => {
        try {
          const tasks = await APIService.getProjectTasks(project.name);
          console.log(`📝 Fetched ${tasks.length} tasks for: ${project.name}`);

          const mappedTasks = tasks.map((task) => ({
            id: task.id || task.name || `task-${Date.now()}-${Math.random()}`,
            name: task.name || task.subject || `task-${Date.now()}`,
            subject: task.subject || task.title || "Untitled Task",
            title: task.title || task.subject || "Untitled Task",
            type: task.type || "general",
            status: task.status || "Open",
            exp_start_date: task.exp_start_date || "",
            exp_end_date: task.exp_end_date || "",
            assignedTo: this.mapAssignedUser(task.assignedTo),
            description: task.description || "",
            modified: task.modified || new Date().toISOString(),
            created: task.created || new Date().toISOString(),
            project: task.project || project.name,
            priority: task.priority || "Medium",
            data: task.data || {},
          }));

          return {
            projectName: project.name,
            tasks: mappedTasks,
            success: true,
          };
        } catch (error) {
          console.error(`❌ Task fetch failed for: ${project.name}`, error);
          return { projectName: project.name, tasks: [], success: false };
        }
      });

      const results = await Promise.allSettled(taskPromises);

      const updatedData = { ...stateManager.data };
      let totalTasks = 0;

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const { projectName, tasks } = result.value;
          const project = updatedData.projects.find(
            (p) => p.name === projectName
          );
          if (project) {
            project.tasks = tasks;
            totalTasks += tasks.length;
          }
        }
      });

      stateManager.setState({ data: updatedData }, false);
      this.saveData();
      console.log(`✅ Loaded ${totalTasks} total tasks`);
    } catch (error) {
      console.error("❌ Error fetching tasks:", error);
      throw error;
    }
  },

  saveData() {
    cacheManager.set(CONSTANTS.STORAGE_KEY, stateManager.data);
  },

  mapAssignedUser(apiAssignedTo) {
    if (!apiAssignedTo) return USERS[0].id;

    if (
      typeof apiAssignedTo === "number" &&
      USERS.find((u) => u.id === apiAssignedTo)
    ) {
      return apiAssignedTo;
    }

    const matchedUser = USERS.find(
      (u) =>
        u.name.toLowerCase().includes(String(apiAssignedTo).toLowerCase()) ||
        String(apiAssignedTo).toLowerCase().includes(u.name.toLowerCase())
    );

    return matchedUser ? matchedUser.id : USERS.id;
  },

  getUserById(userId) {
    return (
      USERS.find((u) => u.id === userId) || { name: "Unassigned", role: "" }
    );
  },

  getSelectedProject() {
    return stateManager.data.projects.find(
      (p) => p.name === stateManager.selectedProjectName
    );
  },

  getSelectedTask() {
    if (stateManager.currentView === CONSTANTS.VIEWS.TASK) {
      for (let project of stateManager.data.projects) {
        const task = project.tasks?.find(
          (t) => (t.name || t.id) === stateManager.selectedTaskName
        );
        if (task) return task;
      }
      return null;
    } else {
      const project = this.getSelectedProject();
      return project?.tasks?.find(
        (t) => (t.name || t.id) === stateManager.selectedTaskName
      );
    }
  },

  calculateProjectProgress(project) {
    if (!project.tasks?.length) return 0;
    const completedTasks = project.tasks.filter(
      (task) => task.status === "Completed" || task.status === "Complete"
    ).length;
    return Math.round((completedTasks / project.tasks.length) * 100);
  },

  getFilteredProjects() {
    const { filters } = stateManager;
    return stateManager.data.projects.filter((project) => {
      const matchesSearch =
        !filters.search ||
        (project.project_name || "")
          .toLowerCase()
          .includes(filters.search.toLowerCase());
      const matchesZone = !filters.zone || project.zone === filters.zone;
      const matchesState = !filters.state || project.state === filters.state;
      const matchesStatus =
        !filters.status || project.status === filters.status;

      return matchesSearch && matchesZone && matchesState && matchesStatus;
    });
  },
};

/* ======================== UI COMPONENTS ======================== */
const UIComponents = {
  createProjectCard(project, isSelected = false) {
    const progressPercentage = DataManager.calculateProjectProgress(project);
    const card = Utils.createElement("div", {
      className: `project-card ${isSelected ? "active" : ""}`,
      attributes: {
        "data-project-id": project.id,
        "data-project-name": project.name,
      },
    });

    card.innerHTML = `
            <div class="project-header">
                <div>
                    <div class="project-title">${project.project_name}</div>
                    <div class="project-state">${project.state}</div>
                </div>
                <div>
                    ${this.getStatusPill(project.status)}
                </div>
            </div>
            
            <div class="project-progress-section">
                <div class="project-progress-header">
                    <span class="project-progress-label">Progress</span>
                    <span class="project-progress-percentage">${progressPercentage}%</span>
                </div>
                <div class="project-progress-bar">
                    <div class="project-progress-fill" style="width: ${progressPercentage}%;"></div>
                </div>
            </div>
            
            <div class="tags">
                <div class="tag">${project.zone}</div>
                <div class="tag">${project.state}</div>
                <div class="tag-count">${project.tasks?.length || 0} tasks</div>
            </div>
        `;

    card.addEventListener("click", () => UIManager.selectProject(project));
    return card;
  },

  createTaskItem(task, index, project = null, isSelected = false) {
    const progressClass = this.getProgressClass(task.status);
    const taskItem = Utils.createElement("div", {
      className: `task-item ${progressClass} ${isSelected ? "active" : ""}`,
      attributes: {
        "data-task-id": task.id,
        "data-task-name": task.name,
      },
    });

    const badgeClass = this.getStatusClass(task.status);
    const assignedUser = DataManager.getUserById(task.assignedTo);

    if (project) {
      const startDate = task.exp_start_date
        ? Utils.formatDate(task.exp_start_date)
        : "No start date";
      const endDate = task.exp_end_date
        ? Utils.formatDate(task.exp_end_date)
        : "No due date";
      const modifiedPretty = Utils.timeAgo(task.modified);
      const modifiedExact = Utils.formatDate(task.modified);

      taskItem.innerHTML = `
                <div class="task-progress-circle ${progressClass}">
                    ${this.getProgressContent(task.status, index)}
                </div>
                <div class="task-content">
                    <div class="task-title">${task.subject || task.title}</div>
                    <div class="task-meta">
                        <div class="task-dates">
                            <span title="Expected Start Date">${startDate}</span> > 
                            <span title="Expected End Date">${endDate}</span>
                        </div>
                        <div class="task-assigned-to">Assigned to ${
                          assignedUser.name
                        }</div>
                    </div>
                </div>
                <div class="task-right">
                    <div class="badge ${badgeClass}">${task.status}</div>
                    <div class="task-updated" title="Last Modified: ${modifiedExact}">${modifiedPretty}</div>
                </div>
            `;
    } else {
      const endDate = task.exp_end_date
        ? Utils.formatDate(task.exp_end_date)
        : "No due date";
      taskItem.innerHTML = `
                <div class="task-progress-circle ${progressClass}">
                    ${this.getProgressContent(task.status, index)}
                </div>
                <div class="task-content">
                    <div class="task-title">${task.title || task.subject}</div>
                    <div class="task-meta">
                        <div class="task-end-date">${
                          task.project || "Unknown Project"
                        } • Due: ${endDate}</div>
                        <div class="task-assigned-to">Assigned to ${
                          assignedUser.name
                        }</div>
                    </div>
                </div>
                <div class="task-right">
                    <div class="badge ${badgeClass}">${task.status}</div>
                    <div class="task-updated">${Utils.timeAgo(
                      task.modified
                    )}</div>
                </div>
            `;
    }

    taskItem.addEventListener("click", () => UIManager.selectTask(task));
    return taskItem;
  },

  getStatusPill(status) {
    const statusMap = {
      "Under Development": "dev",
      Completed: "completed",
      Complete: "completed",
      "Not Started": "not-started",
      Open: "open",
    };
    const statusClass = statusMap[status] || "not-started";
    const displayText =
      status === "Under Development"
        ? "Under Dev"
        : status === "Completed" || status === "Complete"
        ? "Complete"
        : status;
    return `<span class="project-status-pill ${statusClass}">${displayText}</span>`;
  },

  getProgressClass(status) {
    if (!status) return "open";
    const s = status.toLowerCase();
    const statusMap = {
      open: "open",
      working: "working",
      "in progress": "working",
      "pending review": "pending",
      overdue: "overdue",
      template: "template",
      completed: "completed",
      complete: "completed",
      cancelled: "cancelled",
    };
    return statusMap[s] || "open";
  },

  getProgressContent(status, index) {
    if (!status) return (index + 1).toString();

    const contentMap = {
      completed: "✓",
      complete: "✓",
      overdue: "!",
      cancelled: "✕",
      working: "⏳",
      "in progress": "⏳",
      "pending review": "…",
      template: "T",
      open: (index + 1).toString(),
    };

    return contentMap[status.toLowerCase()] || (index + 1).toString();
  },

  getStatusClass(status) {
    if (!status) return "open";
    const s = status.toLowerCase();
    const statusMap = {
      open: "open",
      working: "working",
      "in progress": "working",
      "pending review": "pending",
      overdue: "overdue",
      template: "template",
      completed: "completed",
      complete: "completed",
      cancelled: "cancelled",
    };
    return statusMap[s] || "open";
  },
};

/* ======================== UI MANAGER ======================== */
const UIManager = {
  init() {
    stateManager.subscribe(this.onStateChange.bind(this));
  },

  onStateChange(newState, prevState) {
    if (!newState.initialized) return;

    Utils.batchDOMUpdates(() => {
      if (newState.currentView !== prevState.currentView) {
        this.updateViewUI();
      }

      if (
        newState.data !== prevState.data ||
        JSON.stringify(newState.filters) !== JSON.stringify(prevState.filters)
      ) {
        this.renderProjects();
        this.renderProjectFilters();

        if (newState.currentView === CONSTANTS.VIEWS.TASK) {
          this.renderAllTasks();
          this.populateTaskProjectFilter();
        }
      }

      if (newState.selectedProjectName !== prevState.selectedProjectName) {
        this.updateSelectedProject();
      }

      // FIXED: Re-render task lists when task selection changes
      if (newState.selectedTaskName !== prevState.selectedTaskName) {
        this.updateSelectedTask();
        // Always re-render to show highlighting
        if (newState.currentView === CONSTANTS.VIEWS.PROJECT) {
          this.renderTasksPanel();
        } else {
          this.renderAllTasks();
        }
      }

      this.syncFormInputsWithState();
    });
  },

  syncFormInputsWithState() {
    const inputs = [
      { id: "#projectSearch", value: stateManager.filters.search },
      { id: "#taskSearch", value: stateManager.filters.taskSearch },
      { id: "#projectFilterZone", value: stateManager.filters.zone },
      { id: "#projectFilterState", value: stateManager.filters.state },
      { id: "#projectFilterStatus", value: stateManager.filters.status },
    ];

    inputs.forEach(({ id, value }) => {
      const element = Utils.$(id);
      if (element && element.value !== value) {
        element.value = value;
      }
    });
  },

  updateViewUI() {
    const workspace = Utils.$("#workspace");
    const projectBtn = Utils.$("#projectViewBtn");
    const taskBtn = Utils.$("#taskViewBtn");
    const taskSearchRow = Utils.$("#taskSearchRow");

    if (stateManager.currentView === CONSTANTS.VIEWS.PROJECT) {
      workspace.className = "workspace project-view";
      projectBtn.classList.add("active");
      taskBtn.classList.remove("active");
      taskSearchRow.style.display = "none";
    } else {
      workspace.className = "workspace task-view";
      projectBtn.classList.remove("active");
      taskBtn.classList.add("active");
      taskSearchRow.style.display = "flex";
    }

    this.updateHeader();
  },

  updateHeader() {
    const header = Utils.$("#tasksHeader");
    const progressSummary = Utils.$("#progressSummary");
    let project = DataManager.getSelectedProject();

    if (!project && stateManager.data.projects.length > 0) {
      project = stateManager.data.projects[0];
      stateManager.setState({ selectedProjectName: project.name }, false);
    }

    if (stateManager.currentView === CONSTANTS.VIEWS.PROJECT) {
      if (project) {
        header.textContent = `${project.project_name || project.name} - Tasks`;
        progressSummary.style.display = "block";
      } else {
        header.textContent = "No projects available";
        progressSummary.style.display = "none";
      }
    } else {
      header.textContent = "All Tasks";
      progressSummary.style.display = "none";
    }
  },

  switchToProjectView() {
    stateManager.setState({ currentView: CONSTANTS.VIEWS.PROJECT });
    this.renderTasksPanel();
  },

  switchToTaskView() {
    stateManager.setState({ currentView: CONSTANTS.VIEWS.TASK });
    this.renderAllTasks();
    this.populateTaskProjectFilter();
  },

  async selectProject(project) {
    stateManager.setState({
      selectedProjectName: project.name,
      selectedTaskName: null,
    });

    if (project.tasks && project.tasks.length > 0) {
      this.renderTasksPanel(project, project.tasks);
    } else {
      try {
        const tasks = await APIService.getProjectTasks(project.name);
        const mappedTasks = tasks.map((task) => ({
          id: task.id || task.name || `task-${Date.now()}-${Math.random()}`,
          name: task.name || task.subject || `task-${Date.now()}`,
          subject: task.subject || task.title || "Untitled Task",
          title: task.title || task.subject || "Untitled Task",
          type: task.type || "general",
          status: task.status || "Open",
          exp_start_date: task.exp_start_date || "",
          exp_end_date: task.exp_end_date || "",
          assignedTo: DataManager.mapAssignedUser(task.assignedTo),
          description: task.description || "",
          modified: task.modified || new Date().toISOString(),
          created: task.created || new Date().toISOString(),
          project: task.project || project.name,
          priority: task.priority || "Medium",
          data: task.data || {},
        }));

        const updatedData = { ...stateManager.data };
        const targetProject = updatedData.projects.find(
          (p) => p.name === project.name
        );
        if (targetProject) {
          targetProject.tasks = mappedTasks;
          stateManager.setState({ data: updatedData });
          DataManager.saveData();
        }

        this.renderTasksPanel(project, mappedTasks);
      } catch (error) {
        console.error("Error fetching tasks for selected project:", error);
        this.renderTasksPanel(project, []);
      }
    }
  },

  updateSelectedProject() {
    this.renderProjects();
    if (stateManager.currentView === CONSTANTS.VIEWS.PROJECT) {
      this.renderTasksPanel();
    }
    this.clearForm();
  },

  async selectTask(task) {
    stateManager.setState({ selectedTaskName: task.name || task.id });
  },

  async updateSelectedTask() {
    if (!stateManager.selectedTaskName) {
      this.clearForm();
      return;
    }

    try {
      const taskDetails = await APIService.getTaskDetails(
        stateManager.selectedTaskName
      );

      if (!taskDetails) {
        const localTask = DataManager.getSelectedTask();
        if (localTask) {
          const project = stateManager.data.projects.find(
            (p) =>
              p.tasks &&
              p.tasks.some(
                (t) => (t.name || t.id) === stateManager.selectedTaskName
              )
          );

          if (project) {
            this.renderTaskForm(localTask, project);
            Utils.$("#lastUpdated").textContent =
              "Last updated: " + Utils.timeAgo(localTask.modified);
            Utils.$("#taskFormContainer").style.display = "block";
            Utils.$("#emptyForm").style.display = "none";
          }
        }

        if (stateManager.currentView === CONSTANTS.VIEWS.PROJECT) {
          this.renderTasksPanel();
        } else {
          this.renderAllTasks();
        }

        return;
      }

      const project = stateManager.data.projects.find(
        (p) => p.name === taskDetails.project
      );

      if (!project) {
        console.warn("No project found for task:", taskDetails.project);
        return;
      }

      this.renderTaskForm(taskDetails, project);

      Utils.$("#lastUpdated").textContent =
        "Last updated: " + Utils.timeAgo(taskDetails.modified);
      Utils.$("#taskFormContainer").style.display = "block";
      Utils.$("#emptyForm").style.display = "none";

      if (stateManager.currentView === CONSTANTS.VIEWS.PROJECT) {
        this.renderTasksPanel();
      } else {
        this.renderAllTasks();
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
      ErrorHandler.showNotification("Failed to load task details", "error");
    }
  },

  renderProjects() {
    const list = Utils.$("#projectList");
    if (!list) return;

    const filteredProjects = DataManager.getFilteredProjects();
    list.innerHTML = "";

    if (filteredProjects.length === 0) {
      list.innerHTML = '<div class="empty">No projects found.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    filteredProjects.forEach((project) => {
      const isSelected = project.name === stateManager.selectedProjectName;
      const card = UIComponents.createProjectCard(project, isSelected);
      fragment.appendChild(card);
    });

    list.appendChild(fragment);
  },

  renderTasksPanel(project = DataManager.getSelectedProject(), tasks = null) {
    const taskList = Utils.$("#taskList");
    const progressSummaryText = Utils.$("#progressSummaryText");
    const progressSummaryFill = Utils.$("#progressSummaryFill");

    if (!taskList) return;

    if (!project) {
      taskList.innerHTML =
        '<div class="empty">Select a project to view tasks</div>';
      return;
    }

    let projectTasks = tasks || project.tasks || [];
    projectTasks = projectTasks.sort((a, b) => {
      const nameA = (a.name || a.subject || "").toLowerCase();
      const nameB = (b.name || b.subject || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Update progress
    const completedTasks = projectTasks.filter(
      (t) => t.status === "Completed" || t.status === "Complete"
    ).length;
    const totalTasks = projectTasks.length;
    const progressPercent =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    if (progressSummaryText) {
      progressSummaryText.textContent = `${completedTasks} of ${totalTasks} tasks completed (${Math.round(
        progressPercent
      )}%)`;
    }
    if (progressSummaryFill) {
      progressSummaryFill.style.width = `${progressPercent}%`;
    }

    taskList.innerHTML = "";

    if (projectTasks.length === 0) {
      taskList.innerHTML =
        '<div class="empty">No tasks available for this project.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    projectTasks.forEach((task, index) => {
      const isSelected =
        (task.name || task.id) === stateManager.selectedTaskName;
      const taskItem = UIComponents.createTaskItem(
        task,
        index,
        project,
        isSelected
      );
      fragment.appendChild(taskItem);
    });

    taskList.appendChild(fragment);
  },

  renderAllTasks() {
    const taskList = Utils.$("#taskList");
    if (!taskList) return;

    const taskSearch = stateManager.filters.taskSearch;
    const projectFilter = Utils.$("#taskProjectFilter")?.value || "";

    let allTasks = [];

    stateManager.data.projects.forEach((project) => {
      if (project.tasks) {
        project.tasks.forEach((task) => {
          allTasks.push({
            ...task,
            projectId: project.id,
            projectName: project.name,
          });
        });
      }
    });

    const filteredTasks = allTasks
      .filter(
        (task) =>
          !taskSearch ||
          (task.title || "").toLowerCase().includes(taskSearch.toLowerCase()) ||
          (task.subject || "")
            .toLowerCase()
            .includes(taskSearch.toLowerCase()) ||
          (task.projectName || "")
            .toLowerCase()
            .includes(taskSearch.toLowerCase())
      )
      .filter(
        (task) => !projectFilter || task.projectId.toString() === projectFilter
      );

    taskList.innerHTML = "";

    if (filteredTasks.length === 0) {
      taskList.innerHTML = '<div class="empty">No tasks found.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    filteredTasks.forEach((task, index) => {
      const isSelected =
        (task.name || task.id) === stateManager.selectedTaskName;
      const taskItem = UIComponents.createTaskItem(
        task,
        index,
        null,
        isSelected
      );
      fragment.appendChild(taskItem);
    });

    taskList.appendChild(fragment);
  },

  renderProjectFilters() {
    const projects = stateManager.data.projects;
    if (!projects || projects.length === 0) return;

    const zones = [
      ...new Set(projects.map((p) => p.zone).filter(Boolean)),
    ].sort();
    const states = [
      ...new Set(projects.map((p) => p.state).filter(Boolean)),
    ].sort();

    const zoneFilter = Utils.$("#projectFilterZone");
    const stateFilter = Utils.$("#projectFilterState");

    if (zoneFilter) {
      zoneFilter.innerHTML = '<option value="">All Zones</option>';
      zones.forEach((zone) => {
        const option = Utils.createElement("option", { innerHTML: zone });
        option.value = zone;
        zoneFilter.appendChild(option);
      });
    }

    if (stateFilter) {
      stateFilter.innerHTML = '<option value="">All States</option>';
      states.forEach((state) => {
        const option = Utils.createElement("option", { innerHTML: state });
        option.value = state;
        stateFilter.appendChild(option);
      });
    }
  },

  populateTaskProjectFilter() {
    const filter = Utils.$("#taskProjectFilter");
    if (!filter) return;

    filter.innerHTML = '<option value="">All Projects</option>';

    stateManager.data.projects.forEach((project) => {
      const option = Utils.createElement("option", { innerHTML: project.name });
      option.value = project.id;
      filter.appendChild(option);
    });
  },

  showFilterModal() {
    Utils.$("#blurOverlay")?.classList.add("active");
    Utils.$("#filterModal")?.classList.add("active");
  },

  hideFilterModal() {
    Utils.$("#blurOverlay")?.classList.remove("active");
    Utils.$("#filterModal")?.classList.remove("active");
  },

  renderTaskForm(task, project) {
    const container = Utils.$("#taskFormContainer");
    if (!container) return;

    container.innerHTML = `
            <div class="task-form-content" style="padding: 20px;">
                <h2 style="margin-bottom: 20px; color: var(--on-surface);">
                    ${task.subject || task.title || "Untitled Task"}
                </h2>
                <div class="form-field-group">
                    <label class="form-field-label">Project</label>
                    <input type="text" class="form-field-input" value="${
                      project.name
                    }" readonly />
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div class="form-field-group">
                        <label class="form-field-label">Start Date</label>
                        <input type="date" id="taskStartDate" class="form-field-input" value="${
                          task.exp_start_date || ""
                        }" />
                    </div>
                    <div class="form-field-group">
                        <label class="form-field-label">End Date</label>
                        <input type="date" id="taskEndDate" class="form-field-input" value="${
                          task.exp_end_date || ""
                        }" />
                    </div>
                </div>
                <div class="form-field-group" style="margin-bottom: 16px;">
                    <label class="form-field-label">Status</label>
                    <select id="taskStatus" class="form-field-input">
                        <option ${
                          task.status === "Open" ? "selected" : ""
                        }>Open</option>
                        <option ${
                          task.status === "Working" ? "selected" : ""
                        }>Working</option>
                        <option ${
                          task.status === "Completed" ? "selected" : ""
                        }>Completed</option>
                        <option ${
                          task.status === "Cancelled" ? "selected" : ""
                        }>Cancelled</option>
                    </select>
                </div>
                <div class="form-field-group">
                    <label class="form-field-label">Notes</label>
                    <textarea id="taskNotes" class="form-field-input" rows="4" placeholder="Add task notes...">${
                      task.description || ""
                    }</textarea>
                </div>
            </div>
        `;
  },

  clearForm() {
    const project = DataManager.getSelectedProject();
    const emptyForm = Utils.$("#emptyForm");
    const taskFormContainer = Utils.$("#taskFormContainer");
    const lastUpdated = Utils.$("#lastUpdated");

    if (!emptyForm || !taskFormContainer) return;

    if (stateManager.currentView === CONSTANTS.VIEWS.PROJECT && !project) {
      emptyForm.style.display = "block";
      taskFormContainer.style.display = "none";
    } else if (
      stateManager.currentView === CONSTANTS.VIEWS.TASK &&
      !stateManager.selectedTaskName
    ) {
      emptyForm.style.display = "block";
      taskFormContainer.style.display = "none";
    } else {
      emptyForm.style.display = "none";
    }

    if (lastUpdated) {
      lastUpdated.textContent = "";
    }
  },
};

/* ======================== EVENT HANDLERS ======================== */
const EventHandlers = {
  init() {
    Utils.$("#projectViewBtn")?.addEventListener(
      "click",
      UIManager.switchToProjectView.bind(UIManager)
    );
    Utils.$("#taskViewBtn")?.addEventListener(
      "click",
      UIManager.switchToTaskView.bind(UIManager)
    );

    Utils.$("#projectSearch")?.addEventListener(
      "input",
      Utils.debounce((e) => {
        stateManager.setState({
          filters: { search: e.target.value.trim().toLowerCase() },
        });
      }, 200)
    );

    Utils.$("#taskSearch")?.addEventListener(
      "input",
      Utils.debounce((e) => {
        stateManager.setState({
          filters: { taskSearch: e.target.value.trim().toLowerCase() },
        });
      }, 200)
    );

    Utils.$("#taskProjectFilter")?.addEventListener(
      "change",
      UIManager.renderAllTasks.bind(UIManager)
    );
    Utils.$("#filterBtn")?.addEventListener(
      "click",
      UIManager.showFilterModal.bind(UIManager)
    );
    Utils.$("#closeFilterModal")?.addEventListener(
      "click",
      UIManager.hideFilterModal.bind(UIManager)
    );
    Utils.$("#blurOverlay")?.addEventListener(
      "click",
      UIManager.hideFilterModal.bind(UIManager)
    );

    Utils.$("#applyFilters")?.addEventListener("click", () => {
      const zoneValue = Utils.$("#projectFilterZone")?.value || "";
      const stateValue = Utils.$("#projectFilterState")?.value || "";
      const statusValue = Utils.$("#projectFilterStatus")?.value || "";

      stateManager.setState({
        filters: {
          zone: zoneValue,
          state: stateValue,
          status: statusValue,
        },
      });
      UIManager.hideFilterModal();
    });

    Utils.$("#clearFilters")?.addEventListener("click", () => {
      stateManager.setState({
        filters: {
          zone: "",
          state: "",
          status: "",
          search: "",
          taskSearch: "",
        },
      });
    });

    Utils.$("#saveTask")?.addEventListener("click", this.saveTask.bind(this));

    Utils.$("#themeToggle")?.addEventListener(
      "click",
      this.toggleTheme.bind(this)
    );
  },

  saveTask() {
    if (!stateManager.selectedTaskName) {
      ErrorHandler.showNotification("Select a task first", "warning");
      return;
    }

    const task = DataManager.getSelectedTask();
    if (!task) {
      ErrorHandler.showNotification("Task not found", "error");
      return;
    }

    const startDate = Utils.$("#taskStartDate");
    const endDate = Utils.$("#taskEndDate");
    const status = Utils.$("#taskStatus");
    const notes = Utils.$("#taskNotes");

    if (startDate) task.exp_start_date = startDate.value;
    if (endDate) task.exp_end_date = endDate.value;
    if (status) task.status = status.value;
    if (notes) task.description = notes.value;

    task.modified = new Date().toISOString();

    const data = { ...stateManager.data };
    stateManager.setState({ data });

    DataManager.saveData();

    const lastUpdated = Utils.$("#lastUpdated");
    if (lastUpdated) {
      lastUpdated.textContent = "Last updated: " + Utils.timeAgo(task.modified);
    }

    ErrorHandler.showNotification("Task saved successfully", "success");
  },

  toggleTheme() {
    const root = document.documentElement;
    if (root.getAttribute("data-theme") === "dark") {
      root.removeAttribute("data-theme");
      cacheManager.set("theme", "light");
    } else {
      root.setAttribute("data-theme", "dark");
      cacheManager.set("theme", "dark");
    }
  },
};

/* ======================== APPLICATION INITIALIZATION ======================== */
const App = {
  async init() {
    try {
      console.log("🚀 Starting Project Management SPA...");

      this.showSimpleLoader();

      const cachedTheme = cacheManager.get("theme");
      if (cachedTheme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      }

      UIManager.init();
      EventHandlers.init();

      await DataManager.loadData();

      this.hideSimpleLoader();

      console.log("✅ Application ready");
    } catch (error) {
      console.error("❌ Init failed:", error);
      ErrorHandler.showNotification(
        "Application failed to initialize. Please refresh.",
        "error"
      );
      this.hideSimpleLoader();
    }
  },

  showSimpleLoader() {
    if (Utils.$("#app-loader")) return;

    const loader = Utils.createElement("div", {
      id: "app-loader",
      style: `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(8px);
      `,
      innerHTML: `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <div style="
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #006767;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <div style="font-family: Arial; color: #006767; font-weight: 500; font-size: 16px;">
            Loading...
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `,
    });

    document.body.appendChild(loader);
  },

  hideSimpleLoader() {
    const loader = Utils.$("#app-loader");
    if (loader) {
      loader.style.opacity = "0";
      loader.style.transition = "opacity 0.3s ease-out";
      setTimeout(() => loader.remove(), 300);
    }
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", App.init.bind(App));
} else {
  App.init();
}

window.ProjectManagerApp = {
  App,
  DataManager,
  UIManager,
  Utils,
  CONSTANTS,
  stateManager,
  cacheManager,
};
