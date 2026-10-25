import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';
import {
  Code,
  X,
  FastForward,
  CreditCard,
  RotateCcw,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface DeveloperOptionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DeveloperOptionsModal: React.FC<DeveloperOptionsModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    advanceToNextDay,
    reconcileExternalDebit,
    resetDemoData,
    daysRemainingInCycle,
    buckets,
    defaultBucketId,
  } = useBudgetStore();

  const [selectedSubAmount, setSelectedSubAmount] = useState<number>(499);
  const [selectedBucketId, setSelectedBucketId] = useState<string>(defaultBucketId);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAdvanceDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    advanceToNextDay();
    showToast('Advanced to next day! Daily spent reset to ₹0.');
  };

  const handleAdvanceWeek = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    for (let i = 0; i < 7; i++) {
      advanceToNextDay();
    }
    showToast('Advanced 7 days forward!');
  };

  const handleTriggerDebit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reconcileExternalDebit(selectedSubAmount, selectedBucketId);
    showToast(`Simulated debit of ₹${selectedSubAmount} from ${selectedBucketId}`);
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    resetDemoData();
    showToast('Demo data restored to initial state!');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Code size={18} color={colors.accentCyan} />
            </View>
            <View>
              <Text style={styles.title}>Developer Tools</Text>
              <Text style={styles.subtitle}>Test edge cases & timeline simulation</Text>
            </View>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Temporary action confirmation toast */}
        {toastMessage && (
          <View style={styles.toastBanner}>
            <CheckCircle size={14} color={colors.primary} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Section 1: Timeline Simulation */}
          <Text style={styles.sectionHeader}>Time Simulation (Days & Cycle)</Text>
          <View style={styles.card}>
            <Text style={styles.cardDesc}>
              In real production, Bachaoo automatically advances days at midnight. Use these buttons to manually simulate the passage of time for testing:
            </Text>

            <View style={styles.btnRow}>
              <Pressable style={styles.simBtn} onPress={handleAdvanceDay}>
                <FastForward size={16} color={colors.accentCyan} />
                <Text style={styles.simBtnText}>Next Day (+1)</Text>
              </Pressable>

              <Pressable style={styles.simBtn} onPress={handleAdvanceWeek}>
                <FastForward size={16} color={colors.accentCyan} />
                <Text style={styles.simBtnText}>Next Week (+7)</Text>
              </Pressable>
            </View>

            <Text style={styles.metaInfo}>
              Current cycle status: {daysRemainingInCycle} days remaining
            </Text>
          </View>

          {/* Section 2: Simulate Recurring External Debit */}
          <Text style={styles.sectionHeader}>Simulate Recurring External Debit</Text>
          <View style={styles.card}>
            <Text style={styles.cardDesc}>
              Test how Bachaoo reconciles auto-debits (e.g. UPI autopay, subscription bills, or card charges):
            </Text>

            {/* Presets */}
            <Text style={styles.subHeading}>Select Debit Amount:</Text>
            <View style={styles.chipRow}>
              {[
                { label: '₹199 (Music)', amount: 199 },
                { label: '₹499 (Streaming)', amount: 499 },
                { label: '₹1,499 (Broadband)', amount: 1499 },
                { label: '₹5,000 (Expense)', amount: 5000 },
              ].map((p) => (
                <Pressable
                  key={p.amount}
                  style={[
                    styles.chip,
                    selectedSubAmount === p.amount && styles.chipActive,
                  ]}
                  onPress={() => setSelectedSubAmount(p.amount)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedSubAmount === p.amount && styles.chipTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Target Bucket */}
            <Text style={styles.subHeading}>Charge to Bucket:</Text>
            <View style={styles.chipRow}>
              {buckets.map((b) => (
                <Pressable
                  key={b.id}
                  style={[
                    styles.chip,
                    selectedBucketId === b.id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedBucketId(b.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedBucketId === b.id && styles.chipTextActive,
                    ]}
                  >
                    {b.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.triggerDebitBtn} onPress={handleTriggerDebit}>
              <CreditCard size={16} color="#0B0F19" />
              <Text style={styles.triggerDebitBtnText}>
                Trigger Debit (₹{selectedSubAmount})
              </Text>
            </Pressable>
          </View>

          {/* Section 3: Reset Demo State */}
          <Text style={styles.sectionHeader}>State Reset</Text>
          <View style={styles.card}>
            <Text style={styles.cardDesc}>
              Restore all buckets, initial ₹50,000 net worth, and fresh daily schedule:
            </Text>

            <Pressable style={styles.resetBtn} onPress={handleReset}>
              <RotateCcw size={16} color={colors.danger} />
              <Text style={styles.resetBtnText}>Reset to Fresh Demo State</Text>
            </Pressable>
          </View>
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
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
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
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  toastText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 12,
  },
  cardDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  simBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  simBtnText: {
    color: colors.accentCyan,
    fontSize: 13,
    fontWeight: '700',
  },
  metaInfo: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  subHeading: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipActive: {
    backgroundColor: colors.accentCyan,
    borderColor: colors.accentCyan,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#0B0F19',
    fontWeight: '700',
  },
  triggerDebitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  triggerDebitBtnText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resetBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
