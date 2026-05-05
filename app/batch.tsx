import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
const data = [
  { id: '1', name: 'Grade 5A', students: 32 },
  { id: '2', name: 'Grade 5B', students: 28 },
  { id: '3', name: 'Grade 6A', students: 30 },
  { id: '4', name: 'Grade 6B', students: 25 },
  { id: '5', name: 'Grade 7A', students: 29 },
];

export default function Batch() {

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push('/students' as any)}   // ✅ ADD THIS
    >
      
      <View style={styles.iconBox}>
        <Text>👥</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.subtitle}>{item.students} students</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select Batch</Text>
      
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
    padding: 15
  },
  header: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 15,
    paddingTop: 25
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
  }
});