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

### 3.2. Bucket Architecture, Action Rules & Bill Tracking

#### A. Strict Conservation Invariant
$$\text{Net Worth (Real Bank Balance)} = \sum_{i} \text{Bucket Balance}_i$$
If an unmonitored external transaction reduces the bank balance such that $\text{Net Worth} < \sum \text{Bucket Balance}$, an immediate modal/push alert triggers:
> *"Discrepancy of ₹X detected outside Bachaoo. Select a bucket to deduct from, or it will auto-deduct from `Savings`."*

#### B. The 4 Core Bucket Archetypes
Every bucket follows a clear role and automated action rule:

1. **Fixed Obligation / Bill (e.g., `Rent`, `Mess Fee`, `Electricity`):**
   * **Rule:** Auto-allocate fixed amount (e.g., ₹20,000) from Net Worth on a set cycle date.
   * **Lifecycle Status:** `Funded` $\to$ `Due` $\to$ `Paid`.
   * **Underfunded Warning:** If the due date is approaching and the bucket balance is lower than the required bill (or if money was cannibalized), the app highlights the card in amber/red: *"Rent of ₹20k due in 3 days — bucket is underfunded by ₹5k!"*
   * **Spend Lock:** Money in this bucket is shielded from daily discretionary spending unless explicitly unlocked by the user.

2. **Goal Accumulator (e.g., `iPhone`, `Goa Trip`):**
   * **Rule:** Auto-transfer fixed target (e.g., ₹10,000 monthly) from Net Worth.
   * **Behavior:** Compounds month-over-month towards a target milestone.

3. **Active Spending Pool / Allowance (e.g., `Daily / Monthly Allowance`):**
   * **Rule:** Auto-funded monthly (e.g., ₹10,000).
   * **Behavior:** Feeds the Dynamic Daily Pacer ($\text{Remaining} \div \text{Days Left}$).

4. **Residual / Sink Bucket (e.g., `Savings / Safe Buffer`):**
   * **Rule (Month-End Sweep):** At the end of the month, any unspent residue across discretionary buckets automatically sweeps into `Savings`.
   * **Buffer Role:** Acts as the primary shock-absorber for unexpected external bank debits.

---

### 3.3. Dynamic Daily Pacer Engine & Calendar
* **Dynamic Recalibration Formula:**
  $$\text{Today's Allowance} = \frac{\text{Remaining Discretionary Pool}}{\text{Days Remaining in Cycle}}$$
* **Rolling Rollover vs Borrowing:**
  * **Under-spending (Savings Win):** If you only spend ₹150 of your ₹333 allowance today, the remaining ₹183 naturally rolls over, slightly boosting future daily allowances or being swept into the Safe Buffer.
  * **Over-spending (Borrowing):** If you spend ₹450, future daily allowances seamlessly recalibrate downward (e.g., ₹315/day), making the consequence instant and automatic.
* **Interactive Calendar View:** Displays past performance (green = within daily allowance, red = overspent) and future projected daily allowances.

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

### 3.7. The "Liquidity Waterfall" Cascade (Deficit Absorption Engine)
When an unmonitored outside spend occurs and balance discrepancies ($\Delta$) are detected:
1. **User Prompt Grace Period:** A notification alerts the user: *"₹X detected outside our scope. Tap to assign to a bucket, or it will be auto-settled."*
2. **Waterfall Auto-Deduction Hierarchy:** If unassigned, the system executes a priority cascade:
   * **Stage 1 (Primary Buffer):** Deduct from `savings_root` (the unallocated root residual).
   * **Stage 2 (Discretionary Allowance):** If `savings_root` is exhausted, deduct from `daily_allowance` and `allowance`.
   * **Stage 3 (Bucket Priority / Descending Waterfall):** If deficit remains, deduct in descending order of bucket balance while respecting user-assigned bucket priorities (protecting high-priority goals like `Saving for iPhone` until the very last resort).

---

### 3.8. Root Node Synchronization Mechanics (Who Triggers the Update?)
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

