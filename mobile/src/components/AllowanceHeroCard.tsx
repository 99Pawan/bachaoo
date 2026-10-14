import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { Flame, Calendar, TrendingDown } from 'lucide-react-native';

interface AllowanceHeroCardProps {
  allowanceToday: number;
  spentToday: number;
  remainingToday: number;
  daysRemaining: number;
  totalMonthlyPool: number;
}

export const AllowanceHeroCard: React.FC<AllowanceHeroCardProps> = ({
  allowanceToday,
  spentToday,
  remainingToday,
  daysRemaining,
  totalMonthlyPool,
}) => {
  const percentageSpent = allowanceToday > 0 ? Math.min(100, Math.round((spentToday / allowanceToday) * 100)) : 0;
  const isNearlyDepleted = remainingToday < allowanceToday * 0.2;

  return (
    <View style={styles.card}>
      {/* Header Badge */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Flame size={14} color={colors.primary} />
          <Text style={styles.badgeText}>Today's Safe-to-Spend</Text>
        </View>

        <View style={styles.daysBadge}>
          <Calendar size={13} color={colors.textSecondary} />
          <Text style={styles.daysText}>{daysRemaining} days left</Text>
        </View>
      </View>

      {/* Hero Big Number */}
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>₹</Text>
        <Text style={[styles.amountText, isNearlyDepleted && styles.amountWarning]}>
          {remainingToday.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.amountSubtext}>left for today</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressBar,
            { width: `${percentageSpent}%` },
            percentageSpent > 80 && { backgroundColor: colors.warning },
            percentageSpent >= 100 && { backgroundColor: colors.danger },
          ]}
        />
      </View>

      {/* Stats Breakdown */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Daily Target</Text>
          <Text style={styles.statValue}>₹{allowanceToday}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Spent Today</Text>
          <Text style={[styles.statValue, { color: spentToday > 0 ? colors.warning : colors.textPrimary }]}>
            ₹{spentToday}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Monthly Pool</Text>
          <Text style={styles.statValue}>₹{totalMonthlyPool.toLocaleString('en-IN')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  daysText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  amountContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  currencySymbol: {
    color: colors.primaryLight,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: -4,
  },
  amountText: {
    color: colors.textPrimary,
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
  },
  amountWarning: {
    color: colors.warning,
  },
  amountSubtext: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
});

