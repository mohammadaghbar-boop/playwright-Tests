import { test } from '@playwright/test';

// Bugs that could not be auto-linked to a story — triage into the right spec.
test.describe('Unlinked bug regression guards', () => {
  // JF-233 [Backlog]
  test.fixme('JF-233 FE - Session Expiry - Session Expiry Does Not Redirect to Login Page or Show User-Friendly Message', async () => {});
  // JF-234 [Ready For UAT]
  test.fixme('JF-234 FE - Task Management - Incorrect Empty State Message Displayed on Initial Load (Before Search)', async () => {});
  // JF-235 [Ready For UAT]
  test.fixme('JF-235 User Cannot Edit/Update Condition After Adding It', async () => {});
  // JF-236 [Ready For UAT]
  test.fixme('JF-236 Added Condition Is Displayed as Raw Code Instead of User-Friendly Format', async () => {});
  // JF-237 [Ready For UAT]
  test.fixme('JF-237 Unclear How to Change Logical Operator (AND/OR) Between Conditions', async () => {});
  // JF-241 [To Do]
  test.fixme('JF-241 Frontend :: does not highlight username field with inline validation when API returns field-level er', async () => {});
  // JF-287 [Ready For UAT]
  test.fixme('JF-287 Task Management - No Error Message Displayed on UI When API Returns Validation Error on Confirm', async () => {});
  // JF-293 [UAT]
  test.fixme('JF-293 حقل البحث برقم الأصل غير موجود في قائمة الأصول', async () => {});
  // JF-294 [Ready for QA]
  test.fixme('JF-294 نوع اللوحة مرسل  لكن لا يظهر في الواجهة plateType', async () => {});
  // JF-310 [Rejected]
  test.fixme('JF-310 Heirs Tab: Unexpected behaviors from the "Search" option within the heirs tab', async () => {});
  // JF-336 [To Do]
  test.fixme('JF-336 FE - Extra Search Filter and Column Displayed in Task Management List', async () => {});
  // JF-337 [To Do]
  test.fixme('JF-337 Task Management List UI Does Not Match Figma Design', async () => {});
  // JF-338 [Ready For UAT]
  test.fixme('JF-338 FE - Date Filter in Task Management List Requires Clicking Outside to Apply Selected Date', async () => {});
  // JF-340 [Ready for QA]
  test.fixme('JF-340 User is unable to assign a task to the Flow Map while it is active', async () => {});
  // JF-341 [Ready For UAT]
  test.fixme('JF-341 Conditional text field remains visible after parent condition is deselected', async () => {});
  // JF-342 [Ready For UAT]
  test.fixme('JF-342 Conditional fields do not appear when multiple options are selected simultaneously in a multi-select', async () => {});
  // JF-368 [Ready for QA]
  test.fixme('JF-368 FE - button معاينة incorrectly triggers unsaved changes warning dialog', async () => {});
  // JF-390 [Ready For UAT]
  test.fixme('JF-390 Estates tab: List of available estates is not being updated after filling then clearing the "Date" f', async () => {});
  // JF-415 [Ready For UAT]
  test.fixme('JF-415 Estates List: Missing "Liquidator" column above estates list under "Estates" tab', async () => {});
  // JF-416 [Ready For UAT]
  test.fixme('JF-416 No validation shown when user adds more than 7 fields', async () => {});
  // JF-417 [Ready For UAT]
  test.fixme('JF-417 Pasting a decimal value into expectedCompletionHours strips the dot and causes a backend error', async () => {});
  // JF-418 [Ready For UAT]
  test.fixme('JF-418 Task is created/saved with no predefined fields when all are removed', async () => {});
  // JF-419 [To Do]
  test.fixme('JF-419 Task Number is not visible on the Edit Task screen', async () => {});
  // JF-420 [Rejected]
  test.fixme('JF-420 Task Number is not visible on the Edit Task screen', async () => {});
  // JF-421 [Ready For UAT]
  test.fixme('JF-421 Long technical name is not wrapped in the Task list view', async () => {});
  // JF-422 [Rejected]
  test.fixme('JF-422 System does not force user to select Mandatory or Optional after dropping a field into the drop zone', async () => {});
  // JF-435 [To Do]
  test.fixme('JF-435 Role search returns no results when user types lowercase; requires exact title-case input', async () => {});
  // JF-436 [To Do]
  test.fixme('JF-436 Mobile Field Accepts Non-Numeric Input Without Immediate Rejection', async () => {});
  // JF-437 [To Do]
  test.fixme('JF-437 Non-Admin User Can Access Create User Button and Dialog', async () => {});
  // JF-438 [To Do]
  test.fixme('JF-438 Adding Liquidator (مصفي) role does not render the expected classification category selector', async () => {});
  // JF-439 [Rejected]
  test.fixme('JF-439 Email required validation message displays raw i18n key instead of Arabic text', async () => {});
  // JF-440 [Rejected]
  test.fixme('JF-440 Email field label and placeholder display raw i18n keys instead of Arabic text on Create Internal Us', async () => {});
  // JF-447 [Ready For UAT]
  test.fixme('JF-447 Inconsistent date filter field labels in Task Management — "To" field label is incorrect', async () => {});
  // JF-448 [Rejected]
  test.fixme('JF-448 Change Status Action Returns 400 Bad Request When Changing Active User to Inactive', async () => {});
  // JF-449 [To Do]
  test.fixme('JF-449 Date Range Filter Uses Exclusive End Date in Users List', async () => {});
  // JF-450 [Blocked]
  test.fixme('JF-450 No "View" Action Button in Actions Column for Users List', async () => {});
  // JF-451 [To Do]
  test.fixme('JF-451 Username and ID Number Columns Show Empty "—" for All Users in Users List', async () => {});
  // JF-452 [To Do]
  test.fixme('JF-452 Extra Unexpected Columns (Email, Phone, Roles) Present in Users List Table vs. Spec', async () => {});
  // JF-453 [To Do]
  test.fixme('JF-453 Status Filter Dropdown Contains Undocumented "Pending" (قيد الانتظار) Option', async () => {});
  // JF-454 [To Do]
  test.fixme('JF-454 National ID Column Shown in Users List But No National ID Field in Create User Form', async () => {});
  // JF-455 [Rejected]
  test.fixme('JF-455 Edit Action Redirects to Empty Screen Instead of Edit User Form', async () => {});
  // JF-456 [To Do]
  test.fixme('JF-456 Unauthorized User Can Access User Management Page — Permission Enforced at API Level Only', async () => {});
  // JF-457 [Rejected]
  test.fixme('JF-457 Delete User Action Returns 500 Internal Server Error', async () => {});
  // JF-458 [To Do]
  test.fixme('JF-458 Phone Number Displayed with "+" at End Instead of Beginning in Users List', async () => {});
  // JF-459 [To Do]
  test.fixme('JF-459 Role Names Displayed as Raw English System Codes Instead of Arabic Labels in Users List', async () => {});
  // JF-464 [Ready For UAT]
  test.fixme('JF-464 New estate file is not automatically linked to the correct flowchart due to missing "Stage" value in', async () => {});
  // JF-495 [Ready For UAT]
  test.fixme('JF-495 Inheritance Manager and Relation Manager are not automatically assigned to newly created inheritance', async () => {});
  // JF-497 [Ready For UAT]
  test.fixme('JF-497 An exception occurred in the database while saving changes for context type', async () => {});
  // JF-504 [To Do]
  test.fixme('JF-504 "PM" and "AM" are displayed in English instead of Arabic in the سجل التركة tab', async () => {});
  // JF-510 [To Do]
  test.fixme('JF-510 Events with the same timestamp are not displayed in the correct chronological order in the سجل الترك', async () => {});
  // JF-511 [Ready For UAT]
  test.fixme('JF-511 Rejection notification is NOT sent to the assigned Inheritance Manager when the inheritance fails th', async () => {});
  // JF-512 [To Do]
  test.fixme('JF-512 Inheritance Manager assignment notification does NOT indicate whether the referral request receipt s', async () => {});
  // JF-513 [Ready For UAT]
  test.fixme('JF-513 Rejection reasons are not displayed in the notification or in the rejection decision area on the inh', async () => {});
  // JF-515 [Rejected]
  test.fixme('JF-515 Rejection notification disappears from the notification window after the Inheritance Manager takes a', async () => {});
  // JF-516 [To Do]
  test.fixme('JF-516 File upload fails with "bucket acl" permission error when attaching a document in the رفض التعذر ove', async () => {});
  // JF-517 [To Do]
  test.fixme('JF-517 Event details show "لم تتغير" in the new status field after رفض التعذر despite the inheritance statu', async () => {});
  // JF-519 [To Do]
  test.fixme('JF-519 Rejection notification is only sent for one inheritance and not for each rejected inheritance indepe', async () => {});
  // JF-520 [To Do]
  test.fixme('JF-520 Attachment field in رفض التعذر dialog shows incorrect allowed file types and maximum file size', async () => {});
  // JF-541 [To Do]
  test.fixme('JF-541 Late SAMA callback accepted with 200 OK but DB status not updated after retry exhaustion', async () => {});
  // JF-543 [To Do]
  test.fixme('JF-543 Assignment event details do not display the assigning party or the assigned party name', async () => {});
  // JF-561 [Blocked]
  test.fixme('JF-561 System does not notify the senior Inheritance Manager when no active Inheritance Managers are availa', async () => {});
  // JF-562 [Ready For UAT]
  test.fixme('JF-562 Automatic Inheritance Manager and Relation Manager assignment stops working after deactivating and r', async () => {});
  // JF-568 [To Do]
  test.fixme('JF-568 Phone number field incorrectly marked as mandatory in Heir Confirmation popup', async () => {});
  // JF-569 [To Do]
  test.fixme('JF-569 System allows heir confirmation with empty mandatory fields (no DB data pre-filled)', async () => {});
  // JF-570 [To Do]
  test.fixme('JF-570 Heir Confirmation popup displays incorrect title "تعديل وريث" instead of "تأكيد وريث"', async () => {});
  // JF-573 [Rejected]
  test.fixme('JF-573 Multiple field labels and status values on the real estate asset details page are displaying raw tra', async () => {});
  // JF-597 [Ready For UAT]
  test.fixme('JF-597 SAMA Integration: rpgetliabsinfo and rpgetsafsinfo callbacks fail on new case creation', async () => {});
  // JF-661 [To Do]
  test.fixme('JF-661 Manual re-inquiry attempt is NOT logged in the audit trail with the user ID', async () => {});
  // JF-662 [To Do]
  test.fixme('JF-662 SAMA bank data only binds to UI for first heir — remaining heirs show no data despite status 5 in DB', async () => {});
  // JF-663 [Ready For UAT]
  test.fixme('JF-663 Balance amount displays currency code "1" prepended to value — shows "1 120,000.50" instead of "120,', async () => {});
  // JF-669 [To Do]
  test.fixme('JF-669 Manual Re-Inquiry User ID Not Logged in Audit Trail for Real Estate Registry', async () => {});
  // JF-670 [To Do]
  test.fixme('JF-670 Deceased National ID Stored as Plain Text in real_estate_titles_records — Privacy Violation', async () => {});
  // JF-673 [To Do]
  test.fixme('JF-673 Server Returns 502 Bad Gateway When IdNumber Contains Extremely Large Value', async () => {});
  // JF-676 [To Do]
  test.fixme('JF-676 Automatic CMA inquiry event is not displayed in the inheritance event log', async () => {});
  // JF-713 [To Do]
  test.fixme('JF-713 System creates a new version when saving a published task with no changes made', async () => {});
  // JF-727 [To Do]
  test.fixme('JF-727 File upload fails with HTTP 500 error during disclosure submission', async () => {});
  // JF-744 [To Do]
  test.fixme('JF-744 FE : Toast message not appear on different scenarios and No error message shown to user ', async () => {});
  // JF-745 [Rejected]
  test.fixme('JF-745 User stuck on Register Details screen after closing OTP popup — INVALID_TOKEN, register 400 loop and', async () => {});
  // JF-752 [To Do]
  test.fixme('JF-752 When creating a new disclosure while an existing draft exists for the same estate, the system opens ', async () => {});
  // JF-753 [To Do]
  test.fixme('JF-753 Clicking "Cancel" on an in-progress draft disclosure deletes the draft permanently instead of discar', async () => {});
  // JF-754 [To Do]
  test.fixme('JF-754 Inconsistent placement of action buttons across disclosure form pages, and button layout does not fo', async () => {});
  // JF-756 [To Do]
  test.fixme('JF-756 No UI error message shown when user account status is Inactive — ACCOUNT_INACTIVE error not surfaced', async () => {});
  // JF-757 [To Do]
  test.fixme('JF-757 Disclosure submission silently fails when an attachment is included. The "Confirm Disclosure" button', async () => {});
  // JF-845 [To Do]
  test.fixme('JF-845 Wrong validation error message displayed for PDF attachments exceeding 50MB during manual facility r', async () => {});
  // JF-846 [To Do]
  test.fixme('JF-846 Back button on the Registered Facilities page refreshes the page instead of navigating back — should', async () => {});
  // JF-847 [To Do]
  test.fixme('JF-847 Registered Facilities list does not support pagination — all records loaded at once', async () => {});
  // JF-848 [To Do]
  test.fixme('JF-848 Misleading error message shown for non-owner users during facility registration — rule is not enforc', async () => {});
  // JF-852 [To Do]
  test.fixme('JF-852 Facility attachment download URLs use internal OSS endpoint — files inaccessible from browser due to', async () => {});
  // JF-854 [To Do]
  test.fixme('JF-854 Services Tab — Service Type and Status dropdown filters have no effect on results', async () => {});
  // JF-855 [To Do]
  test.fixme('JF-855 Facilities Tab — Account Status dropdown filter has no effect on results', async () => {});
  // JF-856 [Rejected]
  test.fixme('JF-856 SP user cannot navigate back to facility list after entering a facility', async () => {});
  // JF-858 [To Do]
  test.fixme('JF-858 Upload failure error toast displays raw English text instead of Arabic user-friendly message', async () => {});
  // JF-859 [To Do]
  test.fixme('JF-859 Submit failure error toast displays raw English "Internal server error" instead of Arabic user-frien', async () => {});
  // JF-879 [To Do]
  test.fixme('JF-879 Uncaught TypeError "Cannot read properties of null (reading \'some\')" in subTypeDisabled computatio', async () => {});
});
