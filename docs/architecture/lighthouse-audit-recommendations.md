# GitHub Issue: Lighthouse Performance Audit Recommendations & Improvements

**Issue Title:** [Perf/A11y/SEO] Address Top 3 Lighthouse Recommendations to Enhance Score

## Issue Description

We ran a Chrome Lighthouse audit on the InboxOS frontend application (production build served locally) to benchmark performance, accessibility, SEO, and best practices. 

The benchmark scores achieved after our bundles splitting and React memoization were:
* **Performance:** 92
* **Accessibility:** 87
* **Best Practices:** 96
* **SEO:** 90

To push these scores higher (specifically target 100% on SEO and Accessibility), the audit identified three main opportunities. This issue documents these top 3 recommendations and the corresponding fixes we implemented in the codebase.

---

## Identified Opportunities & Implemented Fixes

### 1. [Accessibility] Icon-Only Buttons Lack Accessible Names (Score: 0)
* **Problem:** Interactive elements like chevron pagination buttons, the refresh button, the dark mode toggle, and the mobile hamburger trigger were icon-only. Screen readers would announce them generically as "button", making the interface inaccessible.
* **Fix Implemented:** Added unique, localized `aria-label` attributes to all icon-only buttons in `Layout.tsx` and `EmailList.tsx`.
  * Mobile drawer close button: `aria-label="Close mobile menu"`
  * Hamburger menu trigger: `aria-label="Open mobile menu"`
  * Theme switcher: `aria-label="Toggle dark mode"`
  * Notification bell: `aria-label="Notifications"`
  * Refresh button: `aria-label="Refresh Ingests"`
  * Pagination keys: `aria-label="Previous page"` and `aria-label="Next page"`

### 2. [Accessibility] Page Does Not Have a `<main>` Landmark Element (Score: 0)
* **Problem:** Assistive technologies (like screen readers) rely on landmarks to let users jump to the main content area quickly. Since the login/register pages were not wrapped in a layout containing a `<main>` element, screen readers couldn't identify the primary content area.
* **Fix Implemented:** Replaced the outer container `<div>` tags in `LoginForm.tsx` and `RegisterForm.tsx` with `<main>` elements, ensuring all paths have a valid main landmark wrapper.

### 3. [SEO] Document Does Not Have a Meta Description (Score: 0)
* **Problem:** Search engines use meta descriptions to summarize page contents in search engine results pages (SERPs). `index.html` was missing a `<meta name="description">` tag, resulting in a deduction in SEO score.
* **Fix Implemented:** Added a descriptive `<meta name="description" content="...">` to the `<head>` of `frontend/index.html` to clearly define InboxOS's purpose to crawler bots.

---

## Verification & Status
* **Status:** Fully Resolved. All code modifications have been successfully compiled and validated.
* **Impact:** Accessibility score is projected to rise to **~95+** and SEO is projected to hit **100%** on subsequent local audits.
