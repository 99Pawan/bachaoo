import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';
import { Bucket } from '../types';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Home,
  Coffee,
  Smartphone,
  ShieldCheck,
  CreditCard,
  Target,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const ManageBucketsSection: React.FC = () => {
  const {
    buckets,
    addBucket,
    updateBucket,
    deleteBucket,
    dailyBucketId,
    setDailyBucket,
    transferBetweenBuckets,
  } = useBudgetStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [editingBucket, setEditingBucket] = useState<Bucket | null>(null);
  const [fromBucketId, setFromBucketId] = useState('');
  const [toBucketId, setToBucketId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [monthlyAllocation, setMonthlyAllocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#8B5CF6');
  const [selectedIcon, setSelectedIcon] = useState('Home');

  const totalAllocated = buckets.reduce((sum, b) => sum + b.currentBalance, 0);

  const openCreateModal = () => {
    setEditingBucket(null);
    setName('');
    setMonthlyAllocation('');
    setDescription('');
    setSelectedColor('#8B5CF6');
    setSelectedIcon('Home');
    setModalVisible(true);
  };

  const openTransferModal = () => {
    setFromBucketId(buckets[0]?.id || '');
    setToBucketId(buckets[1]?.id || '');
    setTransferAmount('');
    setTransferError('');
    setTransferModalVisible(true);
  };

  const handleTransfer = () => {
    const result = transferBetweenBuckets(fromBucketId, toBucketId, parseFloat(transferAmount));
    if (!result.success) {
      setTransferError(result.message || 'Unable to transfer money');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTransferModalVisible(false);
  };

  const openEditModal = (bucket: Bucket) => {
    setEditingBucket(bucket);
    setName(bucket.name);
    setMonthlyAllocation(bucket.monthlyAllocation ? bucket.monthlyAllocation.toString() : '');
    setDescription(bucket.description || '');
    setSelectedColor(bucket.color || '#8B5CF6');
    setSelectedIcon(bucket.iconName || 'Home');
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const parsedMonthly = parseFloat(monthlyAllocation) || 0;
    if (editingBucket) {
      updateBucket(editingBucket.id, {
        name: name.trim(),
        monthlyAllocation: parsedMonthly,
        description: description.trim(),
        color: selectedColor,
        iconName: selectedIcon,
      });
    } else {
      addBucket(
        {
          name: name.trim(),
          currentBalance: 0,
          monthlyAllocation: parsedMonthly,
          description: description.trim(),
          color: selectedColor,
          iconName: selectedIcon,
        },
      );
    }

    setModalVisible(false);
  };

  const handleDelete = (bucketId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteBucket(bucketId);
    setModalVisible(false);
  };

  const renderIcon = (iconName: string, color: string) => {
    const props = { size: 18, color };
    switch (iconName) {
      case 'Home':
        return <Home {...props} />;
      case 'Coffee':
        return <Coffee {...props} />;
      case 'Smartphone':
        return <Smartphone {...props} />;
      case 'ShieldCheck':
        return <ShieldCheck {...props} />;
      case 'Target':
        return <Target {...props} />;
      case 'CreditCard':
      default:
        return <CreditCard {...props} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Summary Banner */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryTitle}>Bucket Management</Text>
            <Text style={styles.summarySubtext}>
              {buckets.length} active buckets
            </Text>
          </View>
          <View style={styles.summaryActions}>
            <Pressable style={styles.transferBtn} onPress={openTransferModal}>
              <ArrowRightLeft size={15} color={colors.accentCyan} />
              <Text style={styles.transferBtnText}>Transfer</Text>
            </Pressable>
            <Pressable style={styles.createBtn} onPress={openCreateModal}>
              <Plus size={16} color="#0B0F19" />
              <Text style={styles.createBtnText}>New Bucket</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statPillsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Allocated</Text>
            <Text style={styles.statPillValue}>₹{totalAllocated.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      {/* Buckets List */}
      <View style={styles.envelopeList}>
        {buckets.map((b) => (
          <View key={b.id} style={styles.envelopeCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconWrap, { backgroundColor: `${b.color}20` }]}>
                  {renderIcon(b.iconName, b.color)}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.envelopeName}>{b.name}</Text>
                    {dailyBucketId === b.id && (
                      <View style={styles.dailyBadge}>
                        <Text style={styles.dailyBadgeText}>Daily spending</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.balanceText}>
                    Current balance: ₹{b.currentBalance.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <Pressable style={styles.editBtn} onPress={() => openEditModal(b)}>
                <Edit2 size={14} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Rules & Metadata Summary */}
            <View style={styles.rulesSection}>
              {b.monthlyAllocation > 0 && (
                <View style={styles.ruleItem}>
                  <Sparkles size={12} color={colors.accentCyan} />
                  <Text style={styles.ruleText}>
                    Monthly reserve: ₹{b.monthlyAllocation.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}

              {b.description ? (
                <Text style={styles.descriptionText}>"{b.description}"</Text>
              ) : null}
            </View>
            <Pressable
              style={[styles.dailyToggle, dailyBucketId === b.id && styles.dailyToggleActive]}
              onPress={() => setDailyBucket(dailyBucketId === b.id ? null : b.id)}
            >
              <Text style={[styles.dailyToggleText, dailyBucketId === b.id && styles.dailyToggleTextActive]}>
                {dailyBucketId === b.id ? 'Daily spending bucket' : 'Use for daily spending'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      {/* Modal for Creating / Editing Buckets */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalSafe}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingBucket ? 'Edit Bucket' : 'New Bucket'}
            </Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Name Input */}
            <Text style={styles.inputLabel}>Bucket Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. WiFi Bill, Goa Trip, Food"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Monthly Autopay / Allocation Rule */}
            <Text style={styles.inputLabel}>Monthly Autopay / Allocation (₹)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0 (optional)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={monthlyAllocation}
              onChangeText={setMonthlyAllocation}
            />

            {/* Description / Rules */}
            <Text style={styles.inputLabel}>Custom Description / Rules</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Add purpose, withdrawal constraints, or notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            {/* Save Button */}
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {editingBucket ? 'Save Changes' : 'Create Bucket'}
              </Text>
            </Pressable>

            {editingBucket && (
              <Pressable
                style={styles.deleteBtn}
                onPress={() => handleDelete(editingBucket.id)}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={styles.deleteBtnText}>Delete Bucket</Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={transferModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.transferOverlay}
        >
          <View style={styles.transferCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Between Buckets</Text>
              <Pressable onPress={() => setTransferModalVisible(false)} hitSlop={10}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>From bucket</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bucketPicker}>
              {buckets.map((bucket) => (
                <Pressable
                  key={bucket.id}
                  style={[styles.bucketChoice, fromBucketId === bucket.id && styles.bucketChoiceActive]}
                  onPress={() => setFromBucketId(bucket.id)}
                >
                  <Text style={styles.bucketChoiceName}>{bucket.name}</Text>
                  <Text style={styles.bucketChoiceBalance}>₹{bucket.currentBalance.toLocaleString('en-IN')}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>To bucket</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bucketPicker}>
              {buckets.map((bucket) => (
                <Pressable
                  key={bucket.id}
                  style={[styles.bucketChoice, toBucketId === bucket.id && styles.bucketChoiceActive]}
                  onPress={() => setToBucketId(bucket.id)}
                >
                  <Text style={styles.bucketChoiceName}>{bucket.name}</Text>
                  <Text style={styles.bucketChoiceBalance}>₹{bucket.currentBalance.toLocaleString('en-IN')}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={transferAmount}
              onChangeText={(value) => {
                setTransferAmount(value);
                setTransferError('');
              }}
            />

            {transferError ? <Text style={styles.transferError}>{transferError}</Text> : null}

            <Pressable style={styles.saveBtn} onPress={handleTransfer}>
              <Text style={styles.saveBtnText}>Transfer Money</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.accentCyan,
  },
  transferBtnText: {
    color: colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  summarySubtext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: {
    color: '#0B0F19',
    fontSize: 12,
    fontWeight: '700',
  },
  statPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statPillLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statPillValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  envelopeList: {
    gap: 12,
  },
  envelopeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  envelopeName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  bucketPicker: {
    gap: 8,
    paddingVertical: 8,
  },
  bucketChoice: {
    width: 140,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  bucketChoiceActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  bucketChoiceName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  bucketChoiceBalance: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  transferOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  transferCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  transferError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  dailyBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 6,
  },
  dailyBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  dailyToggle: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  dailyToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  dailyToggleText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  dailyToggleTextActive: {
    color: colors.primary,
  },
  balanceText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  editBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    marginLeft: 8,
  },
  rulesSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    gap: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    color: colors.accentCyan,
    fontSize: 12,
    fontWeight: '600',
  },
  ruleSubtext: {
    color: colors.textMuted,
    fontSize: 11,
  },
  descriptionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  textInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#0B0F19',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
});
