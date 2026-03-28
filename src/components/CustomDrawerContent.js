import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {DrawerContentScrollView, DrawerItem} from '@react-navigation/drawer';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {useUser} from '../context/UserContext';
import {useMovieCart} from '../context/MovieCartContext';

export default function CustomDrawerContent({navigation}) {
  const {user, logout} = useUser();
  const {cartCount} = useMovieCart();
  const insets = useSafeAreaInsets();

  const goToTab = t => { navigation.closeDrawer(); navigation.navigate('MainTabs', {screen: t}); };

  return (
    <DrawerContentScrollView contentContainerStyle={[s.wrap, {paddingTop: insets.top + 16}]}
      style={{backgroundColor: '#0D0D0D'}}>
      <View style={s.header}>
        <View style={s.avatar}><Ionicons name="person" size={28} color="#FFF" /></View>
        <Text style={s.name}>{user?.name || 'Your Name'}</Text>
        <Text style={s.email}>{user?.email || 'example@email.com'}</Text>
      </View>
      <View style={s.menu}>
        <DrawerItem label="Home" labelStyle={s.lbl}
          icon={({size}) => <Ionicons name="home-outline" size={size} color="#AAA" />}
          onPress={() => goToTab('Home')} />
        <DrawerItem label={`Cart${cartCount > 0 ? ` (${cartCount})` : ''}`} labelStyle={s.lbl}
          icon={({size}) => <Ionicons name="cart-outline" size={size} color="#AAA" />}
          onPress={() => goToTab('Cart')} />
        <DrawerItem label="Profile" labelStyle={s.lbl}
          icon={({size}) => <Ionicons name="person-outline" size={size} color="#AAA" />}
          onPress={() => goToTab('Profile')} />
      </View>
      <View style={s.footer}>
        <DrawerItem label="Logout" labelStyle={[s.lbl, {color: '#EF5350'}]}
          icon={({size}) => <Ionicons name="log-out-outline" size={size} color="#EF5350" />}
          onPress={async () => { await logout(); }} />
      </View>
    </DrawerContentScrollView>
  );
}

const s = StyleSheet.create({
  wrap: {flex: 1},
  header: {alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#1E1E22'},
  avatar: {width: 60, height: 60, borderRadius: 30, backgroundColor: '#5E35B1', alignItems: 'center', justifyContent: 'center', marginBottom: 12},
  name: {fontSize: 17, fontWeight: '700', color: '#FFF'},
  email: {fontSize: 13, color: '#666', marginTop: 2},
  menu: {paddingTop: 12},
  lbl: {fontSize: 15, fontWeight: '500', color: '#CCC', marginLeft: -16},
  footer: {marginTop: 'auto', borderTopWidth: 1, borderTopColor: '#1E1E22'},
});
