import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

const options = [
  { label: 'Classwork Progress', emoji: '📚' },
  { label: 'Homework Progress', emoji: '📝' },
  { label: 'Practice Book Progress', emoji: '📖' },
  { label: 'Activity Book Progress', emoji: '🎨' },
  { label: 'Practice Progress', emoji: '✏️' },
  { label: 'Personal Remarks', emoji: '💬' },
];

const PROGRESS_SCREENS = [
  'Classwork Progress',
  'Homework Progress',
  'Practice Book Progress',
  'Activity Book Progress',
  'Practice Progress',
];

export default function StudentDetails() {
  const { name, id } = useLocalSearchParams<{
    name: string;
    id: string;
  }>();

  const studentName = name ?? 'Student';

  const handlePress = (item: typeof options[0]) => {
    if (PROGRESS_SCREENS.includes(item.label)) {
      router.push({
        pathname: '/progressScreen' as any,
        params: {
          title: item.label,
          studentName: studentName,
          studentId: id,
        },
      });
    } else if (item.label === 'Personal Remarks') {
      router.push({
        pathname: '/personalRemarks' as any,
        params: {
          studentName: studentName,
          studentId: id,
        },
      });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.header}>{studentName}</Text>
      </View>

      <View style={styles.divider} />

      {/* Menu Cards */}
      <View style={styles.list}>
        {options.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handlePress(item)}
          >
            <View style={styles.iconBubble}>
              <Text style={styles.iconEmoji}>{item.emoji}</Text>
            </View>

            <Text style={styles.label}>{item.label}</Text>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },

  content: {
    padding: 15,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 14,
  },

  backBtn: {
    marginRight: 6,
    padding: 2,
  },

  backArrow: {
    fontSize: 28,
    color: '#1f2937',
    lineHeight: 30,
  },

  header: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },

  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 18,
    marginHorizontal: -15,
  },

  list: {
    gap: 10,
  },

  card: {
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowRadius: 4,

    elevation: 1,
  },

  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  iconEmoji: {
    fontSize: 22,
  },

  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },

  chevron: {
    fontSize: 22,
    color: '#9ca3af',
    lineHeight: 24,
  },
});