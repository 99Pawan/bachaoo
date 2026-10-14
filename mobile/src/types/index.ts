export type BucketCategory = 'fixed_bill' | 'goal' | 'spending_pool' | 'savings_sink';

export type BillStatus = 'funded' | 'due_soon' | 'paid' | 'underfunded';

export interface Bucket {
  id: string;
  name: string;
  category: BucketCategory;
  currentBalance: number;
  targetAmount?: number; // E.g., Rent target 20,000, iPhone target 80,000
  monthlyAllocation: number; // Amount auto-transferred monthly
  dueDate?: number; // Day of month (1-31) for fixed bills
  billStatus?: BillStatus;
  iconName: string; // Lucide icon identifier
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  bucketId: string;
  date: string; // ISO string
  type: 'expense' | 'allocation' | 'borrow' | 'sweep';
  borrowDetails?: {
    source: 'tomorrow' | 'bucket';
    fromBucketId?: string;
    recalibratedDailyAllowance?: number;
  };
  note?: string;
}

export interface DailyLedger {
  date: string; // YYYY-MM-DD
  allowanceGiven: number;
  actualSpent: number;
  borrowedAmount: number;
  isOverspent: boolean;
}

