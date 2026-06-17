# Test Cases & Validation

## Budget Buddy - Manual Test Cases

| TC ID  | Feature                     | Test Scenario                                          | Expected Result                                                             | Status |
| ------ | --------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- | ------ |
| TC-001 | Authentication              | Register a new account with a valid email and password | User account is created and redirected to the dashboard                     | ✅ Pass |
| TC-002 | Authentication              | Login using registered credentials                     | User successfully logs in and accesses protected pages                      | ✅ Pass |
| TC-003 | Monthly Budget              | Create a monthly income record                         | Income is saved and reflected in dashboard calculations                     | ✅ Pass |
| TC-004 | Categories                  | Create a new spending category with a budget           | Category appears in the budget list with correct monthly limit              | ✅ Pass |
| TC-005 | Manual Expense              | Add an expense manually                                | Expense is stored in the database and shown in recent expenses              | ✅ Pass |
| TC-006 | AI Natural Language Parsing | Enter "Spent 15 on lunch today"                        | AI extracts amount, description, and suggests category before saving        | ✅ Pass |
| TC-007 | AI Categorization           | Save an expense using AI suggestion                    | Suggested category is selected and can be changed by the user               | ✅ Pass |
| TC-008 | Override AI Suggestion      | Change the suggested category before saving            | User-selected category is stored and marked as corrected                    | ✅ Pass |
| TC-009 | Dashboard Calculations      | Add multiple expenses                                  | Remaining budget, total expenses, and balance update correctly              | ✅ Pass |
| TC-010 | Budget Warning              | Spend more than 80% of a category budget               | Warning indicator appears on the dashboard                                  | ✅ Pass |
| TC-011 | Budget Exceeded             | Spend more than 100% of a category budget              | Category is marked as exceeded                                              | ✅ Pass |
| TC-012 | Savings Goals               | Create a savings goal and add progress                 | Progress percentage updates correctly                                       | ✅ Pass |
| TC-013 | Monthly Report              | Generate monthly report                                | AI summary and spending forecast are generated and saved                    | ✅ Pass |
| TC-014 | Activity Log                | Perform CRUD operations                                | Every important action appears in Recent Activity                           | ✅ Pass |
| TC-015 | Edit Expense                | Modify an existing expense                             | Updated information is saved successfully                                   | ✅ Pass |
| TC-016 | Delete Expense              | Delete an expense                                      | Expense is removed and dashboard totals refresh                             | ✅ Pass |
| TC-017 | Delete All Data             | Use "Delete My Data" option                            | All user-owned records are permanently removed                              | ✅ Pass |
| TC-018 | Row Level Security          | Login with another account                             | User cannot access another user's financial data                            | ✅ Pass |
| TC-019 | Invalid Input Validation    | Submit an expense with missing required fields         | Validation prevents submission and displays an error                        | ✅ Pass |
| TC-020 | AI Service Failure          | Simulate AI gateway failure                            | Application remains functional and displays an appropriate fallback message | ✅ Pass |

---

# Validation Summary

| Category                 | Result   |
| ------------------------ | -------- |
| Authentication           | ✅ Passed |
| Budget Management        | ✅ Passed |
| Expense Management       | ✅ Passed |
| AI Features              | ✅ Passed |
| Savings Goals            | ✅ Passed |
| Reports                  | ✅ Passed |
| Security & Authorization | ✅ Passed |
| Input Validation         | ✅ Passed |

---

## Testing Notes

* All testing was performed manually during development.
* Core business logic was validated through end-to-end user flows.
* Financial calculations were verified using sample datasets.
* Row Level Security (RLS) was validated using multiple user accounts.
* AI-assisted features were tested with multiple natural-language expense descriptions.
* The application gracefully handles invalid input and AI service failures without exposing sensitive information.

---

## Sample Validation Data

| Action         | Sample Input                     | Expected Output                                             |
| -------------- | -------------------------------- | ----------------------------------------------------------- |
| Income         | 500                              | Monthly income = 500                                        |
| Category       | Food = 150                       | Budget created                                              |
| Expense        | Lunch = 25                       | Remaining Food budget = 125                                 |
| AI Input       | "Spent 8 on coffee this morning" | Amount = 8, Description = Coffee, Suggested Category = Food |
| Savings Goal   | Laptop = 800                     | Progress displayed correctly                                |
| Monthly Report | Generate Report                  | AI summary and spending forecast displayed                  |
