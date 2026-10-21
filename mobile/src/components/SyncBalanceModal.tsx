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
} from 'react-native';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';
import { X, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface SyncBalanceModalProps {
  visible: boolean;
  onClose: () => void;
  onDiscrepancyDetected: (delta: number) => void;
}

export const SyncBalanceModal: React.FC<SyncBalanceModalProps> = ({
  visible,
  onClose,
  onDiscrepancyDetected,
}) => {
  const { netWorth, setBankBalance } = useBudgetStore();
  const [balanceInput, setBalanceInput] = useState(netWorth.toString());

  const handleUpdate = () => {
    const num = parseFloat(balanceInput);
    if (isNaN(num) || num < 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { discrepancyDetected, delta } = setBankBalance(num);

    onClose();

    if (discrepancyDetected) {
      onDiscrepancyDetected(delta);
    }
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
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <RefreshCw size={16} color={colors.accentCyan} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Sync Bank Balance</Text>
                <Text style={styles.headerSubtext}>Temporary entry before live bank fetch</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Simple Clean Input */}
          <Text style={styles.inputPrompt}>Enter Actual Bank Balance:</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={balanceInput}
              onChangeText={setBalanceInput}
              autoFocus={true}
            />
          </View>

          {/* Single Confirm Button */}
          <Pressable style={styles.confirmBtn} onPress={handleUpdate}>
            <Text style={styles.confirmBtnText}>Update Balance</Text>
          </Pressable>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  inputPrompt: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  currencyPrefix: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    minWidth: 140,
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#0B0F19',
    fontSize: 16,
    fontWeight: '700',
  },
});
