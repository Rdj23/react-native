import React, {useState, useEffect} from 'react';
import CleverTap from 'clevertap-react-native';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';

import ArrowLeft from '../../src/assets/ArrowLeft.svg';
import CameraIcon from '../../src/assets/User.svg';
import {useUser} from '../context/UserContext';

export default function ProfileScreen({navigation}) {
  const {user, setUser} = useUser();

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone?.replace(/^\+91/, '') || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [error, setError] = useState('');

  const [preferences, setPreferences] = useState({
    whatsapp: false,
    push: true,
    sms: false,
    email: true,
  });

  const isPhoneValid = /^[6-9]\d{9}$/.test(phone);
  const isEmailValid = /\S+@\S+\.\S+/.test(email);

  const togglePreference = key => {
    const updatedValue = !preferences[key];
    const updatedPrefs = {...preferences, [key]: updatedValue};
    setPreferences(updatedPrefs);

    // Map to CleverTap keys
    const clevertapKeyMap = {
      whatsapp: 'MSG-whatsapp',
      push: 'MSG-push',
      sms: 'MSG-sms',
      email: 'MSG-email',
    };

    const cleverTapProfileUpdate = {
      [clevertapKeyMap[key]]: updatedValue,
    };

    CleverTap.profileSet(cleverTapProfileUpdate);
  };

  const handleSave = () => {
    if (!isEmailValid) {
      setError('Valid email required');
      return;
    }

    setError('');
    const formattedPhone = phone ? `+91${phone}` : '';

    setUser({
      ...user,
      name,
      email,
      phone: formattedPhone,
      avatarUrl,
      preferences,
    });

    CleverTap.profileSet({
      Name: name,
      Email: email,
      Phone: formattedPhone,

      'MSG-whatsapp': preferences.whatsapp,
      'MSG-push': preferences.push,
      'MSG-sms': preferences.sms,
      'MSG-email': preferences.email,
    });

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <ArrowLeft width={24} height={24} fill="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <TouchableOpacity style={styles.avatarWrap} onPress={() => {}}>
          {avatarUrl ? (
            <Image source={{uri: avatarUrl}} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <CameraIcon width={32} height={32} fill="#FFF" />
            </View>
          )}
          <Text style={styles.changeText}>Change Photo</Text>
        </TouchableOpacity>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone (optional)</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              style={[styles.input, {flex: 1}]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>

        <Text style={styles.prefTitle}>Notification Preferences</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.prefLabel}>WhatsApp</Text>
          <Switch
            value={preferences.whatsapp}
            onValueChange={() => togglePreference('whatsapp')}
            disabled={!isPhoneValid}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.prefLabel}>Mobile Push</Text>
          <Switch
            value={preferences.push}
            onValueChange={() => togglePreference('push')}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.prefLabel}>SMS</Text>
          <Switch
            value={preferences.sms}
            onValueChange={() => togglePreference('sms')}
            disabled={!isPhoneValid}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.prefLabel}>Email</Text>
          <Switch
            value={preferences.email}
            onValueChange={() => togglePreference('email')}
            disabled={!isEmailValid}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFF'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backBtn: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  title: {fontSize: 18, fontWeight: '700', color: '#1A1A1A'},

  form: {padding: 24},
  avatarWrap: {alignItems: 'center', marginBottom: 24},
  avatar: {width: 100, height: 100, borderRadius: 50},
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#30241F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: {marginTop: 8, color: '#666'},

  field: {marginBottom: 16},
  label: {fontSize: 14, color: '#666', marginBottom: 4},
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
    fontSize: 16,
    paddingVertical: 4,
  },
  phoneRow: {flexDirection: 'row', alignItems: 'center'},
  prefix: {fontSize: 16, color: '#333', marginRight: 8},

  prefTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    color: '#1A1A1A',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prefLabel: {fontSize: 16, color: '#1A1A1A'},

  error: {color: '#E57373', textAlign: 'center', marginBottom: 12},

  saveBtn: {
    marginTop: 24,
    backgroundColor: '#30241F',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  saveText: {color: '#FFF', fontSize: 16, fontWeight: '600'},
});
