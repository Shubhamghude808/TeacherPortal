import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';

import { supabase } from '../lib/supabase';

type Remark = {
  content: string;
  updated_at: string;
};

export default function PersonalRemarks() {
  
  const insets = useSafeAreaInsets();
  const { studentName, studentId } = useLocalSearchParams<{
    studentName: string;
    studentId: string;
  }>();

  const [remarks, setRemarks] = useState('');
  const [previousRemarks, setPreviousRemarks] = useState<Remark[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRemarks();
  }, []);

  const fetchRemarks = async () => {
    const { data, error } = await supabase
      .from('remarks')
      .select('content, updated_at')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.log('Fetch remarks error:', error);
      return;
    }

    if (data) {
      setPreviousRemarks(data);
    }
  };

  const handleSave = async () => {
    if (!remarks.trim()) {
      Alert.alert('Empty Remarks', 'Please write something before saving.');
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('remarks')
        .insert({
          student_id: studentId,
          content: remarks.trim(),
          written_by: user?.id,
        });

      if (error) {
        console.log('Save remarks error:', error);
        Alert.alert('Error', 'Failed to save remarks.');
        return;
      }

      // Prepend new remark locally without refetching
      const newRemark: Remark = {
        content: remarks.trim(),
        updated_at: new Date().toISOString(),
      };
      setPreviousRemarks((prev) => [newRemark, ...prev]);
      setRemarks('');

      Alert.alert('Saved', 'Remarks saved successfully!');
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f4f7' }} edges={['bottom', 'top']}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
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

        {/* New Remarks Card */}
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

          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.saveText}>
              {loading ? 'Saving...' : 'Save Remarks'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Previous Remarks */}
        {previousRemarks.length > 0 && (
          <View style={styles.previousSection}>
            <Text style={styles.sectionTitle}>Previous Remarks</Text>

            {previousRemarks.map((item, index) => (
              <View key={index} style={styles.previousCard}>
                <Text style={styles.previousDate}>{formatDate(item.updated_at)}</Text>
                <View style={styles.previousDivider} />
                <Text style={styles.previousContent}>{item.content}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },

  content: {
    padding: 15,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    gap: 6,
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

  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },

  subHeader: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 1,
  },

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

  previousSection: {
    marginTop: 24,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  previousCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },

  previousDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },

  previousDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 10,
  },

  previousContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
});