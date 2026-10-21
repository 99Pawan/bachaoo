import { create } from 'zustand';
import { Bucket, DayAllocation, Transaction, UndoSnapshot, ActiveDiscrepancy } from '../types';

interface BudgetState {
  netWorth: number;
  buckets: Bucket[];
  spentToday: number;
  daysRemainingInCycle: number;
  dailySchedule: DayAllocation[];
  transactions: Transaction[];
  undoSnapshot: UndoSnapshot | null;
  activeDiscrepancy: ActiveDiscrepancy | null;
  lastActiveDate: string;

  // Selectors & Calculations
  getTodayAllowance: () => number;
  getTodayRemaining: () => number;
  hasZeroAllowanceDays: () => boolean;
  previewBorrowDaysImpact: (amount: number) => {
    canFulfill: boolean;
    daysConsumed: number;
    previewSchedule: { dateStr: string; oldVal: number; newVal: number }[];
  };

  // Core Actions
  spendDirect: (amount: number, title: string) => { success: boolean; overspent: boolean; deficit: number };
  spendBorrowNextAvailable: (amount: number, title: string) => void;
  normalizeRemainingDays: () => void;
  undoLastAction: () => boolean;
  dismissUndo: () => void;
  clearExpiredUndo: () => void;
  reconcileExternalDebit: (amount: number, targetBucketId?: string) => void;
  
  // Clean Sync & Discrepancy Flow
  setBankBalance: (newBalance: number) => { discrepancyDetected: boolean; delta: number };
  settleDiscrepancy: (
    adjustments: { bucketId: string; amountDelta: number }[],
    allowanceAdjustmentMode?: 'normalize' | 'reduce_upcoming'
  ) => void;
  advanceToNextDay: () => void;
  checkAutoAdvance: () => void;
  resetDemoData: () => void;

  defaultBucketId: string;
  dailyBucketId: string | null;

  // Bucket Management
  addBucket: (bucketData: Omit<Bucket, 'id'>) => void;
  updateBucket: (bucketId: string, updates: Partial<Bucket>) => void;
  deleteBucket: (bucketId: string) => void;
  setDefaultBucket: (bucketId: string) => void;
  setDailyBucket: (bucketId: string | null) => void;
  transferBetweenBuckets: (fromBucketId: string, toBucketId: string, amount: number) => {
    success: boolean;
    message?: string;
  };
  spendFromBucket: (bucketId: string, amount: number, title: string) => { success: boolean; message?: string };
}

// Helper to generate the day-by-day calendar schedule
const generateInitialSchedule = (daysCount: number, poolAmount: number): DayAllocation[] => {
  const baseAllowance = Math.floor(poolAmount / daysCount);
  const now = new Date();
  const schedule: DayAllocation[] = [];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < daysCount; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + i);

    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    schedule.push({
      dayIndex: i,
      dateStr: `${targetDate.getDate()} ${monthNames[targetDate.getMonth()]}`,
      dayName: dayNames[dayOfWeek],
      allowance: baseAllowance,
      isToday: i === 0,
      isWeekend,
    });
  }

  return schedule;
};

const INITIAL_BUCKETS: Bucket[] = [
  {
    id: 'spending-pool',
    name: 'Daily Spending Pool',
    currentBalance: 10000,
    monthlyAllocation: 10000,
    iconName: 'Coffee',
    color: '#10B981', // Emerald
  },
  {
    id: 'rent-bill',
    name: 'Rent & Maintenance',
    currentBalance: 20000,
    monthlyAllocation: 20000,
    iconName: 'Home',
    color: '#8B5CF6', // Purple
  },
  {
    id: 'iphone-goal',
    name: 'Saving for iPhone',
    currentBalance: 12000,
    monthlyAllocation: 10000,
    iconName: 'Smartphone',
    color: '#3B82F6', // Blue
  },
  {
    id: 'savings-sink',
    name: 'General Savings & Buffer',
    currentBalance: 8000, // 50,000 - (10k + 20k + 12k)
    monthlyAllocation: 0,
    iconName: 'ShieldCheck',
    color: '#F59E0B', // Amber
  },
];

const INITIAL_SCHEDULE = generateInitialSchedule(28, 10000);

export const useBudgetStore = create<BudgetState>((set, get) => ({
  netWorth: 50000,
  buckets: INITIAL_BUCKETS,
  spentToday: 0,
  daysRemainingInCycle: 28,
  dailySchedule: INITIAL_SCHEDULE,
  undoSnapshot: null,
  activeDiscrepancy: null,
  lastActiveDate: new Date().toISOString().split('T')[0],
  defaultBucketId: 'spending-pool',
  dailyBucketId: 'spending-pool',
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
    const { dailySchedule, dailyBucketId } = get();
    return dailyBucketId ? dailySchedule[0]?.allowance || 0 : 0;
  },

  getTodayRemaining: () => {
    const todayAllowance = get().getTodayAllowance();
    const { spentToday } = get();
    return Math.max(0, todayAllowance - spentToday);
  },

  hasZeroAllowanceDays: () => {
    const { dailySchedule } = get();
    // Checks if any future day (dayIndex > 0) has 0 allowance
    return dailySchedule.slice(1).some((d) => d.allowance === 0);
  },

  // Previews how many future days will be drawn down for a given spend
  previewBorrowDaysImpact: (amount: number) => {
    const { dailySchedule, getTodayRemaining, buckets, dailyBucketId } = get();
    const spendingPool = dailyBucketId
      ? buckets.find((b) => b.id === dailyBucketId)?.currentBalance || 0
      : 0;

    if (amount > spendingPool) {
      return { canFulfill: false, daysConsumed: 0, previewSchedule: [] };
    }

    const todayRemaining = getTodayRemaining();
    let deficit = Math.max(0, amount - todayRemaining);
    let daysConsumed = 0;
    const previewSchedule: { dateStr: string; oldVal: number; newVal: number }[] = [];

    for (let i = 1; i < dailySchedule.length; i++) {
      if (deficit <= 0) break;
      const day = dailySchedule[i];
      if (day.allowance > 0) {
        const take = Math.min(day.allowance, deficit);
        deficit -= take;
        daysConsumed++;
        previewSchedule.push({
          dateStr: day.dateStr,
          oldVal: day.allowance,
          newVal: day.allowance - take,
        });
      }
    }

    return {
      canFulfill: deficit === 0,
      daysConsumed,
      previewSchedule,
    };
  },

  // 1. Direct Spend within today's allowance
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
        b.id === state.dailyBucketId ? { ...b, currentBalance: b.currentBalance - amount } : b
      );

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title,
        amount,
        bucketId: state.dailyBucketId || '',
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

  // 2. Advance from Upcoming Days (Consecutive days draw-down)
  spendBorrowNextAvailable: (amount: number, title: string) => {
    const { dailySchedule, getTodayRemaining, buckets, netWorth, spentToday } = get();
    const todayRemaining = getTodayRemaining();
    let deficit = amount - todayRemaining;

    // Snapshot current state for 60-second Undo
    const snapshot: UndoSnapshot = {
      id: `undo-${Date.now()}`,
      actionDescription: `Borrowed for "${title}"`,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60000, // 1 minute
      previousBuckets: JSON.parse(JSON.stringify(buckets)),
      previousSchedule: JSON.parse(JSON.stringify(dailySchedule)),
      previousSpentToday: spentToday,
      previousNetWorth: netWorth,
    };

    // Draw down upcoming days sequentially
    const updatedSchedule = dailySchedule.map((day) => ({ ...day }));
    let daysConsumed = 0;

    for (let i = 1; i < updatedSchedule.length; i++) {
      if (deficit <= 0) break;
      const day = updatedSchedule[i];
      if (day.allowance > 0) {
        const take = Math.min(day.allowance, deficit);
        day.allowance -= take;
        deficit -= take;
        daysConsumed++;
      }
    }

    const updatedBuckets = buckets.map((b) =>
      b.id === get().dailyBucketId ? { ...b, currentBalance: b.currentBalance - amount } : b
    );

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title,
      amount,
      bucketId: get().dailyBucketId || '',
      date: new Date().toISOString(),
      type: 'borrow_advance',
      borrowDetails: {
        daysConsumed,
      },
      note: `Advanced across next ${daysConsumed} day(s)`,
    };

    set((state) => ({
      netWorth: state.netWorth - amount,
      spentToday: state.spentToday + amount,
      buckets: updatedBuckets,
      dailySchedule: updatedSchedule,
      undoSnapshot: snapshot,
      transactions: [newTx, ...state.transactions],
    }));
  },

  // 3. On-Demand User Normalization ("Smooth the Curve")
  normalizeRemainingDays: () => {
    const { dailySchedule, buckets, netWorth, spentToday } = get();

    // Snapshot for Undo
    const snapshot: UndoSnapshot = {
      id: `undo-${Date.now()}`,
      actionDescription: 'Normalized remaining days',
      timestamp: Date.now(),
      expiresAt: Date.now() + 60000,
      previousBuckets: JSON.parse(JSON.stringify(buckets)),
      previousSchedule: JSON.parse(JSON.stringify(dailySchedule)),
      previousSpentToday: spentToday,
      previousNetWorth: netWorth,
    };

    // Calculate total remaining pool across all days from tomorrow onwards
    const futureDays = dailySchedule.slice(1);
    const futureSum = futureDays.reduce((acc, d) => acc + d.allowance, 0);
    const newDaily = futureDays.length > 0 ? Math.floor(futureSum / futureDays.length) : 0;

    const normalizedSchedule = dailySchedule.map((day, idx) => {
      if (idx === 0) return day; // Keep today intact
      return { ...day, allowance: newDaily };
    });

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title: 'Allowance Re-Normalized',
      amount: 0,
      bucketId: get().dailyBucketId || '',
      date: new Date().toISOString(),
      type: 'normalize',
      note: `Smoothed ₹${newDaily}/day across remaining ${futureDays.length} days`,
    };

    set((state) => ({
      dailySchedule: normalizedSchedule,
      undoSnapshot: snapshot,
      transactions: [newTx, ...state.transactions],
    }));
  },

  // 5. Ephemeral 60-Second Undo
  undoLastAction: () => {
    const { undoSnapshot } = get();
    if (!undoSnapshot || Date.now() > undoSnapshot.expiresAt) {
      set({ undoSnapshot: null });
      return false;
    }

    set({
      buckets: undoSnapshot.previousBuckets,
      dailySchedule: undoSnapshot.previousSchedule,
      spentToday: undoSnapshot.previousSpentToday,
      netWorth: undoSnapshot.previousNetWorth,
      undoSnapshot: null,
    });

    return true;
  },

  dismissUndo: () => {
    set({ undoSnapshot: null });
  },

  clearExpiredUndo: () => {
    const { undoSnapshot } = get();
    if (undoSnapshot && Date.now() > undoSnapshot.expiresAt) {
      set({ undoSnapshot: null });
    }
  },

  // 6. External Discrepancy Reconciliation
  reconcileExternalDebit: (amount: number, targetBucketId?: string) => {
    set((state) => {
      const resolvedBucketId = targetBucketId || state.defaultBucketId;
      const updatedBuckets = state.buckets.map((b) =>
        b.id === resolvedBucketId ? { ...b, currentBalance: Math.max(0, b.currentBalance - amount) } : b
      );

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        title: 'External / Unmonitored Debit',
        amount,
        bucketId: resolvedBucketId,
        date: new Date().toISOString(),
        type: 'sync_adjustment',
        note: 'Auto-reconciled with bank balance',
      };

      return {
        netWorth: state.netWorth - amount,
        buckets: updatedBuckets,
        transactions: [newTx, ...state.transactions],
      };
    });
  },

  // 7. Clean Balance Update (Just updates balance & flags discrepancy)
  setBankBalance: (newBalance: number) => {
    const { buckets } = get();
    const sumBuckets = buckets.reduce((acc, b) => acc + b.currentBalance, 0);
    const delta = newBalance - sumBuckets;

    let activeDiscrepancy: ActiveDiscrepancy | null = null;
    if (delta < 0) {
      activeDiscrepancy = { amount: Math.abs(delta), type: 'deficit', timestamp: Date.now() };
    } else if (delta > 0) {
      activeDiscrepancy = { amount: delta, type: 'surplus', timestamp: Date.now() };
    }

    set({
      netWorth: newBalance,
      activeDiscrepancy,
    });

    return { discrepancyDetected: delta !== 0, delta };
  },

  // 8. Custom Settle Up across any number of buckets
  settleDiscrepancy: (adjustments, allowanceAdjustmentMode = 'normalize') => {
    const { buckets, dailySchedule, netWorth, spentToday, activeDiscrepancy } = get();
    if (!activeDiscrepancy) return;

    // Snapshot for 60s Undo
    const snapshot: UndoSnapshot = {
      id: `undo-${Date.now()}`,
      actionDescription: `Settled ₹${activeDiscrepancy.amount.toLocaleString('en-IN')} discrepancy`,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60000,
      previousBuckets: JSON.parse(JSON.stringify(buckets)),
      previousSchedule: JSON.parse(JSON.stringify(dailySchedule)),
      previousSpentToday: spentToday,
      previousNetWorth: netWorth,
    };

    // Apply custom adjustments to each selected bucket
    const adjMap = new Map(adjustments.map((a) => [a.bucketId, a.amountDelta]));
    const updatedBuckets = buckets.map((b) => {
      const delta = adjMap.get(b.id);
      if (delta !== undefined) {
        return { ...b, currentBalance: Math.max(0, b.currentBalance + delta) };
      }
      return b;
    });

    // Keep the daily schedule consistent with changes to the daily bucket.
    let updatedSchedule = dailySchedule;
    const poolDelta = get().dailyBucketId
      ? adjMap.get(get().dailyBucketId!)
      : undefined;

    if (poolDelta !== undefined && allowanceAdjustmentMode === 'normalize') {
      const todayAllowance = dailySchedule[0]?.allowance || 0;
      const todaySpent = Math.min(spentToday, todayAllowance);
      const todayRemaining = Math.max(0, todayAllowance - todaySpent);
      const remainingBudget = Math.max(
        0,
        todayRemaining
          + dailySchedule.slice(1).reduce((acc, d) => acc + d.allowance, 0)
          + poolDelta
      );
      const daysToNormalize = dailySchedule.length;
      const newDaily = daysToNormalize > 0
        ? Math.floor(remainingBudget / daysToNormalize)
        : 0;

      updatedSchedule = dailySchedule.map((day, idx) => {
        if (idx === 0) return { ...day, allowance: todaySpent + newDaily };
        return { ...day, allowance: newDaily };
      });
    } else if (poolDelta !== undefined && allowanceAdjustmentMode === 'reduce_upcoming' && poolDelta < 0) {
      const todayAllowance = dailySchedule[0]?.allowance || 0;
      const todaySpent = Math.min(spentToday, todayAllowance);
      const todayRemaining = Math.max(0, todayAllowance - todaySpent);
      const todayReduction = Math.min(todayRemaining, Math.abs(poolDelta));
      let remainingReduction = Math.abs(poolDelta) - todayReduction;
      updatedSchedule = dailySchedule.map((day, idx) => {
        if (idx === 0) return { ...day, allowance: day.allowance - todayReduction };
        if (remainingReduction <= 0) return day;

        const reduction = Math.min(day.allowance, remainingReduction);
        remainingReduction -= reduction;
        return { ...day, allowance: day.allowance - reduction };
      });
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title: activeDiscrepancy.type === 'surplus' ? 'Bank Inflow / Refund Settled' : 'Bank Discrepancy Settled',
      amount: activeDiscrepancy.amount,
      bucketId: adjustments[0]?.bucketId || get().defaultBucketId,
      date: new Date().toISOString(),
      type: 'sync_adjustment',
      note: `Adjusted across ${adjustments.length} bucket(s)`,
    };

    set((state) => ({
      buckets: updatedBuckets,
      dailySchedule: updatedSchedule,
      activeDiscrepancy: null,
      undoSnapshot: snapshot,
      transactions: [newTx, ...state.transactions],
    }));
  },

  advanceToNextDay: () => {
    set((state) => {
      const todayAllowance = state.dailySchedule[0]?.allowance || 0;
      const unspentToday = Math.max(0, todayAllowance - state.spentToday);

      const newSchedule = state.dailySchedule.slice(1).map((day, idx) => ({
        ...day,
        dayIndex: idx,
        isToday: idx === 0,
        // Carry forward surplus from previous day into the new "today" (index 0)
        allowance: idx === 0 ? day.allowance + unspentToday : day.allowance,
      }));

      return {
        spentToday: 0,
        daysRemainingInCycle: Math.max(1, state.daysRemainingInCycle - 1),
        dailySchedule: newSchedule,
      };
    });
  },

  checkAutoAdvance: () => {
    const today = new Date().toISOString().split('T')[0];
    const { lastActiveDate, dailySchedule, daysRemainingInCycle, spentToday } = get();

    if (lastActiveDate && lastActiveDate !== today) {
      const prev = new Date(lastActiveDate);
      const curr = new Date(today);
      const diffTime = curr.getTime() - prev.getTime();
      const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      if (diffDays > 0) {
        const todayAllowance = dailySchedule[0]?.allowance || 0;
        const unspentToday = Math.max(0, todayAllowance - spentToday);

        const daysToAdvance = Math.min(diffDays, dailySchedule.length - 1);
        const newSchedule = dailySchedule.slice(daysToAdvance).map((day, idx) => ({
          ...day,
          dayIndex: idx,
          isToday: idx === 0,
          // Carry forward unspent surplus from the last active day to the new today
          allowance: idx === 0 ? day.allowance + unspentToday : day.allowance,
        }));

        set({
          lastActiveDate: today,
          spentToday: 0,
          daysRemainingInCycle: Math.max(1, daysRemainingInCycle - daysToAdvance),
          dailySchedule: newSchedule,
        });
      }
    }
  },

  resetDemoData: () => {
    const freshSchedule = generateInitialSchedule(28, 10000);
    set({
      netWorth: 50000,
      buckets: INITIAL_BUCKETS,
      spentToday: 0,
      daysRemainingInCycle: 28,
      dailySchedule: freshSchedule,
      undoSnapshot: null,
      activeDiscrepancy: null,
      lastActiveDate: new Date().toISOString().split('T')[0],
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
    });
  },

  addBucket: (bucketData) => {
    set((state) => {
      const newId = `bucket-${Date.now()}`;
      const newBucket: Bucket = {
        ...bucketData,
        id: newId,
      };

      return {
        buckets: [...state.buckets, newBucket],
      };
    });
  },

  updateBucket: (bucketId, updates) => {
    set((state) => ({
      buckets: state.buckets.map((b) => (b.id === bucketId ? { ...b, ...updates } : b)),
    }));
  },

  deleteBucket: (bucketId) => {
    set((state) => {
      const target = state.buckets.find((b) => b.id === bucketId);
      if (!target || state.buckets.length <= 1) return state;

      const amountToReclaim = target.currentBalance;
      const remainingBuckets = state.buckets.filter((b) => b.id !== bucketId);
      const reclaimBucketId = target.id === state.defaultBucketId
        ? remainingBuckets[0].id
        : state.defaultBucketId;
      const updatedBuckets = remainingBuckets.map((b) =>
        b.id === reclaimBucketId
          ? { ...b, currentBalance: b.currentBalance + amountToReclaim }
          : b
      );

      return {
        buckets: updatedBuckets,
        dailyBucketId: state.dailyBucketId === bucketId ? null : state.dailyBucketId,
        defaultBucketId: state.defaultBucketId === bucketId
          ? remainingBuckets[0].id
          : state.defaultBucketId,
      };
    });
  },

  setDefaultBucket: (bucketId: string) => {
    set({ defaultBucketId: bucketId });
  },

  setDailyBucket: (bucketId: string | null) => {
    set({ dailyBucketId: bucketId });
  },

  transferBetweenBuckets: (fromBucketId, toBucketId, amount) => {
    const { buckets } = get();
    const source = buckets.find((bucket) => bucket.id === fromBucketId);
    const destination = buckets.find((bucket) => bucket.id === toBucketId);

    if (!source || !destination) {
      return { success: false, message: 'Select two valid buckets' };
    }
    if (source.id === destination.id) {
      return { success: false, message: 'Choose two different buckets' };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Enter a valid amount' };
    }
    if (amount > source.currentBalance) {
      return {
        success: false,
        message: `${source.name} has only ₹${source.currentBalance.toLocaleString('en-IN')}`,
      };
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title: `Transfer: ${source.name} → ${destination.name}`,
      amount,
      bucketId: destination.id,
      date: new Date().toISOString(),
      type: 'transfer',
      note: `Moved from ${source.name} to ${destination.name}`,
      borrowDetails: { sourceBucketId: source.id },
    };

    set((state) => ({
      buckets: state.buckets.map((bucket) => {
        if (bucket.id === source.id) {
          return { ...bucket, currentBalance: bucket.currentBalance - amount };
        }
        if (bucket.id === destination.id) {
          return { ...bucket, currentBalance: bucket.currentBalance + amount };
        }
        return bucket;
      }),
      transactions: [newTx, ...state.transactions],
    }));

    return { success: true };
  },

  spendFromBucket: (bucketId: string, amount: number, title: string) => {
    const { buckets, netWorth, spentToday } = get();
    const target = buckets.find((b) => b.id === bucketId);

    if (!target) {
      return { success: false, message: 'Bucket not found' };
    }

    if (amount > target.currentBalance) {
      return {
        success: false,
        message: `Insufficient balance in ${target.name}. Has ₹${target.currentBalance.toLocaleString('en-IN')}`,
      };
    }

    const updatedBuckets = buckets.map((b) =>
      b.id === bucketId ? { ...b, currentBalance: b.currentBalance - amount } : b
    );

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title,
      amount,
      bucketId,
      date: new Date().toISOString(),
      type: 'expense',
    };

    set({
      netWorth: netWorth - amount,
      spentToday: bucketId === get().dailyBucketId ? spentToday + amount : spentToday,
      buckets: updatedBuckets,
      transactions: [newTx, ...get().transactions],
    });

    return { success: true };
  },
}));
