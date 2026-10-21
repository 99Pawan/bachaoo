import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';
import { X, AlertTriangle, ArrowRight, Shield, Calendar, CheckCircle2, FastForward } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface SpendModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SpendModal: React.FC<SpendModalProps> = ({ visible, onClose }) => {
  const [amountInput, setAmountInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [selectedBucketId, setSelectedBucketId] = useState('');

  const {
    getTodayRemaining,
    buckets,
    spendDirect,
    spendBorrowNextAvailable,
    spendFromBucket,
    dailyBucketId,
    previewBorrowDaysImpact,
  } = useBudgetStore();
  const remainingToday = getTodayRemaining();
  const selectedBucket = buckets.find((b) => b.id === selectedBucketId);
  const isAllowanceSpend = selectedBucketId === dailyBucketId;

  const numericAmount = parseFloat(amountInput) || 0;
  const isOverspend = isAllowanceSpend && numericAmount > remainingToday;
  const deficit = isOverspend ? numericAmount - remainingToday : 0;
  const hasInsufficientBucketBalance =
    !isAllowanceSpend && Boolean(selectedBucket && numericAmount > selectedBucket.currentBalance);

  // Preview multi-day drawdown impact
  const borrowPreview = previewBorrowDaysImpact(numericAmount);

  useEffect(() => {
    if (visible) {
      setSelectedBucketId(dailyBucketId || buckets[0]?.id || '');
    }
  }, [visible, dailyBucketId, buckets]);

  const handleConfirmDirect = () => {
    if (numericAmount <= 0) return;
    const title = titleInput.trim() || 'Quick Expense';
    const result = isAllowanceSpend
      ? spendDirect(numericAmount, title)
      : spendFromBucket(selectedBucketId, numericAmount, title);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    }
  };

  const handleConfirmBorrowNextAvailable = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const title = titleInput.trim() || 'Batch Purchase (Advanced from upcoming days)';
    spendBorrowNextAvailable(numericAmount, title);
    handleClose();
  };

  const handleClose = () => {
    setAmountInput('');
    setTitleInput('');
    setSelectedBucketId(dailyBucketId || '');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Make a Payment</Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Amount Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={amountInput}
              onChangeText={setAmountInput}
              autoFocus={true}
            />
          </View>

          {/* Note Input */}
          <TextInput
            style={styles.titleInput}
            placeholder="What is this for? (e.g. Weekly Groceries, Zomato, Chai)"
            placeholderTextColor={colors.textMuted}
            value={titleInput}
            onChangeText={setTitleInput}
          />

          {/* Funding Bucket */}
          <Text style={styles.sectionLabel}>Deduct from</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bucketPicker}
          >
            {buckets.map((bucket) => {
              const isSelected = bucket.id === selectedBucketId;
              return (
                <Pressable
                  key={bucket.id}
                  style={[
                    styles.bucketOption,
                    isSelected && { borderColor: bucket.color, backgroundColor: `${bucket.color}20` },
                  ]}
                  onPress={() => setSelectedBucketId(bucket.id)}
                >
                  <Text style={[styles.bucketOptionName, isSelected && { color: bucket.color }]}>
                    {bucket.name}
                  </Text>
                  <Text style={styles.bucketOptionBalance}>
                    ₹{bucket.currentBalance.toLocaleString('en-IN')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!isAllowanceSpend && selectedBucket && (
            <View style={styles.bucketNotice}>
              <Shield size={15} color={selectedBucket.color} />
              <Text style={styles.bucketNoticeText}>
                This payment comes entirely from {selectedBucket.name}; today’s allowance stays unchanged.
              </Text>
            </View>
          )}

          {/* State 1: Within Safe Limit */}
          {numericAmount > 0 && isAllowanceSpend && !isOverspend && (
            <View style={styles.safeContainer}>
              <CheckCircle2 size={16} color={colors.primary} />
              <Text style={styles.safeText}>
                Within daily limit! Leaves ₹{(remainingToday - numericAmount).toLocaleString('en-IN')} for today.
              </Text>
            </View>
          )}

          {numericAmount > 0 && hasInsufficientBucketBalance && selectedBucket && (
            <View style={styles.insufficientContainer}>
              <AlertTriangle size={16} color={colors.danger} />
              <Text style={styles.insufficientText}>
                {selectedBucket.name} has only ₹{selectedBucket.currentBalance.toLocaleString('en-IN')}.
              </Text>
            </View>
          )}

          {/* State 2: Over Daily Limit -> Show Choices */}
          {numericAmount > 0 && isAllowanceSpend && isOverspend && (
            <View style={styles.consequenceBox}>
              <View style={styles.warningHeader}>
                <AlertTriangle size={18} color={colors.danger} />
                <Text style={styles.warningTitle}>Over Daily Budget by ₹{deficit.toLocaleString('en-IN')}</Text>
              </View>

              <Text style={styles.warningDescription}>
                You have ₹{remainingToday} left today. Choose how to fund the remaining ₹{deficit}:
              </Text>

              {/* Choice A: Advance from Upcoming Days */}
              {borrowPreview.canFulfill && (
                <Pressable style={styles.consequenceOption} onPress={handleConfirmBorrowNextAvailable}>
                  <View style={styles.optionIconContainer}>
                    <FastForward size={18} color={colors.warning} />
                  </View>
                  <View style={styles.optionDetails}>
                    <View style={styles.optionHeaderRow}>
                      <Text style={styles.optionTitle}>Advance from Upcoming Days</Text>
                      <View style={styles.pillBadge}>
                        <Text style={styles.pillBadgeText}>+{borrowPreview.daysConsumed} days</Text>
                      </View>
                    </View>
                    <Text style={styles.optionSubtext}>
                      Consumes today + next {borrowPreview.daysConsumed} day(s) down to ₹0 from upcoming allowance
                    </Text>
                  </View>
                  <ArrowRight size={16} color={colors.textSecondary} />
                </Pressable>
              )}

            </View>
          )}

          {/* Direct Pay Button (when within limits) */}
          {(!isOverspend || !isAllowanceSpend || numericAmount <= 0) && (
            <Pressable
              style={[
                styles.payButton,
                (numericAmount <= 0 || hasInsufficientBucketBalance) && styles.payButtonDisabled,
              ]}
              onPress={handleConfirmDirect}
              disabled={numericAmount <= 0 || hasInsufficientBucketBalance}
            >
              <Text style={styles.payButtonText}>
                {numericAmount <= 0
                  ? 'Enter Amount'
                  : `Pay ₹${numericAmount} from ${selectedBucket?.name || 'bucket'}`}
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  currencyPrefix: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: '800',
    minWidth: 120,
    textAlign: 'center',
  },
  titleInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bucketPicker: {
    gap: 8,
    paddingBottom: 14,
  },
  bucketOption: {
    minWidth: 132,
    maxWidth: 170,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  bucketOptionName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  bucketOptionBalance: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  bucketNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryMuted,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  bucketNoticeText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  safeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryMuted,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  insufficientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerMuted,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  insufficientText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  safeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  consequenceBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  warningTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  warningDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  consequenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionDetails: {
    flex: 1,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillBadge: {
    backgroundColor: colors.warningMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillBadgeText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  optionSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.6,
  },
  payButtonText: {
    color: '#0B0F19',
    fontSize: 16,
    fontWeight: '700',
  },
});
