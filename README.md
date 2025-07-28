# Project Falcon



## Overview



**Project Falcon** is an internal web platform for **Continental Real Estate Solutions**.  It was designed to help a small appraisal office manage the entire lifecycle of commercial appraisal orders.  The application centralizes tasks such as creating and tracking orders, assigning appraisers, scheduling site visits and reviews, managing clients and users, and recording a history of every action.  Project Falcon is not a public‑facing product; it is meant to streamline internal operations and scale as the company grows.



## Table of Contents



1. [Overview](#overview)

2. [Key Features](#key-features)

3. [Tech Stack](#tech-stack)

4. [Getting Started](#getting-started)

5. [Project Structure](#project-structure)

6. [Roadmap / Open Tasks](#roadmap--open-tasks)

7. [Contributing](#contributing)

8. [License](#license)



## Key Features



### Orders Management



* **Create and edit orders.**  Admins can create new orders via the Orders page.  Each order includes fields such as client, appraiser, base fee, appraiser split, status and due dates.  The `OrderDetailForm` leverages a custom `useOrderForm` hook to pre‑fill existing values and compute appraiser fees based on the base fee and split【430372653444196†L44-L52】.  Users can choose an existing client or enter a custom client, assign an appraiser, edit due dates, and save their changes【430372653444196†L54-L100】.

* **Role‑based editing and deletion.**  Only users with proper permissions may edit or delete an order.  The permissions module defines helpers such as `canEditOrder` and `canDeleteOrder`, which restrict editing to admins and the assigned appraiser while the order is active【416544250918453†L12-L19】 and deletion to admins【416544250918453†L23-L24】.

* **Order list with filtering, sorting and pagination.**  The Orders page fetches orders from Supabase and filters them based on the user’s role: appraisers only see their own orders, while admins and reviewers see all orders【108710227852568†L23-L33】.  Client‑side filters allow users to narrow orders by status or appraiser【108710227852568†L56-L71】, and orders can be sorted by any field in ascending or descending order【108710227852568†L73-L83】.  The `OrdersTable` component handles pagination and displays ten orders per page, with “Prev” / “Next” controls【816753700770000†L62-L102】.

* **Drawer‑based order details.**  Clicking a row in the Orders table opens a drawer with detailed information about that order.  From the drawer, authorized users can edit fields, update status, schedule a site visit via a date picker, or delete the order.  The drawer uses Vaul’s `Drawer` component and a nested `OrderDrawerContent` to display details【816753700770000†L106-L114】.  A dialog allows setting a site‑visit date and saving it back to the order【816753700770000†L117-L133】.

* **Deep order view.**  Navigating to `/orders/:id` fetches the order along with its related client and appraiser names, transforming the data so the page can display either the relational name or manual entry【500239995843849†L15-L34】.  The page then renders an `OrderDetailForm` for editing【500239995843849†L61-L65】.

* **Activity log.**  Each order page can display an activity log panel showing actions performed on that order.  The panel loads entries from the `activity_log` table, including user name, action and timestamp【522863095335295†L11-L33】, and renders them with `ActivityLogCard` components that format the timestamp using `date‑fns`【667986739313400†L3-L13】.



### Clients Management



* **List clients.**  The Clients page fetches clients from Supabase and displays them in a table sorted by name.  If the list is empty, a “No clients found” message appears【59744152141010†L61-L67】.

* **Add new clients (admin only).**  An “+ Add Client” button appears for administrators and navigates to a form for creating a new client【59744152141010†L49-L57】.

* **Drawer for details.**  Each row in the clients table is clickable; clicking opens a side drawer with the client’s details.  The drawer content is provided by `ClientDrawerContent` and can include editing and deletion actions【59744152141010†L68-L94】.

* **Manual clients.**  When creating an order, users can either select a client from the list or enter a custom client.  The `useOrderForm` hook tracks whether the client is custom and stores the manual name accordingly【430372653444196†L54-L67】.



### Users Management



* **User directory.**  The Users page fetches all users from Supabase, sorted by name, and displays them in a responsive grid of cards【88913055298711†L14-L57】.  Admins see an “+ Add User” button to invite new users【88913055298711†L34-L44】.

* **Interactive user cards.**  Each user card flips to reveal editable details.  On the front, the card shows the user’s photo, name and role; the back contains a form to edit name, role, email, phone and upload license files【737264614979764†L101-L161】.  Users can upload license files, which are stored in Supabase storage.  The “Save” button commits changes back to the database, and “Cancel” reverts edits【737264614979764†L163-L180】.

* **View and manage licenses.**  When not editing, the back side lists all license files with links to download them.  If no licenses are uploaded, a placeholder message appears【737264614979764†L186-L216】.



### Dashboards



* **Role‑aware dashboard routing.**  The `Dashboard` component determines the logged‑in user’s role and routes them to the appropriate dashboard: admins see the Admin Dashboard, appraisers see the Appraiser Dashboard, and other roles get an unauthorized message【561628408623021†L20-L26】.

* **Admin Dashboard.**  The Admin Dashboard fetches all orders and displays two key widgets: an Upcoming Activity calendar and a table of open orders.  The calendar uses a `DashboardCalendar` component to visualize upcoming site visits, due dates and review deadlines【753477014407486†L46-L59】.  The open‑orders table lists all orders except those marked “Completed”【753477014407486†L43-L59】.

* **Appraiser Dashboard.**  The Appraiser Dashboard shows only the active orders assigned to the logged‑in appraiser.  It includes a two‑week calendar view for upcoming events and a table listing active orders without the appraiser column【686831164538286†L14-L40】.



### Calendar



* **Shared calendar page.**  The dedicated Calendar page displays a shared FullCalendar instance where everyone can see upcoming site visits, review due dates and final due dates.  Users can switch between month, week and two‑week views using the buttons above the calendar【785291958602515†L45-L67】.  Clicking an event navigates directly to the order detail page【785291958602515†L40-L43】.

* **Role‑based event filtering.**  When loading events, the Calendar page filters orders based on the user’s role: appraisers see only their orders, reviewers see only orders needing review, and admins see all orders【785291958602515†L16-L24】.  The events are transformed into FullCalendar events by a custom hook, `useOrderEvents`【785291958602515†L38-L38】.



### Permissions and Roles



* **Roles.**  Project Falcon defines four roles: `admin`, `appraiser`, `reviewer` and `client`.  Roles are stored in the `users` table and fetched via the `useRole` hook【408061277319521†L11-L39】.

* **Order permissions.**  Functions in `lib/utils/permissions.js` determine what actions a user can perform.  Admins can view all orders, create orders, edit any order and delete orders【416544250918453†L3-L24】.  Appraisers can view and edit their own orders while they are in active states such as “In Progress” or “Site Visit Scheduled”【416544250918453†L15-L17】.  Reviewers can edit their assigned orders when the status is “Needs Review”【416544250918453†L18-L19】.  Only admins can assign appraisers or delete orders【416544250918453†L23-L26】.

* **Client and user permissions.**  Only admins can view all clients and edit client records【416544250918453†L55-L59】.  Users can edit their own profile via the User Card, but only admins can edit other users【416544250918453†L60-L64】.

* **Activity log permissions.**  All roles can create log entries; admins can view all logs, appraisers can view their own logs and shared logs, and reviewers have placeholder rules for future review workflows【416544250918453†L66-L74】.



## Tech Stack



Project Falcon is built with modern web technologies:



| Layer                | Technology | Evidence |

|----------------------|------------|---------|

| Front‑end framework  | **React 18** with **Vite** build tool | `package.json` lists `react` 18.2.0 and `vite` ^5.0.0 as dependencies and dev dependencies【618920931081803†L28-L51】. |

| Styling              | **Tailwind CSS**, plus variants and animations | Tailwind and its companion packages (`tailwind-merge`, `tailwind-variants`, `tailwindcss-animate`) are included in dependencies【618920931081803†L38-L41】. |

| UI components        | **Radix UI** primitives and custom components | Radix packages (`@radix-ui/react-dialog`, `@radix-ui/react-slot`) appear in dependencies【618920931081803†L14-L16】. |

| Calendar             | **FullCalendar** with day, time and list views | FullCalendar packages (`@fullcalendar/core`, `@fullcalendar/daygrid`, `@fullcalendar/interaction`, `@fullcalendar/list`, `@fullcalendar/react`, `@fullcalendar/timegrid`) are dependencies【618920931081803†L8-L13】. |

| Data storage & auth  | **Supabase** | The project uses `@supabase/supabase-js` and the auth helper packages【618920931081803†L16-L19】, and `supabaseClient.js` creates a client with the project’s URL and anon key【837443017888518†L0-L10】. |

| Tables & charts      | **TanStack React Table** and **Chart.js** | These packages are present in dependencies【618920931081803†L20-L23】. |

| Date utilities       | **date‑fns** and **date‑holidays** for formatting and holiday data | Both libraries are dependencies【618920931081803†L24-L27】. |

| Icons and animations | **Lucide React**, **Framer Motion**, **Tippy.js** | These packages appear in `package.json`【618920931081803†L26-L42】. |



## Getting Started



### Prerequisites



* **Node.js** (v16+ recommended) and **npm** or **yarn**.

* A **Supabase** project with a `users`, `clients`, `orders` and `activity_log` tables.  The default Supabase URL and anon key in `src/lib/supabaseClient.js` are placeholders and should be replaced with your own credentials【837443017888518†L2-L8】.



### Installation



```

# Clone the repository

git clone https://github.com/Chrisrossi92/project-falcon.git

cd project-falcon



# Install dependencies

npm install



# Copy the environment variables template and edit it with your Supabase info

cp .env.example .env

# inside .env set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY



# Start the development server

npm run dev



# Build for production

npm run build

```



The dev script starts Vite’s development server (typically at `http://localhost:5173`), and the build script generates a production‐ready bundle.  See `package.json` for available scripts【618920931081803†L3-L5】.



## Project Structure



Project Falcon follows a modular structure.  Some key directories:



* **`src/pages/`** – top‑level pages for routes.  Examples include:

  * `Dashboard.jsx` routes users to the appropriate dashboard based on their role【561628408623021†L20-L26】.

  * `Orders.jsx` lists orders with filtering, sorting and pagination【108710227852568†L23-L83】.

  * `OrderDetail.jsx` fetches an individual order and renders a detailed edit form【500239995843849†L15-L34】.

  * `Clients.jsx` lists clients and provides a drawer for details【59744152141010†L68-L94】.

  * `Users.jsx` displays the user directory and supports adding new users【88913055298711†L34-L57】.

  * `Calendar.jsx` hosts the shared calendar view【785291958602515†L45-L79】.



* **`src/components/`** – reusable components.  Subfolders include:

  * `clients/` – components for client management, such as `ClientsTable` and `ClientDrawerContent` which renders a row and side panel respectively【59744152141010†L68-L94】.

  * `orders/` – components for order management, including `OrdersTable` for tabular display with pagination and drawers【816753700770000†L62-L114】, `OrderDrawerContent` for the detail drawer, and `OrderInfoFields` used in the order detail form.

  * `users/` – components like `UserCard` that display and edit users with a flip animation and license uploads【737264614979764†L101-L161】.

  * `ui/` – generic UI components such as buttons, cards and the `FullCalendarWrapper` which wraps the FullCalendar component and defines custom toolbar buttons【214595380149312†L14-L50】.

  * `ActivityLogCard` and `ActivityLogPanel` display logged actions for orders【522863095335295†L11-L33】【667986739313400†L6-L13】.



* **`src/lib/`** – utility functions and hooks:

  * `supabaseClient.js` exports the Supabase client and helper functions for fetching users, clients and updating orders【837443017888518†L12-L43】.

  * `hooks/` folder defines custom hooks such as `useSession` for retrieving the current user, `useRole` for role lookup【408061277319521†L11-L39】, `useOrders` and `useOrderForm` for order logic【430372653444196†L29-L35】.

  * `utils/permissions.js` centralizes permission checks for orders, clients, users and activity logs【416544250918453†L3-L24】.



* **`src/context/`** – context providers for global state, including user context and notification context.



* **`src/data/`** – holiday data and a script to generate U.S. holidays for the calendar.



* **`public/`** – static assets such as logo, icons and images.



## Roadmap / Open Tasks



The current codebase already delivers core functionality but leaves room for enhancements.  Planned improvements include:



* **Finalize review workflows.** Review logic exists in placeholder form; implement assignment of reviewers and transitions between review states【416544250918453†L18-L19】.

* **Notifications.** Add email or in‑app notifications when orders change status, reviewers are assigned, or due dates approach.

* **Enhanced filtering and sorting.** Provide UI controls to filter orders by status and appraiser and update URL parameters accordingly【108710227852568†L56-L71】.

* **Calendar styling and holiday integration.** Improve the visual design of the calendar and integrate holiday data from `generateholidays.js` so holidays appear automatically.

* **Settings page.** Complete the Settings page with real preferences and user profile editing【653941288517693†L3-L7】.

* **Error handling and fallbacks.** Add robust error messages and fallback screens for network failures or unauthorized access.



## Contributing



Pull requests and issues are welcome!  To contribute:



1. Fork the repository and create a feature branch.

2. Make your changes, ensuring code is linted and tested.

3. Submit a pull request explaining the problem and how your change fixes it.



For larger features or architectural changes, please open an issue first to discuss your proposal.



## License



This project currently does not specify a license.  To allow open‑source collaboration, consider adding an [MIT](https://opensource.org/licenses/MIT) or [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) license.  Until then, the code should be considered proprietary to Continental Real Estate Solutions.
