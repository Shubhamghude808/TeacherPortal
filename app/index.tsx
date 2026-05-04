import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Login() {
  return (
    <View style={styles.container}>

      {/* Logo */}
      <View style={styles.logoBox}>
        <Text style={styles.logo}>📘</Text>
      </View>

      <Text style={styles.title}>Teacher Portal</Text>

      {/* Inputs */}
      <TextInput
        placeholder="Teacher Name"
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#999"
      />

      {/* Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/batch')}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
    justifyContent: 'center',
    padding: 20
  },
  logoBox: {
    backgroundColor: '#3b82f6',
    alignSelf: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 10
  },
  logo: {
    fontSize: 30,
    color: 'white'
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 30
  },
  input: {
    backgroundColor: '#e5e7eb',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 12,
    marginTop: 10
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600'
  }
});