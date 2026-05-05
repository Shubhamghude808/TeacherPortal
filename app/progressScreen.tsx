import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useRef } from 'react';

const TOTAL = 32;

type Status = 'none' | 'partial' | 'complete';

export default function ProgressScreen() {
  const { title, studentName } = useLocalSearchParams<{
    title: string;
    studentName: string;
  }>();

  const [statuses, setStatuses] = useState<Record<number, Status>>(
    Object.fromEntries(Array.from({ length: TOTAL }, (_, i) => [i + 1, 'none']))
  );

  // For double-tap detection
  const lastTap = useRef<Record<number, number>>({});

  const NO_PARTIAL_SCREENS = ['Activity Book Progress', 'Practice Progress'];

// Update handleTap:
const handleTap = (num: number) => {
  const noPartial = NO_PARTIAL_SCREENS.includes(title ?? '');

  setStatuses(prev => {
    const current = prev[num];
    let next: Status;

    if (noPartial) {
      // Simple toggle: none → complete → none
      next = current === 'complete' ? 'none' : 'complete';
    } else {
      // Double-tap detection for other screens
      const now = Date.now();
      const last = lastTap.current[num] || 0;
      const isDoubleTap = now - last < 400;
      lastTap.current[num] = now;

      if (isDoubleTap) {
        next = current === 'complete' ? 'none' : 'complete';
      } else {
        next = current === 'none' ? 'partial' : current === 'partial' ? 'none' : current;
      }
    }

    return { ...prev, [num]: next };
  });
};

  const completeCount = Object.values(statuses).filter(s => s === 'complete').length;
  const partialCount  = Object.values(statuses).filter(s => s === 'partial').length;
  const noPartial = NO_PARTIAL_SCREENS.includes(title ?? '');

  const getBubbleStyle = (num: number) => {
    const s = statuses[num];
    if (s === 'complete') return styles.bubbleComplete;
    if (s === 'partial')  return styles.bubblePartial;
    return styles.bubbleNone;
  };

  const getBubbleTextStyle = (num: number) => {
    const s = statuses[num];
    if (s === 'complete') return styles.bubbleTextComplete;
    if (s === 'partial')  return styles.bubbleTextPartial;
    return styles.bubbleTextNone;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.header}>{title ?? 'Progress'}</Text>
          <Text style={styles.subHeader}>{studentName ?? ''}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Legend / Count Row */}
      <View style={styles.legendRow}>
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
    <Text style={styles.legendText}>Complete: {completeCount}</Text>
  </View>
  {!noPartial && (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: '#bfdbfe' }]} />
      <Text style={styles.legendText}>Partial: {partialCount}</Text>
    </View>
  )}
</View>

      <View style={styles.divider} />

      {/* Number Grid */}
      <View style={styles.gridCard}>
        <View style={styles.grid}>
          {Array.from({ length: TOTAL }, (_, i) => i + 1).map(num => (
            <TouchableOpacity
              key={num}
              style={[styles.bubble, getBubbleStyle(num)]}
              onPress={() => handleTap(num)}
              activeOpacity={0.7}
            >
              <Text style={[styles.bubbleText, getBubbleTextStyle(num)]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hint */}
      <View style={styles.hintCard}>
  <Text style={styles.hintText}>
    {noPartial
      ? 'Tap to mark complete, tap again to undo'
      : 'Tap once for partial completion, double-tap for full completion'
    }
  </Text>
</View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7' },
  content: { padding: 15, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 14,
    gap: 6,
  },
  backBtn: { padding: 2, marginRight: 4 },
  backArrow: { fontSize: 28, color: '#1f2937', lineHeight: 30 },
  header: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  subHeader: { fontSize: 13, color: '#6b7280', marginTop: 1 },

  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: -15,
    marginBottom: 14,
  },

  legendRow: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 16, height: 16, borderRadius: 4 },
  legendText: { fontSize: 14, color: '#374151', fontWeight: '500' },

  gridCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },

  bubble: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleNone: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  bubblePartial: {
    backgroundColor: '#bfdbfe',
    borderWidth: 0,
  },
  bubbleComplete: {
    backgroundColor: '#3b82f6',
    borderWidth: 0,
  },

  bubbleText: { fontSize: 13, fontWeight: '600' },
  bubbleTextNone:     { color: '#9ca3af' },
  bubbleTextPartial:  { color: '#1d4ed8' },
  bubbleTextComplete: { color: 'white' },

  hintCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
  },
  hintText: { color: '#374151', fontSize: 14, lineHeight: 20 },
});