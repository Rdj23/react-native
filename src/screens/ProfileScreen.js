/**
 * ProfileScreen — user profile editing + CleverTap property & event management.
 *
 * Visual design:
 *   - Card-based sections on a soft #FAFAFA background (matches HomeScreen/CartScreen)
 *   - Consistent border-radius (16), shadows, spacing
 *   - Modern inputs with rounded borders instead of underlines
 *   - Icon-prefixed section headers
 *   - Uniform button styles across all sections
 *   - Custom animated toast for all feedback
 */
import React, {useState, useEffect, useRef} from 'react';
import CleverTap from 'clevertap-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CameraIcon from '../../src/assets/User.svg';
import {useUser} from '../context/UserContext';
import {useTheme} from '../context/ThemeContext';

// ─── Custom Toast Component ──────────────────────────────────────────
function Toast({visible, message, type, onDismiss}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {toValue: 1, duration: 250, useNativeDriver: true}),
        Animated.timing(translateY, {toValue: 0, duration: 250, useNativeDriver: true}),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {toValue: 0, duration: 250, useNativeDriver: true}),
          Animated.timing(translateY, {toValue: 20, duration: 250, useNativeDriver: true}),
        ]).start(() => onDismiss?.());
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const config = {
    success: {bg: '#2E7D32', icon: 'checkmark-circle'},
    error: {bg: '#C62828', icon: 'alert-circle'},
    info: {bg: '#1565C0', icon: 'information-circle'},
    warning: {bg: '#E65100', icon: 'warning'},
  }[type] || {bg: '#333', icon: 'information-circle'};

  return (
    <Animated.View
      style={[
        toastStyles.wrap,
        {opacity: fadeAnim, transform: [{translateY}], backgroundColor: config.bg},
      ]}>
      <Ionicons name={config.icon} size={22} color="#FFF" />
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  text: {color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1},
});

// ─── Reusable key-value row ──────────────────────────────────────────
function KeyValueRow({item, onChange, onRemove}) {
  return (
    <View style={s.kvRow}>
      <TextInput
        style={s.kvInput}
        value={item.key}
        onChangeText={t => onChange({...item, key: t})}
        placeholder="Key"
        placeholderTextColor="#B0B0B0"
      />
      <TextInput
        style={[s.kvInput, {flex: 1.4}]}
        value={item.value}
        onChangeText={t => onChange({...item, value: t})}
        placeholder="Value (use , for array)"
        placeholderTextColor="#B0B0B0"
      />
      <TouchableOpacity onPress={onRemove} style={s.kvRemoveBtn}>
        <Ionicons name="close-circle" size={22} color="#E57373" />
      </TouchableOpacity>
    </View>
  );
}

function buildPropsObject(rows) {
  const obj = {};
  rows.forEach(({key, value}) => {
    const k = key.trim();
    if (!k) return;
    obj[k] = value.includes(',') ? value.split(',').map(v => v.trim()) : value;
  });
  return obj;
}

// ─── Section Card wrapper ────────────────────────────────────────────
function SectionCard({icon, title, hint, children, colors}) {
  return (
    <View style={[s.card, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      <View style={s.cardHeader}>
        <View style={s.cardIconCircle}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={[s.cardTitle, {color: colors.text}]}>{title}</Text>
      </View>
      {hint ? <Text style={s.cardHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export default function ProfileScreen({navigation}) {
  const insets = useSafeAreaInsets();
  const {user, setUser} = useUser();
  const {colors} = useTheme();

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone?.replace(/^\+91/, '') || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState(
    user.preferences || {whatsapp: false, push: true, sms: false, email: true},
  );

  const [userProps, setUserProps] = useState([{key: '', value: ''}]);
  const [eventName, setEventName] = useState('');
  const [eventProps, setEventProps] = useState([{key: '', value: ''}]);
  const [toast, setToast] = useState({visible: false, message: '', type: 'success'});

  const showToast = (message, type = 'success') =>
    setToast({visible: true, message, type});

  const isPhoneValid = /^[6-9]\d{9}$/.test(phone);
  const isEmailValid = /\S+@\S+\.\S+/.test(email);

  const togglePreference = key => {
    const val = !preferences[key];
    setPreferences(p => ({...p, [key]: val}));
    const map = {whatsapp: 'MSG-whatsapp', push: 'MSG-push', sms: 'MSG-sms', email: 'MSG-email'};
    CleverTap.profileSet({[map[key]]: val});
  };

  const handleSave = async () => {
    if (!isEmailValid) {
      setError('Valid email required');
      showToast('Please enter a valid email', 'error');
      return;
    }
    setError('');
    const formattedPhone = phone ? `+91${phone}` : '';
    const updatedUser = {name, email, phone: formattedPhone, avatarUrl, preferences};
    setUser(updatedUser);
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    CleverTap.profileSet({
      Name: name, Email: email, Phone: formattedPhone,
      'MSG-whatsapp': preferences.whatsapp, 'MSG-push': preferences.push,
      'MSG-sms': preferences.sms, 'MSG-email': preferences.email,
    });
    showToast('Profile saved');
  };

  const handlePushUserProps = () => {
    const props = buildPropsObject(userProps);
    if (!Object.keys(props).length) {
      showToast('Add at least one key-value pair', 'warning');
      return;
    }
    CleverTap.profileSet(props);
    showToast('Properties pushed');
  };

  const handleFireEvent = () => {
    const trimmed = eventName.trim();
    if (!trimmed) {
      showToast('Enter an event name', 'warning');
      return;
    }
    const props = buildPropsObject(eventProps);
    Object.keys(props).length
      ? CleverTap.recordEvent(trimmed, props)
      : CleverTap.recordEvent(trimmed);
    showToast(`"${trimmed}" fired`);
  };

  const addRow = setter => setter(p => [...p, {key: '', value: ''}]);
  const updateRow = (setter, i, v) => setter(p => p.map((r, j) => (j === i ? v : r)));
  const removeRow = (setter, i) =>
    setter(p => (p.length === 1 ? [{key: '', value: ''}] : p.filter((_, j) => j !== i)));

  return (
    <SafeAreaView style={[s.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {/* ─── Header ──────────────────────────────────────── */}
      <View style={[s.headerBar, {paddingTop: insets.top + 12, backgroundColor: colors.header, borderBottomColor: colors.border}]}>
        <Text style={[s.headerTitle, {color: colors.text}]}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ══════════════════════════════════════════════════
            CARD 1 — Edit Profile
            ══════════════════════════════════════════════════ */}
        <SectionCard icon="person-outline" title="Edit Profile" colors={colors}>
          {/* Avatar */}
          <TouchableOpacity style={s.avatarWrap} onPress={() => {}}>
            {avatarUrl ? (
              <Image source={{uri: avatarUrl}} style={s.avatar} />
            ) : (
              <View style={[s.avatarPlaceholder, {backgroundColor: colors.primary}]}>
                <CameraIcon width={28} height={28} fill={colors.ctaText} />
              </View>
            )}
            <Text style={[s.changePhotoText, {color: colors.primary}]}>Change Photo</Text>
          </TouchableOpacity>

          {/* Name */}
          <Text style={s.inputLabel}>Name</Text>
          <View style={s.inputWrap}>
            <Ionicons name="person-outline" size={18} color="#999" />
            <TextInput style={s.inputField} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#BBB" />
          </View>

          {/* Email */}
          <Text style={s.inputLabel}>Email *</Text>
          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#999" />
            <TextInput style={s.inputField} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#BBB" keyboardType="email-address" autoCapitalize="none" />
          </View>

          {/* Phone */}
          <Text style={s.inputLabel}>Phone (optional)</Text>
          <View style={s.inputWrap}>
            <Text style={s.phonePrefix}>+91</Text>
            <TextInput style={s.inputField} value={phone} onChangeText={setPhone} placeholder="10-digit number" placeholderTextColor="#BBB" keyboardType="number-pad" maxLength={10} />
          </View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <TouchableOpacity style={[s.btnPrimary, {backgroundColor: colors.primary}]} onPress={handleSave}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.ctaText} />
            <Text style={[s.btnPrimaryText, {color: colors.ctaText}]}>Save Profile</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ══════════════════════════════════════════════════
            CARD 2 — Notification Preferences
            ══════════════════════════════════════════════════ */}
        <SectionCard icon="notifications-outline" title="Notification Preferences" colors={colors}>
          {[
            {key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', disabled: !isPhoneValid},
            {key: 'push', label: 'Mobile Push', icon: 'phone-portrait-outline', disabled: false},
            {key: 'sms', label: 'SMS', icon: 'chatbubble-outline', disabled: !isPhoneValid},
            {key: 'email', label: 'Email', icon: 'mail-outline', disabled: !isEmailValid},
          ].map(item => (
            <View key={item.key} style={[s.prefRow, {borderBottomColor: colors.border}]}>
              <View style={s.prefLeft}>
                <Ionicons name={item.icon} size={20} color={item.disabled ? '#CCC' : colors.textSecondary} />
                <Text style={[s.prefLabel, item.disabled && {color: '#CCC'}]}>{item.label}</Text>
              </View>
              <Switch
                value={preferences[item.key]}
                onValueChange={() => togglePreference(item.key)}
                disabled={item.disabled}
                trackColor={{false: '#333', true: colors.accent}}
                thumbColor={preferences[item.key] ? colors.primary : '#F5F5F5'}
              />
            </View>
          ))}
        </SectionCard>

        {/* ══════════════════════════════════════════════════
            CARD 3 — User Properties
            ══════════════════════════════════════════════════ */}
        <SectionCard
          icon="construct-outline"
          title="Set User Properties"
          hint="Add key-value pairs. Use commas in the value for arrays. Leave value empty for empty string."
          colors={colors}>
          {userProps.map((row, i) => (
            <KeyValueRow
              key={`up-${i}`}
              item={row}
              onChange={v => updateRow(setUserProps, i, v)}
              onRemove={() => removeRow(setUserProps, i)}
            />
          ))}
          <TouchableOpacity style={s.addRowBtn} onPress={() => addRow(setUserProps)}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[s.addRowText, {color: colors.primary}]}>Add Property</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnSecondary, {backgroundColor: colors.primary}]} onPress={handlePushUserProps}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.ctaText} />
            <Text style={[s.btnSecondaryText, {color: colors.ctaText}]}>Push to CleverTap</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ══════════════════════════════════════════════════
            CARD 4 — Fire Custom Event
            ══════════════════════════════════════════════════ */}
        <SectionCard icon="flash-outline" title="Fire Custom Event" colors={colors}>
          <Text style={s.inputLabel}>Event Name</Text>
          <View style={s.inputWrap}>
            <Ionicons name="pricetag-outline" size={18} color="#999" />
            <TextInput style={s.inputField} value={eventName} onChangeText={setEventName} placeholder="e.g. Product Viewed" placeholderTextColor="#BBB" />
          </View>

          <Text style={[s.inputLabel, {marginTop: 12}]}>Event Properties (optional)</Text>
          {eventProps.map((row, i) => (
            <KeyValueRow
              key={`ep-${i}`}
              item={row}
              onChange={v => updateRow(setEventProps, i, v)}
              onRemove={() => removeRow(setEventProps, i)}
            />
          ))}
          <TouchableOpacity style={s.addRowBtn} onPress={() => addRow(setEventProps)}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[s.addRowText, {color: colors.primary}]}>Add Property</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnAccent} onPress={handleFireEvent}>
            <Ionicons name="flash" size={18} color="#FFF" />
            <Text style={s.btnAccentText}>Fire Event</Text>
          </TouchableOpacity>
        </SectionCard>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(p => ({...p, visible: false}))}
      />
    </SafeAreaView>
  );
}

// ─── Styles (Dark Theme) ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0D0D'},

  headerBar: {
    paddingHorizontal: 24, paddingBottom: 14,
    backgroundColor: '#111114', borderBottomWidth: 1, borderBottomColor: '#1E1E22',
    alignItems: 'center',
  },
  headerTitle: {fontSize: 18, fontWeight: '700', color: '#FFF'},

  scroll: {padding: 16, paddingBottom: 24},

  card: {
    backgroundColor: '#161618', borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#1E1E22',
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16},
  cardIconCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1E1E22', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {fontSize: 17, fontWeight: '700', color: '#FFF'},
  cardHint: {fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 18},

  avatarWrap: {alignItems: 'center', marginBottom: 20},
  avatar: {width: 88, height: 88, borderRadius: 44},
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#5E35B1', alignItems: 'center', justifyContent: 'center',
  },
  changePhotoText: {marginTop: 8, fontSize: 13, color: '#5E35B1', fontWeight: '600'},

  inputLabel: {fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 4},
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1A1E', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 4,
    marginBottom: 12, borderWidth: 1, borderColor: '#252528',
  },
  inputField: {flex: 1, fontSize: 15, color: '#FFF'},
  phonePrefix: {fontSize: 15, fontWeight: '600', color: '#AAA'},

  errorText: {color: '#EF5350', fontSize: 13, textAlign: 'center', marginBottom: 8},

  prefRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E1E22',
  },
  prefLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  prefLabel: {fontSize: 15, fontWeight: '500', color: '#CCC'},

  kvRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10},
  kvInput: {
    flex: 1, backgroundColor: '#1A1A1E', borderWidth: 1, borderColor: '#252528',
    borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 7, fontSize: 14, color: '#FFF',
  },
  kvRemoveBtn: {padding: 4},

  addRowBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, marginBottom: 4},
  addRowText: {fontSize: 14, fontWeight: '600', color: '#5E35B1'},

  // ── Buttons ───────────────────────────────────────────
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#5E35B1',
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnPrimaryText: {color: '#FFF', fontSize: 15, fontWeight: '700'},

  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: '#5E35B1',
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnSecondaryText: {color: '#FFF', fontSize: 15, fontWeight: '600'},

  btnAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnAccentText: {color: '#FFF', fontSize: 15, fontWeight: '600'},

  // Override switch track for dark theme
  switchTrack: {false: '#333', true: '#7E57C2'},
});
