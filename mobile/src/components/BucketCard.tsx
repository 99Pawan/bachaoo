import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { Bucket } from '../types';
import { Coffee, Home, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react-native';

interface BucketCardProps {
  bucket: Bucket;
}

export const BucketCard: React.FC<BucketCardProps> = ({ bucket }) => {
  // Select Lucide Icon based on iconName
  const renderIcon = () => {
    const iconProps = { size: 20, color: bucket.color };
    switch (bucket.iconName) {
      case 'Home':
        return <Home {...iconProps} />;
      case 'Smartphone':
        return <Smartphone {...iconProps} />;
      case 'ShieldCheck':
        return <ShieldCheck {...iconProps} />;
      case 'Coffee':
      default:
        return <Coffee {...iconProps} />;
    }
  };

  const hasTarget = bucket.targetAmount && bucket.targetAmount > 0;
  const progressPercent = hasTarget ? Math.min(100, Math.round((bucket.currentBalance / bucket.targetAmount!) * 100)) : 0;
  const isUnderfunded = bucket.billStatus === 'underfunded';

  return (
    <View style={[styles.card, isUnderfunded && styles.cardUnderfunded]}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.iconContainer, { backgroundColor: `${bucket.color}20` }]}>
            {renderIcon()}
          </View>
          <View>
            <Text style={styles.bucketName}>{bucket.name}</Text>
            <Text style={styles.categorySubtext}>
              {bucket.category === 'fixed_bill' && `Due on ${bucket.dueDate}th`}
              {bucket.category === 'goal' && `Target: ₹${bucket.targetAmount?.toLocaleString('en-IN')}`}
              {bucket.category === 'spending_pool' && `Monthly pool`}
              {bucket.category === 'savings_sink' && `Buffer & Residuals`}
            </Text>
          </View>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₹{bucket.currentBalance.toLocaleString('en-IN')}</Text>
          {bucket.category === 'fixed_bill' && (
            <View style={[styles.statusTag, isUnderfunded ? styles.tagDanger : styles.tagSuccess]}>
              {isUnderfunded && <AlertCircle size={10} color={colors.danger} />}
              <Text style={[styles.statusTagText, isUnderfunded ? styles.textDanger : styles.textSuccess]}>
                {isUnderfunded ? 'Underfunded' : 'Funded'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Goal Progress bar */}
      {hasTarget && bucket.category === 'goal' && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPercent}%`, backgroundColor: bucket.color }]} />
          </View>
          <Text style={styles.progressText}>{progressPercent}% saved</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardUnderfunded: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bucketName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  categorySubtext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  tagSuccess: {
    backgroundColor: colors.primaryMuted,
  },
  tagDanger: {
    backgroundColor: colors.dangerMuted,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  textSuccess: {
    color: colors.primary,
  },
  textDanger: {
    color: colors.danger,
  },
  progressSection: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
});

