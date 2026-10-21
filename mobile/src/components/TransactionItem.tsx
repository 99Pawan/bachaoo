import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { Transaction } from '../types';
import { ArrowUpRight, CornerDownRight } from 'lucide-react-native';

interface TransactionItemProps {
  transaction: Transaction;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const isBorrow = transaction.type === 'borrow_advance' || transaction.type === 'borrow_buffer';
  const isNormalize = transaction.type === 'normalize';
  const isSync = transaction.type === 'sync_adjustment';

  const formattedDate = new Date(transaction.date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View
          style={[
            styles.iconBox,
            isBorrow && styles.borrowIconBox,
            isNormalize && { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
            isSync && { backgroundColor: 'rgba(6, 182, 212, 0.15)' },
            !isBorrow && !isNormalize && !isSync && styles.expenseIconBox,
          ]}
        >
          {isBorrow ? (
            <CornerDownRight size={16} color={colors.warning} />
          ) : (
            <ArrowUpRight size={16} color={isSync ? colors.accentCyan : colors.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{transaction.title}</Text>
          <Text style={styles.subtext}>
            {formattedDate} {transaction.note ? `• ${transaction.note}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {transaction.amount > 0 ? (
          <Text style={[styles.amount, isBorrow && styles.borrowAmount]}>-₹{transaction.amount}</Text>
        ) : (
          <Text style={[styles.amount, { color: colors.warning }]}>RE-DIVIDED</Text>
        )}
        {isBorrow && <Text style={styles.borrowTag}>ADVANCED</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseIconBox: {
    backgroundColor: colors.primaryMuted,
  },
  borrowIconBox: {
    backgroundColor: colors.warningMuted,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  subtext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  borrowAmount: {
    color: colors.warning,
  },
  borrowTag: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

