import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { loginWithEmail } from '../../services/firebaseAuth';
import { useUser } from '../../context/UserContext';

export default function LoginScreen({ navigation }) {
  const { login } = useUser();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const colors = {
    background: isDark ? '#0B0B0C' : '#FFFFFF',
    surface: isDark ? '#121214' : '#FFFFFF',
    text: isDark ? '#E6E6E6' : '#111111',
    muted: isDark ? '#9AA0A6' : '#8A8A8A',
    border: isDark ? '#262629' : '#E6E6E6',
    primary: '#412f23ff',
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      return alert('Please provide email and password');
    }
    try {
      const userData = await loginWithEmail(email, password);
      login({
        name: userData.displayName || '',
        email: userData.email,
        Identity: userData.email,
      });
    } catch (error) {
      console.error(error);
      alert(error.message || 'Login failed');
    }
  };

  const disabled = !email.trim() || !password;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* <Image source={require('../../assets/logo.png')} style={styles.logo} /> */}

      <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.muted}
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.muted}
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        returnKeyType="done"
      />

      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={handleLogin}
        activeOpacity={0.85}
        accessibilityRole="button"
        disabled={disabled}>
        <Text style={styles.buttonText}>LOG IN</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.centerRow}>
        <Text style={[styles.link, { color: colors.primary }]}>New user? Register</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { width: 100, height: 100, resizeMode: 'contain', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  button: { backgroundColor: '#2d2018', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { marginTop: 18, textAlign: 'center' },
  centerRow: { alignItems: 'center', marginTop: 8 },
});
