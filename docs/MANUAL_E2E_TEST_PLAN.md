# Falcon Manual E2E Test Plan

This checklist is the first-pass manual smoke plan for the hardened Falcon flows after the 8C5 invite, Team Access, order intake, client management, settings, and permission-route hardening work.

Use this file during browser testing. Record pass/fail status, notes, and defect IDs directly in the tables or in the defects section at the end.

## Testing Prerequisites

- Local or staging app is running against a database with the latest migrations.
- Supabase Auth email invite flow is configured with a valid app origin.
- Testers can access at least four accounts: Owner, Admin, Appraiser, Reviewer.
- At least one test account has memberships in two companies for current-company switching checks.
- Browser devtools are available for console/network inspection.
- Email inboxes or invite-link capture are available for invite acceptance testing.
- Known existing lint/build warnings are not treated as E2E failures unless a new runtime defect appears.

## Recommended Test Accounts

| Account | Required Access | Purpose | Ready |
|---|---|---|---|
| Owner | Active Owner role in Company A | Company-wide admin, owner grant/revoke, last-owner protection | [ ] |
| Admin | User management, invite, client/order management permissions | Day-to-day admin flows without Owner-only permissions | [ ] |
| Appraiser | Active Appraiser role only | Assigned order visibility, assignment picker eligibility | [ ] |
| Reviewer | Active Reviewer role only | Review visibility, reviewer assignment picker eligibility | [ ] |
| Limited member | Minimal or read-only permissions | Negative route/action tests | [ ] |
| Invited user | Not yet active in Company A | Invite acceptance tests | [ ] |
| Multi-company user | Active membership in Company A and Company B | Current-company isolation and switch tests | [ ] |

## Recommended Seed / Setup Data

| Data | Requirement | Fixture Needed | Ready |
|---|---|---|---|
| Company A | Active company with Owner/Admin/Appraiser/Reviewer members | No | [ ] |
| Company B | Active company with separate clients/orders/users | No | [ ] |
| Pending invite | Prepared or sent invitation for invited user | No | [ ] |
| Expired invite | Expired invitation for negative acceptance | Yes | [ ] |
| Cancelled invite | Cancelled invitation for no-longer-available copy | Yes | [ ] |
| Accepted invite | Already accepted invitation for replay test | No | [ ] |
| Active AMC | Category `amc`, active, non-merged | No | [ ] |
| Active clients | Regular clients, some attached to AMC | No | [ ] |
| Duplicate client name | Existing active client name | No | [ ] |
| Assigned orders | Orders assigned to Appraiser and Reviewer | No | [ ] |
| Unassigned/unrelated orders | Orders the limited member must not see | No | [ ] |
| Inactive member | Member available for reactivation test | Yes | [ ] |
| Single-owner state | Company with one active Owner | Yes | [ ] |

## Recommended Testing Order

1. Login, session, and current-company context.
2. Permission route access.
3. Invite send, resend, cancel, and accept.
4. Team Access role/status actions.
5. Order create/edit with appraiser/reviewer assignment.
6. Order client/AMC picker and inline client creation.
7. Client create/edit.
8. Dashboard and calendar visibility.
9. Settings profile color.
10. Negative and fixture-heavy cases.

## Stop And Fix Criteria

Stop the manual pass and fix before continuing if any of these occur:

- A user can see or mutate another company's data.
- A pending invitation grants operational access before acceptance.
- A wrong-account invite can be accepted.
- A route allows access without the required permission.
- Team Access role/status actions bypass backend protections.
- Owner/last-owner protections fail.
- Order/client pickers expose users or clients outside the active company.
- Inline client creation links to a cross-company or invalid AMC.
- Legacy role-string authority reappears in the browser-visible workflow.
- Session/current-company switching leaves the app showing stale company data.

## Pass / Fail Checklist

### 1. Login, Session, Current Company

| Done | Result | Test | Account Needed | Setup Data | Steps | Expected Result | Notes / Defect ID |
|---|---|---|---|---|---|---|---|
| [ ] | [ ] Pass / [ ] Fail | Login lands safely | Any active member | Active company membership | Log out, log in | User lands on `/dashboard`; session is valid |  |
| [ ] | [ ] Pass / [ ] Fail | Protected route return | Logged-out user | None | Open `/orders`, then log in | Login redirects back safely or lands on allowed dashboard |  |
| [ ] | [ ] Pass / [ ] Fail | Current company persists | Multi-company user | Company A and B memberships | Switch company, refresh browser | Active company remains selected |  |
| [ ] | [ ] Pass / [ ] Fail | Company switch refreshes session | Multi-company user | Company A and B data | Switch company, inspect dashboard/orders | Data changes to selected company only |  |
| [ ] | [ ] Pass / [ ] Fail | Stale company handling | Multi-company user | Fixture needed: removed/inactive membership | Load app with stale current company | App blocks stale visibility and recovers safely | Fixture needed |

### 2. Permission Route Access

| Done | Result | Test | Account Needed | Setup Data | Steps | Expected Result | Notes / Defect ID |
|---|---|---|---|---|---|---|---|
| [ ] | [ ] Pass / [ ] Fail | Owner/admin route access | Owner/Admin | Active company | Visit `/users`, `/clients`, `/orders`, `/settings` | Allowed routes load |  |
| [ ] | [ ] Pass / [ ] Fail | Appraiser route restrictions | Appraiser | Appraiser-only role | Direct-open `/users`, `/clients/new`, `/orders/new` | Unauthorized routes are blocked |  |
| [ ] | [ ] Pass / [ ] Fail | Reviewer route restrictions | Reviewer | Reviewer-only role | Direct-open admin/client create routes | Unauthorized routes are blocked |  |
| [ ] | [ ] Pass / [ ] Fail | Settings permission | Active member | `settings.view` expected | Open `/settings` | Settings loads only when permission allows |  |
| [ ] | [ ] Pass / [ ] Fail | Logged-out protected access | Logged-out user | None | Open `/clients` | Redirects to login; no data visible |  |

### 3. Invite Send, Resend, Cancel, Accept

| Done | Result | Test | Account Needed | Setup Data | Steps | Expected Result | Notes / Defect ID |
|---|---|---|---|---|---|---|---|
| [ ] | [ ] Pass / [ ] Fail | Send company invite | Owner/Admin | Target email not active in company | `/users` -> Invite New Member -> choose preset -> send | Invite appears pending; recipient has no access yet |  |
| [ ] | [ ] Pass / [ ] Fail | Resend invite | Owner/Admin | Pending sent/prepared invite | Click resend action | New invite email is sent; old pending invite is replaced/cancelled as designed |  |
| [ ] | [ ] Pass / [ ] Fail | Cancel invite | Owner/Admin | Pending invite | Cancel invite and confirm | Invite becomes non-actionable; list refreshes |  |
| [ ] | [ ] Pass / [ ] Fail | Accept while logged out | Invited user | Valid invite link | Open invite link while logged out, log in | Returns to accept page, accepts, refreshes session, lands dashboard |  |
| [ ] | [ ] Pass / [ ] Fail | Accept while logged in | Invited user | Valid invite link | Log in first, then open accept link | Invite accepts; company access becomes active |  |
| [ ] | [ ] Pass / [ ] Fail | Wrong-account invite | Different signed-in user | Valid invite for another email | Open accept link | Safe wrong-account error |  |
| [ ] | [ ] Pass / [ ] Fail | Expired invite | Invited user | Expired invite | Open accept link | Safe expired error | Fixture needed |
| [ ] | [ ] Pass / [ ] Fail | Already accepted invite | Invited user | Accepted invite | Reopen accepted link | Safe no-longer-available error |  |

### 4. Team Access Role / Status Actions

| Done | Result | Test | Account Needed | Setup Data | Steps | Expected Result | Notes / Defect ID |
|---|---|---|---|---|---|---|---|
| [ ] | [ ] Pass / [ ] Fail | Member list loads | Owner/Admin | Active members | Open `/users` | Team Access member list loads |  |
| [ ] | [ ] Pass / [ ] Fail | Edit role presets | Owner/Admin | Editable member | Open Edit Roles, select preset roles, save | Roles update through RPC; list refreshes |  |
| [ ] | [ ] Pass / [ ] Fail | Owner grant blocked when unauthorized | Admin without Owner grant | Owner role preset | Try assigning Owner | Safe permission error | Fixture needed |
| [ ] | [ ] Pass / [ ] Fail | Last-owner protection | Owner | Single active Owner | Try removing/deactivating last Owner | Safe last-owner error | Fixture needed |
| [ ] | [ ] Pass / [ ] Fail | Deactivate member | Owner/Admin | Active non-owner member | Deactivate and confirm | Member loses active company access |  |
| [ ] | [ ] Pass / [ ] Fail | Reactivate member | Owner/Admin | Inactive member | Reactivate and confirm | Member becomes active again | Fixture needed |
| [ ] | [ ] Pass / [ ] Fail | Unauthorized action hidden/blocked | Limited member | Limited permissions | Open `/users` or attempt action | Buttons hidden or backend blocks safely |  |

### 5. Order Create/Edit And Assignment Pickers

| Done | Result | Test | Account Needed | Setup Data | Steps | Expected Result | Notes / Defect ID |
|---|---|---|---|---|---|---|---|
| [ ] | [ ] Pass / [ ] Fail | Appraiser picker eligibility | Order creator | Active Appraiser and Admin without Appraiser role | Open order create/edit | Only explicit Appraiser role members appear |  |
| [ ] | [ ] Pass / [ ] Fail | Reviewer picker eligibility | Order creator | Active Reviewer | Open order create/edit | Reviewer picker shows explicit Reviewer role members |  |
| [ ] | [ ] Pass / [ ] Fail | Inactive members excluded | Order creator | Inactive appraiser/reviewer | Open pickers | Inactive members do not appear | Fixture needed |
| [ ] | [ ] Pass / [ ] Fail | Fee split compatibility | Order creator | Appraiser with default split | Select appraiser | Split/default behavior remains intact |  |
| [ ] | [ ] Pass / [ ] Fail | Create order | Order creator | Clients/users available | Create full order | Order saves and appears in list |  |
| [ ] | [ ] Pass / [ ] Fail | Edit order assignment | Order updater | Existing order | Change appraiser/reviewer, save | Assignment persists; no cross-company users visible |  |

### 6. Order Client / AMC Picker And Inline Client Creation

| Done | Result | Test | Account Needed | Setup Data | Steps | Expected Result | Notes / Defect ID |
|---|---|---|---|---|---|---|---|
| [ ] | [ ] Pass / [ ] Fail | Client picker loads | Order creator | Active clients | Open order form | Client options load from safe projection |  |
| [ ] | [ ] Pass / [ ] Fail | AMC picker loads | Order creator | Active AMC | Open order form | Active AMCs appear |  |
| [ ] | [ ] Pass / [ ] Fail | AMC-filtered clients | Order creator | Clients attached to AMC | Select AMC | Client dropdown filters/preserves current behavior |  |
| [ ] | [ ] Pass / [ ] Fail | Contact preview | Order creator | Client with contact fields | Select client | Safe contact preview fields display |  |
| [ ] | [ ] Pass / [ ] Fail | Duplicate client nudge | Order creator | Existing active client | Type matching manual client name | Duplicate warning/nudge appears |  |
| [ ] | [ ] Pass / [ ] Fail | Inline client creation | Order creator | New client name | Submit order with manual client | Client is created through order-form RPC; order uses created client |  |
| [ ] | [ ] Pass / [ ] Fail | Inline invalid AMC blocked | Order creator | Invalid/cross-company AMC | Submit manual client with invalid AMC | Safe invalid AMC error | Fixture needed |

### 7. Clients List / Detail / Create / Edit

| Done | Result | Test | Account Needed | Setup Data | Steps | Expected Result | Notes / Defect ID |
|---|---|---|---|---|---|---|---|
| [ ] | [ ] Pass / [ ] Fail | Client list loads | Client reader | Existing clients | Open `/clients` | List loads through management projection |  |
| [ ] | [ ] Pass / [ ] Fail | Client detail loads | Client reader | Existing client | Open client detail/profile | Safe detail fields display |  |
| [ ] | [ ] Pass / [ ] Fail | Create regular client | Client creator | None | `/clients/new`, create client | Client created through management RPC |  |
| [ ] | [ ] Pass / [ ] Fail | Create lender | Client creator | None | `/clients/new`, create lender | Lender created through management RPC |  |
| [ ] | [ ] Pass / [ ] Fail | Create AMC | Client creator | None | `/clients/new`, create AMC | AMC created through management RPC |  |
| [ ] | [ ] Pass / [ ] Fail | Edit client | Client updater | Existing client | Edit name/contact/status/category/AMC | Update persists through management RPC |  |
| [ ] | [ ] Pass / [ ] Fail | Duplicate client blocked | Client creator/updater | Existing active client | Create/update duplicate active name | Safe duplicate error |  |
| [ ] | [ ] Pass / [ ] Fail | Hard delete absent | Any client user | Existing client | Inspect active UI | No active hard-delete path is exposed |  |

### 8. Dashboard / Calendar Visibility

| Done | Result | Test | Account Needed | Setup Data | Steps | Expected Result | Notes / Defect ID |
|---|---|---|---|---|---|---|---|
| [ ] | [ ] Pass / [ ] Fail | Owner/admin dashboard lens | Owner/Admin | Company orders | Open dashboard | Company-wide/admin lens displays |  |
| [ ] | [ ] Pass / [ ] Fail | Appraiser dashboard lens | Appraiser | Assigned orders | Open dashboard | Assigned/appraiser lens displays |  |
| [ ] | [ ] Pass / [ ] Fail | Reviewer dashboard lens | Reviewer | Reviewer-visible orders | Open dashboard | Reviewer lens displays |  |
| [ ] | [ ] Pass / [ ] Fail | Owner/admin calendar | Owner/Admin | Company events/orders | Open calendar | Company-wide permitted events display |  |
| [ ] | [ ] Pass / [ ] Fail | Assigned calendar | Appraiser/Reviewer | Assigned and unassigned orders | Open calendar | Only permitted events display |  |
| [ ] | [ ] Pass / [ ] Fail | Cross-company isolation | Multi-company user | Company A and B data | Switch company and revisit dashboard/calendar | Only selected-company data displays |  |

### 9. Settings Profile Color

| Done | Result | Test | Account Needed | Setup Data | Steps | Expected Result | Notes / Defect ID |
|---|---|---|---|---|---|---|---|
| [ ] | [ ] Pass / [ ] Fail | Load profile color | Any user | Existing color optional | Open `/settings` | Color loads from current-user settings RPC |  |
| [ ] | [ ] Pass / [ ] Fail | Save valid color | Any user | None | Set `#3366FF`, save, refresh | Color persists |  |
| [ ] | [ ] Pass / [ ] Fail | Clear color | Any user | Existing color | Clear value if UI supports it, save | Color clears safely |  |
| [ ] | [ ] Pass / [ ] Fail | Invalid color rejected | Any user | None | Enter invalid color if UI allows | Safe invalid-color error | Browser input may prevent this |
| [ ] | [ ] Pass / [ ] Fail | Notification prefs unchanged | Any user | Existing prefs | Change notification prefs | Existing notification behavior still works |  |

## Defects Found

| Defect ID | Date | Tester | Area | Account | Steps / Evidence | Severity | Status |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

## Final Sign-Off

| Item | Sign-Off |
|---|---|
| Login/session/current company smoke passed | [ ] |
| Permission route access smoke passed | [ ] |
| Invite lifecycle smoke passed | [ ] |
| Team Access actions smoke passed | [ ] |
| Order create/edit and assignment smoke passed | [ ] |
| Client/AMC intake smoke passed | [ ] |
| Broad client management smoke passed | [ ] |
| Dashboard/calendar visibility smoke passed | [ ] |
| Settings color smoke passed | [ ] |
| Fixture-needed negative cases scheduled or completed | [ ] |

