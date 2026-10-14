import { create } from 'zustand';
import { Bucket, Transaction } from '../types';

interface BudgetState {
  netWorth: number;
  buckets: Bucket[];
  spentToday: number;
  daysRemainingInCycle: number;
  transactions: Transaction[];

  // Selectors / Calculations
  getTodayAllowance: () => number;
  getTodayRemaining: () => number;

  // Actions
  spendDirect: (amount: number, title: string) => { success: boolean; overspent: boolean; deficit: number };
  spendWithBorrowTomorrow: (amount: number, title: string) => void;
  spendWithBorrowBucket: (amount: number, title: string, sourceBucketId: string) => void;
  reconcileExternalDebit: (amount: number, targetBucketId?: string) => void;
  setNetWorth: (amount: number) => void;
  advanceToNextDay: () => void;
}

const INITIAL_BUCKETS: Bucket[] = [
  {
    id: 'spending-pool',
    name: 'Daily Spending Pool',
    category: 'spending_pool',
    currentBalance: 10000,
    monthlyAllocation: 10000,
    iconName: 'Coffee',
    color: '#10B981', // Emerald
  },
  {
    id: 'rent-bill',
    name: 'Rent & Maintenance',
    category: 'fixed_bill',
    currentBalance: 20000,
    targetAmount: 20000,
    monthlyAllocation: 20000,
    dueDate: 5,
    billStatus: 'funded',
    iconName: 'Home',
    color: '#8B5CF6', // Purple
  },
  {
    id: 'iphone-goal',
    name: 'Saving for iPhone',
    category: 'goal',
    currentBalance: 12000,
    targetAmount: 80000,
    monthlyAllocation: 10000,
    iconName: 'Smartphone',
    color: '#3B82F6', // Blue
  },
  {
    id: 'savings-sink',
    name: 'Safe Buffer & Savings',
    category: 'savings_sink',
    currentBalance: 8000, // 50,000 - (10k + 20k + 12k)
    monthlyAllocation: 0,
    iconName: 'ShieldCheck',
    color: '#F59E0B', // Amber
  },
];

export const useBudgetStore = create<BudgetState>((set, get) => ({
  netWorth: 50000,
  buckets: INITIAL_BUCKETS,
  spentToday: 0,
  daysRemainingInCycle: 28,
  transactions: [
    {
      id: 'tx-1',
      title: 'Morning Chai & Bun Maska',
      amount: 45,
      bucketId: 'spending-pool',
      date: new Date().toISOString(),
      type: 'expense',
      note: 'Campus Canteen',
    },
  ],

  getTodayAllowance: () => {
    const { buckets, daysRemainingInCycle } = get();
    const spendingPool = buckets.find((b) => b.id === 'spending-pool');
    if (!spendingPool || daysRemainingInCycle <= 0) return 0;
    return Math.max(0, Math.floor(spendingPool.currentBalance / daysRemainingInCycle));
  },

  getTodayRemaining: () => {
    const todayAllowance = get().getTodayAllowance();
    const { spentToday } = get();
    return Math.max(0, todayAllowance - spentToday);
  },

  // Standard spend within allowance
  spendDirect: (amount: number, title: string) => {
    const remainingToday = get().getTodayRemaining();
    if (amount > remainingToday) {
      return {
        success: false,
        overspent: true,
        deficit: amount - remainingToday,
      };
    }

    set((state) => {
      const updatedBuckets = state.buckets.map((b) =>
        b.id === 'spending-pool' ? { ...b, currentBalance: b.currentBalance - amount } : b
      );

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title,
        amount,
        bucketId: 'spending-pool',
        date: new Date().toISOString(),
        type: 'expense',
      };

      return {
        netWorth: state.netWorth - amount,
        spentToday: state.spentToday + amount,
        buckets: updatedBuckets,
        transactions: [newTx, ...state.transactions],
      };
    });

    return { success: true, overspent: false, deficit: 0 };
  },

  // Consequence Option A: Borrow from Tomorrow
  spendWithBorrowTomorrow: (amount: number, title: string) => {
    set((state) => {
      const updatedBuckets = state.buckets.map((b) =>
        b.id === 'spending-pool' ? { ...b, currentBalance: b.currentBalance - amount } : b
      );

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title,
        amount,
        bucketId: 'spending-pool',
        date: new Date().toISOString(),
        type: 'borrow',
        borrowDetails: {
          source: 'tomorrow',
        },
        note: 'Borrowed from upcoming days allowance',
      };

      return {
        netWorth: state.netWorth - amount,
        spentToday: state.spentToday + amount,
        buckets: updatedBuckets,
        transactions: [newTx, ...state.transactions],
      };
    });
  },

  // Consequence Option B: Cannibalize another bucket
  spendWithBorrowBucket: (amount: number, title: string, sourceBucketId: string) => {
    const remainingToday = get().getTodayRemaining();
    const deficit = amount - remainingToday;

    set((state) => {
      const updatedBuckets = state.buckets.map((b) => {
        if (b.id === 'spending-pool') {
          return { ...b, currentBalance: b.currentBalance - remainingToday };
        }
        if (b.id === sourceBucketId) {
          return { ...b, currentBalance: b.currentBalance - deficit };
        }
        return b;
      });

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title,
        amount,
        bucketId: 'spending-pool',
        date: new Date().toISOString(),
        type: 'borrow',
        borrowDetails: {
          source: 'bucket',
          fromBucketId: sourceBucketId,
        },
        note: `Pulled ₹${deficit} from ${sourceBucketId}`,
      };

      return {
        netWorth: state.netWorth - amount,
        spentToday: state.spentToday + remainingToday,
        buckets: updatedBuckets,
        transactions: [newTx, ...state.transactions],
      };
    });
  },

  // External Discrepancy Reconciliation (Spotify / ATM / Outside spend)
  reconcileExternalDebit: (amount: number, targetBucketId = 'savings-sink') => {
    set((state) => {
      const updatedBuckets = state.buckets.map((b) =>
        b.id === targetBucketId ? { ...b, currentBalance: Math.max(0, b.currentBalance - amount) } : b
      );

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title: 'External / Unmonitored Debit',
        amount,
        bucketId: targetBucketId,
        date: new Date().toISOString(),
        type: 'expense',
        note: 'Auto-reconciled with bank balance',
      };

      return {
        netWorth: state.netWorth - amount,
        buckets: updatedBuckets,
        transactions: [newTx, ...state.transactions],
      };
    });
  },

  setNetWorth: (amount: number) => set({ netWorth: amount }),

  advanceToNextDay: () => {
    set((state) => ({
      spentToday: 0,
      daysRemainingInCycle: Math.max(1, state.daysRemainingInCycle - 1),
    }));
  },
}));

