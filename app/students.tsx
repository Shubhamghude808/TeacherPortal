import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

import { useSafeAreaInsets } from 'react-native-safe-area-context';


type Student = {
  id: string;
  name: string;
  roll_number: string | null;
};

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

// yyyy-mm-dd for DB queries
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function Students() {
  const insets = useSafeAreaInsets();
  const { batchId, batchName } = useLocalSearchParams<{
    batchId: string;
    batchName: string;
  }>();

  const [students, setStudents] = useState<Student[]>([]);
  const [present, setPresent] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch students when batchId changes
  useEffect(() => {
    if (batchId) fetchStudents();
  }, [batchId]);

  // Fetch existing attendance whenever date or students change
  useEffect(() => {
    if (students.length > 0) fetchAttendance();
  }, [date, students]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('id, name, roll_number')
        .eq('batch_id', batchId)
        .eq('is_active', true)
        .order('roll_number', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      Alert.alert('Error', 'Could not load students.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, is_present')
        .eq('batch_id', batchId)
        .eq('date', formatDateISO(date));

      if (error) throw error;

      // Mark as present only those with is_present = true
      const presentIds = (data || [])
        .filter((r) => r.is_present)
        .map((r) => r.student_id);

      setPresent(presentIds);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const toggleAttendance = (id: string) => {
    setPresent((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const saveAttendance = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dateISO = formatDateISO(date);

      // Upsert all students' attendance for this date
      const records = students.map((s) => ({
        student_id: s.id,
        batch_id: batchId,
        date: dateISO,
        is_present: present.includes(s.id),
        marked_by: user.id,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(records, {
          onConflict: 'student_id,batch_id,date',
        });

      if (error) throw error;

      Alert.alert('Saved', 'Attendance saved successfully.');
    } catch (err) {
      console.error('Error saving attendance:', err);
      Alert.alert('Error', 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && selectedDate) setDate(selectedDate);
  };

  const renderItem = ({ item }: { item: Student }) => {
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

        <View style={{ flex: 1 }}>
          <Text style={[styles.name, isPresent && { color: 'white' }]}>
            {item.name}
          </Text>
          {item.roll_number && (
            <Text style={[styles.rollNo, isPresent && { color: 'rgba(255,255,255,0.75)' }]}>
              Roll #{item.roll_number}
            </Text>
          )}
        </View>

        {isPresent
          ? <Text style={styles.tick}>✓</Text>
          : <Text style={styles.tap}>Tap to mark</Text>
        }
      </TouchableOpacity>
    );
  };

  return (
  <View style={styles.container}>
    
    {/* Header */}
    <View style={styles.headerRow}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
    <Text style={styles.backArrow}>‹</Text>
  </TouchableOpacity>
  <View>
    <Text style={styles.header}>Students</Text>
    <Text style={styles.sub}>{batchName ?? 'Batch'}</Text>
  </View>
</View>

    {/* Date Picker Row */}
    <TouchableOpacity
      style={styles.dateRow}
      onPress={() => setShowPicker((prev) => !prev)}
      activeOpacity={0.7}
    >
      <Text style={styles.calendarIcon}>📅</Text>
      <Text style={styles.dateText}>{formatDate(date)}</Text>
    </TouchableOpacity>

    {showPicker && (
      <DateTimePicker
        value={date}
        mode="date"
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
        onChange={onDateChange}
        maximumDate={new Date()}
      />
    )}

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
        Attendance: {present.length}/{students.length}
      </Text>
      <Text style={styles.attendanceDateText}>{formatDateLong(date)}</Text>
    </View>

    {/* Hint */}
    <View style={styles.hintCard}>
      <Text style={styles.hintText}>
        Tap a student to toggle attendance. Long press for details.
      </Text>
    </View>

    {/* Student list */}
    {loading ? (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    ) : students.length === 0 ? (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No students in this batch.</Text>
      </View>
    ) : (
      <FlatList
        data={students}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    )}

    {/* Save button */}
{!loading && students.length > 0 && (
  <TouchableOpacity
    style={[styles.saveButton, saving && { opacity: 0.7 }, { bottom: 20 + insets.bottom }]}
    onPress={saveAttendance}
    disabled={saving}
  >
    <Text style={styles.saveText}>
      {saving ? 'Saving...' : '⎙  Save Attendance'}
    </Text>
  </TouchableOpacity>
)}

  </View>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7', padding: 15 },
headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginBottom: 12,
},
backBtn: {
  padding: 2,
  marginRight: 4,
},
backArrow: {
  fontSize: 28,
  color: '#1f2937',
  lineHeight: 30,
},
  header: { fontSize: 22, fontWeight: '600', paddingTop: 25 },
  sub: { color: 'gray', marginBottom: 12 },

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

  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    marginBottom: 8,
  },
  doneText: { color: 'white', fontWeight: '600' },

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

  name: { fontWeight: '500' },
  rollNo: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  tap: { color: '#9ca3af', fontSize: 12 },
  tick: { color: 'white', fontSize: 18 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 15 },

  saveButton: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveText: { color: 'white', fontWeight: '600', fontSize: 16 },

   hintCard: {
    backgroundColor: '#dce6f4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },

  hintText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
});