import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
} from 'react-native';
import { colors } from './src/theme/colors';
import { useBudgetStore } from './src/store/useBudgetStore';
import { AllowanceHeroCard } from './src/components/AllowanceHeroCard';
import { BucketCard } from './src/components/BucketCard';
import { SpendModal } from './src/components/SpendModal';
import { SyncBalanceModal } from './src/components/SyncBalanceModal';
import { UndoToast } from './src/components/UndoToast';
import { TransactionItem } from './src/components/TransactionItem';
import { DiscrepancyResolutionSection } from './src/components/DiscrepancyResolutionSection';
import { AllowanceCalendarModal } from './src/components/AllowanceCalendarModal';
import { DeveloperOptionsModal } from './src/components/DeveloperOptionsModal';
import { ManageBucketsSection } from './src/components/ManageBucketsSection';
import {
  QrCode,
  Smartphone,
  ShieldCheck,
  Wallet,
  RefreshCw,
  Sparkles,
  Calendar,
  Code,
  LayoutDashboard,
  History,
  Scale,
  Sliders,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'activity' | 'manage' | 'settle'>('home');
  const [spendModalVisible, setSpendModalVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [devModalVisible, setDevModalVisible] = useState(false);
  const [discrepancyBanner, setDiscrepancyBanner] = useState<{
    visible: boolean;
    delta: number;
    isDeficit: boolean;
  }>({ visible: false, delta: 0, isDeficit: true });
  const scrollRef = useRef<any>(null);

  const {
    netWorth,
    buckets,
    spentToday,
    daysRemainingInCycle,
    transactions,
    getTodayAllowance,
    getTodayRemaining,
    hasZeroAllowanceDays,
    normalizeRemainingDays,
    checkAutoAdvance,
    dailyBucketId,
  } = useBudgetStore();

  // Automatic Next Day: verify calendar progression on app open
  useEffect(() => {
    checkAutoAdvance();
  }, []);

  const todayAllowance = getTodayAllowance();
  const todayRemaining = getTodayRemaining();
  const spendingPoolBucket = buckets.find((b) => b.id === dailyBucketId);
  const spendingPoolTotal = spendingPoolBucket ? spendingPoolBucket.currentBalance : 0;
  const showNormalizeBanner = hasZeroAllowanceDays();

  // Conservation invariant check
  const sumBuckets = buckets.reduce((acc, b) => acc + b.currentBalance, 0);
  const isConserved = sumBuckets === netWorth;

  const handleNormalize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    normalizeRemainingDays();
  };

  const handleSyncBalanceClick = () => {
    setSyncModalVisible(true);
  };

  const handleDiscrepancyDetected = (delta: number) => {
    setDiscrepancyBanner({
      visible: true,
      delta: Math.abs(delta),
      isDeficit: delta < 0,
    });
  };

  const handleAdjustNow = () => {
    setDiscrepancyBanner((prev) => ({ ...prev, visible: false }));
    setActiveTab('settle');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.appTitle}>bachaoo</Text>
            <View style={styles.bankBadge}>
              <Wallet size={12} color={colors.primary} />
              <Text style={styles.bankBadgeText}>₹{netWorth.toLocaleString('en-IN')}</Text>
              <Pressable style={styles.syncBtn} onPress={handleSyncBalanceClick}>
                <RefreshCw size={10} color={colors.accentCyan} />
                <Text style={styles.syncBtnText}>Sync</Text>
              </Pressable>
              <Pressable style={styles.calendarHeaderBtn} onPress={() => setCalendarModalVisible(true)}>
                <Calendar size={10} color={colors.accentCyan} />
                <Text style={styles.calendarHeaderBtnText}>Calendar</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.syncBadge}>
            <ShieldCheck size={13} color={isConserved ? colors.primary : colors.warning} />
            <Text style={[styles.syncBadgeText, !isConserved && { color: colors.warning }]}>
              {isConserved ? 'Balanced' : 'Discrepancy'}
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
            onOpenCalendar={() => setCalendarModalVisible(true)}
          />
        </View>

        {/* Dynamic User Normalization Banner (When upcoming days have ₹0) */}
        {showNormalizeBanner && (
          <View style={styles.normalizeBanner}>
            <View style={styles.normalizeLeft}>
              <Sparkles size={16} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.normalizeTitle}>Upcoming Days Have ₹0</Text>
                <Text style={styles.normalizeSubtext}>
                  You advanced funds for a batch spend. Want to smooth remaining allowance?
                </Text>
              </View>
            </View>

            <Pressable style={styles.normalizeBtn} onPress={handleNormalize}>
              <Text style={styles.normalizeBtnText}>Normalize</Text>
            </Pressable>
          </View>
        )}

        {/* Primary Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.primaryActionBtn, styles.scanBtn]}
            onPress={() => setSpendModalVisible(true)}
          >
            <QrCode size={18} color="#0B0F19" />
            <Text style={styles.scanBtnText}>Scan & Pay</Text>
          </Pressable>

          <Pressable style={styles.secondaryActionBtn} onPress={() => setSpendModalVisible(true)}>
            <Smartphone size={18} color={colors.textPrimary} />
            <Text style={styles.secondaryActionBtnText}>Pay Phone</Text>
          </Pressable>
        </View>

        {/* TAB 1: HOME (Hero + Quick Actions + Virtual Buckets) */}
        {activeTab === 'home' && (
          <View>
            {/* Buckets Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Buckets</Text>
              <Text style={styles.sectionSubtext}>Allocated: ₹{sumBuckets.toLocaleString('en-IN')}</Text>
            </View>

            {buckets.map((bucket) => (
              <BucketCard key={bucket.id} bucket={bucket} />
            ))}

            {/* Inline Discrepancy Banner — alert on Home that points to Settle Up */}
            {discrepancyBanner.visible && (
              <View style={[styles.discrepancyBanner, discrepancyBanner.isDeficit ? styles.bannerDeficit : styles.bannerSurplus]}>
                <View style={styles.discrepancyBannerLeft}>
                  <Text style={[styles.discrepancyBannerTitle, discrepancyBanner.isDeficit ? { color: colors.danger } : { color: colors.primary }]}>
                    {discrepancyBanner.isDeficit ? '⚠️' : '✨'} ₹{discrepancyBanner.delta.toLocaleString('en-IN')} {discrepancyBanner.isDeficit ? 'Deficit' : 'Surplus'} Detected
                  </Text>
                  <Text style={styles.discrepancyBannerSubtext}>Your real balance doesn't match. Settle it now.</Text>
                </View>
                <Pressable style={styles.adjustNowBtn} onPress={handleAdjustNow}>
                  <Text style={styles.adjustNowText}>Settle Up</Text>
                </Pressable>
              </View>
            )}
            
            {/* Discrete Developer & Timeline Simulation Trigger */}
            <Pressable style={styles.devToolsLauncher} onPress={() => setDevModalVisible(true)}>
              <Code size={13} color={colors.textMuted} />
              <Text style={styles.devToolsLauncherText}>Developer & Timeline Simulation</Text>
            </Pressable>
          </View>
        )}

        {/* TAB 2: ACTIVITY (Recent Transactions) */}
        {activeTab === 'activity' && (
          <View>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Text style={styles.sectionSubtext}>{transactions.length} entries</Text>
            </View>

            <View style={styles.transactionsCard}>
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </View>
          </View>
        )}

        {/* TAB 3: MANAGE (Add/Edit Buckets & Rules) */}
        {activeTab === 'manage' && (
          <View>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>Manage Buckets</Text>
              <Text style={styles.sectionSubtext}>Configure rules & autopay</Text>
            </View>

            <ManageBucketsSection />
          </View>
        )}

        {/* TAB 4: SETTLE UP (Discrepancy Resolution) */}
        {activeTab === 'settle' && (
          <View>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>Balance Reconciliation</Text>
              <Text style={styles.sectionSubtext}>Sync with bank</Text>
            </View>

            <DiscrepancyResolutionSection />
          </View>
        )}
      </ScrollView>

      {/* Persistent Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <Pressable
          style={styles.tabBarItem}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('home');
          }}
        >
          <LayoutDashboard
            size={20}
            color={activeTab === 'home' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabBarLabel,
              activeTab === 'home' && styles.tabBarLabelActive,
            ]}
          >
            Buckets
          </Text>
        </Pressable>

        <Pressable
          style={styles.tabBarItem}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('activity');
          }}
        >
          <History
            size={20}
            color={activeTab === 'activity' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabBarLabel,
              activeTab === 'activity' && styles.tabBarLabelActive,
            ]}
          >
            Activity
          </Text>
        </Pressable>

        <Pressable
          style={styles.tabBarItem}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('manage');
          }}
        >
          <Sliders
            size={20}
            color={activeTab === 'manage' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabBarLabel,
              activeTab === 'manage' && styles.tabBarLabelActive,
            ]}
          >
            Manage
          </Text>
        </Pressable>

        <Pressable
          style={styles.tabBarItem}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('settle');
          }}
        >
          <View style={styles.tabIconWithBadge}>
            <Scale
              size={20}
              color={activeTab === 'settle' ? colors.primary : colors.textMuted}
            />
            {!isConserved && <View style={styles.tabBadgeDot} />}
          </View>
          <Text
            style={[
              styles.tabBarLabel,
              activeTab === 'settle' && styles.tabBarLabelActive,
            ]}
          >
            Settle Up
          </Text>
        </Pressable>
      </View>

      {/* Spend / Payment Modal */}
      <SpendModal visible={spendModalVisible} onClose={() => setSpendModalVisible(false)} />

      {/* Sync Balance / Discrepancy Modal */}
      <SyncBalanceModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        onDiscrepancyDetected={handleDiscrepancyDetected}
      />

      {/* Allowance Calendar & Schedule Modal */}
      <AllowanceCalendarModal
        visible={calendarModalVisible}
        onClose={() => setCalendarModalVisible(false)}
      />

      {/* Developer & Simulation Modal */}
      <DeveloperOptionsModal
        visible={devModalVisible}
        onClose={() => setDevModalVisible(false)}
      />

      {/* 60-Second Floating Undo Toast */}
      <UndoToast />
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
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
    gap: 8,
  },
  headerTitleContainer: {
    flex: 1,
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
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  syncBtnText: {
    color: colors.accentCyan,
    fontSize: 10,
    fontWeight: '700',
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
  calendarHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  calendarHeaderBtnText: {
    color: colors.accentCyan,
    fontSize: 10,
    fontWeight: '700',
  },
  heroSection: {
    marginBottom: 4,
  },
  normalizeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
    marginTop: 4,
    gap: 8,
  },
  normalizeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  normalizeTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
  },
  normalizeSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  normalizeBtn: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  normalizeBtnText: {
    color: '#0B0F19',
    fontSize: 12,
    fontWeight: '700',
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
  devToolsLauncher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
  },
  devToolsLauncherText: {
    color: colors.textMuted,
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
  discrepancyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  bannerDeficit: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bannerSurplus: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  discrepancyBannerLeft: {
    flex: 1,
  },
  discrepancyBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  discrepancyBannerSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  adjustNowBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  adjustNowText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    paddingVertical: 10,
    paddingBottom: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 4,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabBarLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabIconWithBadge: {
    position: 'relative',
  },
  tabBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
});
