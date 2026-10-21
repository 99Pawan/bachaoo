import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { Bucket } from '../types';
import {
  Coffee,
  CreditCard,
  Home,
  ShieldCheck,
  Smartphone,
  Target,
} from 'lucide-react-native';

interface BucketCardProps {
  bucket: Bucket;
}

export const BucketCard: React.FC<BucketCardProps> = ({ bucket }) => {
  const renderIcon = () => {
    const iconProps = { size: 20, color: bucket.color };
    switch (bucket.iconName) {
      case 'Home':
        return <Home {...iconProps} />;
      case 'Smartphone':
        return <Smartphone {...iconProps} />;
      case 'ShieldCheck':
        return <ShieldCheck {...iconProps} />;
      case 'Target':
        return <Target {...iconProps} />;
      case 'Coffee':
        return <Coffee {...iconProps} />;
      default:
        return <CreditCard {...iconProps} />;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={[styles.iconContainer, { backgroundColor: `${bucket.color}20` }]}>
            {renderIcon()}
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.bucketName}>{bucket.name}</Text>
            {bucket.description ? (
              <Text style={styles.description} numberOfLines={1}>{bucket.description}</Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.balanceText}>₹{bucket.currentBalance.toLocaleString('en-IN')}</Text>
      </View>

      {bucket.monthlyAllocation > 0 && (
        <Text style={styles.monthlyText}>
          Monthly allocation: ₹{bucket.monthlyAllocation.toLocaleString('en-IN')}
        </Text>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  bucketName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  balanceText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  monthlyText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 10,
    marginLeft: 54,
  },
});
