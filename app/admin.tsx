import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'teachers' | 'students' | 'batches';

interface School  { id: string; name: string; created_at: string }
interface Teacher { id: string; name: string; email: string; is_active: boolean; school_id: string }
interface Batch   { id: string; name: string; grade: string; is_active: boolean; teacher_id: string }
interface Student { id: string; name: string; roll_number: string; is_active: boolean; batch_id: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'teachers', label: 'Teachers', icon: '👩‍🏫' },
  { key: 'batches',  label: 'Batches',  icon: '📚' },
  { key: 'students', label: 'Students', icon: '🎒' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {

  const [activeTab, setActiveTab]   = useState<Tab>('teachers');
  const [adminName, setAdminName]   = useState('Admin');
  const [loading, setLoading]       = useState(false);

  // Data
  const [schools,  setSchools]  = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [batches,  setBatches]  = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode,    setModalMode]    = useState<'add' | 'edit'>('add');
  const [editingId,    setEditingId]    = useState<string | null>(null);

  // Form fields (shared, only relevant ones used per tab)
  const [fieldName,       setFieldName]       = useState('');
  const [fieldEmail,      setFieldEmail]      = useState('');
  const [fieldPassword,   setFieldPassword]   = useState('');
  const [fieldGrade,      setFieldGrade]      = useState('');
  const [fieldRollNumber, setFieldRollNumber] = useState('');
  const [fieldSchoolId,   setFieldSchoolId]   = useState('');
  const [fieldTeacherId,  setFieldTeacherId]  = useState('');
  const [fieldBatchId,    setFieldBatchId]    = useState('');

  // ── Load admin name ──────────────────────────────────────────────────────────
  useEffect(() => {
  let fetched = false; // ✅ guard

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (session && !fetched) {
        fetched = true; // ✅ prevent re-runs

        supabase.from('users').select('name').eq('id', session.user.id).single()
          .then(({ data }) => { if (data) setAdminName(data.name); });

        supabase.from('schools').select('*').order('created_at', { ascending: false })
          .then(({ data }) => setSchools(data ?? []));

        fetchAllData();
      } else if (!session && event === 'SIGNED_OUT') {
        router.replace('/');
      }
    }
  );
  return () => subscription.unsubscribe();
}, []);

  // ── Fetch schools once (needed for teacher's school dropdown) ────────────────

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
      setSchools(data ?? []);
    })();
  }, []);

 // Single effect on mount — fetch everything once
useEffect(() => {
  fetchAllData();
}, []);

const fetchAllData = async () => {
  setLoading(true);
  try {
    const [teachersRes, batchesRes, studentsRes] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'teacher').order('name'),
      supabase.from('batches').select('*').order('name'),
      supabase.from('students').select('*').order('name'),
    ]);
    if (teachersRes.data) setTeachers(teachersRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
    if (studentsRes.data) setStudents(studentsRes.data);
  } catch (e) {
    console.error(e);
  }
  setLoading(false);
};

// Only refetch the active tab after a save/edit operation
const fetchTab = async (tab: Tab) => {
  setLoading(true);
  try {
    if (tab === 'teachers') {
      const { data } = await supabase.from('users').select('*').eq('role', 'teacher').order('name');
      setTeachers(data ?? []);
    } else if (tab === 'batches') {
      const { data } = await supabase.from('batches').select('*').order('name');
      setBatches(data ?? []);
    } else if (tab === 'students') {
      const { data } = await supabase.from('students').select('*').order('name');
      setStudents(data ?? []);
    }
  } catch (e) {
    console.error(e);
  }
  setLoading(false);
};
  // ── Logout ───────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  // ── Open modal ───────────────────────────────────────────────────────────────

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setFieldName(''); setFieldEmail(''); setFieldPassword('');
    setFieldGrade(''); setFieldRollNumber('');
    setFieldSchoolId(schools[0]?.id ?? '');
    setFieldTeacherId(teachers[0]?.id ?? '');
    setFieldBatchId(batches[0]?.id ?? '');
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setModalMode('edit');
    setEditingId(item.id);
    setFieldName(item.name ?? '');
    setFieldEmail(item.email ?? '');
    setFieldPassword('');
    setFieldGrade(item.grade ?? '');
    setFieldRollNumber(item.roll_number ?? '');
    setFieldSchoolId(item.school_id ?? '');
    setFieldTeacherId(item.teacher_id ?? '');
    setFieldBatchId(item.batch_id ?? '');
    setModalVisible(true);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!fieldName.trim()) {
      Alert.alert('Validation', 'Name is required'); return;
    }

    setLoading(true);
    try {
      if (activeTab === 'teachers') {
        await saveTeacher();
      } else if (activeTab === 'batches') {
        await saveBatch();
      } else if (activeTab === 'students') {
        await saveStudent();
      }
      setModalVisible(false);
      fetchTab(activeTab);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong');
    }
    setLoading(false);
  };

 const saveTeacher = async () => {
  if (!fieldEmail.trim()) throw new Error('Email is required');
  
  if (modalMode === 'add') {
    if (!fieldPassword.trim()) throw new Error('Password is required for new teachers');

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: fieldEmail.trim(),
      password: fieldPassword.trim(),
      options: {
        data: {
          name: fieldName.trim(),
          role: 'teacher',
          school_id: fieldSchoolId || null,
        },
      },
    });

    if (signUpErr || !signUpData.user) throw signUpErr ?? new Error('Could not create user');

  } else {
    const { error } = await supabase.from('users').update({
      name: fieldName.trim(),
      email: fieldEmail.trim(),
    }).eq('id', editingId!);
    if (error) throw error;
  }
};

  const saveBatch = async () => {
    if (modalMode === 'add') {
      const { error } = await supabase.from('batches').insert({
        name: fieldName.trim(),
        grade: fieldGrade.trim() || null,
        teacher_id: fieldTeacherId || null,
        is_active: true,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('batches').update({
        name: fieldName.trim(),
        grade: fieldGrade.trim() || null,
        teacher_id: fieldTeacherId || null,
      }).eq('id', editingId!);
      if (error) throw error;
    }
  };

  const saveStudent = async () => {
    if (modalMode === 'add') {
      const { error } = await supabase.from('students').insert({
        name: fieldName.trim(),
        roll_number: fieldRollNumber.trim() || null,
        batch_id: fieldBatchId || null,
        is_active: true,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('students').update({
        name: fieldName.trim(),
        roll_number: fieldRollNumber.trim() || null,
        batch_id: fieldBatchId || null,
      }).eq('id', editingId!);
      if (error) throw error;
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────────

  const toggleActive = async (item: any, table: string) => {
    const { error } = await supabase
      .from(table)
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    if (error) { Alert.alert('Error', error.message); return; }
    fetchTab(activeTab);
  };

  // ── Render list items ─────────────────────────────────────────────────────────

  const renderTeacher = ({ item }: { item: Teacher }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardIcon}>👩‍🏫</Text>
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.email}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}
          onPress={() => toggleActive(item, 'users')}
        >
          <Text style={styles.statusBadgeText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBatch = ({ item }: { item: Batch }) => {
    const teacher = teachers.find(t => t.id === item.teacher_id);
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIcon}>📚</Text>
          <View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              {item.grade ? `Grade ${item.grade}` : 'No grade'} · {teacher?.name ?? 'Unassigned'}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}
            onPress={() => toggleActive(item, 'batches')}
          >
            <Text style={styles.statusBadgeText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStudent = ({ item }: { item: Student }) => {
    const batch = batches.find(b => b.id === item.batch_id);
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIcon}>🎒</Text>
          <View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              {item.roll_number ? `Roll ${item.roll_number}` : 'No roll no.'} · {batch?.name ?? 'Unassigned'}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}
            onPress={() => toggleActive(item, 'students')}
          >
            <Text style={styles.statusBadgeText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Dropdown helper (simple picker using buttons) ─────────────────────────────

  const DropdownField = ({
    label, value, options, onSelect
  }: {
    label: string;
    value: string;
    options: { id: string; label: string }[];
    onSelect: (id: string) => void;
  }) => (
    <View style={styles.dropdownWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dropdownScroll}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.dropdownOption, value === opt.id && styles.dropdownOptionSelected]}
            onPress={() => onSelect(opt.id)}
          >
            <Text style={[styles.dropdownOptionText, value === opt.id && styles.dropdownOptionTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ── Modal form fields per tab ────────────────────────────────────────────────

  const renderFormFields = () => {
    if (activeTab === 'teachers') return (
      <>
        <Text style={styles.inputLabel}>Full Name *</Text>
        <TextInput style={styles.modalInput} value={fieldName} onChangeText={setFieldName} placeholder="Teacher name" placeholderTextColor="#aaa" />

        <Text style={styles.inputLabel}>Email *</Text>
        <TextInput style={styles.modalInput} value={fieldEmail} onChangeText={setFieldEmail} placeholder="teacher@school.com" placeholderTextColor="#aaa" autoCapitalize="none" keyboardType="email-address" />

        {modalMode === 'add' && (
          <>
            <Text style={styles.inputLabel}>Password *</Text>
            <TextInput style={styles.modalInput} value={fieldPassword} onChangeText={setFieldPassword} placeholder="Min 6 characters" placeholderTextColor="#aaa" secureTextEntry />
          </>
        )}
      </>
    );

    if (activeTab === 'batches') return (
      <>
        <Text style={styles.inputLabel}>Batch Name *</Text>
        <TextInput style={styles.modalInput} value={fieldName} onChangeText={setFieldName} placeholder="e.g. Morning Batch A" placeholderTextColor="#aaa" />

        <Text style={styles.inputLabel}>Grade</Text>
        <TextInput style={styles.modalInput} value={fieldGrade} onChangeText={setFieldGrade} placeholder="e.g. 5, 6, 7..." placeholderTextColor="#aaa" />

        {teachers.length > 0 && (
          <DropdownField
            label="Assign Teacher"
            value={fieldTeacherId}
            options={[{ id: '', label: 'None' }, ...teachers.map(t => ({ id: t.id, label: t.name }))]}
            onSelect={setFieldTeacherId}
          />
        )}
      </>
    );

    if (activeTab === 'students') return (
      <>
        <Text style={styles.inputLabel}>Student Name *</Text>
        <TextInput style={styles.modalInput} value={fieldName} onChangeText={setFieldName} placeholder="Student full name" placeholderTextColor="#aaa" />

        <Text style={styles.inputLabel}>Roll Number</Text>
        <TextInput style={styles.modalInput} value={fieldRollNumber} onChangeText={setFieldRollNumber} placeholder="e.g. 42" placeholderTextColor="#aaa" keyboardType="numeric" />

        {batches.length > 0 && (
          <DropdownField
            label="Assign to Batch"
            value={fieldBatchId}
            options={[{ id: '', label: 'None' }, ...batches.filter(b => b.is_active).map(b => ({ id: b.id, label: b.name }))]}
            onSelect={setFieldBatchId}
          />
        )}
      </>
    );

    return null;
  };

  // ── List data helpers ────────────────────────────────────────────────────────

  const listData = () => {
    if (activeTab === 'teachers') return teachers;
    if (activeTab === 'batches')  return batches;
    if (activeTab === 'students') return students;
    return [];
  };

  const renderItem = (info: any) => {
    if (activeTab === 'teachers') return renderTeacher(info);
    if (activeTab === 'batches')  return renderBatch(info);
    if (activeTab === 'students') return renderStudent(info);
    return null;
  };

  const currentTab = TABS.find(t => t.key === activeTab)!;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* Header */}
      <View style={styles.header}>
  <View>
    <Text style={styles.greeting}>Hello, {adminName} </Text>
    <Text style={styles.headerSub}>Admin Dashboard</Text>
  </View>
  <View style={{ flexDirection: 'row', gap: 8 }}>
    {/* ✅ Add this */}
    <TouchableOpacity onPress={() => router.push('/report')} style={styles.reportBtn}>
      <Text style={styles.logoutText}>📊 Report</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  </View>
</View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{teachers.length}</Text>
          <Text style={styles.statLabel}>Teachers</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{batches.length}</Text>
          <Text style={styles.statLabel}>Batches</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{students.length}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          key={activeTab}
          data={listData() as any[]}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>{currentTab.icon}</Text>
              <Text style={styles.emptyText}>No {currentTab.label.toLowerCase()} yet</Text>
              <Text style={styles.emptySub}>Tap + to add one</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>
              {modalMode === 'add' ? `Add ${currentTab.label.slice(0, -2)}` : `Edit ${currentTab.label.slice(0, -2)}`}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {renderFormFields()}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={loading}
              >
                <Text style={styles.saveBtnText}>
                  {loading ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7' },

  // Header
  header: {
    backgroundColor: '#3b82f6',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  greeting:   { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub:  { color: '#bfdbfe', fontSize: 13, marginTop: 2 },
  logoutBtn:  { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statNum:   { fontSize: 20, fontWeight: '800', color: '#1e3a8a' },
  statLabel: { fontSize: 10, color: '#6b7280', marginTop: 2 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: '#3b82f6' },
  tabIcon:   { fontSize: 16 },
  tabLabel:  { fontSize: 10, color: '#6b7280', marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: '#fff' },

  // List
  list:       { paddingHorizontal: 12, paddingBottom: 100 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  // Empty
  emptyBox:  { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySub:  { fontSize: 13, color: '#9ca3af', marginTop: 4 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon:  { fontSize: 26, marginRight: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardSub:   { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Status badge
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  activeBadge: { backgroundColor: '#dcfce7' },
  inactiveBadge: { backgroundColor: '#fee2e2' },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  // Edit button
  editBtn:     { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    backgroundColor: '#3b82f6', width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '300' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#d1d5db',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle:  { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  inputLabel:  { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  modalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10, padding: 13,
    fontSize: 14, color: '#111827',
    marginBottom: 16,
  },

  // Dropdown
  dropdownWrapper: { marginBottom: 16 },
  dropdownScroll:  { flexDirection: 'row' },
  dropdownOption: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8,
  },
  dropdownOptionSelected:     { backgroundColor: '#3b82f6' },
  dropdownOptionText:         { fontSize: 13, color: '#374151' },
  dropdownOptionTextSelected: { color: '#fff', fontWeight: '600' },

  // Modal actions
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: '#f3f4f6',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: {
    flex: 1, backgroundColor: '#3b82f6',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  //report btn
  reportBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
});