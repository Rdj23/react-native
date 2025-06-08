import React, {useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {TextInput, Button, Text} from 'react-native-paper';
import {registerWithEmail} from '../../services/firebaseAuth';
import {COLORS} from '../../theme/colors';
import CleverTap from 'clevertap-react-native';

export default function RegisterScreen({navigation}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cleverTapId, setCleverTapId] = useState(null);

  useEffect(() => {
    CleverTap.getCleverTapID(id => {
      setCleverTapId(id);
    });
  }, []);

  const handleRegister = async () => {
    try {
      await registerWithEmail(email, password, name);
      navigation.replace('Login');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create{'\n'}your account</Text>

      <TextInput
        label="Enter your name"
        value={name}
        onChangeText={setName}
        mode="flat"
        underlineColor={COLORS.border}
        style={styles.input}
      />

      <TextInput
        label="Email address"
        value={email}
        onChangeText={setEmail}
        mode="flat"
        underlineColor={COLORS.border}
        style={styles.input}
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="flat"
        underlineColor={COLORS.border}
        secureTextEntry
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleRegister}
        style={styles.button}
        labelStyle={styles.buttonLabel}
        buttonColor={COLORS.primary}>
        SIGN UP
      </Button>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>

      {cleverTapId && (
        <Text style={styles.ctId}>CleverTap ID: {cleverTapId}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    color: COLORS.text,
  },
  input: {backgroundColor: 'transparent', marginBottom: 16},
  button: {borderRadius: 32, paddingVertical: 6},
  buttonLabel: {fontWeight: 'bold', fontSize: 16, color: '#fff'},
  link: {marginTop: 32, textAlign: 'center', color: COLORS.primary},
  ctId: {marginTop: 24, fontSize: 12, color: '#999', textAlign: 'center'},
});
