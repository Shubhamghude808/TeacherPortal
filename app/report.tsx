import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Batch   { id: string; name: string; grade: string }
interface Student { id: string; name: string; roll_number: string; batch_id: string }
interface AttendanceRow {
  student_id: string;
  date: string;
  is_present: boolean;
  batch_id: string;
}

interface StudentStat {
  id: string;
  name: string;
  roll_number: string;
  batch_id: string;
  present: number;
  total: number;
  pct: number;
}

interface BatchStat {
  id: string;
  name: string;
  grade: string;
  avgPct: number;
  studentCount: number;
  lowCount: number; // students below 75%
}

interface DayTrend {
  date: string;         // "DD" label
  fullDate: string;
  presentCount: number;
  totalMarked: number;
  pct: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH  = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 140;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
  return { from, to };
}

function pctColor(pct: number) {
  if (pct >= 85) return '#22c55e';
  if (pct >= 75) return '#f59e0b';
  return '#ef4444';
}

function pctBg(pct: number) {
  if (pct >= 85) return '#dcfce7';
  if (pct >= 75) return '#fef9c3';
  return '#fee2e2';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AttendanceReport() {
  const now = new Date();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [drillStudent,  setDrillStudent]  = useState<StudentStat | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [batches,    setBatches]    = useState<Batch[]>([]);
  const [students,   setStudents]   = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading,    setLoading]    = useState(false);

  // ── Pickers ───────────────────────────────────────────────────────────────
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [batchPickerVisible, setBatchPickerVisible] = useState(false);

  // ── Fetch batches + students once ─────────────────────────────────────────
  // ── Single auth-gated effect ──────────────────────────────────────────────
useEffect(() => {
  let fetched = false;

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (session && !fetched) {
        fetched = true;
        loadInitialData();
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);

// Fetch batches + students once
const loadInitialData = async () => {
  const [bRes, sRes] = await Promise.all([
    supabase.from('batches').select('id, name, grade').eq('is_active', true).order('name'),
    supabase.from('students').select('id, name, roll_number, batch_id').eq('is_active', true).order('name'),
  ]);
  if (bRes.data) setBatches(bRes.data);
  if (sRes.data) setStudents(sRes.data);

  // Fetch attendance after batches/students are loaded
  await fetchAttendance();
};

// ── Fetch attendance when filter changes (after initial load) ─────────────
const [initialized, setInitialized] = useState(false);

useEffect(() => {
  if (!initialized) return; // skip on mount — loadInitialData handles first fetch
  fetchAttendance();
}, [selectedYear, selectedMonth, selectedBatch]);

const fetchAttendance = async () => {
  setLoading(true);
  const { from, to } = getMonthRange(selectedYear, selectedMonth);

  let query = supabase
    .from('attendance')
    .select('student_id, date, is_present, batch_id')
    .gte('date', from)
    .lte('date', to);

  if (selectedBatch !== 'all') {
    query = query.eq('batch_id', selectedBatch);
  }

  const { data } = await query;
  setAttendance(data ?? []);
  setLoading(false);
  setInitialized(true); // ✅ now filter changes will trigger re-fetch
};

  // ── Derived: student stats ────────────────────────────────────────────────
  const studentStats = useMemo<StudentStat[]>(() => {
    const filteredStudents = selectedBatch === 'all'
      ? students
      : students.filter(s => s.batch_id === selectedBatch);

    return filteredStudents.map(s => {
      const rows = attendance.filter(a => a.student_id === s.id);
      const present = rows.filter(a => a.is_present).length;
      const total   = rows.length;
      const pct     = total > 0 ? Math.round((present / total) * 100) : 0;
      return { ...s, present, total, pct };
    }).sort((a, b) => a.pct - b.pct); // worst first
  }, [attendance, students, selectedBatch]);

  // ── Derived: batch stats ──────────────────────────────────────────────────
  const batchStats = useMemo<BatchStat[]>(() => {
    const targetBatches = selectedBatch === 'all'
      ? batches
      : batches.filter(b => b.id === selectedBatch);

    return targetBatches.map(b => {
      const bStudents = studentStats.filter(s => s.batch_id === b.id && s.total > 0);
      const avgPct = bStudents.length > 0
        ? Math.round(bStudents.reduce((sum, s) => sum + s.pct, 0) / bStudents.length)
        : 0;
      return {
        ...b,
        avgPct,
        studentCount: bStudents.length,
        lowCount: bStudents.filter(s => s.pct < 75).length,
      };
    }).filter(b => b.studentCount > 0);
  }, [studentStats, batches, selectedBatch]);

  // ── Derived: daily trend ──────────────────────────────────────────────────
  const dailyTrend = useMemo<DayTrend[]>(() => {
    const byDate: Record<string, { present: number; total: number }> = {};

    attendance.forEach(a => {
      if (!byDate[a.date]) byDate[a.date] = { present: 0, total: 0 };
      byDate[a.date].total++;
      if (a.is_present) byDate[a.date].present++;
    });

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date: date.slice(8),          // "DD"
        fullDate: date,
        presentCount: counts.present,
        totalMarked: counts.total,
        pct: counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0,
      }));
  }, [attendance]);

  // ── Summary numbers ───────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const withData  = studentStats.filter(s => s.total > 0);
    const avgPct    = withData.length > 0
      ? Math.round(withData.reduce((s, x) => s + x.pct, 0) / withData.length) : 0;
    const lowCount  = withData.filter(s => s.pct < 75).length;
    const totalDays = dailyTrend.length;
    return { avgPct, lowCount, totalStudents: withData.length, totalDays };
  }, [studentStats, dailyTrend]);

  // ── Drill-down: per-student daily breakdown ───────────────────────────────
  const studentDailyBreakdown = useMemo(() => {
    if (!drillStudent) return [];
    return dailyTrend.map(d => {
      const row = attendance.find(
        a => a.student_id === drillStudent.id && a.date === d.fullDate
      );
      return { ...d, status: row ? (row.is_present ? 'P' : 'A') : '-' };
    });
  }, [drillStudent, dailyTrend, attendance]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const selectedBatchName = batches.find(b => b.id === selectedBatch)?.name ?? 'All Batches';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Attendance Report</Text>
          <Text style={styles.headerSub}>Analytics & Insights</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Filters ── */}
      <View style={styles.filtersRow}>
        <TouchableOpacity style={styles.filterChip} onPress={() => setMonthPickerVisible(true)}>
          <Text style={styles.filterChipIcon}>📅</Text>
          <Text style={styles.filterChipText}>{MONTHS[selectedMonth].slice(0, 3)} {selectedYear}</Text>
          <Text style={styles.filterChipArrow}>▾</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterChip} onPress={() => setBatchPickerVisible(true)}>
          <Text style={styles.filterChipIcon}>📚</Text>
          <Text style={styles.filterChipText} numberOfLines={1}>
            {selectedBatch === 'all' ? 'All Batches' : selectedBatchName}
          </Text>
          <Text style={styles.filterChipArrow}>▾</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Fetching data…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Summary Cards ── */}
          <View style={styles.summaryRow}>
            <SummaryCard label="Avg Attendance" value={`${summary.avgPct}%`} color={pctColor(summary.avgPct)} icon="📊" />
            <SummaryCard label="Students" value={`${summary.totalStudents}`} color="#3b82f6" icon="🎒" />
            <SummaryCard label="Days Tracked" value={`${summary.totalDays}`} color="#8b5cf6" icon="📅" />
            <SummaryCard label="Low Attendance" value={`${summary.lowCount}`} color="#ef4444" icon="⚠️" />
          </View>

          {/* ── Daily Trend Chart ── */}
          {dailyTrend.length > 0 && (
            <Section title="Daily Attendance Trend" icon="📈">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ width: Math.max(CHART_WIDTH, dailyTrend.length * 32), paddingRight: 12 }}>
                  <TrendChart data={dailyTrend} />
                </View>
              </ScrollView>
              {/* <View style={styles.legendRow}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Daily attendance %</Text>
              </View> */}
            </Section>
          )}

          {/* ── Batch Summary ── */}
          {batchStats.length > 0 && (
            <Section title="Batch Summary" icon="📚">
              {batchStats.map(b => (
                <BatchCard key={b.id} batch={b} />
              ))}
            </Section>
          )}

          {/* ── Student List ── */}
          {studentStats.length > 0 && (
            <Section title="Student Attendance" icon="🎒">
              {/* Legend */}
              <View style={styles.studentLegendRow}>
                <LegendBadge color="#22c55e" label="≥85% Good" />
                <LegendBadge color="#f59e0b" label="75–84% OK" />
                <LegendBadge color="#ef4444" label="<75% Low" />
              </View>
              {studentStats.map(s => (
                <TouchableOpacity key={s.id} onPress={() => setDrillStudent(s)}>
                  <StudentRow student={s} />
                </TouchableOpacity>
              ))}
            </Section>
          )}

          {studentStats.length === 0 && !loading && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No attendance data</Text>
              <Text style={styles.emptySub}>for this period and batch</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Month Picker Modal ── */}
      <PickerModal
        visible={monthPickerVisible}
        title="Select Month"
        onClose={() => setMonthPickerVisible(false)}
      >
        {/* Year selector */}
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={styles.yearArrowBtn}>
            <Text style={styles.yearArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.yearLabel}>{selectedYear}</Text>
          <TouchableOpacity
            onPress={() => setSelectedYear(y => Math.min(y + 1, now.getFullYear()))}
            style={styles.yearArrowBtn}
          >
            <Text style={styles.yearArrow}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.monthGrid}>
          {MONTHS.map((m, i) => {
            const isFuture = selectedYear === now.getFullYear() && i > now.getMonth();
            const isSelected = i === selectedMonth && selectedYear === selectedYear;
            return (
              <TouchableOpacity
                key={m}
                disabled={isFuture}
                style={[
                  styles.monthCell,
                  isSelected && i === selectedMonth && styles.monthCellSelected,
                  isFuture && styles.monthCellDisabled,
                ]}
                onPress={() => { setSelectedMonth(i); setMonthPickerVisible(false); }}
              >
                <Text style={[
                  styles.monthCellText,
                  isSelected && i === selectedMonth && styles.monthCellTextSelected,
                  isFuture && styles.monthCellTextDisabled,
                ]}>
                  {m.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </PickerModal>

      {/* ── Batch Picker Modal ── */}
      <PickerModal
        visible={batchPickerVisible}
        title="Select Batch"
        onClose={() => setBatchPickerVisible(false)}
      >
        {[{ id: 'all', name: 'All Batches', grade: '' }, ...batches].map(b => (
          <TouchableOpacity
            key={b.id}
            style={[styles.batchOption, selectedBatch === b.id && styles.batchOptionSelected]}
            onPress={() => { setSelectedBatch(b.id); setBatchPickerVisible(false); }}
          >
            <Text style={[styles.batchOptionText, selectedBatch === b.id && styles.batchOptionTextSelected]}>
              {b.name}{b.grade ? ` · Grade ${b.grade}` : ''}
            </Text>
            {selectedBatch === b.id && <Text style={styles.batchCheckmark}>✓</Text>}
          </TouchableOpacity>
        ))}
      </PickerModal>

      {/* ── Student Drill-down Modal ── */}
      <Modal visible={!!drillStudent} animationType="slide" transparent>
        <View style={styles.drillOverlay}>
          <View style={styles.drillSheet}>
            <View style={styles.modalHandle} />

            {drillStudent && (
              <>
                <View style={styles.drillHeader}>
                  <View>
                    <Text style={styles.drillName}>{drillStudent.name}</Text>
                    {drillStudent.roll_number
                      ? <Text style={styles.drillSub}>Roll No. {drillStudent.roll_number}</Text>
                      : null}
                  </View>
                  <View style={[styles.drillPctBadge, { backgroundColor: pctBg(drillStudent.pct) }]}>
                    <Text style={[styles.drillPctText, { color: pctColor(drillStudent.pct) }]}>
                      {drillStudent.pct}%
                    </Text>
                  </View>
                </View>

                <View style={styles.drillStatRow}>
                  <View style={styles.drillStat}>
                    <Text style={styles.drillStatNum}>{drillStudent.present}</Text>
                    <Text style={styles.drillStatLabel}>Present</Text>
                  </View>
                  <View style={styles.drillStatDivider} />
                  <View style={styles.drillStat}>
                    <Text style={styles.drillStatNum}>{drillStudent.total - drillStudent.present}</Text>
                    <Text style={styles.drillStatLabel}>Absent</Text>
                  </View>
                  <View style={styles.drillStatDivider} />
                  <View style={styles.drillStat}>
                    <Text style={styles.drillStatNum}>{drillStudent.total}</Text>
                    <Text style={styles.drillStatLabel}>Total Days</Text>
                  </View>
                </View>

                <Text style={styles.drillDayTitle}>Day-by-day Breakdown</Text>
                <ScrollView style={styles.drillDayScroll}>
                  <View style={styles.drillDayGrid}>
                    {studentDailyBreakdown.map(d => (
                      <View
                        key={d.fullDate}
                        style={[
                          styles.drillDayCell,
                          d.status === 'P' ? styles.drillDayCellPresent
                          : d.status === 'A' ? styles.drillDayCellAbsent
                          : styles.drillDayCellNA,
                        ]}
                      >
                        <Text style={styles.drillDayNum}>{d.date}</Text>
                        <Text style={[
                          styles.drillDayStatus,
                          d.status === 'P' ? { color: '#16a34a' }
                          : d.status === 'A' ? { color: '#dc2626' }
                          : { color: '#9ca3af' },
                        ]}>
                          {d.status}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={styles.drillCloseBtn} onPress={() => setDrillStudent(null)}>
              <Text style={styles.drillCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[summaryStyles.card, { borderTopColor: color }]}>
      <Text style={summaryStyles.icon}>{icon}</Text>
      <Text style={[summaryStyles.value, { color }]}>{value}</Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  icon:  { fontSize: 18, marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 9, color: '#6b7280', textAlign: 'center', marginTop: 2 },
});

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrapper}>
      <View style={sectionStyles.titleRow}>
        <Text style={sectionStyles.icon}>{icon}</Text>
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper:  { marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon:     { fontSize: 16, marginRight: 6 },
  title:    { fontSize: 16, fontWeight: '700', color: '#111827' },
});

function TrendChart({ data }: { data: DayTrend[] }) {
  const max = 100;
  const barWidth = Math.max(20, (CHART_WIDTH / data.length) - 4);

  return (
    <View style={{ height: CHART_HEIGHT + 30 }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(pct => (
        <View
          key={pct}
          style={{
            position: 'absolute',
            left: 0, right: 0,
            bottom: 24 + (pct / 100) * CHART_HEIGHT,
            height: 1,
            backgroundColor: pct === 75 ? '#fca5a5' : '#f3f4f6',
          }}
        />
      ))}
      {/* 75% label */}
      <Text style={{
        position: 'absolute',
        right: 0,
        bottom: 24 + (75 / 100) * CHART_HEIGHT - 8,
        fontSize: 9, color: '#ef4444', fontWeight: '600',
      }}>75%</Text>

      {/* Bars */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 24, paddingBottom: 24 }}>
        {data.map((d, i) => (
          <View key={i} style={{ alignItems: 'center', marginRight: 4, width: barWidth }}>
            <View
              style={{
                width: barWidth - 4,
                height: Math.max(3, (d.pct / max) * CHART_HEIGHT),
                backgroundColor: pctColor(d.pct),
                borderRadius: 4,
                opacity: 0.85,
              }}
            />
            <Text style={{ fontSize: 8, color: '#9ca3af', marginTop: 4 }}>{d.date}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BatchCard({ batch }: { batch: BatchStat }) {
  return (
    <View style={batchStyles.card}>
      <View style={batchStyles.left}>
        <Text style={batchStyles.name}>{batch.name}</Text>
        <Text style={batchStyles.sub}>
          {batch.grade ? `Grade ${batch.grade} · ` : ''}{batch.studentCount} students
          {batch.lowCount > 0 ? `  ·  ⚠️ ${batch.lowCount} low` : ''}
        </Text>
      </View>
      <View style={[batchStyles.pctBadge, { backgroundColor: pctBg(batch.avgPct) }]}>
        <Text style={[batchStyles.pctText, { color: pctColor(batch.avgPct) }]}>
          {batch.avgPct}%
        </Text>
      </View>
    </View>
  );
}

const batchStyles = StyleSheet.create({
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
  left:     { flex: 1 },
  name:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  sub:      { fontSize: 12, color: '#6b7280', marginTop: 3 },
  pctBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  pctText:  { fontSize: 16, fontWeight: '800' },
});

function StudentRow({ student }: { student: StudentStat }) {
  const barWidth = student.total > 0 ? `${student.pct}%` : '0%';
  return (
    <View style={studentRowStyles.card}>
      <View style={studentRowStyles.top}>
        <View style={studentRowStyles.nameBlock}>
          <Text style={studentRowStyles.name}>{student.name}</Text>
          {student.roll_number
            ? <Text style={studentRowStyles.roll}>Roll {student.roll_number}</Text>
            : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[studentRowStyles.pct, { color: pctColor(student.pct) }]}>
            {student.total > 0 ? `${student.pct}%` : 'N/A'}
          </Text>
          <Text style={studentRowStyles.fraction}>{student.present}/{student.total} days</Text>
        </View>
      </View>
      <View style={studentRowStyles.barBg}>
        <View style={[
          studentRowStyles.barFill,
          { width: barWidth as any, backgroundColor: pctColor(student.pct) },
        ]} />
      </View>
    </View>
  );
}

const studentRowStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  top:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  nameBlock:  { flex: 1 },
  name:       { fontSize: 13, fontWeight: '600', color: '#111827' },
  roll:       { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  pct:        { fontSize: 16, fontWeight: '800' },
  fraction:   { fontSize: 10, color: '#9ca3af', marginTop: 1 },
  barBg:      { height: 5, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  barFill:    { height: 5, borderRadius: 4 },
});

function LegendBadge({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 4 }} />
      <Text style={{ fontSize: 11, color: '#6b7280' }}>{label}</Text>
    </View>
  );
}

function PickerModal({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          <TouchableOpacity style={pickerStyles.closeBtn} onPress={onClose}>
            <Text style={pickerStyles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '70%' },
  handle:       { width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:        { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 16 },
  closeBtn:     { backgroundColor: '#3b82f6', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f2f4f7' },

  // Header
  header: {
    backgroundColor: '#3b82f6',
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  backIcon:    { color: '#fff', fontSize: 20, lineHeight: 22 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerSub:   { color: '#bfdbfe', fontSize: 12, textAlign: 'center', marginTop: 2 },

  // Filters
  filtersRow:    { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  filterChip:    { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  filterChipIcon:  { fontSize: 14, marginRight: 6 },
  filterChipText:  { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
  filterChipArrow: { fontSize: 12, color: '#9ca3af' },

  // Scroll
  scroll: { paddingHorizontal: 12, paddingTop: 4 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },

  // Legend
  legendRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  legendDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6', marginRight: 6 },
  legendText:  { fontSize: 11, color: '#6b7280' },
  studentLegendRow: { flexDirection: 'row', marginBottom: 12 },

  // Loading / empty
  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  emptyBox:    { alignItems: 'center', paddingTop: 60 },
  emptyIcon:   { fontSize: 48 },
  emptyText:   { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySub:    { fontSize: 13, color: '#9ca3af', marginTop: 4 },

  // Month picker
  yearRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  yearArrowBtn:{ padding: 8 },
  yearArrow:   { fontSize: 24, color: '#3b82f6', fontWeight: '300' },
  yearLabel:   { fontSize: 18, fontWeight: '700', color: '#111827', marginHorizontal: 24 },
  monthGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthCell:   { width: '22%', paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  monthCellSelected: { backgroundColor: '#3b82f6' },
  monthCellDisabled: { opacity: 0.35 },
  monthCellText:     { fontSize: 13, fontWeight: '600', color: '#374151' },
  monthCellTextSelected: { color: '#fff' },
  monthCellTextDisabled: { color: '#9ca3af' },

  // Batch picker
  batchOption:         { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  batchOptionSelected: { },
  batchOptionText:     { fontSize: 15, color: '#374151' },
  batchOptionTextSelected: { color: '#3b82f6', fontWeight: '700' },
  batchCheckmark:      { color: '#3b82f6', fontSize: 16, fontWeight: '700' },

  // Drill-down modal
  drillOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  drillSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '85%' },
  modalHandle:  { width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  drillHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  drillName:    { fontSize: 18, fontWeight: '800', color: '#111827' },
  drillSub:     { fontSize: 13, color: '#6b7280', marginTop: 3 },
  drillPctBadge:{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  drillPctText: { fontSize: 20, fontWeight: '900' },
  drillStatRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, marginBottom: 20 },
  drillStat:    { flex: 1, alignItems: 'center' },
  drillStatNum: { fontSize: 22, fontWeight: '800', color: '#111827' },
  drillStatLabel:{ fontSize: 11, color: '#6b7280', marginTop: 3 },
  drillStatDivider: { width: 1, backgroundColor: '#e5e7eb' },
  drillDayTitle:{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  drillDayScroll:{ maxHeight: 240 },
  drillDayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  drillDayCell: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  drillDayCellPresent: { backgroundColor: '#dcfce7' },
  drillDayCellAbsent:  { backgroundColor: '#fee2e2' },
  drillDayCellNA:      { backgroundColor: '#f3f4f6' },
  drillDayNum:  { fontSize: 11, fontWeight: '700', color: '#374151' },
  drillDayStatus:{ fontSize: 11, fontWeight: '800', marginTop: 2 },
  drillCloseBtn:{ backgroundColor: '#3b82f6', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  drillCloseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
   backArrow: {
    fontSize: 32,
    color: '#ffffff',
    lineHeight: 30,
  },
});