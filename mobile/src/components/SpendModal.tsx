import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';
import { X, AlertTriangle, ArrowRight, Shield, Calendar, CheckCircle2, FastForward } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface SpendModalProps {
  visible: boolean;
  initialMode: 'scan' | 'upi';
  onClose: () => void;
}

type PaymentMode = 'scan' | 'upi' | 'details';
type PaymentAction = 'direct' | 'borrow';

interface PendingPayment {
  amount: number;
  title: string;
  bucketId: string;
  action: PaymentAction;
}

export const SpendModal: React.FC<SpendModalProps> = ({ visible, initialMode, onClose }) => {
  const [amountInput, setAmountInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [payeeInput, setPayeeInput] = useState('');
  const [selectedBucketId, setSelectedBucketId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initialMode);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const launchedPaymentRef = useRef(false);

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
    startPayment('direct');
  };

  const handleConfirmBorrowNextAvailable = () => {
    startPayment('borrow');
  };

  const isPhoneNumber = (value: string) => {
    const normalized = value.replace(/[\s-]/g, '');
    return /^\+?\d{10,13}$/.test(normalized);
  };

  const startPayment = async (action: PaymentAction) => {
    if (numericAmount <= 0 || !selectedBucketId || !payeeInput.trim()) {
      setPaymentError('Enter an amount and payee before continuing.');
      return;
    }
    if (paymentMode === 'upi' && isPhoneNumber(payeeInput)) {
      setPaymentError(
        'A phone number cannot be resolved by the standard UPI link. Scan the recipient’s QR code or enter their UPI ID instead.'
      );
      return;
    }
    if (!isAllowanceSpend && hasInsufficientBucketBalance) {
      setPaymentError('The selected bucket does not have enough balance.');
      return;
    }
    if (action === 'borrow' && !borrowPreview.canFulfill) {
      setPaymentError('Upcoming allowance cannot cover this payment.');
      return;
    }

    const title = titleInput.trim() || 'UPI Payment';
    const pending: PendingPayment = {
      amount: numericAmount,
      title,
      bucketId: selectedBucketId,
      action,
    };

    const upiUrl = `upi://pay?pa=${encodeURIComponent(payeeInput.trim())}&am=${encodeURIComponent(
      numericAmount.toFixed(2)
    )}&cu=INR`;

    try {
      setPaymentError('');
      setPendingPayment(pending);
      launchedPaymentRef.current = true;
      await Linking.openURL(upiUrl);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      setPendingPayment(null);
      launchedPaymentRef.current = false;
      setPaymentError('No compatible UPI app could be opened. Check the payee and try again.');
    }
  };

  const completePayment = (success: boolean) => {
    if (!pendingPayment) return;
    if (!success) {
      setPendingPayment(null);
      setAwaitingConfirmation(false);
      launchedPaymentRef.current = false;
      return;
    }

    if (pendingPayment.action === 'borrow') {
      spendBorrowNextAvailable(pendingPayment.amount, pendingPayment.title);
    } else {
      const result = pendingPayment.bucketId === dailyBucketId
        ? spendDirect(pendingPayment.amount, pendingPayment.title)
        : spendFromBucket(pendingPayment.bucketId, pendingPayment.amount, pendingPayment.title);

      if (!result.success) {
        setPaymentError(
          'message' in result && result.message
            ? result.message
            : 'Payment succeeded, but the bucket could not be updated.'
        );
        return;
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPendingPayment(null);
    setAwaitingConfirmation(false);
    launchedPaymentRef.current = false;
    handleClose();
  };

  const handleClose = () => {
    setAmountInput('');
    setTitleInput('');
    setPayeeInput('');
    setSelectedBucketId(dailyBucketId || '');
    setPaymentMode(initialMode);
    setPendingPayment(null);
    setAwaitingConfirmation(false);
    setPaymentError('');
    launchedPaymentRef.current = false;
    onClose();
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && launchedPaymentRef.current && pendingPayment) {
        setAwaitingConfirmation(true);
      }
    });
    return () => subscription.remove();
  }, [pendingPayment]);

  useEffect(() => {
    if (visible) {
      setPaymentMode(initialMode);
      setAwaitingConfirmation(false);
      setPaymentError('');
    }
  }, [visible, initialMode]);

  const handleQrScanned = ({ data }: { data: string }) => {
    if (!data.toLowerCase().startsWith('upi://pay')) {
      setPaymentError('This QR code is not a supported UPI payment QR.');
      return;
    }

    const parsed = Linking.parse(data);
    const queryParams = parsed.queryParams || {};
    const payee = typeof queryParams.pa === 'string' ? queryParams.pa : '';
    const scannedAmount = typeof queryParams.am === 'string' ? queryParams.am : '';
    const payeeName = typeof queryParams.pn === 'string' ? queryParams.pn : '';

    if (!payee) {
      setPaymentError('This UPI QR does not contain a payee ID.');
      return;
    }

    setPayeeInput(payee);
    setAmountInput(scannedAmount);
    setTitleInput(payeeName);
    setPaymentError('');
    setPaymentMode('details');
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
            <Text style={styles.headerTitle}>
              {awaitingConfirmation ? 'Confirm Payment' : paymentMode === 'scan' ? 'Scan & Pay' : 'Pay by UPI ID'}
            </Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {awaitingConfirmation && pendingPayment ? (
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationIcon}>
                <CheckCircle2 size={28} color={colors.primary} />
              </View>
              <Text style={styles.confirmationTitle}>Did the payment succeed?</Text>
              <Text style={styles.confirmationText}>
                Confirm only after checking the UPI app. Bachaoo has not deducted this payment yet.
              </Text>
              <Text style={styles.confirmationAmount}>
                ₹{pendingPayment.amount.toLocaleString('en-IN')}
              </Text>
              <Pressable style={styles.payButton} onPress={() => completePayment(true)}>
                <Text style={styles.payButtonText}>Yes, payment succeeded</Text>
              </Pressable>
              <Pressable style={styles.cancelPaymentButton} onPress={() => completePayment(false)}>
                <Text style={styles.cancelPaymentText}>No, it failed or was cancelled</Text>
              </Pressable>
            </View>
          ) : paymentMode === 'scan' ? (
            <View style={styles.scannerContainer}>
              {!cameraPermission ? (
                <Text style={styles.cameraMessage}>Checking camera permission...</Text>
              ) : !cameraPermission.granted ? (
                <>
                  <Text style={styles.cameraMessage}>
                    Camera access is needed to scan a UPI QR code.
                  </Text>
                  <Pressable style={styles.payButton} onPress={requestCameraPermission}>
                    <Text style={styles.payButtonText}>Allow Camera</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={() => setPaymentMode('upi')}>
                    <Text style={styles.secondaryButtonText}>Enter a UPI ID instead</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <CameraView
                    style={styles.camera}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={handleQrScanned}
                  />
                  <Text style={styles.cameraHint}>Point the camera at a UPI QR code.</Text>
                </>
              )}
              {paymentError ? <Text style={styles.paymentError}>{paymentError}</Text> : null}
            </View>
          ) : (
          <>
          {paymentMode === 'upi' && (
            <>
              <Text style={styles.sectionLabel}>UPI ID</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Enter a UPI ID (e.g. merchant@upi)"
                placeholderTextColor={colors.textMuted}
                value={payeeInput}
                onChangeText={setPayeeInput}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.payeeHint}>
                Enter the recipient’s UPI ID, then verify the recipient in your payment app before confirming.
              </Text>
            </>
          )}
          {paymentMode === 'details' && (
            <View style={styles.scannedPayee}>
              <Text style={styles.scannedPayeeLabel}>Scanned UPI ID</Text>
              <Text style={styles.scannedPayeeValue}>{payeeInput}</Text>
            </View>
          )}

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
          {paymentError ? <Text style={styles.paymentError}>{paymentError}</Text> : null}
          </>
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
  scannerContainer: {
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cameraHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  cameraMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 20,
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  confirmationCard: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  confirmationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmationTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmationText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
  confirmationAmount: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '800',
    marginVertical: 18,
  },
  cancelPaymentButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelPaymentText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  paymentError: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 19,
  },
  payeeHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -8,
    marginBottom: 14,
  },
  scannedPayee: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  scannedPayeeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  scannedPayeeValue: {
    color: colors.textPrimary,
    fontWeight: '600',
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
