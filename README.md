# Define the Falcon project overview (reloaded after kernel reset)
project_falcon_overview = """
# 🛠️ Project Falcon Overview

## 📌 What Is Falcon?
**Falcon** is an internal web platform for **Continental Real Estate Solutions**, designed to:
- Track commercial appraisal orders
- Manage clients, appraisers, reviewers, and assignment workflow
- Streamline scheduling, delivery, and activity logging
- Centralize operations for the full team (Mike, Pam, Chris, Abby, etc.)

## 🧑‍💼 Target Users
| Role       | Access Summary                                                                 |
|------------|---------------------------------------------------------------------------------|
| **Admin**  | Full access to orders, clients, users, settings, dashboards                    |
| **Appraiser** | Sees only their own orders and calendar items. Can update progress.         |
| **Reviewer** | Sees orders needing review. Read-only access to most data.                   |
| **Client** | ❌ No client login (internal platform only)                                     |

## 🧭 Core Functionality

### ✅ Orders Management
- Create, edit, delete orders (admin)
- Filter by status, appraiser, or due date
- Track:
  - Status (`In Progress`, `Needs Review`, etc.)
  - Due dates (site visit, review, final)
  - Appraiser and fee split
  - Client info (selectable or manual)
- Inline editing of orders via `OrderDetailForm`
- Live activity log per order

### ✅ Clients Management
- Add/edit/delete clients
- View client-specific details via drawers
- Manual override allowed when client is not in database

### ✅ Users Management
- Add/edit/delete users
- Assign appraisers to jobs with automated split logic
- Reviewer and Admin roles shown with caps and permissions

### ✅ Dashboard
- Role-based dashboard views:
  - **Admin**: Calendar + recent orders + quick stats
  - **Appraiser**: Assigned orders + calendar + status cards
- Calendar shows:
  - 📍 Site visits
  - 🔍 Review dates
  - ⏰ Due dates
  - 🎉 Holidays

### ✅ Calendar
- Based on `@fullcalendar/react`
- Admins see **all events**
- Appraisers see **their own jobs**
- Reviewers see only **orders needing review**
- Clickable entries link to `OrderDetail`

### ✅ Activity Log
- Every key action (create, edit, update, complete, etc.) is logged
- Logs include:
  - User name
  - Timestamp
  - Role
  - Context (e.g., "Marked complete: 212 Brunell")
- Admin and Appraiser visibility logic (`visible_to` array)

## 💅 UI/UX Design Goals

| Element            | Style Choice                         |
|--------------------|--------------------------------------|
| **Styling**        | Tailwind CSS                         |
| **Component Base** | ShadCN UI-inspired + custom elements |
| **Icons**          | `lucide-react`                       |
| **Forms**          | Native inputs with Tailwind styling  |
| **Map**            | Leaflet for static previews          |
| **Calendar**       | FullCalendar with event styling      |
| **Drawer Panels**  | Radix or custom sliding panels       |
| **Tables**         | Clean, sortable, expandable rows     |
| **Cards**          | Rounded, hoverable summary views     |

## 🔌 Tech Stack

| Layer         | Stack                      |
|---------------|----------------------------|
| **Frontend**  | React + Vite               |
| **State**     | Custom hooks + Context API |
| **Backend**   | Supabase (PostgreSQL + Auth + Storage) |
| **UI**        | Tailwind, Headless UI, Lucide Icons |
| **Calendar**  | FullCalendar               |
| **Maps**      | Leaflet (static previews)  |
| **Forms**     | Controlled inputs (no external form libs) |
| **Build Tool**| Vite + Tailwind + PostCSS  |

## 🔒 Permissions Model

| Feature               | Admin | Appraiser | Reviewer |
|-----------------------|:-----:|:---------:|:--------:|
| View all orders       | ✅    | ❌ (only own) | ❌ (only 'In Review') |
| Create/edit/delete    | ✅    | ✅ (own only) | ❌ |
| Submit new orders     | ✅    | ❌         | ❌ |
| Assign appraisers     | ✅    | ❌         | ❌ |
| Edit users/clients    | ✅    | ❌         | ❌ |
| View calendar         | ✅    | ✅         | ✅ |
| See activity log      | ✅    | ✅ (limited) | ✅ |

## ⚠️ Known Gaps / Open Tasks
- [ ] Improve styling of calendar to match full UI
- [ ] Finalize review workflows (marking as complete)
- [ ] Add notification or alert logic (optional)
- [ ] Implement sorting/filtering across all table views
- [ ] Add Settings page content (currently a stub)
- [ ] Add static assets folder (`/images/`) for UI icons
- [ ] Add error fallback page and login redirect protection

# 📁 Project Falcon Component Overview

## 🧩 components/clients

Handles all UI and logic related to the client records within the Falcon platform.

- **ClientCard.jsx** – Compact visual representation of a client. Used in card-style views.
- **ClientDetail.jsx** – Detailed view for a single client, used in full-page views or modals.
- **ClientForm.jsx** – Form for adding/editing client info. Used by admins.
- **ClientList.jsx** – Displays multiple clients in a scrollable or paginated list.
- **ClientView.jsx** – Wrapper component for displaying a selected client's information (may combine detail and list or conditionally render them).


## 📁 components/orders

This folder contains all order-related UI logic including cards, tables, sidebars, and drawers.

- `OrderCard.jsx` – Compact summary card for individual orders. Used in dashboards.
- `ActiveOrdersList.jsx` – Scrollable list of active orders with selection + highlight logic.
- `OrdersTable.jsx` – Main table layout for order listings. Supports drawer expansion.
- `OrderDrawerContent.jsx` – Drawer content wrapper. Loads full order and splits layout into detail + sidebar.
- `OrderDetailPanel.jsx` – Left-side detail grid using `<MetaItem>`. Conditionally shows admin data.
- `OrderSidebarPanel.jsx` – Right-side drawer panel with map, key dates, and activity log.

## 📁 components/ui

Reusable UI elements styled with Tailwind and built on headless primitives or native HTML.

- `button.jsx` – Configurable `<Button>` with variant support. Uses `@radix-ui/react-slot`.
- `calendar.jsx` – React Calendar wrapper (`react-calendar`). Optional default CSS.
- `card.jsx` – Standardized card layout (`Card`, `CardHeader`, `CardContent`).
- `drawer.jsx` – Drawer wrapper based on Radix. ⚠️ Currently missing `RadixDrawer` import.
- `form.jsx` – Minimal `<FormField>` wrapper with optional label.
- `label.jsx` – Accessible form `<Label>`, styled with Tailwind.
- `map.jsx` – Leaflet-based map using `MapContainer` and markers.
- `select.jsx` – Styled `<select>` input.
- `textarea.jsx` – Styled `<textarea>` with responsive sizing.

**Import Convention:** All components are named exports. Use:
```js
import { Button } from '@/components/ui/button';

## 📁 components/users

Handles the display of user records in table format with expandable drawer details.

### `UsersTable.jsx`
- Renders a styled table of users.
- Columns:
  - User ID
  - Name
  - Role (capitalized)
- Clicking a row opens a drawer via the shared `TableDrawer` component.
- Tracks selected user using `useState`.
- Usage:
  ```js
  import UsersTable from '@/components/users/UsersTable';

  ## 📁 components/ (top-level)

These components support global layout, dashboards, activity logs, shared UI elements, and data drawers.

### `ActivityLogCard.jsx`
- Displays a single activity log entry.
- Shows user name, action, and timestamp.
- Used in activity log views.

### `ActivityLogPanel.jsx`
- Fetches and displays a list of activities for a given `orderId` from Supabase.
- Uses `ActivityLogCard` for each log entry.
- Displays fallback text when loading or empty.

### `Badge.jsx`
- Status badge with variant styles.
- Supported `type`s: `default`, `inProgress`, `review`, `completed`.
- Used in tables and cards to highlight status.

### `ContactForm.jsx`
- Controlled form for entering or editing contact info (name, email, phone).
- `onAdd()` callback used to trigger external save.
- Styled with basic Tailwind form classes.

### `DashboardCalendar.jsx`
- Full-featured calendar using `@fullcalendar/react`.
- Fetches orders and appointments from Supabase.
- Displays events by type (📍 Site, 🔍 Review, ⏰ Due, 🎉 Holiday).
- Supports compact mode and filters based on role.

### `DashboardCard.jsx`
- Reusable card component for dashboard modules.
- Optional `title`, `children`, and `className` props.
- Applies consistent padding, rounded corners, and hover effects.

### `FloatingActivityLog.jsx`
- Draggable, expandable activity widget fixed to bottom-left of the screen.
- Displays the 20 most recent visible logs for current user role.
- Uses `react-draggable` and Supabase for fetching.
- Toggle buttons to expand/collapse or close.

### `KeyDateCard.jsx`
- Displays a labeled date with optional icon inside a `Card`.
- Used in drawers to highlight things like site visits or due dates.

### `MapContainer.jsx`
- Static Google Maps embed for a given `lat` and `lng`.
- Renders a styled, responsive container with an iframe.
- Used in side panels to preview property location.

### `MetaItem.jsx`
- Displays a label + value row.
- Used in data panels (e.g. OrderDetailPanel) for showing structured info.

### `SectionHeader.jsx`
- Consistent section heading renderer.
- Used in layouts or detail views for visual separation.

### `Sidebar.jsx`
- Main sidebar navigation component.
- Uses `NavLink` to highlight the active route.
- Includes links to Dashboard, Orders, Clients, Users, and Calendar.

### `SidebarLink.jsx`
- Custom link component for sidebar usage.
- Highlights active route with blue background and subtle shadow.
- Accepts `to` and `label` props.

### `SummaryCard.jsx`
- Clickable stat box used in dashboard views.
- Accepts `label`, `count`, `color`, and `onClick`.
- Styled with Tailwind borders, shadows, and center alignment.

### `TableDrawer.jsx`
- Wrapper for rendering entity-specific detail panels (Order, Client, User).
- Props: `isOpen`, `onClose`, `data`, `type`.
- Dynamically selects the correct detail component:
  - `OrderDrawerContent`, `ClientDrawerContent`, `UserDrawerContent`
- Styled as a white rounded box with a close button.

## 📁 context

Context providers for managing application-wide user state and authentication.

### `UserContext.jsx`
- Creates a React context to share user session info throughout the app.
- Uses Supabase to:
  - Fetch the current session
  - Load the user’s profile from the `users` table
- Automatically refreshes on:
  - Sign in
  - Token refresh
  - Sign out
- Provides:
  - `user` (entire profile row)
  - `loading` (boolean while session/profile is loading)
- Usage:
  ```js
  import { internalUseUser } from '@/context/UserContext';
  const { user, loading } = internalUseUser();

## 📁 data

This folder contains static and sample data used for seeding or supporting calendar and dashboard functionality.

### `generateholidays.js`
- Node script that uses `date-holidays` to fetch U.S. public holidays for 2025.
- Filters only `type === 'public'` holidays.
- Outputs result to `usHolidays2025.json`.
- Run manually to regenerate the holiday file:
  ```bash
  node src/data/generateholidays.js

  ## 📁 layout

Defines the top-level layout structure shared across all app pages.

### `Layout.jsx`
- Wraps all pages in a consistent shell:
  - Sidebar with navigation links
  - Main content area using `<Outlet />`
  - Floating activity log component
- Navigation:
  - Uses `NavLink` to highlight current route
  - Role-based: only shows Clients/Users for admins, Calendar for non-reviewers
- Handles logout via Supabase and redirects to `/login`
- Tailwind-styled with sidebar width `w-64` and light background

**Components Used:**
- `FloatingActivityLog`
- `useSession()` from `hooks/useSession`
- `supabase.auth.signOut()`

**Routing Integration:**
- Must be nested inside `BrowserRouter`
- All routed content is injected via `<Outlet />`

## 📁 lib/hooks

Custom React hooks for managing shared form logic and user session state.

### `useEditableForm.js`
- Manages local state for form editing.
- Tracks a copy of `initialData` and updates when it changes (e.g., switching records).
- Provides:
  - `editedData`: current form state
  - `setEditedData`: setter to overwrite the whole form
  - `handleChange`: for `onChange` handlers (uses `e.target.name`)
  - `updateField(field, value)`: for programmatic updates:contentReference[oaicite:0]{index=0}

### `useSession.js`
- Central hook for accessing the authenticated user.
- Wraps `internalUseUser()` from `UserContext`.
- Returns:
  - `user`: full user profile
  - `loading`: true while session is loading
  - `isLoggedIn`, `isAdmin`, `isAppraiser`, `isReviewer`: role helpers:contentReference[oaicite:1]{index=1}
- Use this to avoid duplicating role logic across components.

## 📁 lib

Core utility modules including Supabase client setup, activity logging, and helper functions.

### `supabaseClient.js`
- Creates and exports a configured Supabase client.
- Also exports helper functions for:
  - `getClients()` – fetches all clients
  - `getUsers()` – fetches all users
  - `updateOrder(order)` – updates an order record by ID
- All errors are caught and logged to the console:contentReference[oaicite:0]{index=0}

### `logactivity.js`
- Centralized function for inserting activity records into the `activity_log` table.
- Accepts:
  - `user_id`, `order_id`, `action`, `role`, `visible_to` (array), `context` (object)
- Logs to Supabase and handles insert errors gracefully:contentReference[oaicite:1]{index=1}

### `utils.js`
- Utility helpers used across UI and hooks:
  - `cn(...inputs)` – merges class names using `clsx` and `tailwind-merge`
  - `formatDate(dateStr)` – formats a date to `Jul 2, 2025` style:contentReference[oaicite:2]{index=2}

  ## 📁 pages/api

Optional API route(s) used for server-side logic in a Vite or hybrid framework context.

### `activites.js`
- API handler to fetch the latest 20 activity log entries for a specific `orderId`.
- Filters only logs visible to appraisers (`visible_to_appraiser: true`).
- Sorts logs in descending order by timestamp.
- Returns:
  - `400` if `orderId` is missing
  - `500` if Supabase query fails
  - `200` with log data on success
- Used if deploying on a platform that supports serverless routes (e.g., Vercel):contentReference[oaicite:0]{index=0}

> 🟡 **Note:** This file may be redundant. If you're directly querying Supabase client-side (as in `FloatingActivityLog.jsx`), you can likely delete this unless you need server protection or middleware later.

## 📁 pages (Part 1 of 2)

These are the top-level routed pages for the Falcon platform. Each one corresponds to a user-facing screen.

### `AdminDashboard.jsx`
- Shown to users with `admin` role.
- Displays two main sections:
  - 📅 Calendar of upcoming due/review events
  - 📝 Recent orders (most recent 5)
- Uses `<OrderCard />` components inside a `Card` UI shell:contentReference[oaicite:0]{index=0}

### `AppraiserDashboard.jsx`
- Similar to AdminDashboard but scoped to only orders assigned to the current appraiser.
- Uses `<SummaryCard />` for quick stats and `<OrderCard />` for recent jobs.

### `ClientDetail.jsx`
- Dynamic route for editing or viewing a single client.
- Uses `useParams()` to detect `clientId` and loads from Supabase.
- Includes full form UI for editing fields.

### `Clients.jsx`
- Admin-only route to manage clients.
- Fetches all clients and renders a `<ClientsTable />` with drawer details.
- Includes "+ Add Client" button that links to `/clients/new`:contentReference[oaicite:1]{index=1}

### `Dashboard.jsx`
- Determines which dashboard component to show based on user role:
  - `admin` → `<AdminDashboard />`
  - `appraiser` → `<AppraiserDashboard />`
  - unknown → error message
- Gets role from `user_metadata.role` after login:contentReference[oaicite:2]{index=2}

### `EditClient.jsx`
- Used for both creating and updating a client.
- Loads from Supabase if editing an existing record.
- Includes validation and full controlled form logic:contentReference[oaicite:3]{index=3}

### `EditUser.jsx`
- Same structure as EditClient but for users.
- Can add new or edit existing users, including role and commission split.
- Supports deletion of users and basic error handling:contentReference[oaicite:4]{index=4}

### `ClientsTable.jsx` (in components, not pages)
- See components/clients.

### `UserDetail.jsx`
- Alias for EditUser; same functionality, accessed via `/users/:userId`.

### `AppraiserDashboard.jsx`
- Shows appraiser-specific view: limited to assigned orders and events.
- Structured similarly to AdminDashboard but with narrower scope.

### `NewOrder.jsx`
- Admin-only route for creating a new appraisal order.
- Fetches all clients and appraisers on load and populates dropdowns.
- Supports manual client entry (`manual_client`) for one-off jobs.
- Tracks local `formData` state using `useState()`, with helper `handleChange()` and `handleAppraiserSelect()` logic.
- On submit:
  - Creates order in Supabase
  - Logs activity using `logActivity()`
  - Redirects to `/orders`
- Basic form UI using native inputs, styled with Tailwind.
- No external form library used.

### `OrderDetail.jsx`
- Dynamic route for viewing and editing a single order (`/orders/:id`).
- Fetches the order by ID using `useParams()` and Supabase `select().single()`.
- Displays loading spinner (Lucide `<Loader2 />`) while fetching.
- On error, shows a basic error message.

#### Features:
- Wraps editable form in `<OrderDetailForm />`, passing:
  - `order`, `setOrder`
  - `handleChange()` – updates local state
  - `handleSave()` – calls Supabase `.update()` and handles saving state
- Inline form editing experience; no modal or drawer.
- Uses Tailwind for layout/styling.
- Does **not** include any client or appraiser display logic — assumes that’s handled by the form component.

### `OrderDetailForm.jsx`
- Inline form component for editing an order’s full detail set.
- Consumed inside `OrderDetail.jsx`.
- Uses custom form hook `useEditableForm()` to track changes and local state.
- Makes use of global Supabase helpers: `getClients`, `getUsers`, `updateOrder`.

#### Key Features:
- Supports **manual client name entry** or selecting from client dropdown (`ClientSelector.jsx`).
- Filters `users` to isolate appraisers.
- Includes:
  - Address, status, due dates (client/review/site visit)
  - Appraiser selection and fee split
  - Property and report type
  - Notes, paid status, and client invoice number
- Image-based calendar icon appears next to date fields (static asset reference: `/images/calendar-icon.png`).
- Submits data using `handleSave()`, which:
  - Calls `updateOrder(finalData)`
  - Shows toast success/error messages
  - Redirects to `/orders` on success
- Controlled form layout using `grid`, `shadow`, and Tailwind utility classes.
- Does **not** handle activity logging — assumes this happens at a higher level.

### `Orders.jsx`
- Full-page view listing all orders.
- Pulls from Supabase `orders` table with joined `clients` and `appraisers`.
- Uses role-aware logic to filter visibility:
  - **Appraiser**: only sees orders assigned to them.
  - **Reviewer**: only sees orders with status `In Review` or `Needs Review`.
  - **Admin**: sees all orders.

#### Features:
- Accepts filters from URL query string:
  - `?status=...` and `?appraiser=...`
  - Filters stored in `statusFilter` and `appraiserFilter` state.
- Orders list sorted by a selected field (`id` by default), toggled via `setSortField` and `setSortAsc`.
- Includes “Clear Filter” button that resets state and query string.
- Renders `OrdersTable` component and passes:
  - `orders` array (transformed to include `client_name`, `appraiser_name`)
  - `loading` state
  - Sort toggles (`sortField`, `sortAsc`, etc.)

#### Notes:
- Located at `/orders` route.
- Works in tandem with `OrdersTable.jsx`.
- May benefit from refactoring into a shared hook if filtering logic expands across other roles or views.

### `Settings.jsx`
- Static placeholder page for user or system configuration options.

#### Features:
- Displays a heading: **"Settings"**
- Shows static text: **"Here you can update your preferences."**

#### Notes:
- No dynamic content, forms, or settings logic yet.
- Can later be expanded to include:
  - User profile preferences
  - Notification settings
  - Admin-level configuration options

  ### `UserDetail.jsx`
- Full-page form to **create, edit, or delete** a user record (Admin only).
- Used for user management (name, email, role, and fee split %).

#### Features:
- Supports both **edit** (via `/users/:id`) and **new user** creation (via `/users/new`).
- Pulls user data from Supabase using `useParams()` on load (unless adding a new user).
- Form includes:
  - Name, Email, Role (admin/appraiser/reviewer), Split %
- Submits data to Supabase:
  - Inserts if new
  - Updates if existing
  - Deletes on confirmation
- Uses `navigate()` on successful save/delete.

#### Notes:
- Utilizes local state for form data and saving/loading/error flags.
- Minimal styling (Tailwind-based).
- `useSession()` is **not** used here, so access control is assumed at route level.

### `Users.jsx`
- Main page for **viewing and managing users**.
- Lists all users in the system, sorted alphabetically by name.

#### Features:
- **Admin-only** access to add new users via `+ Add User` button (navigates to `/users/new`).
- Fetches user list from Supabase on page load.
- Renders:
  - Loading message during fetch
  - Error message if fetch fails
  - Empty state if no users exist
  - `<UsersTable />` if users are found

#### Imports:
- `UsersTable` component from `components/users/UsersTable.jsx`
- Session context via `useSession` to check current user's role
- `supabaseClient` for DB interaction
- `useNavigate` from `react-router-dom` for routing

#### Notes:
- Only users with role `"admin"` see the "Add User" button.
- Designed with clean Tailwind styling and inline error/loading states.

### `index.html`
- Main HTML shell for the Falcon Platform (used by Vite as entry point).

#### Purpose:
- Mounts the React app to the `<div id="root"></div>`.
- Loads core calendar styles via CDN for **FullCalendar** components.

#### Head Includes:
- `<link>` to FullCalendar **DayGrid** and **TimeGrid** CSS via CDN:
  - `@fullcalendar/daygrid@6.1.8/main.min.css`
  - `@fullcalendar/timegrid@6.1.8/main.min.css`

#### Script:
- Loads `src/main.jsx` as the application entry point.

#### Notes:
- No favicon or custom meta tags yet (optional additions).
- Tailwind CSS and other app-level styling handled through Vite + PostCSS pipeline.
- Keep these CDN links in sync with your installed `@fullcalendar/*` versions in `package.json`.

### `jsconfig.json`
- Configuration file that enables absolute imports and modern JavaScript features in the Falcon Platform (for use with Vite + React).

#### Purpose:
- Helps IDEs (like VSCode) understand module paths.
- Enables the `@/` alias for cleaner, relative-free imports (e.g., `@/components/Sidebar` instead of `../../../components/Sidebar`).

#### Key Options:
- `"baseUrl": "."`: Sets the root of the project.
- `"paths": { "@/*": ["src/*"] }"`: Defines the `@` alias to point to `src/`.
- `"jsx": "react-jsx"`: Enables the modern JSX transform (used with React 17+).
- `"module": "ESNext"` and `"target": "ESNext"`: Enables modern JavaScript module syntax.
- `"allowJs"` / `"checkJs"`: Allow JS files in the project without type-checking (important since you're not using TypeScript).

#### Required?
✅ Yes — if you're using `@/` imports (which you are), this config is necessary.  
✅ It also improves developer experience in IDEs by enabling autocompletion and path resolution.

#### Notes:
- Works in tandem with your **Vite config** and **Babel/ESLint (if present)**.
- Keep this file version-controlled — it’s part of your build and dev tooling.

### Root Config Files

#### `package.json`
- Primary manifest for the Falcon Platform.
- Defines app name, version, scripts, and dependencies.
- Key scripts:
  - `dev`: Runs Vite dev server (`vite`)
  - `build`: Compiles the production build (`vite build`)
- Includes all essential libraries (React, Supabase, FullCalendar, Tailwind, etc.)
- Manages your dependency tree; lockfile (`package-lock.json`) reflects the exact installed versions.

#### `package-lock.json`
- Auto-generated by npm to lock dependency versions.
- Ensures consistent installs across environments.
- ⚠️ Do **not edit manually** — commit it to version control.

#### `vite.config.js`
- Configures Vite (your build tool and dev server).
- Likely contains the `@` alias for `src/`:
  ```js
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }

  # 🗃️ Supabase Database Schema

## `orders`

| Column            | Type          | Description                                                             |
|-------------------|---------------|-------------------------------------------------------------------------|
| `id`              | int8          | Primary key                                                             |
| `address`         | text          | Subject property address                                                |
| `status`          | text          | One of: 'In Progress', 'Needs Review', 'Completed', etc.               |
| `due_date`        | date          | Final report due date                                                   |
| `site_visit_date` | date          | Scheduled date for site inspection                                      |
| `review_due_date` | date          | Internal review due date                                                |
| `created_at`      | timestamp     | Record creation time (auto-generated)                                   |
| `updated_at`      | timestamp     | Last updated time (auto-generated)                                      |
| `notes`           | text          | Internal notes or appraiser instructions                                |
| `manual_client`   | text          | Manually entered client name (if not linked to DB record)               |
| `client_id`       | int8 (FK)     | Foreign key → `clients.id`                                              |
| `appraiser_id`    | uuid (FK)     | Foreign key → `users.id`                                                |
| `base_fee`        | numeric       | Total fee quoted to client                                              |
| `appraiser_split` | numeric       | Appraiser’s fee split percentage                                        |
| `appraiser_fee`   | numeric       | Appraiser’s actual fee based on split                                   |
| `client_invoice`  | numeric       | Internal invoice reference number                                       |
| `paid_status`     | text          | 'paid', 'unpaid', or other custom flag                                  |
| `report_type`     | text          | E.g., 'Sales Only', 'Full Appraisal', etc.                              |
| `property_type`   | text          | E.g., 'Retail', 'Industrial', 'Mixed-Use'                               |

### Foreign Key Constraints

- `client_id` → `public.clients.id`
- `appraiser_id` → `public.users.id`


## `clients`

| Column       | Type        | Description                        |
|--------------|-------------|------------------------------------|
| `id`         | uuid        | Primary key                        |
| `name`       | text        | Client company name                |
| `contact`    | text        | Contact person name                |
| `email`      | text        | Contact email                      |
| `phone`      | text        | Contact phone                      |
| `created_at` | timestamp   | Auto-generated                     |

## `users`

| Column        | Type        | Description                        |
|---------------|-------------|------------------------------------|
| `id`          | uuid        | Supabase Auth user ID              |
| `name`        | text        | Full name                          |
| `email`       | text        | User email                         |
| `role`        | text        | 'admin', 'appraiser', 'reviewer'   |
| `split`       | numeric     | Fee split %                        |
| `created_at`  | timestamp   | Auto-generated                     |

## `activity_log`

| Column        | Type        | Description                                  |
|---------------|-------------|----------------------------------------------|
| `id`          | serial      | Primary key                                  |
| `user_id`     | uuid        | FK to `users`                                |
| `order_id`    | integer     | FK to `orders`                               |
| `action`      | text        | Description of the action (e.g., 'Updated')  |
| `role`        | text        | Role of the user who took action             |
| `visible_to`  | json        | Array of roles that can see this log         |
| `created_at`  | timestamp   | Timestamp of action                          |


## 🚀 Local Dev Quickstart

```bash
git clone https://github.com/Chrisrossi92/project-falcon.git
cd project-falcon
npm install
npm run dev


















