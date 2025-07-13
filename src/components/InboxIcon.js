// src/components/InboxIcon.js
import React, {useEffect, useState} from 'react';
import {Platform, View, Pressable, Text} from 'react-native';
import CleverTap from 'clevertap-react-native';
import NotificationIcon from '../assets/Notification.svg';
import { useUser } from '../context/UserContext';

export default function InboxIcon({style}) {
  const { isLoggedIn } = useUser();
  if (!isLoggedIn) return null;

  const [unreadCount, setUnreadCount] = useState(0);

  // helper: get the unread‐count badge
  const refreshBadge = () => {
    try {
      CleverTap.getInboxMessageUnreadCount((err, count) => {
        if (!err) setUnreadCount(count);
      });
    } catch (e) {
      console.warn('🔴 InboxIcon.refreshBadge error:', e);
    }
  };

  useEffect(() => {
    // 1) initial badge
    refreshBadge();

    // 2) subscribe to “inbox ready” & “inbox updated”
    const initL = CleverTap.addListener(
      CleverTap.CleverTapInboxDidInitialize,
      () => {
        try {
          refreshBadge();
        } catch (e) {
          console.warn('🔴 InboxIcon.init handler:', e);
        }
      },
    );
    const updL = CleverTap.addListener(
      CleverTap.CleverTapInboxMessagesDidUpdate,
      () => {
        try {
          refreshBadge();
        } catch (e) {
          console.warn('🔴 InboxIcon.update handler:', e);
        }
      },
    );

    // 3) subscribe to item‐tap (click)
    const tapL = CleverTap.addListener(
      CleverTap.CleverTapInboxMessageTapped,
      event => {
        try {
          // Android gives you a JSON string; iOS an object
          const data = Platform.OS === 'android' ? JSON.parse(event) : event;
          const msg = data.msg || data; // some SDK versions wrap in { msg }
          CleverTap.markReadInboxMessageForId(msg.messageId);
          refreshBadge();
          CleverTap.pushInboxNotificationClickedEventForId(msg.messageId);
        } catch (e) {
          console.warn('🔴 InboxIcon.tap handler error:', e);
        }
      },
    );

    return () => {
      if (initL?.remove) initL.remove();
      if (updL?.remove) updL.remove();
      if (tapL?.remove) tapL.remove();
    };
  }, []);

  // open the native inbox UI
  const openInbox = () => {
    try {
      CleverTap.showInbox({
        tabs: ['All'],
        navBarTitle: 'My Inbox',
        // …any styling overrides…
      });
    } catch (e) {
      console.warn('🔴 InboxIcon.openInbox error:', e);
    }
  };

  return (
    <Pressable onPress={openInbox} style={style}>
      <NotificationIcon width={24} height={24} />
      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -1, // tighter to the bell
            right: -1, // ditto
            minWidth: 14, // smaller badge
            height: 14,
            paddingHorizontal: 2,
            backgroundColor: 'red',
            borderRadius: 7, // half of height for a perfect circle

            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text
            style={{
              color: 'white',
              fontSize: 8, // smaller text
              lineHeight: 10,
              fontWeight: 'bold',
            }}>
            {unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
