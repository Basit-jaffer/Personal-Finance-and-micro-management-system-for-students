# Demo Script

**Project:** Budget Buddy - Agentic Personal Finance & Micro-Budgeting for Students

**Estimated Demo Time:** 5-7 Minutes

# Demo Objective

Demonstrate how a student can use Budget Buddy to manage monthly finances, track expenses, receive AI-powered assistance, monitor budgets, and generate financial insights while maintaining complete ownership and privacy of their data.


# Demo Flow

## 1. User Registration & Authentication (30 seconds)

### Action

* Open the application.
* Register a new account (or log in using an existing account).

### Explain

> Every student has their own secure account using Supabase Authentication. All financial records are isolated using Row Level Security, ensuring users can only access their own data.


## 2. Dashboard Overview (30 seconds)

### Action

Navigate to the Dashboard.

### Show

* Current Balance
* Total Income
* Total Expenses
* Budget Status
* Savings Progress
* Recent Activity

### Explain

> The dashboard provides a complete overview of the student's financial health, including budget utilization, remaining balance, and recent financial activities.


## 3. Create Monthly Budget (45 seconds)

### Navigate

Budgets

### Action

Create:

Monthly Income

500

Categories

* Food — 150
* Transport — 60
* Subscriptions — 30

### Explain

> Students first define their monthly income and spending categories. These budgets are later used for tracking and forecasting.


## 4. Add Expense using AI (1 minute)

Navigate to

Expenses

### Action

Enter

Spent 8 on coffee this morning

### Show

AI automatically extracts:

* Amount
* Description
* Suggested Category

Review the information.

Click Save.

### Explain

> Instead of filling multiple fields manually, users can simply describe their expense in natural language. AI converts the sentence into structured financial data before saving.


## 5. Manual Expense Entry (45 seconds)

Add:

* Bus Pass — 50 (Transport)
* Netflix — 15 (Subscriptions)
* Groceries — 80 (Food)

### Explain

> Users may also enter expenses manually whenever preferred.


## 6. Budget Monitoring (45 seconds)

Add another expense:

Lunch — 70 (Food)

### Show

Dashboard now displays:

* Budget warning
* Remaining budget
* Updated balance

### Explain

> Once spending reaches 80% of a category budget, the system proactively alerts the user before overspending occurs.


## 7. Override AI Suggestion (30 seconds)

Edit one expense.

Change its category.

Save.

### Explain

> AI only provides recommendations. The user always has the final decision. Any corrections are stored to improve transparency and maintain user control.


## 8. Savings Goals (30 seconds)

Navigate to

Savings

Create

Laptop

Target Amount:

800

Add some savings.

### Show

Progress percentage updates.

### Explain

> Students can create financial goals and monitor their progress over time.


## 9. Generate Monthly Report (45 seconds)

Navigate to

Reports

Click

Generate Report

### Show

* Spending summary
* Forecasted month-end balance
* AI-generated financial insights

### Explain

> The report combines financial calculations with AI-generated summaries to help students understand their spending habits and improve future budgeting decisions.


## 10. Recent Activity (20 seconds)

Return to Dashboard.

Show Recent Activity.

### Explain

> Every important action performed by the user is logged, providing a simple audit trail of financial activities.


## 11. Privacy Demonstration (30 seconds)

Open User Menu.

Click

Delete All My Data

Show confirmation dialog.

(Do not necessarily confirm unless desired.)

### Explain

> User privacy is one of the project's core principles. Students maintain complete ownership of their financial data and can permanently delete it at any time.


# Technical Highlights

Mention briefly during the presentation:

* React 19 frontend
* TanStack Start server functions
* Supabase Authentication
* PostgreSQL database
* Row Level Security (RLS)
* Gemini AI integration
* Server-side validation
* Secure API key handling


# AI Usage Disclosure

This project uses AI responsibly.

AI is used for:

* Natural-language expense parsing
* Expense categorization
* Monthly financial summaries

All AI suggestions are reviewable, editable, and never automatically accepted without user confirmation.


# Known Limitations

Current MVP limitations include:

* Single-user (student) role
* No bank account integration
* No receipt OCR
* No recurring transactions
* No offline mode
* AI categorization depends on user-defined category names

These features are planned for future development.


# Future Scope

Potential improvements include:

* Multi-currency support
* Parent or mentor dashboards
* Receipt OCR
* Recurring expense automation
* Bank API integration
* Mobile application
* Push notifications
* Offline-first support


# Closing Statement

Budget Buddy demonstrates how AI can simplify personal finance for students while maintaining privacy, security, and user control. The project combines modern web technologies, secure cloud infrastructure, and practical AI assistance to deliver an intuitive budgeting experience suitable for everyday student financial management.
