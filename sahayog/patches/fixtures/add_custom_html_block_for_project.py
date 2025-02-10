import frappe


def execute():
    # Insert a new Custom HTML Block document named 'Sahayog Project'
    html_content = """
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sahayog Project</title>
</head>
<body>
  <!-- Header Section -->
  <div class="header" style="display: flex; flex-direction: row;justify-content:space-between">
      <div style="font-size:25px;width:61%">
           Hi, <span class="emp_name"></span><br>
          <span>Welcome to the Sahayog Project</span>
      </div>
      <div>
          <img  style="float:right;width:65%;" src="/assets/sahayog/images/sahayoglogo.svg">
      </div>
  </div>

  <div class="container"  style="display: flex; flex-direction: row;">

  
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="sidebar-fixed">
            <span style="font-size:20px;">#Projects</span>
<button class="createPRbtn" onclick="frappe.new_doc('Project')" 
        style="float:right; border-radius: 5px; color: #009A1E; border-color: #009A1E; border: 1px solid; background-color: transparent;">
    + Create Project
</button>
            <!-- Filters Section -->
        <div style="margin-top: 5px;display: flex;gap: 5px;flex-wrap: wrap;">
        <select id="zoneFilter" style="flex: 1;padding: 5px;border-radius:5px;border:0;background:transparent;">
            <option value="">Zone</option>
            <!-- Options will be populated dynamically -->
        </select>

        <select id="regionFilter" style="flex: 1;padding: 5px;border-radius:5px;border:0;background:transparent;">
            <option value="">Region</option>
            <!-- Options will be populated dynamically -->
        </select>
    </div> 
        <div style="margin-top: 5px;display: flex;gap: 5px;flex-wrap: wrap;">
                <select id="divisionFilter" style="flex: 1;padding: 5px; margin-bottom: 5px;border-radius:5px;border:0;background:transparent;">
            <option value="">Division</option>
            <!-- Options will be populated dynamically -->
        </select>

        <select id="statusFilter" style="flex: 1;padding: 5px; margin-bottom: 5px;border-radius:5px;border:0;background:transparent;">
            <option value="">Status</option>
            <!-- Options will be populated dynamically -->
        </select>
            </div>
    <!-- Project Name Search Filter (placed below the other filters) -->
    <div style="display: flex; flex-direction: row;">
        <input type="text" id="projectNameSearch" placeholder=" Search Project Name" style="width: 100%; padding: 3px;border-radius:5px;border:0;background:transparent;">
    </div>
    </div>
    <div class="sidebar-scroll">
            <ul class="project-list">
                <!--fetching projects here-->
            </ul>
         </div>
    </div>
    <!-- Details Section -->
    <div class="details">
        <div class="details-fixed">
            <span style="text-align: center;">
                <h2>No Project selected.</h2>
                <p>Click any project in the list to preview it here</p>
            </span>
        </div>
        <div class="details-scroll">
            <ul class="tasks">
            <!--fetching task here-->
            </ul>
        </div>
    </div>
  </div>
</body>
</html>"""

    css_content = """
        body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: transparent;
      color: #333;
    }
    #projectNameSearch::placeholder {
    font-size:12px;
}
    select{
        border:0;
        font-size:12px;
        color:gray;
    }
    .header {
      background-color: #EDEDED;
      color: black;
      padding: 15px 20px;
      font-size: 18px;
      font-weight: bold;
      margin:10px 20px 0px 20px;
      border:1px solid #ABB6CB;
      border-radius:10px;
    }
    .header span {
      font-weight: normal;
    }
    /* Main container */
.container {
  display: flex;
  flex-direction: row;
  max-width: 1200px;
  margin: 5px auto;
  background: transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 600px; /* Set a fixed height */
  overflow: hidden; /* Prevent overflowing content */
}
    .sidebar-scroll{
  flex: 1;
  background: transparent;
  padding: 15px;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto; /* Enable vertical scrolling */
  max-height: 100%; /* Ensure it respects the container height */
}
    .project-list {
      list-style: none;
      padding: 0;
    }
    .project-list li {
  background: transparent;
  border-radius:10px;
  padding: 5px;
  display: flex;
  flex-direction: column; /* Stack items vertically */
}
.project-info {
  display: flex;
  justify-content: space-between; /* Align project name and status on the same line */
  font-size: 14px;
}

.project-info .status {
 font-size: var(--text-body-size-small, .75rem);
 padding:3px;
 margin-top:auto;
 float:right;
 border-radius: var(--borderRadius-full, 624.9375rem);
 min-width: 40px;
 text-align: center;
 padding-left: 5px;
 padding-right: 5px;
    
}
.details-fixed .status{
   font-size: var(--text-body-size-small, .75rem);
 padding:3px;
 margin-top:auto;
 float:right;
 border-radius: var(--borderRadius-full, 624.9375rem);
 min-width: 40px;
 text-align: center;
 padding-left: 5px;
 padding-right: 5px;  
 margin-bottom: 5px;
}
.project-details {
  font-size: 12px;
  color: #777;
  margin-top: 5px;
  display: block; /* Ensure the details are stacked vertically */
}
    .project-list li .status {
  color: #ffc107;
}
.project-list li div {
  display: flex;
  flex-direction: row; /* Ensure the inner div elements stack vertically */
}
    .details-scroll {
  flex: 2;
  overflow-y: auto; /* Enable vertical scrolling */
  max-height: 100%; /* Ensure it respects the container height */
}
    
    .tasks {
      list-style: none;
      padding: 0;
    }
    .tasks li {
      background: transparent;
      padding: 10px 10px 0 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .tasks li .date {
      font-size: 14px;
    }
/* Optional: Style the scrollbar (works in modern browsers) */
.sidebar-scroll::-webkit-scrollbar,
.details-scroll::-webkit-scrollbar {
  width: 8px;
}

.sidebar-scroll::-webkit-scrollbar-thumb,
.details-scroll::-webkit-scrollbar-thumb {
  background-color: #cccccc;
  border-radius:10px;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover,
.details-scroll::-webkit-scrollbar-thumb:hover {
  background-color: #aaaaaa;
}

.sidebar-fixed{
  flex-shrink: 0; /* Prevent shrinking */
  padding: 10px;
  background-color: transparent;
  border-bottom: 1px solid #ABB6CB;
  border-radius: 10px 10px 0 0; /* Apply radius only to top-left and top-right corners */

}
.details-fixed {
  flex-shrink: 0; /* Prevent shrinking */
  padding: 10px;
  background-color: transparent;
  border-bottom: 1px solid #ABB6CB;
  border-radius: 10px 10px 0 0; /* Apply radius only to top-left and top-right corners */

}
.sidebar {
  flex: 0 0 38%; /* Sidebar is 33% width */
  background: transparent;
  border-right: 1px solid #ABB6CB;
  display: flex;
  flex-direction: column;
  border: 1px solid #ABB6CB;
  border-radius: 10px;
  margin: 5px;
}

.details {
  flex: 1; /* Take the remaining 67% */
  display: flex;
  flex-direction: column;
  border:1px solid #ABB6CB;
  border-radius:10px;
  margin:5px;

}
/* Initially set the placeholder font size */
    #projectNameSearch::placeholder {
        font-size: 10px; /* Default font size */
        color: gray; /* Optional: Customize the color */
        transition: font-size 0.3s ease; /* Smooth transition for font size */
    }
    /* On focus, increase the placeholder font size */
    #projectNameSearch:focus::placeholder {
        font-size: 12px; /* Increase font size when focused */
    }
     #projectNameSearch:focus {
        border: none; /* Remove border */
        outline: none; /* Remove the outline that appears on focus */
    }
   /* General styles for select elements */


.sidebar-scroll {
  flex-grow: 1;
  padding: 10px 20px 10px 20px;
  overflow-y: auto; /* Enable vertical scrolling */
  border-radius:5px;

}

.details-scroll {
  flex-grow: 1;
  padding: 10px;
  overflow-y: auto; /* Enable vertical scrolling */
    border-radius:5px;

}
    /* Hover effect on sidebar and details list items */
    .sidebar .project-list li, 
    .details .tasks li {
      transition: transform 0.3s ease;/* Smooth transition */
      cursor: pointer; /* Show hand pointer */
      padding: 10px;
    }

    /* Scale and background color change on hover */
    /* Hover effect */
.sidebar .project-list li:hover{
  transform: scale(1.05); /* Slightly enlarge the item */
    /*background-color: #f0f0f0;*/
}

.details .tasks li:hover {
   transform: scale(1.04);
    
}
  
.sidebar .project-list li.selected {
  transform: scale(1.05); /* Apply scaling */
  transition: transform 0.2s ease, border 0.2s ease; /* Smooth transition */
}

/* Shimmer effect */
.progress-bar-shimmer {
  position: relative;
  overflow: hidden;
  background: linear-gradient(90deg, #009A1E 25%, #33CC33 50%, #009A1E 75%);
  background-size: 200% 100%;
  animation: shimmer 3s infinite linear;
}

/* Keyframes for shimmer animation */
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.loading-indicator {
  display: inline-block;
  cursor: pointer;
  transition: all 0.3s ease;
}

.loading-indicator::before {
  content: ">>>"; /* Predefined content visible by default */
  opacity: 1; /* Visible by default */
  transition: opacity 0.3s ease;
}

li:hover .loading-indicator::before {
  animation: blink 1s infinite; /* Apply blinking animation on hover */
}
@keyframes blink {
  0%, 100% {
    opacity: 1; /* Visible */
  }
  50% {
    opacity: 0; /* Invisible */
  }
}

.details .tasks li:hover .status {
  animation: blink 1s infinite; /* Apply blinking animation to the status */
}

.details .tasks li:hover .loading-indicator::before {
  animation: blink 1s infinite; /* Apply blinking animation to the loading indicator */
}

@keyframes blink {
  0%, 100% {
    opacity: 1; /* Fully visible */
  }
  50% {
    opacity: 0; /* Invisible */
  }
}"""

    js_content = """
    fetchAllProjects();
populateFilters();
setupFilterListeners();
fetchEmpName();
hideCreatePRButton();
function hideCreatePRButton() {
    // Check if the user doesn't have both 'Administrator' and 'Project Manager' roles
    if (!frappe.user.has_role('Administrator') && !frappe.user.has_role('Project Manager')) {
        const createPRbtn = root_element.querySelector('.createPRbtn');
        
        if (createPRbtn) {
            createPRbtn.style.display = 'none';
        } else {
            console.log("Button with class '.createPRbtn' not found!");
        }
    } else {
        console.log("User has the required role.");
    }
}
function fetchAllProjects() {
  frappe.call({
    method: "sahayog.patches.fixtures.add_custom_html_block_for_project.get_all_projects",
    callback: function (response) {
      if (response.message) {
        console.log("API Response:", response.message);
        window.allProjects = response.message; // Set global variable
        populateProjectList(response.message);
      } else {
        console.error("No projects returned from API.");
      }
    },
    error: function (error) {
      console.error("Error fetching projects:", error);
    },
  });
}

// Populate the project list (already provided in your code)
function populateProjectList(projects) {
  const projectList = root_element.querySelector(".project-list");
  const detailsDiv = root_element.querySelector(".details-scroll");
  const detailsDivFixed = root_element.querySelector(".details-fixed");

  if (!projectList || !detailsDiv) {
    console.error(".project-list or .details element not found in the DOM.");
    return;
  }

  projectList.innerHTML = ""; // Clear the existing content

  // Check if there are any projects
  if (projects.length === 0) {
    const noRecordsMessage = document.createElement("li");
    noRecordsMessage.textContent = "No records found";
    noRecordsMessage.style.color = "red"; // Optional: style the message
    noRecordsMessage.style.textAlign = "center"; // Optional: center the message
    projectList.appendChild(noRecordsMessage);
    return; // Exit early to avoid further processing
  }

  projects.forEach((project, index) => {
    const statusColor =
      project.custom_branch_status === "Not Started" ? "#007bff" : // Gray
      project.custom_branch_status === "Under Development" ? "#E49B0F" : // Blue
      project.custom_branch_status === "Live" ? "#28a745" : // Green
      "#000"; // Default color (Black)

    const li = document.createElement("li");
    li.classList.add("project-item"); // Add a common class for styling
    
     // Add a custom data attribute to store the status color
    li.setAttribute("data-status-color", statusColor);
    
    
    li.innerHTML = `
      <div class="project-info">
         <div style="display: flex; align-items: center;">
          <img src="/assets/sahayog/images/sahalogo.svg" alt="Logo" style="width: 30px; height: 30px; margin-right: 10px; vertical-align: middle;">
          <span>${project.project_name}</span>
        </div>
        <span class="status" style="color: ${statusColor}; border:1px solid ${statusColor};text-shadow: 0.5px 0.5px 0.5px rgba(0, 0, 0, 0.5);">${project.custom_branch_status}</span>
      </div>
      <div class="project-details">
    <span style='float: left;'>
      <span style="color: #28a745;font-size: 20px;">&#8226;</span> ${project.custom_zone}  
      <span style="color: #28a745;font-size: 20px;">&#8226;</span> ${project.custom_region}
      <span style="color: #28a745;font-size: 20px;">&#8226;</span> ${project.custom_division}
    </span>      
    </div>
    `;
    projectList.appendChild(li);

    // Add a separator <hr> after each <li>, except the last one
    if (index < projects.length - 1) { // Skip <hr> after the last item
      const hr = document.createElement("hr");
      hr.style.border = "1px solid #ccc"; // Optional: Style the separator
      hr.style.margin = "5px 0"; // Optional: Add margin for aesthetics
      projectList.appendChild(hr);
    }

    // Add a click event for each project
    li.addEventListener("click", function () {
      console.log(`Project clicked: ${project.project_name}`);

      // Remove "selected" class from all items
      const allItems = projectList.querySelectorAll(".project-item");
      allItems.forEach((item) => {
        item.classList.remove("selected");
        item.style.border = ""; // Reset the border for all items
        item.style.borderLeft = ""; // Reset the border for all items
      });
      
      // Add "selected" class to the clicked item
      li.classList.add("selected");
      
      // Apply the border color dynamically from the data attribute
      li.style.border = `1px solid ${statusColor}`;
      li.style.borderLeft = `5px solid ${statusColor}`;
      
      detailsDivFixed.innerHTML = `
  <p>
    <b><span style='font-size:25px;'>${project.project_name} - Tasks</span></b>
    <span style='float: right; color: #555;'>
      <span style="color: #28a745;font-size: 20px;">&#8226;</span> ${project.custom_zone} 
      <span style="color: #28a745;font-size: 20px;">&#8226;</span> ${project.custom_region} 
      <span style="color: #28a745;font-size: 20px;">&#8226;</span> ${project.custom_division}
    </span>
  </p>
  <p>
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; color: #555; display: block;" class="percent-text">${project.percent_complete}% Completed</span>
        <span class="status" style="color: ${statusColor}; border:1px solid ${statusColor};text-shadow: 0.5px 0.5px 0.5px rgba(0, 0, 0, 0.5);">${project.custom_branch_status}</span>
    </div>
    <div style="width: 100%; background-color: #ddd; border-radius: 10px; height: 10px;">
      <div class="progress-bar" style="width: ${project.percent_complete}%; background-color: #009A1E; height: 100%; border-radius: 10px;"></div>
    </div>
  </p>
`;

      // Fetch tasks for the selected project
      fetchTasksForProject(project.name, detailsDiv);

      // Animate the progress bar
      const progressBar = root_element.querySelector(".progress-bar");
      const percentageText = root_element.querySelector(".percent-text");
      animateProgressBarAndText(progressBar, percentageText, project.percent_complete);
    });
  });

  console.log("Project list populated successfully.");
}

function fetchTasksForProject(projectName, detailsDiv) {
  frappe.call({
    method: "sahayog.patches.fixtures.add_custom_html_block_for_project.get_all_tasks", // Correct path
    args: {
      project_name: projectName  // Pass the project name to the server-side function
    },
    callback: function (response) {
      if (response.message) {
        console.log("Tasks for project:", projectName, response.message);
        displayTaskList(response.message, detailsDiv);
      } else {
        console.error("No tasks found for this project.");
      }
    },
    error: function (error) {
      console.error("Error fetching tasks:", error);
    },
  });
}

function displayTaskList(tasks, detailsDiv) {
  // Clear existing tasks from the detailsDiv
  detailsDiv.innerHTML = `<ul class="tasks"></ul>`;
  const taskList = detailsDiv.querySelector(".tasks");

  // Sort tasks by the numeric index in the subject (e.g., "task 1", "task 2")
  tasks.sort((a, b) => {
    const indexA = parseInt(a.subject.match(/\d+/)); // Extract the number from subject
    const indexB = parseInt(b.subject.match(/\d+/));
    return indexA - indexB; // Sort in ascending order
  });

  tasks.forEach((task, index) => {
     const statusColor = 
    task.status === "Open" ? "#FFA500" : // Orange
      task.status === "Working" ? "#007BFF" : // Blue
      task.status === "Pending Review" ? "#E6B800" : // Slightly darker yellow
      task.status === "Overdue" ? "#FF0000" : // Red
      task.status === "Template" ? "#6C757D" : // Gray
      task.status === "Completed" ? "#009A1E" : // Green
      task.status === "Cancelled" ? "#DC3545" : // Dark Red
      "#000"; // Default color if status is unknown

    const formattedDate = formatDate(task.modified);

    // Create and append task list item
    const li = document.createElement("li");
    li.innerHTML = `
      <p><b><span style='font-size:16px;'>${task.subject}</span></b><br>
         <span style='color:#005570;font-size:12px;' title="Expected Start Date">${task.exp_start_date}</span> 
         <span class="loading-indicator" style='font-size:16px;'></span> 
         <span style='color:#5A892E;font-size:12px;' title="Expected End Date">${task.exp_end_date}</span>
      </p>
      <p>
         <span class="status" style='font-size:16px;float: right;color:${statusColor};text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);'>${task.status}</span><br>
         <span class="assigned-to" style='font-size:10px;float: right;'><i>last updated - ${formattedDate}</i></span>
      </p>
    `;
    taskList.appendChild(li);

    // Add a separator <hr> after each <li>, except the last one
    if (index < tasks.length - 1) { // Skip <hr> for the last task
      const hr = document.createElement("hr");
      hr.style.border = "1px solid #ccc"; // Optional: Style the separator
      hr.style.margin = "5px 0 5px -10px"; // Optional: Add margin for aesthetics
      hr.style.width = "105%"; // Optional: Add margin for aesthetics
      taskList.appendChild(hr);
    }

    // Add a click event for each task
    li.addEventListener("click", function () {
      const taskUrl = `/app/task/${task.name}`; // Assuming 'task.name' is the unique identifier for the task
      window.open(taskUrl, "_blank"); // Open the task's URL in a new tab
    });
  });

  console.log("Tasks displayed and sorted successfully.");
}


function formatDate(dateString) {
  const actualDate = new Date(dateString); // Get the date object
  const prettyDate = frappe.datetime.prettyDate(actualDate); // Get the pretty date
  
  // Return an HTML element with the pretty date and a tooltip for the actual date
  return `
    <span title="${actualDate.toLocaleDateString()} ${actualDate.toLocaleTimeString()}">
      ${prettyDate}
    </span>
  `;
}



function populateFilters() {
    frappe.call({
        method: "sahayog.patches.fixtures.add_custom_html_block_for_project.get_options_dynamically_for_filter", // Update with your app name and Python method
        callback: function (response) {
            const data = response.message;

            if (data) {
                // Populate Zone filter
                const zoneFilter = root_element.querySelector("#zoneFilter");
                data.zone_names.sort().forEach(zone => {
                    const option = document.createElement("option");
                    option.value = zone;
                    option.textContent = zone;
                    zoneFilter.appendChild(option);
                });

                // Populate Region filter
                const regionFilter = root_element.querySelector("#regionFilter");
                data.region_names.sort().forEach(region => {
                    const option = document.createElement("option");
                    option.value = region;
                    option.textContent = region;
                    regionFilter.appendChild(option);
                });

                // Populate Division filter
                const divisionFilter = root_element.querySelector("#divisionFilter");
                data.division_names.forEach(division => {
                    const option = document.createElement("option");
                    option.value = division;
                    option.textContent = division;
                    divisionFilter.appendChild(option);
                });

                // Populate Status filter
                const statusFilter = root_element.querySelector("#statusFilter");
                data.custom_branch_status_options.forEach(status => {
                    const option = document.createElement("option");
                    option.value = status;
                    option.textContent = status;
                    statusFilter.appendChild(option);
                });
            }
        },
        error: function (error) {
            console.error("Failed to fetch filter options:", error);
        }
    });
}

// Attach event listeners to the filters
function setupFilterListeners() {
  const filters = {
    zone: root_element.querySelector("#zoneFilter"),
    region: root_element.querySelector("#regionFilter"),
    division: root_element.querySelector("#divisionFilter"),
    status: root_element.querySelector("#statusFilter"),
    projectName: root_element.querySelector("#projectNameSearch"),
  };

  // Add change/input listeners for all filters
  Object.values(filters).forEach((filter) => {
    if (filter.id === "projectNameSearch") {
      // Apply filters when typing in the project name search input
      filter.addEventListener("input", () => {
        updateFilterBackground(filter);
        applyFilters();
      });
    } else {
      filter.addEventListener("change", () => {
        updateFilterBackground(filter);
        applyFilters();
      });
    }
  });

  // Apply filters when typing in the project name search input
  filters.projectName.addEventListener("input", applyFilters);
}

// Dynamically change the background of filters based on value
function updateFilterBackground(filter) {
  if (filter.value !== "") {
    filter.style.backgroundColor = "#f8f9f5"; // Light green for applied filters
    filter.style.border = "1px solid black";
    filter.style.color = "black"; // Ensure text is visible
  } else {
    filter.style.backgroundColor = "white"; // Default background for no selection
    filter.style.border = 0;
    filter.style.color = "gray"; // Default color
  }
}

// Filter projects based on the selected filters
function applyFilters() {
  const filters = {
    zone: root_element.querySelector("#zoneFilter").value,
    region: root_element.querySelector("#regionFilter").value,
    division: root_element.querySelector("#divisionFilter").value,
    status: root_element.querySelector("#statusFilter").value,
    projectName: root_element.querySelector("#projectNameSearch").value.toLowerCase(), // Case insensitive search
  };

  const allProjects = window.allProjects || []; // Store all fetched projects in a global variable for filtering
  const filteredProjects = allProjects.filter((project) => {
    return (
      (filters.zone === "" || project.custom_zone === filters.zone) &&
      (filters.region === "" || project.custom_region === filters.region) &&
      (filters.division === "" || project.custom_division === filters.division) &&
      (filters.status === "" || project.custom_branch_status === filters.status) &&
      (filters.projectName === "" ||
        project.project_name.toLowerCase().includes(filters.projectName))
    );
  });

  // Update the project list dynamically
  populateProjectList(filteredProjects);
}


function fetchEmpName(){
    if (frappe.session.user === "Administrator") {
    // Directly set the name for the Administrator
    const fullName = "Administrator";
    console.log("Full name is:", fullName);
    const nameElement = root_element.querySelector(".emp_name");
    if (nameElement) {
      nameElement.textContent = fullName;
    } else {
      console.warn("#emp-name element not found.");
    }
    }
    else{
                frappe.call({
      method: "frappe.client.get",
      args: {
        doctype: "Employee",
        filters: { user_id: frappe.session.user }, // Fetch based on user_id
      },
      callback: function (response) {
        if (response.message) {
          const { first_name, last_name } = response.message;
          const fullName = `${first_name} ${last_name}`;
          console.log("Full name is:", fullName);
          const nameElement = root_element.querySelector(".emp_name");
          if (nameElement) {
            nameElement.textContent = fullName;
          } else {
            console.warn("#emp-name element not found.");
          }
        } else {
          console.error("Failed to fetch user name.");
        }
      },
    });

    }

}
function animateProgressBarAndText(progressBar, percentageText, targetWidth) {
  let currentWidth = 0;
  let currentText = 0;

  // Set initial state (0%)
  progressBar.style.width = "0%";
  percentageText.textContent = "0% Completed";

  // Add the shimmer effect class
  progressBar.classList.add("progress-bar-shimmer");

  // Function to update the progress bar and text
  function updateAnimation() {
    const incrementStep = 1; // Adjust the speed of increment
    const delay = 10; // Delay in milliseconds for smoother animation

    if (currentWidth < targetWidth || currentText < targetWidth) {
      currentWidth = Math.min(currentWidth + incrementStep, targetWidth); // Increment width
      currentText = Math.min(currentText + incrementStep, targetWidth); // Increment percentage text

      // Update progress bar width and text
      progressBar.style.width = `${currentWidth}%`;
      percentageText.textContent = `${Math.round(currentText)}% Completed`;

      // Continue animation
      setTimeout(updateAnimation, delay);
    } else if (targetWidth === 100) {
      // Remove shimmer effect if targetWidth is 100
      progressBar.classList.remove("progress-bar-shimmer");

        
        // Add sound effect when targetWidth reaches 100
        const celebrationSound = new Audio('/files/applause.mp3'); // Path to your sound file
        celebrationSound.play(); // Play the sound
      // Trigger celebration when progress reaches 100%
      triggerCelebration();
      startMoneyRain();
      
    
    }
  }
   
   // Start the animation
  updateAnimation();
  
  // Celebration effect
function triggerCelebration() {
  // Utility functions
  const Utils = {
    parsePx: (value) => parseFloat(value.replace(/px/, "")),
    getRandomInRange: (min, max, precision = 0) => {
      const multiplier = Math.pow(10, precision);
      const randomValue = Math.random() * (max - min) + min;
      return Math.floor(randomValue * multiplier) / multiplier;
    },
    getRandomItem: (array) => array[Math.floor(Math.random() * array.length)],
    getScaleFactor: () => Math.log(window.innerWidth) / Math.log(1920),
    debounce: (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
      };
    },
  };

  const DEG_TO_RAD = Math.PI / 180;

  const defaultConfettiConfig = {
    confettiesNumber:350,
    confettiRadius: 6,
    confettiColors: [
      "#fcf403", "#62fc03", "#f4fc03", "#03e7fc", "#03fca5", "#a503fc", "#fc03ad", "#fc03c2"
    ],
    emojies: [],
    svgIcon: null,
  };

  class Confetti {
    constructor({ initialPosition, direction, radius, colors, emojis, svgIcon }) {
      const speedFactor = Utils.getRandomInRange(0.9, 1.7, 3) * Utils.getScaleFactor();
      this.speed = { x: speedFactor, y: speedFactor };
      this.finalSpeedX = Utils.getRandomInRange(0.2, 0.6, 3);
      this.rotationSpeed = emojis.length || svgIcon ? 0.01 : Utils.getRandomInRange(0.03, 0.07, 3) * Utils.getScaleFactor();
      this.dragCoefficient = Utils.getRandomInRange(0.0005, 0.0009, 6);
      this.radius = { x: radius, y: radius };
      this.initialRadius = radius;
      this.rotationAngle = direction === "left" ? Utils.getRandomInRange(0, 0.2, 3) : Utils.getRandomInRange(-0.2, 0, 3);
      this.emojiRotationAngle = Utils.getRandomInRange(0, 2 * Math.PI);
      this.radiusYDirection = "down";

      const angle = direction === "left" ? Utils.getRandomInRange(82, 15) * DEG_TO_RAD : Utils.getRandomInRange(-15, -82) * DEG_TO_RAD;
      this.absCos = Math.abs(Math.cos(angle));
      this.absSin = Math.abs(Math.sin(angle));

      const offset = Utils.getRandomInRange(-150, 0);
      const position = {
        x: initialPosition.x + (direction === "left" ? -offset : offset) * this.absCos,
        y: initialPosition.y - offset * this.absSin
      };

      this.position = { ...position };
      this.initialPosition = { ...position };
      this.color = emojis.length || svgIcon ? null : Utils.getRandomItem(colors);
      this.emoji = emojis.length ? Utils.getRandomItem(emojis) : null;
      this.svgIcon = null;

      if (svgIcon) {
        this.svgImage = new Image();
        this.svgImage.src = svgIcon;
        this.svgImage.onload = () => {
          this.svgIcon = this.svgImage;
        };
      }

      this.createdAt = Date.now();
      this.direction = direction;
    }

    draw(context) {
      const { x, y } = this.position;
      const { x: radiusX, y: radiusY } = this.radius;
      const scale = window.devicePixelRatio;

      if (this.svgIcon) {
        context.save();
        context.translate(scale * x, scale * y);
        context.rotate(this.emojiRotationAngle);
        context.drawImage(this.svgIcon, -radiusX, -radiusY, radiusX * 2, radiusY * 2);
        context.restore();
      } else if (this.color) {
        context.fillStyle = this.color;
        context.beginPath();
        context.ellipse(x * scale, y * scale, radiusX * scale, radiusY * scale, this.rotationAngle, 0, 2 * Math.PI);
        context.fill();
      } else if (this.emoji) {
        context.font = `${radiusX * scale}px serif`;
        context.save();
        context.translate(scale * x, scale * y);
        context.rotate(this.emojiRotationAngle);
        context.textAlign = "center";
        context.fillText(this.emoji, 0, radiusY / 2);
        context.restore();
      }
    }

    updatePosition(deltaTime, currentTime) {
      const elapsed = currentTime - this.createdAt;

      if (this.speed.x > this.finalSpeedX) {
        this.speed.x -= this.dragCoefficient * deltaTime;
      }

      this.position.x += this.speed.x * (this.direction === "left" ? -this.absCos : this.absCos) * deltaTime;
      this.position.y = this.initialPosition.y - this.speed.y * this.absSin * elapsed + 0.00125 * Math.pow(elapsed, 2) / 2;

      if (!this.emoji && !this.svgIcon) {
        this.rotationSpeed -= 1e-5 * deltaTime;
        this.rotationSpeed = Math.max(this.rotationSpeed, 0);

        if (this.radiusYDirection === "down") {
          this.radius.y -= deltaTime * this.rotationSpeed;
          if (this.radius.y <= 0) {
            this.radius.y = 0;
            this.radiusYDirection = "up";
          }
        } else {
          this.radius.y += deltaTime * this.rotationSpeed;
          if (this.radius.y >= this.initialRadius) {
            this.radius.y = this.initialRadius;
            this.radiusYDirection = "down";
          }
        }
      }
    }

    isVisible(canvasHeight) {
      return this.position.y < canvasHeight + 100;
    }
  }

  class ConfettiManager {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.canvas.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; pointer-events: none;";
      document.body.appendChild(this.canvas);
      this.context = this.canvas.getContext("2d");
      this.confetti = [];
      this.lastUpdated = Date.now();
      window.addEventListener("resize", Utils.debounce(() => this.resizeCanvas(), 200));
      this.resizeCanvas();
      requestAnimationFrame(() => this.loop());
    }

    resizeCanvas() {
      this.canvas.width = window.innerWidth * window.devicePixelRatio;
      this.canvas.height = window.innerHeight * window.devicePixelRatio;
    }

    addConfetti(config = {}) {
      const { confettiesNumber, confettiRadius, confettiColors, emojies, svgIcon } = {
        ...defaultConfettiConfig,
        ...config,
      };

      const baseY = (5 * window.innerHeight) / 7;
      for (let i = 0; i < confettiesNumber / 2; i++) {
        this.confetti.push(new Confetti({
          initialPosition: { x: 0, y: baseY },
          direction: "right",
          radius: confettiRadius,
          colors: confettiColors,
          emojis: emojies,
          svgIcon,
        }));
        this.confetti.push(new Confetti({
          initialPosition: { x: window.innerWidth, y: baseY },
          direction: "left",
          radius: confettiRadius,
          colors: confettiColors,
          emojis: emojies,
          svgIcon,
        }));
      }
    }

    resetAndStart(config = {}) {
      this.confetti = [];
      this.addConfetti(config);
    }

    loop() {
      const currentTime = Date.now();
      const deltaTime = currentTime - this.lastUpdated;
      this.lastUpdated = currentTime;

      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.confetti = this.confetti.filter((item) => {
        item.updatePosition(deltaTime, currentTime);
        item.draw(this.context);
        return item.isVisible(this.canvas.height);
      });

      requestAnimationFrame(() => this.loop());
    }
  }

  const manager = new ConfettiManager();
  manager.addConfetti();
}
}"""


    # Check if Custom HTML Block already exists
    custom_block = frappe.db.exists('Custom HTML Block', 'Sahayog Projects')
    if custom_block:
        doc = frappe.get_doc('Custom HTML Block', 'Sahayog Projects')
        doc.html = html_content
        doc.style = css_content
        doc.script = js_content
        doc.save()
        print("Updated Custom HTML Block: Sahayog Projects")
    else:
        frappe.get_doc({
            'doctype': 'Custom HTML Block',
            'name': 'Sahayog Projects',
            'html': html_content,
            'style': css_content,
            'script': js_content
        }).insert()
        print("Created Custom HTML Block: Sahayog Projects")
        
    frappe.db.commit()



@frappe.whitelist()
def get_all_projects():
    """
    Fetch all projects with relevant fields
    """
    try:
        # Fetch all projects with relevant fields
        projects = frappe.get_all(
            "Project", 
            fields=["name","project_name", "custom_branch_status", "custom_region", "custom_zone","custom_division","percent_complete"]
        )
        print(projects)  # Print fetched projects to the console
        return projects
    except Exception as e:
        frappe.throw(f"Error fetching projects: {str(e)}")


@frappe.whitelist()
def get_all_tasks(project_name):
    """
    Fetch all tasks for a specific project.
    """
    try:
        # Fetch tasks where the project field matches the passed project_name
        tasks = frappe.get_all(
            "Task", 
            filters={"project": project_name},  # Add filter for the project field
            fields=["name","subject","exp_start_date", "exp_end_date", "status", "modified"]
        )
        print(tasks)  # Print fetched tasks to the console
        return tasks
    except Exception as e:
        frappe.throw(f"Error fetching tasks: {str(e)}")


@frappe.whitelist()
def get_options_dynamically_for_filter():
    # Fetch all the names from the Zone doctype
    zone_names = frappe.get_all('Zone', fields=['name'])
    
    # Fetch all the names from the Region doctype
    region_names = frappe.get_all('Region', fields=['name'])
    
    # Fetch all the names from the Division doctype
    division_names = frappe.get_all('Division', fields=['name'])
    
    # Fetch the options of the custom_branch_status field from the Project doctype
    custom_branch_status_options = frappe.get_meta('Project').get_field('custom_branch_status').options
    
    # Return the list of names from all three doctypes and the options of the field
    return {
        'zone_names': [zone.get('name') for zone in zone_names],
        'region_names': [region.get('name') for region in region_names],
        'division_names': [division.get('name') for division in division_names],
        'custom_branch_status_options': custom_branch_status_options.split("\n")  # Split options by new line
    }

