/**
 * InboxItemCard — single inbox notification card.
 */
import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

function timeAgo(epoch) {
  if (!epoch) return '';
  const diff = Date.now() / 1000 - epoch;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(epoch * 1000).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

export default function InboxItemCard({item, onPress, onLongPress, onButtonPress}) {
  const unread = !item.isRead;
  const hasMedia = !!item.mediaUrl;
  const hasButtons = item.buttons?.length > 0;

  return (
    <TouchableOpacity
      style={[s.card, unread && s.cardUnread]}
      activeOpacity={0.88}
      onPress={() => onPress?.(item)}
      onLongPress={() => onLongPress?.(item)}
      delayLongPress={400}>

      {/* Unread indicator */}
      {unread && <View style={s.dot} />}

      {/* Hero media */}
      {hasMedia && (
        <Image source={{uri: item.mediaUrl}} style={s.media} resizeMode="cover" />
      )}

      <View style={s.body}>
        {/* Row: icon (only if campaign provides one) + title + time */}
        <View style={s.row}>
          {item.iconUrl ? (
            <Image source={{uri: item.iconUrl}} style={s.icon} />
          ) : null}
          <View style={{flex: 1}}>
            <Text style={[s.title, unread && s.titleUnread]} numberOfLines={2}>
              {item.title || 'New notification'}
            </Text>
          </View>
          <Text style={s.time}>{timeAgo(item.date)}</Text>
        </View>

        {/* Body text */}
        {item.body ? (
          <Text style={[s.bodyText, unread && s.bodyTextUnread]} numberOfLines={3}>{item.body}</Text>
        ) : null}

        {/* Tags */}
        {item.tags?.length > 0 && (
          <View style={s.tagRow}>
            {item.tags.slice(0, 2).map((t, i) => (
              <View key={i} style={s.tag}><Text style={s.tagText}>{t}</Text></View>
            ))}
          </View>
        )}

        {/* CTA buttons */}
        {hasButtons && (
          <View style={s.ctaRow}>
            {item.buttons.slice(0, 2).map((btn, i) => (
              <TouchableOpacity key={i} style={s.cta} onPress={() => onButtonPress?.(item, btn, i)}>
                <Text style={s.ctaText}>{btn.text}</Text>
                <Ionicons name="arrow-forward" size={12} color="#B39DDB" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#131315',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1B1B1F',
  },
  cardUnread: {
    backgroundColor: '#15121E',
    borderColor: 'rgba(94,53,177,0.18)',
    borderLeftWidth: 3,
    borderLeftColor: '#5E35B1',
  },
  dot: {
    position: 'absolute', top: 16, right: 14, zIndex: 5,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#5E35B1',
  },
  media: {width: '100%', height: 160, backgroundColor: '#1A1A1E'},
  body: {padding: 14},
  row: {flexDirection: 'row', alignItems: 'center', gap: 10},
  icon: {width: 28, height: 28, borderRadius: 7, backgroundColor: '#1E1E22'},
  iconFallback: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: '#1B1B1F',
    alignItems: 'center', justifyContent: 'center',
  },
  iconFallbackUnread: {backgroundColor: 'rgba(94,53,177,0.12)'},
  title: {fontSize: 14, fontWeight: '600', color: '#777'},
  titleUnread: {fontWeight: '700', color: '#F0F0F0'},
  time: {fontSize: 11, color: '#3A3A3F'},
  bodyText: {fontSize: 13, color: '#555', lineHeight: 19, marginTop: 8},
  bodyTextUnread: {color: '#999'},
  tagRow: {flexDirection: 'row', gap: 6, marginTop: 10},
  tag: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'},
  tagText: {fontSize: 10, fontWeight: '600', color: '#555'},
  ctaRow: {flexDirection: 'row', gap: 8, marginTop: 12},
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18,
    backgroundColor: 'rgba(94,53,177,0.1)',
    borderWidth: 1, borderColor: 'rgba(94,53,177,0.2)',
  },
  ctaText: {fontSize: 12, fontWeight: '600', color: '#B39DDB'},
});
