import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Login() {

  const [session, setSession] = useState<any>(undefined);
  const [role, setRole] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Fetch role so we can redirect correctly
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setRole(profile?.role ?? null);
      }

      setSession(session);
    };

    loadSession();
  }, []);

  if (session === undefined) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (session) {
    // Redirect based on role
    if (role === 'admin') 
      return <Redirect href="/admin" />;
    return <Redirect href="/batch" />;
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Details', 'Please enter email and password');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        Alert.alert('Login Failed', 'Invalid email or password');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        Alert.alert('Profile Error', 'User profile not found');
        setLoading(false);
        return;
      }

      setLoading(false);

      // Route based on role
      if (profile.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/batch');
      }

    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Something went wrong');
      setLoading(false);
    }
  };

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

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
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