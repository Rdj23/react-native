import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { loginWithEmail } from '../../services/firebaseAuth';
import { useUser } from '../../context/UserContext'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const { login } = useUser(); // ✅
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const userData = await loginWithEmail(email, password);

      const existingPrefs = await AsyncStorage.getItem('user');
      const prefs = existingPrefs ? JSON.parse(existingPrefs).preferences : {};

      // Instead of navigation.replace, update context state
      login({
      name: userData.displayName || '',
      email: userData.email,
      phone: userData.phoneNumber || '',
      avatarUrl: '',
      preferences: prefs || {
        whatsapp: false,
        push: true,
        sms: false,
        email: true,
      },
        
        
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };
  return (
    <View style={styles.container}>
      {/* Static image icon (optional) */}
      {/* <Image source={require('')} style={styles.logo} /> */}

      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>LOG IN</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>New user? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  logo: { width: 100, height: 100, resizeMode: 'contain', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
  input: { borderBottomWidth: 1, borderColor: '#ccc', paddingVertical: 8, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#2d2018', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { marginTop: 24, textAlign: 'center', color: '#2d2018' },
});
