import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { supabase } from '../lib/supabase';

export default function Login() {

  useEffect(() => {
    const test = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*');

      console.log('Supabase connected:', data, error);
    };

    test();
  }, []);

  return (
    <View style={styles.container}>

      <View style={styles.logoBox}>
        <Text style={styles.logo}>📘</Text>
      </View>

      <Text style={styles.title}>Teacher Portal</Text>

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