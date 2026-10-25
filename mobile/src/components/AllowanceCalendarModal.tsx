import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';
import {
  Calendar,
  X,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  CalendarRange,
  Clock,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface AllowanceCalendarModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'daily' | 'weekly' | 'monthly';

export const AllowanceCalendarModal: React.FC<AllowanceCalendarModalProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const {
    dailySchedule,
    daysRemainingInCycle,
    spentToday,
    getTodayAllowance,
    getTodayRemaining,
    hasZeroAllowanceDays,
    normalizeRemainingDays,
    buckets,
    dailyBucketId,
  } = useBudgetStore();

  const todayAllowance = getTodayAllowance();
  const todayRemaining = getTodayRemaining();
  const dailyBucket = buckets.find((b) => b.id === dailyBucketId);
  const poolBalance = dailyBucket ? dailyBucket.currentBalance : 0;
  const showZeroWarning = hasZeroAllowanceDays();

  // Group days into 7-day weeks for Weekly Tab
  const weeklyGroups = React.useMemo(() => {
    const weeks: {
      weekIndex: number;
      weekLabel: string;
      days: typeof dailySchedule;
      totalAllowance: number;
      hasZero: boolean;
    }[] = [];

    const chunkSize = 7;
    for (let i = 0; i < dailySchedule.length; i += chunkSize) {
      const chunk = dailySchedule.slice(i, i + chunkSize);
      const weekNum = Math.floor(i / chunkSize) + 1;
      const totalAllowance = chunk.reduce((sum, d) => sum + d.allowance, 0);
      const hasZero = chunk.some((d) => d.allowance === 0);

      const startDay = chunk[0]?.dateStr || '';
      const endDay = chunk[chunk.length - 1]?.dateStr || '';

      weeks.push({
        weekIndex: weekNum,
        weekLabel: i === 0 ? 'Current Week' : `Week ${weekNum}`,
        days: chunk,
        totalAllowance,
        hasZero,
      });
    }

    return weeks;
  }, [dailySchedule]);

  const handleNormalize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    normalizeRemainingDays();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Calendar size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.title}>Allowance Schedule</Text>
              <Text style={styles.subtitle}>{daysRemainingInCycle} days remaining in cycle</Text>
            </View>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Smart View Selector: Daily | Weekly | Monthly */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'daily' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('daily');
            }}
          >
            <CalendarDays
              size={14}
              color={activeTab === 'daily' ? '#0B0F19' : colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}
            >
              Daily
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'weekly' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('weekly');
            }}
          >
            <CalendarRange
              size={14}
              color={activeTab === 'weekly' ? '#0B0F19' : colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}
            >
              Weekly
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'monthly' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('monthly');
            }}
          >
            <TrendingUp
              size={14}
              color={activeTab === 'monthly' ? '#0B0F19' : colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}
            >
              Monthly
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* DAILY VIEW */}
          {activeTab === 'daily' && (
            <View>
              {/* Zero Allowance Notice (if any day was borrowed) */}
              {showZeroWarning && (
                <View style={styles.warningCard}>
                  <View style={styles.warningTop}>
                    <AlertCircle size={16} color={colors.warning} />
                    <Text style={styles.warningTitle}>Upcoming Days Have ₹0</Text>
                  </View>
                  <Text style={styles.warningDesc}>
                    You advanced funds from future days for a batch spend. You can smooth out the remaining pool equally across all remaining days.
                  </Text>
                  <Pressable style={styles.normalizeActionBtn} onPress={handleNormalize}>
                    <Sparkles size={14} color="#0B0F19" />
                    <Text style={styles.normalizeActionText}>Normalize Remaining Days</Text>
                  </Pressable>
                </View>
              )}

              {/* Day List */}
              <View style={styles.dayList}>
                {dailySchedule.map((day) => {
                  const isZero = day.allowance === 0;

                  return (
                    <View
                      key={day.dayIndex}
                      style={[
                        styles.dayCard,
                        day.isToday && styles.dayCardToday,
                        isZero && styles.dayCardZero,
                      ]}
                    >
                      <View style={styles.dayDateCol}>
                        <View style={styles.dateRow}>
                          <Text
                            style={[
                              styles.dateText,
                              day.isToday && { color: colors.primary, fontWeight: '800' },
                            ]}
                          >
                            {day.dateStr}
                          </Text>
                          <Text style={styles.dayNameText}>· {day.dayName}</Text>
                        </View>

                        <View style={styles.badgesRow}>
                          {day.isToday ? (
                            <View style={styles.todayPill}>
                              <Text style={styles.todayPillText}>Today</Text>
                            </View>
                          ) : isZero ? (
                            <View style={styles.advancedPill}>
                              <Text style={styles.advancedPillText}>Advanced (₹0)</Text>
                            </View>
                          ) : (
                            <Text style={styles.upcomingText}>Upcoming</Text>
                          )}

                          {day.isWeekend && (
                            <View style={styles.weekendPill}>
                              <Text style={styles.weekendPillText}>Weekend</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.dayAmountCol}>
                        <Text
                          style={[
                            styles.dayAmount,
                            isZero && styles.dayAmountZero,
                            day.isToday && { color: colors.primary },
                          ]}
                        >
                          ₹{day.allowance.toLocaleString('en-IN')}
                        </Text>
                        {day.isToday && (
                          <Text style={styles.todayRemainingSub}>
                            ₹{todayRemaining} left today
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* WEEKLY VIEW */}
          {activeTab === 'weekly' && (
            <View style={styles.weeklyList}>
              {weeklyGroups.map((week) => (
                <View key={week.weekIndex} style={styles.weekCard}>
                  <View style={styles.weekHeader}>
                    <View>
                      <Text style={styles.weekLabel}>{week.weekLabel}</Text>
                      <Text style={styles.weekDateSpan}>
                        {week.days[0]?.dateStr} – {week.days[week.days.length - 1]?.dateStr} ({week.days.length} days)
                      </Text>
                    </View>
                    <View style={styles.weekAmountCol}>
                      <Text style={styles.weekAmount}>
                        ₹{week.totalAllowance.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.weekAmountSub}>allocated</Text>
                    </View>
                  </View>

                  {/* Day pill overview for the week */}
                  <View style={styles.weekPillsRow}>
                    {week.days.map((d) => (
                      <View
                        key={d.dayIndex}
                        style={[
                          styles.miniDayPill,
                          d.isToday && styles.miniDayToday,
                          d.allowance === 0 && styles.miniDayZero,
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniDayText,
                            d.isToday && { color: colors.primary, fontWeight: '800' },
                            d.allowance === 0 && { color: colors.danger },
                          ]}
                        >
                          {d.dayName.slice(0, 1)}
                        </Text>
                        <Text
                          style={[
                            styles.miniDayAmt,
                            d.allowance === 0 && { color: colors.danger },
                          ]}
                        >
                          {d.allowance === 0 ? '0' : `₹${d.allowance}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* MONTHLY OVERVIEW */}
          {activeTab === 'monthly' && (
            <View style={styles.monthlyContainer}>
              <View style={styles.monthlySummaryCard}>
                <Text style={styles.summaryTitle}>Cycle Allowance Overview</Text>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Monthly Pool</Text>
                    <Text style={styles.summaryValue}>₹{poolBalance.toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Days Remaining</Text>
                    <Text style={styles.summaryValue}>{daysRemainingInCycle} Days</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Daily Allowance Pace</Text>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>
                      ₹{todayAllowance}/day
                    </Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Spent Today</Text>
                    <Text style={[styles.summaryValue, { color: spentToday > 0 ? colors.warning : colors.textPrimary }]}>
                      ₹{spentToday}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.healthCard}>
                <View style={styles.healthTop}>
                  <CheckCircle size={18} color={colors.primary} />
                  <Text style={styles.healthTitle}>Pacing Health: Safe & On Track</Text>
                </View>
                <Text style={styles.healthDesc}>
                  Your daily allowance of ₹{todayAllowance} ensures your daily bucket balance of ₹{poolBalance.toLocaleString('en-IN')} lasts for all remaining {daysRemainingInCycle} days without running into early shortages.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#0B0F19',
    fontWeight: '800',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  warningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  warningTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  warningTitle: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '700',
  },
  warningDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  normalizeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.warning,
    paddingVertical: 10,
    borderRadius: 10,
  },
  normalizeActionText: {
    color: '#0B0F19',
    fontSize: 13,
    fontWeight: '700',
  },
  dayList: {
    gap: 10,
  },
  dayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  dayCardToday: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  dayCardZero: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  dayDateCol: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  dayNameText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginLeft: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  todayPill: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  advancedPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  advancedPillText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  weekendPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weekendPillText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  upcomingText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  dayAmountCol: {
    alignItems: 'flex-end',
  },
  dayAmount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  dayAmountZero: {
    color: colors.danger,
  },
  todayRemainingSub: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  weeklyList: {
    gap: 12,
  },
  weekCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  weekLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  weekDateSpan: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  weekAmountCol: {
    alignItems: 'flex-end',
  },
  weekAmount: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  weekAmountSub: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  weekPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  miniDayPill: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  miniDayToday: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  miniDayZero: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  miniDayText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  miniDayAmt: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  monthlyContainer: {
    gap: 16,
  },
  monthlySummaryCard: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '47%',
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  healthCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  healthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  healthTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  healthDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
