export interface Bucket {
  id: string;
  name: string;
  currentBalance: number;
  monthlyAllocation: number;
  iconName: string;
  color: string;
  description?: string;
}

export interface DayAllocation {
  dayIndex: number; // 0 = today, 1 = tomorrow, 2 = day after, etc.
  dateStr: string; // "15 Oct", "16 Oct", etc.
  dayName: string; // "Thu", "Fri", "Sat", etc.
  allowance: number; // Allowance assigned for this specific day
  isToday: boolean;
  isWeekend: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  bucketId: string;
  date: string; // ISO string
  type: 'expense' | 'transfer' | 'borrow_advance' | 'borrow_buffer' | 'normalize' | 'sync_adjustment';
  borrowDetails?: {
    daysConsumed?: number; // How many future days were drawn down to ₹0
    sourceBucketId?: string;
  };
  note?: string;
}

export interface UndoSnapshot {
  id: string;
  actionDescription: string;
  timestamp: number; // Date.now()
  expiresAt: number; // timestamp + 60,000 ms (1 minute)
  previousBuckets: Bucket[];
  previousSchedule: DayAllocation[];
  previousSpentToday: number;
  previousNetWorth: number;
}

export interface ActiveDiscrepancy {
  amount: number; // Discrepancy absolute amount
  type: 'deficit' | 'surplus'; // deficit: bank < buckets, surplus: bank > buckets
  timestamp: number;
}
