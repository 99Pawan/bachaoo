import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Alert,
} from 'react-native';
import { colors } from './src/theme/colors';
import { useBudgetStore } from './src/store/useBudgetStore';
import { AllowanceHeroCard } from './src/components/AllowanceHeroCard';
import { BucketCard } from './src/components/BucketCard';
import { SpendModal } from './src/components/SpendModal';
import { TransactionItem } from './src/components/TransactionItem';
import { QrCode, PlusCircle, FastForward, BellRing, ShieldCheck, Wallet } from 'lucide-react-native';

export default function App() {
  const [spendModalVisible, setSpendModalVisible] = useState(false);

  const {
    netWorth,
    buckets,
    spentToday,
    daysRemainingInCycle,
    transactions,
    getTodayAllowance,
    getTodayRemaining,
    advanceToNextDay,
    reconcileExternalDebit,
  } = useBudgetStore();

  const todayAllowance = getTodayAllowance();
  const todayRemaining = getTodayRemaining();
  const spendingPoolBucket = buckets.find((b) => b.id === 'spending-pool');
  const spendingPoolTotal = spendingPoolBucket ? spendingPoolBucket.currentBalance : 0;

  // Check conservation invariant: Net Worth == Sum of Buckets
  const sumBuckets = buckets.reduce((acc, b) => acc + b.currentBalance, 0);
  const isConserved = sumBuckets === netWorth;

  const handleSimulateExternalDebit = () => {
    Alert.alert(
      'External Bank Debit Detected',
      'Bank SMS: "₹499 debited for Netflix Autopay". Which bucket should absorb this?',
      [
        {
          text: 'Deduct from Safe Buffer',
          onPress: () => reconcileExternalDebit(499, 'savings-sink'),
        },
        {
          text: 'Deduct from Daily Pool',
          onPress: () => reconcileExternalDebit(499, 'spending-pool'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>bachaoo</Text>
            <View style={styles.bankBadge}>
              <Wallet size={12} color={colors.primary} />
              <Text style={styles.bankBadgeText}>Net Worth: ₹{netWorth.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <View style={styles.syncBadge}>
            <ShieldCheck size={14} color={isConserved ? colors.primary : colors.warning} />
            <Text style={[styles.syncBadgeText, !isConserved && { color: colors.warning }]}>
              {isConserved ? '100% Balanced' : 'Discrepancy'}
            </Text>
          </View>
        </View>

        {/* Hero Card: Today's Safe-to-Spend */}
        <View style={styles.heroSection}>
          <AllowanceHeroCard
            allowanceToday={todayAllowance}
            spentToday={spentToday}
            remainingToday={todayRemaining}
            daysRemaining={daysRemainingInCycle}
            totalMonthlyPool={spendingPoolTotal}
          />
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryActionBtn, styles.scanBtn]}
            onPress={() => setSpendModalVisible(true)}
          >
            <QrCode size={18} color="#0B0F19" />
            <Text style={styles.scanBtnText}>Scan & Pay</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryActionBtn}
            onPress={() => setSpendModalVisible(true)}
          >
            <PlusCircle size={18} color={colors.textPrimary} />
            <Text style={styles.secondaryActionBtnText}>Quick Spend</Text>
          </Pressable>
        </View>

        {/* Interactive Demo Simulation Controls */}
        <View style={styles.simulationBar}>
          <Pressable style={styles.simBtn} onPress={advanceToNextDay}>
            <FastForward size={14} color={colors.accentCyan} />
            <Text style={styles.simBtnText}>Next Day</Text>
          </Pressable>

          <Pressable style={styles.simBtn} onPress={handleSimulateExternalDebit}>
            <BellRing size={14} color={colors.warning} />
            <Text style={styles.simBtnText}>Simulate Autopay</Text>
          </Pressable>
        </View>

        {/* Buckets Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Virtual Envelopes</Text>
          <Text style={styles.sectionSubtext}>Total allocated: ₹{sumBuckets.toLocaleString('en-IN')}</Text>
        </View>

        {buckets.map((bucket) => (
          <BucketCard key={bucket.id} bucket={bucket} />
        ))}

        {/* Recent Transactions */}
        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.sectionSubtext}>{transactions.length} entries</Text>
        </View>

        <View style={styles.transactionsCard}>
          {transactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}
        </View>
      </ScrollView>

      {/* Spend / Payment Modal */}
      <SpendModal visible={spendModalVisible} onClose={() => setSpendModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  bankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bankBadgeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  syncBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroSection: {
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  scanBtn: {
    backgroundColor: colors.primary,
  },
  scanBtnText: {
    color: '#0B0F19',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  secondaryActionBtnText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  simulationBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    backgroundColor: colors.surfaceElevated,
    padding: 8,
    borderRadius: 12,
  },
  simBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  simBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtext: {
    color: colors.textMuted,
    fontSize: 12,
  },
  transactionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
});
