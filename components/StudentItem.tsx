import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';

type Props = {
  student: {
    id: string;
    name: string;
  };
  isPresent: boolean;
  onToggle: (id: string) => void;
};

export default function StudentItem({ student, isPresent, onToggle }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, isPresent && styles.presentCard]}
      onPress={() => onToggle(student.id)}
      onLongPress={() =>
    router.push({
        pathname: '/studentDetails',
        params: { id: student.id, name: student.name },
    })
    }
    >
      <View style={styles.avatar}>
        <Text>{student.name[0]}</Text>
      </View>

      <Text style={[styles.name, isPresent && styles.presentText]}>
        {student.name}
      </Text>

      {isPresent ? (
        <Text style={styles.tick}>✓</Text>
      ) : (
        <Text style={styles.tap}>Tap to mark present</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7', padding: 15 },

  header: {
    fontSize: 22,
    fontWeight: '600',
    paddingTop: 25,
  },

  sub: {
    color: 'gray',
    marginBottom: 10
  },

  attendance: {
    backgroundColor: '#e5e7eb',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },

  presentCard: {
    backgroundColor: '#22c55e'
  },

  avatar: {
    backgroundColor: '#dbeafe',
    width: 35,
    height: 35,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },

  name: {
    flex: 1,
    fontWeight: '500'
  },

  presentText: {
    color: 'white'
  },

  tap: {
    color: '#9ca3af',
    fontSize: 12
  },

  tick: {
    color: 'white',
    fontSize: 18
  }
});