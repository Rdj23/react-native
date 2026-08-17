import React, {useCallback} from 'react';
import {View, Text, StyleSheet, Switch} from 'react-native';
import {DrawerContentScrollView, DrawerItem} from '@react-navigation/drawer';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {useUser} from '../context/UserContext';
import {useMovieCart} from '../context/MovieCartContext';
import {useTheme} from '../context/ThemeContext';

export default function CustomDrawerContent({navigation}) {
  const {user, logout, mockSubscriptionTier, setMockSubscriptionTier} = useUser();
  const {cartCount} = useMovieCart();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  const goToTab = t => { navigation.closeDrawer(); navigation.navigate('MainTabs', {screen: t}); };

  // Navigates to a screen nested inside HomeStack (which lives under the Home tab)
  const goToHomeStackScreen = screen => {
    navigation.closeDrawer();
    navigation.navigate('MainTabs', {screen: 'Home', params: {screen}});
  };

  const isPremium = mockSubscriptionTier === 'premium';

  const handleTierToggle = useCallback((value) => {
    const newTier = value ? 'premium' : 'free';
    setMockSubscriptionTier(newTier);
    // fetchVariables is called automatically in UserContext right after profileSet
  }, [setMockSubscriptionTier]);

  return (
    <DrawerContentScrollView contentContainerStyle={[s.wrap, {paddingTop: insets.top + 16}]}
      style={{backgroundColor: colors.background}}>
      <View style={[s.header, {borderBottomColor: colors.border}]}>
        <View style={[s.avatar, {backgroundColor: colors.primary}]}><Ionicons name="person" size={28} color={colors.ctaText} /></View>
        <Text style={[s.name, {color: colors.text}]}>{user?.name || 'Your Name'}</Text>
        <Text style={s.email}>{user?.email || 'example@email.com'}</Text>
      </View>
      <View style={s.menu}>
        <DrawerItem label="Home" labelStyle={s.lbl}
          icon={({size}) => <Ionicons name="home-outline" size={size} color={colors.textSecondary} />}
          onPress={() => goToTab('Home')} />
        <DrawerItem label={`Cart${cartCount > 0 ? ` (${cartCount})` : ''}`} labelStyle={s.lbl}
          icon={({size}) => <Ionicons name="cart-outline" size={size} color={colors.textSecondary} />}
          onPress={() => goToTab('Cart')} />
        <DrawerItem label="Profile" labelStyle={s.lbl}
          icon={({size}) => <Ionicons name="person-outline" size={size} color={colors.textSecondary} />}
          onPress={() => goToTab('Profile')} />
      </View>

      {/* ─── Dev Menu ────────────────────────────────────── */}
      <View style={[s.devSection, {borderTopColor: colors.border, borderBottomColor: colors.border}]}>
        <View style={s.devHeader}>
          <Ionicons name="code-slash-outline" size={16} color={colors.primary} />
          <Text style={[s.devTitle, {color: colors.primary}]}>Developer Menu</Text>
        </View>
        <View style={s.devRow}>
          <View style={s.devLabelWrap}>
            <Ionicons
              name={isPremium ? 'diamond' : 'lock-closed'}
              size={16}
              color={isPremium ? colors.primary : '#888'}
            />
            <Text style={s.devLabel}>
              {isPremium ? 'Premium' : 'Free'} User
            </Text>
          </View>
          <Switch
            value={isPremium}
            onValueChange={handleTierToggle}
            trackColor={{false: '#333', true: colors.accent}}
            thumbColor={isPremium ? colors.primary : '#888'}
          />
        </View>
        <Text style={s.devHint}>
          Toggles subscription tier for paywall testing
        </Text>

        <DrawerItem label="Native Display" labelStyle={s.lbl}
          icon={({size}) => <Ionicons name="tv-outline" size={size} color={colors.primary} />}
          onPress={() => goToHomeStackScreen('NativeDisplay')} />
        <Text style={s.devHint}>
          Renders Native Display units by slot (position key-value)
        </Text>
      </View>

      <View style={[s.footer, {borderTopColor: colors.border}]}>
        <DrawerItem label="Logout" labelStyle={[s.lbl, {color: '#EF5350'}]}
          icon={({size}) => <Ionicons name="log-out-outline" size={size} color="#EF5350" />}
          onPress={async () => { await logout(); }} />
      </View>
    </DrawerContentScrollView>
  );
}

const s = StyleSheet.create({
  wrap: {flex: 1},
  header: {alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1},
  avatar: {width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12},
  name: {fontSize: 17, fontWeight: '700'},
  email: {fontSize: 13, color: '#666', marginTop: 2},
  menu: {paddingTop: 12},
  lbl: {fontSize: 15, fontWeight: '500', color: '#CCC', marginLeft: -16},
  devSection: {marginTop: 16, paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1},
  devHeader: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14},
  devTitle: {fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1},
  devRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  devLabelWrap: {flexDirection: 'row', alignItems: 'center', gap: 8},
  devLabel: {fontSize: 15, fontWeight: '600', color: '#CCC'},
  devHint: {fontSize: 11, color: '#555', marginTop: 8},
  footer: {marginTop: 'auto', borderTopWidth: 1},
});
