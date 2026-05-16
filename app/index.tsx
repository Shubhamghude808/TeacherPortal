import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [session, setSession] = useState<any>(undefined);
  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAndCacheRole = async (userId: string): Promise<string | null> => {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    const fetchedRole = profile?.role ?? null;
    if (fetchedRole) await AsyncStorage.setItem('userRole', fetchedRole);
    return fetchedRole;
  };

  useEffect(() => {
    // Load cached role immediately so redirect is instant on reopen
    AsyncStorage.getItem('userRole').then(cached => {
      if (cached) setRole(cached);
    });

    // Single source of truth — skip getSession, rely on onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          await AsyncStorage.removeItem('userRole');
          setRole(null);
          setSession(null);
          return;
        }

        if (session) {
          // Use cached role while fresh one loads in background
          const cached = await AsyncStorage.getItem('userRole');
          if (cached) setRole(cached);

          const freshRole = await fetchAndCacheRole(session.user.id);
          setRole(freshRole);
          setSession(session);
        } else {
          setSession(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Details', 'Please enter email and password');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert('Login Failed', 'Invalid email or password');
        setLoading(false);
      }
      // No redirect needed — onAuthStateChange drives it
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Something went wrong');
      setLoading(false);
    }
  };

  if (session === undefined) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (session) {
    return <Redirect href={role === 'admin' ? '/admin' : '/batch'} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logo}>📘</Text>
      </View>

      <Text style={styles.title}>Teacher Portal</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f7', justifyContent: 'center', padding: 20 },
  logoBox: { backgroundColor: '#3b82f6', alignSelf: 'center', padding: 20, borderRadius: 20, marginBottom: 10 },
  logo: { fontSize: 30, color: 'white' },
  title: { textAlign: 'center', fontSize: 20, fontWeight: '600', marginBottom: 30 },
  input: { backgroundColor: '#e5e7eb', padding: 15, borderRadius: 12, marginBottom: 15 },
  button: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 12, marginTop: 10 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
});