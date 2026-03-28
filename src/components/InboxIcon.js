/**
 * InboxIcon — bell icon with live unread badge.
 * Navigates to the custom InboxScreen on tap.
 */
import React, {useEffect, useState} from 'react';
import {View, Pressable, Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useUser} from '../context/UserContext';
import * as Inbox from '../services/InboxService';

export default function InboxIcon({style}) {
  const {isLoggedIn} = useUser();
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);

  if (!isLoggedIn) return null;

  const refreshBadge = () => {
    Inbox.getUnreadCount(count => setUnreadCount(count));
  };

  useEffect(() => {
    refreshBadge();
    const l1 = Inbox.addListener(Inbox.EVENTS.INITIALIZED, refreshBadge);
    const l2 = Inbox.addListener(Inbox.EVENTS.UPDATED, refreshBadge);
    return () => { l1?.remove?.(); l2?.remove?.(); };
  }, []);

  return (
    <Pressable onPress={() => navigation.navigate('Inbox')} style={[st.btn, style]}>
      <Ionicons name="notifications-outline" size={20} color="#FFF" />
      {unreadCount > 0 && (
        <View style={st.badge}>
          <Text style={st.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  btn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 16, height: 16, paddingHorizontal: 3,
    backgroundColor: '#5E35B1', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#0D0D0D',
  },
  badgeText: {color: '#FFF', fontSize: 9, fontWeight: '800', lineHeight: 12},
});
