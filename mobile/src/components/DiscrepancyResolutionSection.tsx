import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const DiscrepancyResolutionSection: React.FC = () => {
  const {
    activeDiscrepancy,
    buckets,
    settleDiscrepancy,
    dailyBucketId,
  } = useBudgetStore();

  const [allowanceAdjustmentMode, setAllowanceAdjustmentMode] = useState<
    'normalize' | 'reduce_upcoming'
  >('normalize');
  const [validationError, setValidationError] = useState('');
  // Custom amount per bucket. Key: bucketId, Value: string input for typing
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Reset custom amounts when activeDiscrepancy changes
  useEffect(() => {
    setCustomAmounts({});
    setValidationError('');
    setAllowanceAdjustmentMode('normalize');
  }, [activeDiscrepancy]);

  if (!activeDiscrepancy) {
    return (
      <View style={styles.allSetCard}>
        <View style={styles.allSetIconBadge}>
          <CheckCircle2 size={32} color={colors.primary} />
        </View>
        <Text style={styles.allSetTitle}>You are all set!</Text>
        <Text style={styles.allSetSubtext}>
          Bank balance matches your buckets perfectly. Zero discrepancies detected.
        </Text>
      </View>
    );
  }

  const isDeficit = activeDiscrepancy.type === 'deficit';
  const targetTotal = activeDiscrepancy.amount;

  // Calculate sum of entered amounts
  const parsedAmounts: Record<string, number> = {};
  let totalAllocated = 0;

  buckets.forEach((b) => {
    const val = Math.max(0, parseFloat(customAmounts[b.id] || '0') || 0);
    parsedAmounts[b.id] = val;
    totalAllocated += val;
  });

  const remainingToAllocate = targetTotal - totalAllocated;
  const hasInvalidDeduction = isDeficit && buckets.some(
    (bucket) => parsedAmounts[bucket.id] > bucket.currentBalance
  );
  const isFullyAllocated = remainingToAllocate === 0 && !hasInvalidDeduction;

  const handleAmountChange = (bucketId: string, text: string) => {
    setValidationError('');
    setCustomAmounts((prev) => ({
      ...prev,
      [bucketId]: text,
    }));
  };

  const handleQuickFillRemaining = (bucketId: string) => {
    if (remainingToAllocate <= 0) return;
    const current = parsedAmounts[bucketId] || 0;
    const bucket = buckets.find((item) => item.id === bucketId);
    const availableToDeduct = bucket ? Math.max(0, bucket.currentBalance - current) : remainingToAllocate;
    const newAmount = isDeficit
      ? current + Math.min(remainingToAllocate, availableToDeduct)
      : current + remainingToAllocate;

    setCustomAmounts((prev) => ({
      ...prev,
      [bucketId]: newAmount.toString(),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleConfirmSettle = () => {
    if (hasInvalidDeduction) {
      setValidationError('A deduction cannot be greater than the bucket balance.');
      return;
    }
    if (!isFullyAllocated) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const adjustments = Object.entries(parsedAmounts)
      .filter(([_, amt]) => amt > 0)
      .map(([bucketId, amt]) => ({
        bucketId,
        amountDelta: isDeficit ? -amt : amt, // Negative for deficit, positive for surplus
      }));

    settleDiscrepancy(
      adjustments,
      isDeficit && dailyBucketId && parsedAmounts[dailyBucketId] > 0
        ? allowanceAdjustmentMode
        : 'normalize'
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={[styles.headerBanner, isDeficit ? styles.bannerDeficit : styles.bannerSurplus]}>
        <View style={styles.headerLeft}>
          {isDeficit ? (
            <AlertTriangle size={20} color={colors.danger} />
          ) : (
            <ArrowUpRight size={20} color={colors.primary} />
          )}
          <View>
            <Text style={[styles.bannerTitle, isDeficit ? styles.textDanger : styles.textSuccess]}>
              {isDeficit
                ? `₹${targetTotal.toLocaleString('en-IN')} Discrepancy Found`
                : `+₹${targetTotal.toLocaleString('en-IN')} Surplus Found`}
            </Text>
            <Text style={styles.bannerSubtext}>
              {isDeficit
                ? 'Deduct this missing amount across one or multiple buckets'
                : 'Fill one or multiple buckets with this extra balance'}
            </Text>
          </View>
        </View>
      </View>

      {/* Allocation Progress Meter */}
      <View style={styles.meterCard}>
        <View style={styles.meterRow}>
          <View>
            <Text style={styles.meterLabel}>Total Discrepancy</Text>
            <Text style={styles.meterTarget}>₹{targetTotal.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.meterDivider} />

          <View>
            <Text style={styles.meterLabel}>Allocated</Text>
            <Text style={[styles.meterAllocated, isFullyAllocated && { color: colors.primary }]}>
              ₹{totalAllocated.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.meterDivider} />

          <View>
            <Text style={styles.meterLabel}>Remaining</Text>
            <Text
              style={[
                styles.meterRemaining,
                remainingToAllocate > 0 ? { color: colors.warning } : { color: colors.primary },
                remainingToAllocate < 0 && { color: colors.danger },
              ]}
            >
              {remainingToAllocate < 0
                ? `+₹${Math.abs(remainingToAllocate)} (Over)`
                : `₹${remainingToAllocate.toLocaleString('en-IN')}`}
            </Text>
          </View>
        </View>

      </View>

      {/* Buckets Custom Adjustment List */}
      <Text style={styles.sectionHeading}>
        {isDeficit ? 'Deduct from buckets:' : 'Fill buckets:'}
      </Text>

      <View style={styles.bucketList}>
        {buckets.map((bucket) => {
          const enteredVal = customAmounts[bucket.id] || '';

          return (
            <View key={bucket.id} style={styles.bucketCard}>
              <View style={styles.bucketInfo}>
                <Text style={styles.bucketName}>{bucket.name}</Text>
                <Text style={styles.bucketBalance}>
                  Current Bal: ₹{bucket.currentBalance.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.inputArea}>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefix}>₹</Text>
                  <TextInput
                    style={styles.customInput}
                    keyboardType="numeric"
                    placeholder={isDeficit ? 'Deduct' : 'Fill'}
                    placeholderTextColor={colors.textMuted}
                    value={enteredVal}
                    onChangeText={(txt) => handleAmountChange(bucket.id, txt)}
                  />
                </View>

                {remainingToAllocate > 0 && (!isDeficit || parsedAmounts[bucket.id] < bucket.currentBalance) && (
                  <Pressable
                    style={styles.fillBtn}
                    onPress={() => handleQuickFillRemaining(bucket.id)}
                  >
                    <Text style={styles.fillBtnText}>{isDeficit ? 'Max' : '+Fill'}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Daily allowance adjustment choice */}
      {isDeficit && dailyBucketId && parsedAmounts[dailyBucketId] > 0 && (
        <View style={styles.allowanceChoiceCard}>
          <Text style={styles.allowanceChoiceTitle}>Adjust upcoming daily allowance</Text>
          <Text style={styles.allowanceChoiceDescription}>
            Choose how the deduction affects the remaining days.
          </Text>
          <View style={styles.allowanceChoiceList}>
            <Pressable
              style={[
                styles.allowanceChoice,
                allowanceAdjustmentMode === 'normalize' && styles.allowanceChoiceActive,
              ]}
              onPress={() => setAllowanceAdjustmentMode('normalize')}
            >
              <View style={styles.choiceRadio}>
                {allowanceAdjustmentMode === 'normalize' && <View style={styles.choiceRadioSelected} />}
              </View>
              <View style={styles.choiceTextContainer}>
                <Text style={styles.choiceTitle}>Normalize evenly</Text>
                <Text style={styles.choiceDescription}>
                  Spread the reduced balance evenly across all remaining days.
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={[
                styles.allowanceChoice,
                allowanceAdjustmentMode === 'reduce_upcoming' && styles.allowanceChoiceActive,
              ]}
              onPress={() => setAllowanceAdjustmentMode('reduce_upcoming')}
            >
              <View style={styles.choiceRadio}>
                {allowanceAdjustmentMode === 'reduce_upcoming' && <View style={styles.choiceRadioSelected} />}
              </View>
              <View style={styles.choiceTextContainer}>
                <Text style={styles.choiceTitle}>Reduce upcoming days</Text>
                <Text style={styles.choiceDescription}>
                  Take the deduction from future days in sequence, leaving today unchanged.
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      {hasInvalidDeduction && (
        <Text style={styles.validationError}>
          One or more deductions exceed the current bucket balance.
        </Text>
      )}
      {validationError ? <Text style={styles.validationError}>{validationError}</Text> : null}

      {/* Settle Up Action Button */}
      <Pressable
        style={[styles.settleBtn, !isFullyAllocated && styles.settleBtnDisabled]}
        onPress={handleConfirmSettle}
        disabled={!isFullyAllocated}
      >
        <Text style={styles.settleBtnText}>
          {isFullyAllocated
            ? `Confirm & Settle ₹${targetTotal.toLocaleString('en-IN')}`
            : remainingToAllocate > 0
            ? `${isDeficit ? 'Deduct' : 'Fill'} ₹${remainingToAllocate} more to Settle`
            : `Exceeded by ₹${Math.abs(remainingToAllocate)}`}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  headerBanner: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  bannerDeficit: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bannerSurplus: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  bannerSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  textDanger: {
    color: colors.danger,
  },
  textSuccess: {
    color: colors.primary,
  },
  meterCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 16,
  },
  meterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meterLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  meterTarget: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  meterAllocated: {
    color: colors.warning,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  meterRemaining: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  meterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surfaceBorder,
  },
  validationError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionHeading: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  bucketList: {
    gap: 10,
    marginBottom: 16,
  },
  bucketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  bucketInfo: {
    flex: 1,
  },
  bucketName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  bucketBalance: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    minWidth: 90,
  },
  inputPrefix: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  customInput: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 50,
    padding: 0,
  },
  fillBtn: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fillBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  allowanceChoiceCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  allowanceChoiceTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  allowanceChoiceDescription: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
    marginBottom: 10,
  },
  allowanceChoiceList: {
    gap: 8,
  },
  allowanceChoice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  allowanceChoiceActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  choiceRadio: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  choiceRadioSelected: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  choiceDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    color: colors.textSecondary,
    fontSize: 11,
    flex: 1,
  },
  settleBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBtnDisabled: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.5,
  },
  settleBtnText: {
    color: '#0B0F19',
    fontSize: 15,
    fontWeight: '700',
  },
  allSetCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginTop: 20,
  },
  allSetIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  allSetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  allSetSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
