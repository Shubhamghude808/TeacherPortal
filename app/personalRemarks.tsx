import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';

export default function PersonalRemarks() {
  const { studentName } = useLocalSearchParams<{ studentName: string }>();
  const [remarks, setRemarks] = useState('');

  const handleSave = () => {
    if (!remarks.trim()) {
      Alert.alert('Empty Remarks', 'Please write something before saving.');
      return;
    }
    // Save logic here (API call, local storage, etc.)
    Alert.alert('Saved', 'Remarks saved successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.header}>Personal Remarks</Text>
            <Text style={styles.subHeader}>{studentName ?? 'Student'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Card */}
        <View style={styles.card}>
          <TextInput
            style={styles.textInput}
            placeholder="Write your remarks about the student's progress, behavior, and areas of improvement..."
            placeholderTextColor="#9ca3af"
            multiline
            value={remarks}
            onChangeText={setRemarks}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveText}>Save Remarks</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 20,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
    gap: 16,
  },

  textInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 280,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    lineHeight: 22,
  },

  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});