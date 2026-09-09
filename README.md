# Equipment Borrowing and Return Monitoring System

## Systems Analysis and Design — Laboratory Exercise 3

**Course:** Systems Analysis and Design  
**Section:** BSIT Section B  
**Mode:** Individual  
**Frontend:** HTML, CSS, JavaScript  
**Backend:** Supabase (PostgreSQL + Authentication)  
**Hosting:** GitHub Pages  

---

## I. Problem Statement

The College maintains various equipment (laptops, projectors, cameras, microphones, routers, etc.) that students, faculty, and staff may borrow. Currently, borrowing is recorded manually, making it difficult to track which equipment is borrowed, who borrowed it, when items should be returned, equipment availability, return status, and overdue transactions. This manual process leads to lost records, double-bookings, and unaccounted equipment. The proposed **Online Equipment Borrowing and Return Monitoring System** digitizes the entire workflow, providing real-time tracking, automated overdue detection, and centralized record management accessible from any device through a web browser.

---

## II. Actors

| Actor | Description |
|-------|-------------|
| **System User / Equipment Custodian** | Authenticated user who manages equipment records, records borrowing transactions, processes returns, and monitors the system dashboard. Directly interacts with the application. |
| **Borrower** | Student, faculty, or staff who borrows equipment. Their information is recorded by the System User. Does not directly interact with the system. |

---

## III. System Architecture

```
INTERNET
   │
   ▼
GitHub Pages
   │
   ▼
HTML / CSS / JS
   │
   ▼
Supabase JS CDN
   │
   ▼
Supabase
   ┌───────────────┴───────────────┐
   │                               │
Authentication                 PostgreSQL
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                    equipment       borrow_transactions
```

---

## IV. Use Case Diagram

See: [documentation/use-case.png](documentation/use-case.png)

### Use Cases:

| # | Use Case |
|---|----------|
| UC-01 | Login |
| UC-02 | View Dashboard |
| UC-03 | Add Equipment |
| UC-04 | View Equipment |
| UC-05 | Edit Equipment |
| UC-06 | Delete Equipment |
| UC-07 | Search Equipment |
| UC-08 | Record Borrowing |
| UC-09 | View Transactions |
| UC-10 | Return Equipment |
| UC-11 | Search Transactions |
| UC-12 | Filter Transactions |
| UC-13 | Logout |

---

## V. Entity Relationship Diagram

See: [documentation/erd.png](documentation/erd.png)

**Relationship:** One equipment item can appear in many borrowing transactions over time, but each borrowing transaction refers to exactly one equipment item (1:M relationship).

### Equipment Table

| Field | Data Type | Description |
|-------|-----------|-------------|
| id | BIGINT (PK) | Auto-generated primary key |
| equipment_name | TEXT | Name of the equipment |
| category | TEXT | Equipment category |
| asset_code | TEXT (UNIQUE) | Unique identifier code |
| condition | TEXT | Good, Fair, or For Repair |
| availability | TEXT | Available or Borrowed |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### Borrow Transactions Table

| Field | Data Type | Description |
|-------|-----------|-------------|
| id | BIGINT (PK) | Auto-generated primary key |
| equipment_id | BIGINT (FK) | References equipment(id) |
| borrower_name | TEXT | Name of the borrower |
| borrower_type | TEXT | Student, Faculty, or Staff |
| department | TEXT | Office or department |
| date_borrowed | DATE | Date equipment was borrowed |
| due_date | DATE | Expected return date |
| date_returned | DATE | Actual return date (nullable) |
| status | TEXT | Borrowed, Returned, or Overdue |
| user_id | UUID (FK) | References auth.users(id) |
| created_at | TIMESTAMPTZ | Record creation timestamp |

---

## VI. Business Rules

| ID | Business Rule | Implementation |
|----|---------------|----------------|
| BR-01 | Equipment name cannot be empty | Client-side validation + HTML required attribute |
| BR-02 | Asset code must be unique | Database UNIQUE constraint + client error handling |
| BR-03 | Only available equipment may be borrowed | Equipment dropdown filters by availability = 'Available' |
| BR-04 | Borrower name must be provided | Client-side validation + HTML required attribute |
| BR-05 | Due date cannot be earlier than borrowing date | JavaScript date comparison validation |
| BR-06 | Newly borrowed equipment receives "Borrowed" status | Set in createBorrowing() function |
| BR-07 | Borrowed equipment becomes unavailable | Equipment availability updated to "Borrowed" on transaction creation |
| BR-08 | Returned equipment becomes available again | Equipment availability updated to "Available" on return |
| BR-09 | Equipment past due date identified as Overdue | checkOverdue() compares current date with due_date |
| BR-10 | Deletion requires user confirmation | Confirmation modal before delete operation |
| BR-11 | Only authenticated users may manage records | Supabase auth + session check + RLS policies |
| BR-12 | A returned transaction cannot be returned twice | Status check before processing return |

---

## VII. Requirements Traceability Matrix

| Requirement | Feature | Module | Test Case |
|-------------|---------|--------|-----------|
| FR-01 | User Login | auth.js | TC-01 |
| FR-02 | Add Equipment | equipment.js | TC-02 |
| FR-03 | Edit Equipment | equipment.js | TC-03 |
| FR-04 | Delete Equipment | equipment.js | TC-04 |
| FR-05 | Record Borrowing | transactions.js | TC-05 |
| FR-06 | Return Equipment | transactions.js | TC-06 |
| FR-07 | Detect Overdue | transactions.js | TC-07 |
| FR-08 | Search Records | equipment.js, transactions.js | TC-08 |
| FR-09 | Filter Records | equipment.js, transactions.js | TC-09 |
| FR-10 | Dashboard Summary | transactions.js (updateDashboard) | TC-10 |

---

## VIII. Functional Testing Results

| Test ID | Test Scenario | Expected Result | Actual Result | Status |
|---------|--------------|-----------------|---------------|--------|
| TC-01 | Login with valid account | Dashboard displayed | Dashboard displayed | ✅ PASS |
| TC-02 | Add equipment | Record successfully saved | Record saved and displayed | ✅ PASS |
| TC-03 | Edit equipment | Changes displayed | Changes reflected in table | ✅ PASS |
| TC-04 | Delete equipment | Confirmation shown before deletion | Confirmation modal displayed, item deleted | ✅ PASS |
| TC-05 | Borrow available equipment | Transaction saved, equipment becomes Borrowed | Transaction recorded, status changed | ✅ PASS |
| TC-06 | Return equipment | Transaction becomes Returned, equipment becomes Available | Both statuses updated correctly | ✅ PASS |
| TC-07 | View late borrowing | Record displayed as Overdue | Overdue status auto-detected | ✅ PASS |
| TC-08 | Search borrower | Matching transactions displayed | Filtered results shown | ✅ PASS |
| TC-09 | Filter Borrowed status | Only Borrowed transactions displayed | Correct filtering | ✅ PASS |
| TC-10 | Open deployment URL | System accessible online | System loads correctly | ✅ PASS |

---

## IX. Setup Instructions

### 1. Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and run the script in `documentation/database-setup.sql`
4. Go to **Authentication > Users** and create a test user account
5. Go to **Project Settings > API** and copy your:
   - Project URL
   - Anon/Public key

### 2. Configure the Application

1. Open `js/supabase.js`
2. Replace `YOUR_SUPABASE_URL` with your project URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

### 3. Deploy to GitHub Pages

1. Create a GitHub repository
2. Push all files to the repository
3. Go to **Settings > Pages** and enable GitHub Pages from the main branch
4. Access your system at: `https://username.github.io/repository-name/`

---

## X. Project Structure

```
SAD-EquipmentBorrowing/
├── index.html              ← Main application (Dashboard + Equipment + Transactions)
├── login.html              ← Authentication page
├── css/
│   └── style.css           ← Design system and all styles
├── js/
│   ├── supabase.js         ← Supabase client configuration
│   ├── auth.js             ← Authentication module
│   ├── equipment.js        ← Equipment CRUD module
│   └── transactions.js     ← Borrowing/Return/Overdue module
├── README.md               ← This documentation
└── documentation/
    ├── database-setup.sql  ← SQL setup script for Supabase
    ├── use-case.png        ← Use Case Diagram
    └── erd.png             ← Entity Relationship Diagram
```

---

## XI. Technologies Used

- **HTML5** — Page structure and semantic markup
- **CSS3** — Custom dark theme with glassmorphism design
- **JavaScript (ES6+)** — Application logic and DOM manipulation
- **Supabase** — PostgreSQL database, authentication, and Row Level Security
- **GitHub Pages** — Static site hosting

---

## XII. Bonus Feature

**Equipment Borrowing History** — Clicking on any equipment name displays its complete borrowing history, showing all past and current transactions. Data is fetched dynamically from Supabase.
