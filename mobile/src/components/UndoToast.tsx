import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useBudgetStore } from '../store/useBudgetStore';
import { RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export const UndoToast: React.FC = () => {
  const { undoSnapshot, undoLastAction, dismissUndo, clearExpiredUndo } = useBudgetStore();
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 80 || Math.abs(gestureState.vx) > 0.8) {
          const direction = gestureState.dx >= 0 ? 1 : -1;
          Animated.timing(translateX, {
            toValue: direction * 500,
            duration: 180,
            useNativeDriver: true,
          }).start(() => dismissUndo());
          return;
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 8,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    translateX.setValue(0);
  }, [undoSnapshot, translateX]);

  useEffect(() => {
    if (!undoSnapshot) return;

    const interval = setInterval(() => {
      const remainingMs = undoSnapshot.expiresAt - Date.now();
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(secs);

      if (secs <= 0) {
        clearExpiredUndo();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [undoSnapshot]);

  if (!undoSnapshot || secondsRemaining <= 0) return null;

  const handleUndo = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    undoLastAction();
  };

  const progressPercent = Math.min(100, Math.max(0, (secondsRemaining / 60) * 100));

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {/* Background progress indicator */}
      <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />

      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.actionText} numberOfLines={1}>
            {undoSnapshot.actionDescription}
          </Text>
          <Text style={styles.timerText}>{secondsRemaining}s to undo</Text>
        </View>

        <Pressable style={styles.undoBtn} onPress={handleUndo}>
          <RotateCcw size={14} color="#0B0F19" />
          <Text style={styles.undoBtnText}>UNDO</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: colors.warning,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  timerText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  undoBtnText: {
    color: '#0B0F19',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
