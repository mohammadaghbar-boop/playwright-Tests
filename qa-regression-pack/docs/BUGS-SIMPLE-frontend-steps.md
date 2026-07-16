# JF Bugs — Simple Summary + How to See Each One in the Portal

Plain-language list of the 14 confirmed new bugs, ordered most → least serious.
Full technical detail is in `DEFECTS-LOG.md`; this file is for eyeballing them in the browser.

## Before you start — log in
1. Open **https://d-infath-jf-portal.azm-cit.com/login**
2. Click **"مستخدمين تجريبيين"** (Demo Users), then choose **admin@infath.sa** (full admin)
   or **demo-estate-manager**. (The `test2@test.com` account does NOT work here.)
3. Test estates already in the system: **INH00005 → INH00011**.

> Note: bugs marked **[API-level — UI not ready]** were found via the backend because the
> Assets screen currently shows "الأصول قريبا / Coming soon" for the accounts we have. You
> may not be able to click through those until that screen is enabled.

---

## 1. ~~Liquidator can't log in at all~~ → NOT A BUG (by design) ✅ closed
**Reviewed & re-verified 2026-07-16 — this is expected behavior, not a defect.** Liquidators
log in **only through Nafath**, and first-time **registration is part of the normal onboarding
flow**. We re-drove it: Nafath login → **/register** → email + valid mobile → **متابعة** → the
OTP screen appears ("تم إرسال رمز التحقق إلى رقم الجوال…") — i.e. the flow works up to sending
the code. (A fake mobile like 0500000011 is correctly rejected; a valid one triggers the OTP.)
The only thing that stops *us* from finishing is that the portal's registration OTP isn't shown
to our test tooling — a **test-environment limitation, not a product bug.**

## 2. "Deactivate task" shows a server error  🔴 High
**What's wrong:** Turning a task off fails with an internal error; the task stays active.
**See it:** Log in as admin → **إدارة المهام (Task Management)** → open the **⋮ menu** on any task → **إلغاء التفعيل (Deactivate)** → a red **"حدث خطأ داخلي"** error appears and the task is still active.

## 3. "Delete task" shows a server error  🔴 High
**What's wrong:** Deleting a task fails with an internal error; nothing is removed.
**See it:** **إدارة المهام** → **⋮ menu** on a task → **حذف (Delete)** → confirm → red **"حدث خطأ داخلي"** error; the task is still in the list.

## 4. A non-qualifying estate is NOT auto-rejected  🔴 High
**What's wrong:** An estate that should be automatically rejected (no final judgment + no sale authority) stays open instead.
**See it:** Open estate **INH00011** → check its status/timeline. It's still "جديد / New" with no rejection event, even though the work-requirements rule should have rejected it.

## 5. Real-estate estimated value is always empty  🔴 High
**What's wrong:** The automatic property valuation never gets saved, so every property shows no value.
**See it:** Open estate **INH00005** (or 00006) → **Assets / الأصول** → any real-estate asset shows **estimated value = "-"**, and the estate's **"القيمة التقديرية للتركة"** is "-". **[Assets screen may show "Coming soon" — otherwise API-level]**

## 6. Manually-added assets don't show in the assets list  🔴 High
**What's wrong:** You can add an asset and it saves, but it never appears in the estate's asset list.
**See it:** Open an estate → **Assets / الأصول** → add a new asset → it does not appear in the list afterward. **[API-level — UI not ready]**

## 7. Duplicate property deed accepted  🔴 High
**What's wrong:** You can add two properties with the same deed number to one estate; the duplicate isn't blocked.
**See it:** Open an estate → **Assets** → add a real-estate asset with a deed number → add another with the **same deed number** → both are accepted. **[API-level — UI not ready]**

## 8. Duplicate vehicle serial accepted  🔴 High
**What's wrong:** Same as #7 but for vehicles — two vehicles with the same serial number are both accepted.
**See it:** Open an estate → **Assets** → add two vehicles with the **same serial number** → both accepted. **[API-level — UI not ready]**

## 9. ~~Service registration gets stuck on step 2~~ → NOT A BUG ✅ debunked (re-verified 2026-07-16)
**Re-driven carefully: the wizard works — all 6 steps pass.** The earlier finding was an
automation artifact: the date fields simply don't accept *typed* dates — you must open the
calendar and **click the day**, then the value commits and **Next** enables.
**BUT a new, worse bug was found in its place (see #9-NEW):**

## 9-NEW. Final "Register service" submit fails — server error on Terms & Conditions  🔴 Critical
**What's wrong:** After completing all 6 wizard steps, clicking **تسجيل الخدمة (Register the
service)** fails because the server's site-config (terms & conditions, privacy notice, etc.)
returns an internal error — for **every** content key. The service is never created, which
blocks the whole liquidator onboarding at its final step.
**See it:** As an approved facility's service provider → complete the wizard steps 1–6 →
click the final **تسجيل الخدمة** → a server error appears (behind the scenes:
`site-config/...terms-and-conditions` → **500 خطأ في الخادم الداخلي**, 3× reproduced).

## 10. Vehicle valuation returns zero vehicles  🟠 High
**What's wrong:** The vehicle-price check reports "success" but brings back no vehicles, so no valuation is produced.
**See it:** Open estate **INH00007** (has vehicles) → **Assets / vehicle valuation** → the vehicle valuation is empty even though the check says it succeeded.

## 11. Closing an inquiry (as recipient) does nothing  🟠 High
**What's wrong:** When the recipient of an inquiry tries to close it, the Close button does nothing and the inquiry stays open.
**See it:** Open an inquiry (استفسار) you received → click **إغلاق (Close)** → a reason box appears and accepts text, but clicking the final **Close** does nothing; status stays **قيد التنفيذ (In progress)**. (Note: the creator closing it works fine — only the recipient path is broken.)
*(Please confirm manually — worth one click-through to rule out a button issue.)*

## 12. Can't view a role's details  🟡 Medium
**What's wrong:** The Roles list has no "View" action, so you can't open a role to see its permissions.
**See it:** Log in as admin → **الأدوار (Roles)** → there's no view/eye action on the rows, so you can't open the read-only permission matrix.

## 13. No history entry when an asset is added  🟡 Medium
**What's wrong:** Adding an asset doesn't create an entry in the estate's activity log.
**See it:** Open an estate → add an asset → open **سجل التركة (Estate events log)** → there's no "تم إضافة أصل / Asset added" entry. **[API-level — UI not ready]**

## 14. Asset saved with no type / missing required fields  🟡 Medium (low)
**What's wrong:** The system will save an asset that has no asset type and is missing required fields.
**See it:** Open an estate → **Assets** → try to add an asset without choosing a type / without required fields → it saves anyway. **[API-level — the on-screen form may block this even though the backend doesn't]**

---

## Two extra items — probably NOT product bugs to file
- **Purchasing-Department login doesn't work** (`test2@test.com` → error). This looks like a **missing/expired test account**, not a product bug — check with the team for working PD credentials.
- **Roles list is missing a "Role Number" filter** that the spec mentions. Confirm the requirement still applies before filing.
