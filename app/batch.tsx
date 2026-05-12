import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { supabase } from '../lib/supabase';

type Batch = {
  id: string;
  name: string;
  grade: string | null;
  is_active: boolean;
  studentCount: number;
};

export default function Batch() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState('');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      // 1. Get current auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }

      // 2. Get teacher profile
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profile) setTeacherName(profile.name);

      // 3. Fetch batches for this teacher, with active student count
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id,
          name,
          grade,
          is_active,
          students!students_batch_id_fkey (
            id
          )
        `)
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const formatted: Batch[] = (data || []).map((batch: any) => ({
        id: batch.id,
        name: batch.name,
        grade: batch.grade,
        is_active: batch.is_active,
        // Only count active students
        studentCount: (batch.students || []).filter((s: any) => s.is_active !== false).length,
      }));

      setBatches(formatted);
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    router.replace('/');
    await supabase.auth.signOut();
  };

  const renderItem = ({ item }: { item: Batch }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/students', params: { batchId: item.id, batchName: item.name } } as any)}
    >
      <View style={styles.iconBox}>
        <Text>👥</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.subtitle}>
          {item.studentCount} student{item.studentCount !== 1 ? 's' : ''}
        </Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      <View style={styles.topBar}>
        <View>
          <Text style={styles.header}>My Batches</Text>
          {teacherName ? (
            <Text style={styles.subheader}>👋 {teacherName}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : batches.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No batches assigned yet.</Text>
        </View>
      ) : (
        <FlatList
          data={batches}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
    padding: 15
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 25,
    marginBottom: 15
  },

  header: {
    fontSize: 22,
    fontWeight: '600'
  },

  subheader: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2
  },

  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },

  logoutText: {
    color: 'white',
    fontWeight: '600'
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 1
  },

  iconBox: {
    backgroundColor: '#e0e7ff',
    padding: 10,
    borderRadius: 10,
    marginRight: 12
  },

  title: {
    fontSize: 16,
    fontWeight: '600'
  },

  subtitle: {
    color: '#6b7280'
  },

  arrow: {
    fontSize: 20,
    color: '#9ca3af'
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  emptyText: {
    color: '#6b7280',
    fontSize: 15
  }
});