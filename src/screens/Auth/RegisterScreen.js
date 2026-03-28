import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {registerWithEmail} from '../../services/firebaseAuth';

export default function RegisterScreen({navigation}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) { setError('Please fill all fields'); return; }
    setError('');
    try { await registerWithEmail(email, password, name); navigation.navigate('Login'); }
    catch (e) { setError(e.message || 'Registration failed'); }
  };

  const disabled = !name.trim() || !email.trim() || !password;

  return (
    <KeyboardAvoidingView
      style={[s.container, {paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <View style={s.top}>
        <View style={s.iconCircle}><Ionicons name="person-add-outline" size={36} color="#5E35B1" /></View>
        <Text style={s.brand}>GemStore</Text>
        <Text style={s.title}>Create account</Text>
        <Text style={s.subtitle}>Join us to get started</Text>
      </View>
      <View style={s.form}>
        <Text style={s.label}>Name</Text>
        <View style={s.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#666" />
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#555" autoCapitalize="words" returnKeyType="next" />
        </View>
        <Text style={s.label}>Email</Text>
        <View style={s.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#666" />
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#555" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
        </View>
        <Text style={s.label}>Password</Text>
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#666" />
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Create a password" placeholderTextColor="#555" secureTextEntry={!showPwd} returnKeyType="done" onSubmitEditing={handleRegister} />
          <TouchableOpacity onPress={() => setShowPwd(p => !p)}>
            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
          </TouchableOpacity>
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <TouchableOpacity style={[s.btn, disabled && s.btnOff]} onPress={handleRegister} activeOpacity={0.85} disabled={disabled}>
          <Text style={s.btnText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.linkRow}>
          <Text style={s.linkMuted}>Already have an account? </Text>
          <Text style={s.linkAccent}>Log In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0D0D', paddingHorizontal: 28, justifyContent: 'center'},
  top: {alignItems: 'center', marginBottom: 36},
  iconCircle: {width: 72, height: 72, borderRadius: 36, backgroundColor: '#1A1A1E', alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  brand: {fontSize: 14, fontWeight: '700', color: '#5E35B1', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8},
  title: {fontSize: 28, fontWeight: '800', color: '#FFF'},
  subtitle: {fontSize: 15, color: '#666', marginTop: 4},
  form: {width: '100%'},
  label: {fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 12},
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#161618', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 6,
    borderWidth: 1, borderColor: '#252528',
  },
  input: {flex: 1, fontSize: 15, color: '#FFF'},
  error: {color: '#EF5350', fontSize: 13, textAlign: 'center', marginTop: 12},
  btn: {backgroundColor: '#5E35B1', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24},
  btnOff: {opacity: 0.4},
  btnText: {color: '#FFF', fontSize: 16, fontWeight: '700'},
  linkRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 20},
  linkMuted: {fontSize: 14, color: '#666'},
  linkAccent: {fontSize: 14, fontWeight: '700', color: '#5E35B1'},
});
