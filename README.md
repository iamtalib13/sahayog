# Sahayog ERP

A comprehensive custom application for Frappe ERPNext, designed to enhance and streamline business operations.

## Overview

Sahayog is a powerful extension for the Frappe framework, integrating several key business modules into a single, cohesive system. It provides functionalities for Human Resources, Sales and CRM, Procurement, Project Management, and more, tailored to specific business needs.

## Core Modules

The application is composed of several modules:

- **Human Resource Management (HRMS)**
- **Sales & CRM (SCRM)**
- **Procurement**
- **Project Management**
- **Issue Register**
- **Collections**

### Human Resource Management (HRMS)

This module extends the core HR functionalities of Frappe.
- Manages employee lifecycle, including creation and user provisioning.
- Custom logic for employee naming and status (Active/Inactive).
- Handles department and branch-specific data.
- Overrides for handling employee data updates.

#### Key HRMS DocTypes:
- `Employee`: Central document for employee information.
- `Department`: Organizational departments.
- `Branch`: Different company branches.

### Sales & CRM (SCRM)

Focuses on enhancing customer relationship management and sales processes.
- Manages leads, opportunities, and customers.
- Custom API for lead owner assignments.
- Integration with Service Level Agreements (SLAs).
- Automated contact creation from leads.

#### Key SCRM DocTypes:
- `Lead`: Potential sales interest.
- `Opportunity`: Qualified sales opportunity.
- `Customer`: Company's customers.

### Procurement

Streamlines the purchasing and inventory management processes.
- Handles `Supplier Quotation`, `Purchase Order`, and `Purchase Receipt`.
- Custom logic for item naming and warehouse management.
- Asset management integration.

#### Key Procurement DocTypes:
- `Supplier Quotation`: Quotes from suppliers.
- `Purchase Order`: Orders placed with suppliers.
- `Item`: Products and services.

### Project Management

Provides tools for managing projects and tasks effectively.
- Defines `Project Templates` for quick project setup.
- Manages `Tasks` with dependencies and assignments.
- Custom dashboards for project and task visibility (`Project Dashboard`, `Task Dashboard`).

#### Key Project DocTypes:
- `Project`: The main project document.
- `Task`: Individual tasks within a project.
- `Project Template`: Reusable project structures.

### Issue Register

A dedicated module for tracking and managing issues.
- Allows users to report issues and track their resolution status.
- Provides reports and dashboards for issue analysis.

## Custom APIs & Logic

Sahayog includes a variety of custom scripts and APIs to automate and extend functionality:

- **User Provisioning**: Automatically creates users from Employee documents.
- **Branch & Warehouse Linking**: Logic to link branches with warehouses.
- **Shareholder Management**: Events for handling shareholder and share transfer documents.
- **Custom Naming**: Several overrides for document naming conventions (e.g., `Employee`, `Item`).

## Installation

To install Sahayog, you need a Frappe Bench environment.

1. Go to your bench directory:
   ```bash
   cd ~/frappe-bench
   ```
2. Get the app from its repository (replace with actual repository URL):
   ```bash
   bench get-app https://github.com/your-org/sahayog
   ```
3. Install the app on your site:
   ```bash
   bench --site your-site-name.localhost install-app sahayog
   ```
4. Migrate the database:
   ```bash
   bench --site your-site-name.localhost migrate
   ```

## Contribution

Contributions are welcome! Please follow the standard Frappe app development guidelines.
1. Fork the repository.
2. Create a new branch for your feature.
3. Add your changes and commit them.
4. Push to your branch and create a Pull Request.

## License

