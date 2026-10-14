import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';
import { X, AlertTriangle, ArrowRight, Shield, Calendar, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface SpendModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SpendModal: React.FC<SpendModalProps> = ({ visible, onClose }) => {
  const [amountInput, setAmountInput] = useState('');
  const [titleInput, setTitleInput] = useState('');

  const {
    getTodayRemaining,
    getTodayAllowance,
    daysRemainingInCycle,
    buckets,
    spendDirect,
    spendWithBorrowTomorrow,
    spendWithBorrowBucket,
  } = useBudgetStore();

  const remainingToday = getTodayRemaining();
  const todayAllowance = getTodayAllowance();
  const spendingPool = buckets.find((b) => b.id === 'spending-pool')?.currentBalance || 0;
  const safeBuffer = buckets.find((b) => b.id === 'savings-sink')?.currentBalance || 0;

  const numericAmount = parseFloat(amountInput) || 0;
  const isOverspend = numericAmount > remainingToday;
  const deficit = isOverspend ? numericAmount - remainingToday : 0;

  // Recalibration preview if borrowing from tomorrow
  const newPoolAfterBorrow = Math.max(0, spendingPool - numericAmount);
  const recalibratedDailyAllowance =
    daysRemainingInCycle > 1 ? Math.floor(newPoolAfterBorrow / (daysRemainingInCycle - 1)) : 0;

  const handleConfirmDirect = () => {
    if (numericAmount <= 0) return;
    const title = titleInput.trim() || 'Quick Expense';
    const result = spendDirect(numericAmount, title);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    }
  };

  const handleConfirmBorrowTomorrow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const title = titleInput.trim() || 'Impulse Spend (Borrowed from Tomorrow)';
    spendWithBorrowTomorrow(numericAmount, title);
    handleClose();
  };

  const handleConfirmBorrowBuffer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const title = titleInput.trim() || 'Expense (Deducted from Safe Buffer)';
    spendWithBorrowBucket(numericAmount, title, 'savings-sink');
    handleClose();
  };

  const handleClose = () => {
    setAmountInput('');
    setTitleInput('');
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
            placeholder="What is this for? (e.g. Swiggy, Chai, Books)"
            placeholderTextColor={colors.textMuted}
            value={titleInput}
            onChangeText={setTitleInput}
          />

          {/* Budget Evaluation States */}
          {numericAmount > 0 && !isOverspend && (
            <View style={styles.safeContainer}>
              <CheckCircle2 size={16} color={colors.primary} />
              <Text style={styles.safeText}>
                Within limit! Leaves ₹{(remainingToday - numericAmount).toLocaleString('en-IN')} for today.
              </Text>
            </View>
          )}

          {/* Overspend Consequence Screen */}
          {numericAmount > 0 && isOverspend && (
            <View style={styles.consequenceBox}>
              <View style={styles.warningHeader}>
                <AlertTriangle size={18} color={colors.danger} />
                <Text style={styles.warningTitle}>Over Daily Budget by ₹{deficit.toLocaleString('en-IN')}</Text>
              </View>

              <Text style={styles.warningDescription}>
                You only have ₹{remainingToday} left for today. Choose where to take the remaining ₹{deficit}:
              </Text>

              {/* Option A: Borrow from Tomorrow */}
              <Pressable style={styles.consequenceOption} onPress={handleConfirmBorrowTomorrow}>
                <View style={styles.optionIconContainer}>
                  <Calendar size={18} color={colors.warning} />
                </View>
                <View style={styles.optionDetails}>
                  <Text style={styles.optionTitle}>Borrow from Tomorrow</Text>
                  <Text style={styles.optionSubtext}>
                    Tomorrow's allowance drops from ₹{todayAllowance} to{' '}
                    <Text style={{ color: colors.warning, fontWeight: '700' }}>₹{recalibratedDailyAllowance}</Text>
                  </Text>
                </View>
                <ArrowRight size={16} color={colors.textSecondary} />
              </Pressable>

              {/* Option B: Pull from Safe Buffer */}
              <Pressable
                style={[styles.consequenceOption, safeBuffer < deficit && styles.optionDisabled]}
                onPress={safeBuffer >= deficit ? handleConfirmBorrowBuffer : undefined}
              >
                <View style={styles.optionIconContainer}>
                  <Shield size={18} color={colors.accentBlue} />
                </View>
                <View style={styles.optionDetails}>
                  <Text style={styles.optionTitle}>Pull from Safe Buffer</Text>
                  <Text style={styles.optionSubtext}>
                    Safe Buffer balance: ₹{safeBuffer.toLocaleString('en-IN')}
                  </Text>
                </View>
                <ArrowRight size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}

          {/* Direct Pay Button (when within limits) */}
          {(!isOverspend || numericAmount <= 0) && (
            <Pressable
              style={[styles.payButton, numericAmount <= 0 && styles.payButtonDisabled]}
              onPress={handleConfirmDirect}
              disabled={numericAmount <= 0}
            >
              <Text style={styles.payButtonText}>
                {numericAmount <= 0 ? 'Enter Amount' : `Pay ₹${numericAmount} via UPI`}
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
  safeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryMuted,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
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
  optionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  optionSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
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

