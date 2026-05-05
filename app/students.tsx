import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const studentsData = [
  { id: '1', name: 'Emma Thompson' },
  { id: '2', name: 'Liam Johnson' },
  { id: '3', name: 'Sophia Martinez' },
  { id: '4', name: 'Noah Williams' },
  { id: '5', name: 'Olivia Brown' },
  { id: '6', name: 'Ethan Davis' },
  { id: '7', name: 'Ava Garcia' },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Students() {
  const [present, setPresent] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<boolean>(false);

  const toggleAttendance = (id: string) => {
    if (present.includes(id)) {
      setPresent(present.filter(item => item !== id));
    } else {
      setPresent([...present, id]);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // On Android the picker closes automatically; on iOS keep it open
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
    }
  };

  const renderItem = ({ item }: any) => {
    const isPresent = present.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, isPresent && styles.presentCard]}
        onPress={() => toggleAttendance(item.id)}
        onLongPress={() =>
        router.push({
          pathname: '/studentDetails',
          params: { id: item.id, name: item.name },
        })
}
      >
        <View style={[styles.avatar, isPresent && styles.presentAvatar]}>
          <Text style={[styles.avatarText, isPresent && { color: 'white' }]}>
            {item.name[0]}
          </Text>
        </View>

        <Text style={[styles.name, isPresent && { color: 'white' }]}>
          {item.name}
        </Text>

        {isPresent
          ? <Text style={styles.tick}>✓</Text>
          : <Text style={styles.tap}>Tap to mark present</Text>
        }
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Students</Text>
      <Text style={styles.sub}>Grade 5A</Text>

      {/* Date Picker Row */}
      <TouchableOpacity
        style={styles.dateRow}
        onPress={() => setShowPicker(prev => !prev)}
        activeOpacity={0.7}
      >
        <Text style={styles.calendarIcon}>📅</Text>
        <Text style={styles.dateText}>{formatDate(date)}</Text>
      </TouchableOpacity>

      {/* Native Picker — shown inline on iOS, as modal on Android */}
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()} // optional: prevent future dates
        />
      )}

      {/* iOS: Done button to dismiss */}
      {showPicker && Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => setShowPicker(false)}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      )}

      {/* Attendance summary */}
      <View style={styles.attendanceRow}>
        <Text style={styles.attendanceText}>
          Attendance: {present.length}/{studentsData.length}
        </Text>
        <Text style={styles.attendanceDateText}>{formatDateLong(date)}</Text>
      </View>

      {/* Student list */}
      <FlatList
        data={studentsData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7', padding: 15 },

  header: { fontSize: 22, fontWeight: '600', paddingTop: 25 },
  sub: { color: 'gray', marginBottom: 12 },

  // Date picker trigger row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  calendarIcon: { fontSize: 18, marginRight: 10 },
  dateText: { fontSize: 16, color: '#1f2937', fontWeight: '500' },

  // iOS Done button
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    marginBottom: 8,
  },
  doneText: { color: 'white', fontWeight: '600' },

  // Attendance bar
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  attendanceText: { fontWeight: '500', color: '#374151' },
  attendanceDateText: { color: '#6b7280', fontSize: 13 },

  // Student cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  presentCard: { backgroundColor: '#22c55e' },

  avatar: {
    backgroundColor: '#dbeafe',
    width: 35,
    height: 35,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  presentAvatar: { backgroundColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontWeight: '600', color: '#3b82f6' },

  name: { flex: 1, fontWeight: '500' },
  tap: { color: '#9ca3af', fontSize: 12 },
  tick: { color: 'white', fontSize: 18 },
});