export type UserRole = 'admin' | 'member';

export type GroupFrequency = 'weekly' | 'monthly' | 'custom';

export type GroupStatus = 'active' | 'completed' | 'cancelled';

export type MemberStatus = 'active' | 'removed' | 'completed';

export type RoundStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export type PaymentStatus =
  | 'paid'
  | 'unpaid'
  | 'partial'
  | 'late'
  | 'cancelled'
  | 'corrected';

export type PaymentMethod = 'cash' | 'bank' | 'mobile_money' | 'other';

export type PayoutStatus = 'pending' | 'received' | 'cancelled' | 'corrected';

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
};

export type AyuutoGroup = {
  id: string;
  name: string;
  amount_per_member: number;
  frequency: GroupFrequency;
  custom_interval_days: number | null;
  start_date: string;
  status: GroupStatus;
  created_by: string | null;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  profile_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  status: MemberStatus;
  joined_at: string;
};

export type Round = {
  id: string;
  group_id: string;
  round_number: number;
  due_date: string;
  receiver_member_id: string | null;
  expected_total: number;
  paid_total: number;
  status: RoundStatus;
  created_at: string;

  receiver?: GroupMember | null;
};

export type Payment = {
  id: string;
  group_id: string;
  round_id: string;
  member_id: string;
  amount_due: number;
  amount_paid: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paid_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  member?: GroupMember | null;
  round?: Round | null;
  group?: AyuutoGroup | null;
};

export type Payout = {
  id: string;
  group_id: string;
  round_id: string;
  receiver_member_id: string;
  payout_amount: number;
  payout_date: string | null;
  received_status: PayoutStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  receiver?: GroupMember | null;
  round?: Round | null;
  group?: AyuutoGroup | null;
};

export type ActivityLog = {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  description: string | null;
  created_at: string;
};

export type DashboardStats = {
  totalGroups: number;
  activeGroups: number;
  currentRound: number;
  totalExpectedMoney: number;
  totalPaidMoney: number;
  missingAmount: number;
  unpaidMembersCount: number;
  upcomingReceiversCount: number;
};