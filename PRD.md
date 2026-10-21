# Bachaoo — Product Specification Document (PRD)

> **Status:** Living Document (Draft)  
> **Target Audience:** College students, interns, and early-career freshers living on a tight monthly budget.  
> **Core Mission:** Eliminate the "lump-sum illusion" and stop impulse spending through smart virtual envelope budgeting, dynamic daily allowances, and payment gatekeeping without requiring actual money transfers.

---

## 1. Problem Statement & Behavioral Insight

* **The Lump-Sum Illusion:** When a student receives ₹10,000 for the month, seeing that ₹10,000 in their bank app makes a ₹500 or ₹1,000 impulse expense (e.g., late-night food delivery, cab rides) feel deceptively small. By week 3, the account is empty.
* **The Two-Account Friction:** Traditional advice recommends keeping two accounts (one for savings, one for spending), but manual transfers between accounts are tedious, easily forgotten, and often incur fees or minimum-balance penalties.
* **Lack of Real-Time Trade-Off Awareness:** In standard UPI apps (GPay, PhonePe), money leaves instantly with zero friction or visual consequence to future days.

---

## 2. Core Concepts & Architecture

```mermaid
flowchart TD
    subgraph Total Liquidity Layer
        Total["Real Bank Balance (e.g., ₹50,000)"]
    end

    subgraph Flat Envelopes
        Total --> B_Goal["🎯 Goals: iPhone (₹12,000)"]
        Total --> B_Fixed["🔒 Fixed: Rent/Bills (₹15,000)"]
        Total --> B_Buffer["🛡️ Safe Buffer / Unallocated (₹13,000)"]
        Total --> B_Spend["☕ Monthly Spending Pool (₹10,000)"]
    end

    subgraph Dynamic Daily Pacer Engine
        B_Spend --> DailyCalc["Daily Pacer Formula: Pool ÷ Days Remaining"]
        DailyCalc --> TodayCard["Today's Safe-to-Spend Limit (e.g., ₹333)"]
    end

    subgraph Payment Gatekeeper & Friction
        TodayCard --> SpendAttempt{"Spend Attempt (e.g., ₹450)"}
        SpendAttempt -->|Within Limit| PayUPI["Launch UPI App"]
        SpendAttempt -->|Over Limit (+₹117)| OverspendPrompt{"Friction / Consequence Choice"}
        OverspendPrompt -->|Borrow from Tomorrow| Recalibrate["Recalibrate Remaining Days (₹315/day)"]
        OverspendPrompt -->|Pull from Bucket| DeductBucket["Deduct ₹117 from Safe Buffer or Goals"]
        Recalibrate --> PayUPI
        DeductBucket --> PayUPI
    end
```

---

## 3. Detailed Feature Breakdown (v1 / MVP)

### 3.1. Bank Account Linking & Master Liquidity
* **Multi-Account Aggregation:** Supports linking one or multiple bank accounts.
* **Zero Real Transfers:** Bachaoo does **not** act as an escrow, wallet, or prepaid instrument (PPI). Real funds stay securely in the user's bank accounts.
* **Unified Liquidity Pool:** Reflects the unified liquidity balance across all linked accounts in real time.

---

### 3.2. Simple Envelopes
All envelopes are identical virtual balances. An envelope has a name, current balance, color/icon, optional description, and optional monthly allocation. Names such as `Rent`, `iPhone`, `Home Repair`, or `Food` are labels chosen by the user, not behavior types.

One optional envelope can be selected as the **daily spending envelope**. Only that envelope participates in daily pacing and overspend friction. Spending from any other envelope deducts directly from its balance and does not affect the daily allowance.

The app does not judge whether an envelope is sufficiently funded, enforce bill due dates, track savings targets, or apply hardcoded priority rules. A low balance is simply displayed for the user to decide how to handle.

---

### 3.3. Daily Allowance Engine, Weekend Weighting & Calendar

#### A. Custom Distribution (Weekend Weighting)
Instead of flat division ($\text{Pool} \div \text{Days}$), users can configure custom weighting:
* **Weekday / Weekend Split:** e.g., Weekdays ₹250/day, Friday–Sunday ₹550/day.
* **Interactive Calendar:** Pre-renders projected allowances for every future day of the month based on active weights.

#### B. Dual Borrow Mechanics & Upfront Batch Spend Pattern
When spending exceeds today's remaining allowance, the user has two distinct borrow choices:
1. **Mode 1 — Advance from Upcoming Days (Sequential Future Drawdown):**
   * Instead of restricting to a single day, the user can advance across multiple upcoming consecutive days (e.g., Day +1, Day +2, Day +3) down to ₹0.
   * **Upfront Batch Purchase Use Case:** Supports planned bulk expenses (e.g., weekly supplies/rations or monthly bus pass, setting the next several days' allowance to ₹0 because those days require no spending).
   * **Psychological Guardrail:** Waking up to **₹0 allowance** on subsequent days serves as a powerful friction reminder against unnecessary impulse spending.
   * **Ceiling Constraint:** Permitted as long as the parent allowance bucket balance $\ge$ total transaction amount.
2. **Mode 2 — On-Demand User Normalization ("Smooth the Curve"):**
   * Normalization is **strictly user-empowered**, never forced by the system.
   * If a user with several ₹0 days decides they need liquid daily budget, they can tap a 1-click **"Normalize Remaining Days"** button on the hero dashboard or inside the calendar to re-spread whatever remains in the parent pool evenly across the cycle.
3. **1-Minute Ephemeral Undo Window:**
   * Any borrow or normalization action displays a 60-second floating snackbar/toast to immediately revert accidental taps without database history overhead.

---

### 3.4. The Dedicated Discrepancy Resolution Hub
Triggered on-demand via the **"Sync Balance"** button near Net Worth, or automatically on delta detection:

#### A. Negative Discrepancy ($\text{Synced Balance} < \text{Tracked Net Worth}$)
* **Interactive Splitting Interface:** If ₹5,000 is missing, the user is presented with a resolution card allowing itemized allocation (e.g., ₹2,000 from Daily Allowance [with normalize toggle], ₹1,000 from General Savings, ₹2,000 from iPhone Goal).
* **Automatic Fallback Cascade:** If ignored or unassigned:
  1. Deduct first from `General Savings`.
  2. If exhausted, deduct from `Allowance`.
  3. If exhausted, deduct from `Savings Goals`.
  4. Deduct from `Fixed Payments` only as the final critical resort.

#### B. Positive Discrepancy ($\text{Synced Balance} > \text{Tracked Net Worth}$)
* **Surplus Allocation Interface:** If +₹10,000 is detected (bonus, refund, gift):
  * Top-up an underfunded `Fixed Payments` bucket (or overfill it).
  * Direct to a specific `Savings Goal`.
  * Add to `Allowance` (either flat custom boost or normalize across remaining days).
  * Default destination if unassigned: **`General Savings`**.

---

### 3.4. Overspend "Consequence Engine" (Trade-Off Friction)
When a transaction exceeds today's remaining allowance (e.g., spending ₹400 when today's balance is ₹300):
1. **Option A — Bucket Cannibalization:** Take the deficit (₹100) from an existing savings/discretionary bucket.
2. **Option B — Borrow from Tomorrow:** Deduct ₹100 from the next day's (or upcoming days') allowance, reducing tomorrow's limit from ₹300 to ₹200.
* **Psychological Impact:** Forces active decision-making before the spend happens, making future costs tangible.

---

### 3.5. Payment Gatekeeper Flow & Android UPI Interceptor
* **Zero License Overhead (No TPAP/PSP Needed):** Rather than becoming a regulated NPCI Third-Party Application Provider (which costs crores and requires bank sponsorships), Bachaoo acts as a client-side **UPI Intent Interceptor & Forwarder**.
* **Flow:**
  1. Zomato/Blinkit/QR triggers `android.intent.action.VIEW` with `upi://pay?...`.
  2. Bachaoo registers this intent filter and appears in the Android payment app list.
  3. When selected, Bachaoo intercepts the payee details and amount, runs the budget/allowance evaluation, and applies friction/borrowing if exceeded.
  4. Bachaoo immediately forwards the transaction via an explicit Android Intent to the user's installed banking/UPI app (Google Pay, PhonePe, Paytm).

---

### 3.6. Real-World Sync & Unmonitored Transaction Handling
* **The "Blindspot" Challenge:** Autopay (Spotify/Netflix), cash withdrawals, or direct payments bypassing Bachaoo.
* **Dedicated Predictable Buckets:** Users can set up dedicated buckets for known auto-debits (e.g., `Subscriptions / Autopay` with ₹500/month) so recurring charges don't disturb discretionary allowances.

---

### 3.7. The "Liquidity Waterfall" Cascade & Bidirectional Delta Reconciliation
Discrepancies between the tracked virtual state and real bank accounts can be **negative** (unmonitored spends) or **positive** (silent refunds/credits).

#### A. Negative Discrepancy (Ghost Debits / Missed Spends)
When money leaves the bank without a detected SMS/notification:
1. **User Prompt Grace Period:** A notification alerts the user: *"₹X detected outside our scope. Tap to assign to a bucket, or it will be auto-settled."*
2. **Waterfall Auto-Deduction Hierarchy:** If unassigned, the system executes a priority cascade:
   * **Stage 1 (Primary Buffer):** Deduct from `savings_root` / `Safe Buffer`.
   * **Stage 2 (Discretionary Allowance):** If buffer is exhausted, deduct from `daily_allowance` and `spending_pool`.
   * **Stage 3 (Bucket Priority):** If deficit remains, deduct in descending order of bucket balance while protecting high-priority goals (`Saving for iPhone`) until the very last resort.

#### B. Positive Discrepancy (Ghost Credits / Silent Refunds)
When money enters the bank silently (e.g., e-commerce refund from Flipkart/Amazon, peer UPI repayment, interest credit):
1. **Delta Detection:** $\text{Real Bank Balance} > \sum \text{Bucket Balances}$.
2. **User Allocation Prompt:** *"Found an untracked +₹X credit (Refund or Transfer). Where should this go?"*
3. **Default Inflow Sink:** If unassigned, auto-credits into **`Safe Buffer / Savings`** so discretionary daily allowance is not artificially inflated without user consent.

---

### 3.8. The "Ghost Transaction" Edge Case (Why SMS Fails in India)
SMS parsing is inherently non-deterministic in India due to several ecosystem factors:
* **UPI Lite Transactions:** For micro-spends under ₹500 via on-device UPI Lite wallets, banks do not send individual SMS alerts to prevent telecom congestion.
* **Silent Inward Refunds:** E-commerce refunds (Flipkart, Swiggy, Zomato, Amazon) frequently arrive via IMPS/NEFT batch credits with no customer-facing SMS alerts.
* **TRAI DND & DLT Gateway Drops:** Regulatory scrubbing or poor cell reception in campus hostels often causes SMS delivery to drop silently.
* **Bank Maintenance Windows:** Late-night transactions (12:00 AM – 3:30 AM) during core banking settlement runs often fail to trigger SMS dispatch.

**Solution Architecture:**
* Rather than trusting SMS as a single point of truth, Bachaoo uses a **Hybrid Multi-Signal Model**:
  1. **Signal A (Direct App Spends):** 100% deterministic (captured at point of intent).
  2. **Signal B (Android Notification/SMS Listener):** Catches ~85-90% of external spends.
  3. **Signal C (Bidirectional Balance Check):** Periodic delta check that catches silent refunds and missed debits without requiring line-by-line bank statements.
Since Indian commercial banks do not expose open, real-time webhooks or pub-sub directly to third-party apps, synchronization is handled via three complementary layers:

1. **App Lifecycle Triggers (Event-Driven):**
   * **Post-Payment Intent Return:** When Bachaoo launches GPay/PhonePe and control returns to Bachaoo (`onActivityResult` / app resume), Bachaoo immediately decrements the expected amount and records the ledger entry.
   * **Foreground / App Resume:** Every time the app is opened, a quick delta check is performed.
   * **Manual Pull-to-Refresh:** Standard on-demand user refresh.
2. **On-Device Pub-Sub via Android `NotificationListenerService`:**
   * Avoids the heavy privacy friction and Play Store policy restrictions of `READ_SMS`.
   * Listens on-device for push notifications from banking apps and UPI apps (e.g., *"₹499 debited from A/c XX1234"*).
   * Acts as an immediate, event-driven local pub-sub trigger without user intervention.
3. **RBI Account Aggregator (AA) Framework (Automated Backend Sync):**
   * Long-term institutional solution: Integrates with consent-based Account Aggregators (e.g., Setu, Finvu) to fetch verified bank balances and statement deltas periodically via secure backend APIs.

---

### 3.9. Future Roadmap: Group Expense Splitting ("Indian Splitwise with UPI")
* **Direct UPI Settlement:** Unlike standard Splitwise where users must open an external UPI app and manually mark settlements, Bachaoo will integrate deep-linked 1-click UPI settling.
* **Envelope Attribution:** When splitting an expense, the user's share is automatically attributed to their daily allowance or corresponding bucket, while receivables are tracked without muddying the active spending limit.

---

## 4. Technical Architecture & Tech Stack

### 4.1. Mobile Client
* **Framework:** React Native with **Expo (Managed Workflow)**
* **Language:** TypeScript
* **Styling:** NativeWind (Tailwind CSS for React Native)
* **State Management:** Zustand (lightweight, predictable, Pinia-like DX)
* **Native Modules:**
  * `expo-camera` / `expo-barcode-scanner`: High-speed UPI QR code scanning.
  * `expo-linking`: Dynamic UPI Intent scheme (`upi://pay`) generation and deep-link handling.
  * `expo-local-authentication`: Biometric fingerprint / Face ID app locking.
* **On-Device Database (Local-First):** Expo SQLite / OP-SQLite for offline-first, 0ms latency allowance evaluations.

### 4.2. Backend & Cloud Infrastructure
* **Language/Runtime:** Go (Golang) — lightweight, memory-efficient, single-binary container deployment.
* **Framework / Router:** Go standard library or `go-chi/chi` / `gin-gonic/gin`.
* **Database:** PostgreSQL (ACID compliant for double-entry financial ledger integrity; `JSONB` for extensible bucket action rules).
* **Communication:** RESTful JSON API with JWT authentication and background ledger synchronization.

### 4.3. Project Directory Structure
```
bachaoo/
├── mobile/                 # React Native / Expo (TypeScript) client application
│   ├── app/                # Expo Router screen hierarchy (tabs, modals)
│   ├── src/
│   │   ├── components/     # UI widgets (AllowanceCard, BucketList, etc.)
│   │   ├── store/          # Zustand global stores (budgetStore, transactionStore)
│   │   ├── db/             # Local SQLite database & migrations
│   │   ├── utils/          # Calculation engine (daily pacer, waterfall cascade)
│   │   └── types/          # Shared TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
├── backend/                # Go (Golang) microservice & PostgreSQL migrations
│   ├── cmd/server/         # Entrypoint main.go
│   ├── internal/           # Business logic, ledger services, HTTP handlers
│   └── go.mod
└── PRD.md                  # Living product requirement & architectural specification
```

### 4.4. Development Environment Status
* **Node.js:** `v24.6.0` (Verified)
* **npm:** `v11.19.1` (Verified)
* **Git:** `v2.45.2` (Verified)
* **Testing Device:** Expo Go on Android / iOS

---

## 5. Change Log & Discussion History
* **Session 1:** Established core problem statement, college/fresher demographic, zero-transfer virtual buckets, daily allowance calendar, borrow-from-tomorrow logic, and UPI intent flow.
* **Session 2:** Added roadmap item for peer group expense splitting with direct UPI settlement; evaluated product-market fit and behavioral viability.
* **Session 3:** Defined initial hierarchical concept, Android UPI Interceptor (non-TPAP) architecture, and sync strategies.
* **Session 4:** Architected Liquidity Waterfall cascade and Android notification listener pub-sub pattern.
* **Session 5:** Architectural Simplification: Replaced recursive tree with Flat Envelopes + Dynamic Daily Pacer Engine.
* **Session 6:** Defined bucket archetypes, fixed bill status lifecycle, strict conservation invariant, and selected full-stack technology choices (React Native/Expo TS + Go + PostgreSQL + Local-First SQLite).
* **Session 7:** Mapped React Native mental model to Vue 3 + TS, verified local development toolchain (Node v24, npm v11, Git), locked modular monorepo structure (`mobile/` + `backend/`).
* **Session 8 (MVP Core Built):** Scaffolded Expo TypeScript app in `mobile/`. Implemented Zustand `useBudgetStore`, dynamic daily pacer engine, `AllowanceHeroCard`, `BucketCard`, `SpendModal` friction & consequence engine (Borrow from tomorrow / Pull from buffer), external debit reconciler, and verified 100% clean TypeScript compilation.
* **Session 9:** Documented zero-custody UPI intent payment architecture, analyzed "Ghost Transactions" (missed bank SMS, UPI Lite, silent Flipkart/Amazon refunds), and designed Bidirectional Delta Reconciliation (handling both unmonitored debits and untracked refund credits).
* **Session 10:** Built multi-bucket discrepancy resolution engine (`DiscrepancyResolutionSection`) with custom per-bucket adjustment inputs, `+Fill` helper, and auto-waterfall cascade.
* **Session 11 (UI Decluttering & Smart Calendar):** Cleaned up dashboard: removed persistent day cards and simulation bar from primary view. Created dedicated on-demand `AllowanceCalendarModal` (Daily, Weekly, and Monthly cycle pacing tabs). Implemented automatic next-day calendar progression based on local date, and isolated timeline & debit simulation into a discrete `DeveloperOptionsModal`. Refined borrow copy to "Advance from Upcoming Days" (Upfront Batch Spend pattern).
* **Session 12 (Envelope Simplification):** Removed fixed-bill, goal, buffer, and allowance envelope types. All envelopes now share the same balance model, with monthly allocation retained. Users may optionally designate one envelope as the daily spending envelope; discrepancy settlement requires explicit envelope selection without a hardcoded waterfall.
