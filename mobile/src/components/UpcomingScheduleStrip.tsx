import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';

export const UpcomingScheduleStrip: React.FC = () => {
  const { dailySchedule } = useBudgetStore();
  const nextDays = dailySchedule.slice(0, 7); // Show next 7 days

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {nextDays.map((day) => {
          const isZero = day.allowance === 0;

          return (
            <View
              key={day.dayIndex}
              style={[
                styles.dayCard,
                day.isToday && styles.todayCard,
                isZero && !day.isToday && styles.zeroCard,
              ]}
            >
              <Text style={[styles.dayName, day.isToday && styles.todayText]}>
                {day.isToday ? 'TODAY' : day.dayName}
              </Text>
              <Text style={styles.dateStr}>{day.dateStr}</Text>

              <View style={[styles.allowanceBadge, isZero && styles.zeroBadge]}>
                <Text style={[styles.allowanceText, isZero && styles.zeroText]}>
                  ₹{day.allowance}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scroll: {
    gap: 10,
    paddingRight: 10,
  },
  dayCard: {
    width: 78,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  todayCard: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  zeroCard: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  dayName: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  todayText: {
    color: colors.primary,
  },
  dateStr: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  allowanceBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  zeroBadge: {
    backgroundColor: colors.dangerMuted,
  },
  allowanceText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  zeroText: {
    color: colors.danger,
  },
});

