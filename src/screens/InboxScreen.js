/**
 * InboxScreen — production-ready custom App Inbox.
 *
 * Features: filters (All/Unread/Tags), swipe-to-delete, multi-select delete,
 * mark all read, clear all, pull-to-refresh, shimmer, viewability tracking.
 */
import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View, Text, FlatList, StyleSheet, StatusBar,
  TouchableOpacity, RefreshControl, Modal, Animated, Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Swipeable, GestureHandlerRootView} from 'react-native-gesture-handler';

import useInbox from '../hooks/useInbox';
import InboxItemCard from '../components/InboxItemCard';
import * as InboxService from '../services/InboxService';

// ─── Shimmer ─────────────────────────────────────────────────────────
function Shimmer() {
  const a = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, {toValue: 0.5, duration: 700, useNativeDriver: true}),
      Animated.timing(a, {toValue: 0.2, duration: 700, useNativeDriver: true}),
    ])).start();
  }, []);
  return (
    <Animated.View style={[shimS.card, {opacity: a}]}>
      <View style={shimS.row}>
        <View style={{flex: 1, gap: 7}}><View style={shimS.b1} /><View style={shimS.b2} /></View>
        <View style={shimS.b3} />
      </View>
      <View style={shimS.b4} /><View style={shimS.b5} />
    </Animated.View>
  );
}
const shimS = StyleSheet.create({
  card: {marginHorizontal: 16, marginBottom: 8, backgroundColor: '#131315', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1B1B1F'},
  row: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  b1: {height: 12, width: '65%', backgroundColor: '#1B1B1F', borderRadius: 6},
  b2: {height: 10, width: '35%', backgroundColor: '#18181B', borderRadius: 5},
  b3: {height: 10, width: 30, backgroundColor: '#18181B', borderRadius: 5},
  b4: {height: 10, width: '92%', backgroundColor: '#18181B', borderRadius: 5, marginTop: 10},
  b5: {height: 10, width: '60%', backgroundColor: '#18181B', borderRadius: 5, marginTop: 5},
});

// ─── Swipe delete action ─────────────────────────────────────────────
function renderRight(progress, dragX, onDel) {
  const scale = dragX.interpolate({inputRange: [-80, -40, 0], outputRange: [1, 0.7, 0], extrapolate: 'clamp'});
  return (
    <View style={swS.wrap}>
      <Animated.View style={{transform: [{scale}]}}>
        <TouchableOpacity style={swS.btn} onPress={onDel}>
          <Ionicons name="trash" size={18} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
const swS = StyleSheet.create({
  wrap: {width: 64, justifyContent: 'center', alignItems: 'center', marginBottom: 8, marginRight: 16},
  btn: {width: 44, height: 44, borderRadius: 14, backgroundColor: '#B71C1C', alignItems: 'center', justifyContent: 'center'},
});

// ─── Screen ──────────────────────────────────────────────────────────
export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const {messages, unreadCount, loading, refresh, markRead, deleteMsg, trackView, trackClick} = useInbox();

  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState({type: null, item: null});
  const [refreshing, setRefreshing] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const seenRef = useRef(new Set());
  const swRefs = useRef({});

  useFocusEffect(useCallback(() => { refresh(); seenRef.current.clear(); }, [refresh]));

  const onPull = useCallback(() => {
    setRefreshing(true); refresh(); setTimeout(() => setRefreshing(false), 500);
  }, [refresh]);

  // Dynamic tag filters
  const tagSet = new Set();
  messages.forEach(m => (m.tags || []).forEach(t => t && tagSet.add(t)));
  const tagFilters = Array.from(tagSet);
  const tagCounts = {};
  tagFilters.forEach(t => { tagCounts[t] = messages.filter(m => (m.tags || []).includes(t)).length; });

  const filtered = (() => {
    if (filter === 'all') return messages;
    if (filter === 'unread') return messages.filter(m => !m.isRead);
    return messages.filter(m => (m.tags || []).includes(filter));
  })();

  // Viewability
  const viewCfg = useRef({viewAreaCoveragePercentThreshold: 50}).current;
  const onViewable = useRef(({viewableItems}) => {
    viewableItems?.forEach(({item}) => {
      if (item?.id && !seenRef.current.has(item.id)) { seenRef.current.add(item.id); trackView(item.id); }
    });
  }).current;

  // ─── Handlers ──────────────────────────────────────────────────
  const handlePress = useCallback(item => {
    if (selectMode) {
      toggleSelect(item.id);
      return;
    }
    if (!item.isRead) markRead(item.id);
    trackClick(item.id);
    if (item.actionUrl) {
      console.log('[Inbox] Opening deep link:', item.actionUrl);
      Linking.openURL(item.actionUrl).catch(e => console.warn('[Inbox] Failed to open URL:', e));
    }
  }, [selectMode, markRead, trackClick]);

  const handleLongPress = useCallback(item => {
    if (!selectMode) {
      setSelectMode(true);
      setSelected(new Set([item.id]));
    }
  }, [selectMode]);

  const handleBtnPress = useCallback((item, btn) => {
    if (!item.isRead) markRead(item.id);
    trackClick(item.id);
    if (btn.url) {
      console.log('[Inbox] Opening CTA link:', btn.url);
      Linking.openURL(btn.url).catch(e => console.warn('[Inbox] Failed to open CTA:', e));
    }
  }, [markRead, trackClick]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = new Set(filtered.map(m => m.id));
    // If all are already selected, deselect all
    const allSelected = filtered.every(m => selected.has(m.id));
    if (allSelected) {
      setSelected(new Set());
      setSelectMode(false);
    } else {
      setSelected(allIds);
    }
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const deleteSelected = () => {
    const ids = Array.from(selected).filter(Boolean);
    if (ids.length) {
      InboxService.deleteBatch(ids);
      setTimeout(refresh, 300);
    }
    exitSelect();
  };

  const execModal = () => {
    const {type, item} = modal;
    setModal({type: null, item: null});
    if (type === 'delete' && item) deleteMsg(item.id);
    if (type === 'clearAll') { InboxService.deleteBatch(messages.map(m => m.id).filter(Boolean)); setTimeout(refresh, 300); }
    if (type === 'markAll') { InboxService.markReadBatch(messages.filter(m => !m.isRead).map(m => m.id).filter(Boolean)); setTimeout(refresh, 300); }
    if (type === 'deleteSelected') deleteSelected();
  };

  // ─── Render item ───────────────────────────────────────────────
  const renderItem = useCallback(({item}) => {
    const isSelected = selected.has(item.id);

    if (selectMode) {
      return (
        <TouchableOpacity
          style={[s.selectRow, isSelected && s.selectRowOn]}
          activeOpacity={0.85}
          onPress={() => toggleSelect(item.id)}>
          <View style={[s.checkbox, isSelected && s.checkboxOn]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <View style={{flex: 1}}>
            <InboxItemCard item={item} onPress={() => toggleSelect(item.id)} onButtonPress={handleBtnPress} />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <Swipeable
        ref={ref => { swRefs.current[item.id] = ref; }}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={(p, d) => renderRight(p, d, () => { swRefs.current[item.id]?.close(); deleteMsg(item.id); })}>
        <View style={{marginHorizontal: 16, marginBottom: 8}}>
          <InboxItemCard
            item={item}
            onPress={handlePress}
            onLongPress={handleLongPress}
            onButtonPress={handleBtnPress}
          />
        </View>
      </Swipeable>
    );
  }, [selectMode, selected, handlePress, handleLongPress, handleBtnPress, deleteMsg]);

  const modalCfg = {
    delete: {icon: 'trash-outline', color: '#EF5350', bg: '#2A1515', title: 'Delete?', sub: 'Remove this notification permanently.', btn: 'Delete'},
    clearAll: {icon: 'notifications-off-outline', color: '#EF5350', bg: '#2A1515', title: 'Clear All?', sub: `Delete all ${messages.length} notifications?`, btn: 'Clear All'},
    markAll: {icon: 'checkmark-done', color: '#5E35B1', bg: '#1E1028', title: 'Mark All Read?', sub: `Mark ${unreadCount} as read?`, btn: 'Confirm'},
    deleteSelected: {icon: 'trash-outline', color: '#EF5350', bg: '#2A1515', title: `Delete ${selected.size}?`, sub: `Remove ${selected.size} selected notification${selected.size !== 1 ? 's' : ''}?`, btn: 'Delete'},
  }[modal.type] || {};

  const filterData = [
    {key: 'all', label: `All (${messages.length})`},
    {key: 'unread', label: `Unread (${unreadCount})`},
    ...tagFilters.map(t => ({key: t, label: `${t} (${tagCounts[t]})`})),
  ];

  return (
    <GestureHandlerRootView style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── Header ───────────────────────────────────── */}
      {selectMode ? (
        // Select mode header
        <View style={[s.hdr, {paddingTop: insets.top + 10}]}>
          <TouchableOpacity style={s.hBtn} onPress={exitSelect}>
            <Ionicons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.hTitle}>Selected ({selected.size})</Text>
          <View style={s.hRight}>
            <TouchableOpacity style={s.hBtn} onPress={selectAll}>
              <Ionicons name="checkbox-outline" size={16} color="#5E35B1" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.hBtn, selected.size === 0 && {opacity: 0.3}]}
              disabled={selected.size === 0}
              onPress={() => setModal({type: 'deleteSelected', item: null})}>
              <Ionicons name="trash" size={16} color="#EF5350" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Normal header
        <View style={[s.hdr, {paddingTop: insets.top + 10}]}>
          <TouchableOpacity style={s.hBtn} onPress={() => nav.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={s.hCenter}>
            <Text style={s.hTitle}>Notifications</Text>
            {unreadCount > 0 && <View style={s.hBadge}><Text style={s.hBadgeT}>{unreadCount}</Text></View>}
          </View>
          <View style={s.hRight}>
            {unreadCount > 0 && (
              <TouchableOpacity style={s.hBtn} onPress={() => setModal({type: 'markAll', item: null})}>
                <Ionicons name="checkmark-done" size={16} color="#5E35B1" />
              </TouchableOpacity>
            )}
            {messages.length > 0 && (
              <TouchableOpacity style={s.hBtn} onPress={() => setModal({type: 'clearAll', item: null})}>
                <Ionicons name="trash-outline" size={15} color="#EF5350" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ─── Filters ──────────────────────────────────── */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filterData}
        keyExtractor={i => i.key}
        contentContainerStyle={s.fRow}
        renderItem={({item: f}) => (
          <TouchableOpacity style={[s.fTab, filter === f.key && s.fTabOn]} onPress={() => setFilter(f.key)}>
            <Text style={[s.fText, filter === f.key && s.fTextOn]}>{f.label}</Text>
          </TouchableOpacity>
        )}
      />

      {/* ─── List ─────────────────────────────────────── */}
      {loading && !refreshing ? (
        <View style={{paddingTop: 4}}>{[0,1,2,3,4].map(i => <Shimmer key={i} />)}</View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyC}>
            <Ionicons name={filter === 'unread' ? 'checkmark-circle' : 'notifications-off'} size={36} color="#2A2A30" />
          </View>
          <Text style={s.emptyT}>{filter === 'unread' ? 'All caught up' : 'No notifications'}</Text>
          <Text style={s.emptyS}>{filter === 'unread' ? "You've read everything" : 'Nothing here yet'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          extraData={[selectMode, selected]}
          contentContainerStyle={{paddingBottom: insets.bottom + 20}}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPull} tintColor="#5E35B1" colors={['#5E35B1']} progressBackgroundColor="#161618" />}
          viewabilityConfig={viewCfg}
          onViewableItemsChanged={onViewable}
          initialNumToRender={10}
          maxToRenderPerBatch={6}
          windowSize={7}
        />
      )}

      {/* ─── Modal ────────────────────────────────────── */}
      <Modal visible={!!modal.type} transparent animationType="fade">
        <View style={s.mOvr}>
          <View style={s.mCard}>
            <View style={[s.mIco, {backgroundColor: modalCfg.bg}]}>
              <Ionicons name={modalCfg.icon || 'help'} size={24} color={modalCfg.color} />
            </View>
            <Text style={s.mTitle}>{modalCfg.title}</Text>
            <Text style={s.mSub}>{modalCfg.sub}</Text>
            <View style={s.mBtns}>
              <TouchableOpacity style={s.mCancel} onPress={() => setModal({type: null, item: null})}>
                <Text style={s.mCancelT}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.mAction, {backgroundColor: modalCfg.color}]} onPress={execModal}>
                <Text style={s.mActionT}>{modalCfg.btn}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0D0D0D'},

  // Header
  hdr: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10},
  hBtn: {width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center'},
  hCenter: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7},
  hTitle: {flex: 1, fontSize: 16, fontWeight: '700', color: '#FFF', textAlign: 'center'},
  hBadge: {backgroundColor: '#5E35B1', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4},
  hBadgeT: {color: '#FFF', fontSize: 10, fontWeight: '800'},
  hRight: {flexDirection: 'row', gap: 6},

  // Filters
  fRow: {paddingHorizontal: 16, paddingBottom: 8, gap: 8},
  fTab: {height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center'},
  fTabOn: {backgroundColor: '#5E35B1', borderColor: '#5E35B1'},
  fText: {fontSize: 12, fontWeight: '600', color: '#444'},
  fTextOn: {color: '#FFF'},

  // Select mode
  selectRow: {flexDirection: 'row', alignItems: 'center', paddingLeft: 16, marginBottom: 8},
  selectRowOn: {backgroundColor: 'rgba(94,53,177,0.06)'},
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', marginRight: 4,
  },
  checkboxOn: {backgroundColor: '#5E35B1', borderColor: '#5E35B1'},

  // Empty
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40},
  emptyC: {width: 64, height: 64, borderRadius: 32, backgroundColor: '#131315', borderWidth: 1, borderColor: '#1B1B1F', alignItems: 'center', justifyContent: 'center', marginBottom: 12},
  emptyT: {fontSize: 16, fontWeight: '700', color: '#555'},
  emptyS: {fontSize: 13, color: '#333', marginTop: 4, textAlign: 'center'},

  // Modal
  mOvr: {flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 28},
  mCard: {width: '100%', backgroundColor: '#18181C', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#222226'},
  mIco: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12},
  mTitle: {fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 4},
  mSub: {fontSize: 13, color: '#777', textAlign: 'center', marginBottom: 20, lineHeight: 18},
  mBtns: {flexDirection: 'row', gap: 10, width: '100%'},
  mCancel: {flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2E', alignItems: 'center'},
  mCancelT: {color: '#888', fontSize: 14, fontWeight: '600'},
  mAction: {flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center'},
  mActionT: {color: '#FFF', fontSize: 14, fontWeight: '700'},
});
