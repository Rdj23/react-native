/**
 * NativeDisplayScreen — test harness for CleverTap Native Display campaigns
 * (Dashboard 1 / primary instance).
 *
 * The page renders a dummy storefront (see DummyStorefront.js) purely so campaign
 * units can be judged against realistic surroundings — spacing, contrast and
 * whether a bottom banner covers content all read differently on an empty page.
 * None of that filler content is interactive; the only live parts are the trigger
 * panel and the display units themselves.
 *
 * ─── HOW TO USE ──────────────────────────────────────────────────────────────
 *  1. On the dashboard, create a Native Display campaign whose "When" trigger is
 *     an event — e.g. `Native Display` with property `layout` equals `top`.
 *  2. In the campaign's Custom Key-Value section, add the position hint that tells
 *     the app where to draw it — this is the authoritative source:
 *         position = Top | Bottom | Full | Carousel
 *     Matching is case-insensitive, and the keys layout / placement / slot /
 *     template are accepted as aliases — see SLOT_KV_KEYS in
 *     src/services/NativeDisplayService.js
 *  3. Open this screen, edit the event name / property key if needed, and tap one
 *     of the four trigger buttons. The unit renders into the matching region.
 *
 *  If a campaign ships no position hint, the slot is inferred: carousel template
 *  or multiple content items → carousel; otherwise the property value of the
 *  event you just fired is used; otherwise it falls back to `top`.
 *
 * ─── REGIONS ON THIS PAGE ────────────────────────────────────────────────────
 *  TOP       first block inside the scroll flow, like a hero banner
 *  CAROUSEL  inline under a "Sponsored" heading, where a promo strip would sit
 *  BOTTOM    last block inside the scroll flow, after the storefront sections
 *  FULL      absolute overlay covering the whole page (dismissible)
 *
 *  TOP/CAROUSEL/BOTTOM all scroll with the page rather than being pinned. A
 *  banner that holds position while content moves under it reads as chrome, so
 *  pinning is exactly what made these look like in-app overlays. FULL is the one
 *  intentional overlay, since an interstitial is what that slot means.
 *
 *  Image-only creatives (type `simple-image`) render full-bleed: edge to edge,
 *  no margin, radius, border or card background, so they read as a native strip
 *  of the page rather than an in-app overlay. Every slot carries a small, subtle
 *  dismiss ✕. A slot with no unit renders nothing and occupies zero height.
 *
 *  Dismissal is local to this screen (the SDK's cache is untouched), and firing
 *  any trigger again clears it so re-delivered units reappear.
 *
 * ─── EVENTS FIRED HERE (Dashboard 1) ─────────────────────────────────────────
 *  <your event name>                 → the campaign trigger, with your property
 *  Display Unit Viewed  (SDK-internal, via pushDisplayUnitViewedEventForID)
 *  Display Unit Clicked (SDK-internal, via pushDisplayUnitClickedEventForID)
 */
import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import NativeDisplayUnit from '../components/nativedisplay/NativeDisplayUnit';
import {
  SectionLabel,
  DummyHero,
  DummyChips,
  DummyProductRow,
  DummyGrid,
  DummyOrders,
} from '../components/nativedisplay/DummyStorefront';
import useNativeDisplay from '../hooks/useNativeDisplay';
import {SLOTS} from '../services/NativeDisplayService';
import {useTheme} from '../context/ThemeContext';

const DEFAULT_EVENT = 'Native Display';
const DEFAULT_PROP_KEY = 'layout';

/**
 * The four trigger presets. `value` is the *event property* value sent to the
 * dashboard, so it must match the campaign's "When" condition — property matching
 * there is case-sensitive. Title-cased to mirror the custom_kv vocabulary
 * (position = Top | Bottom | Full | Carousel); if your campaign triggers on
 * lowercase instead, either change these or use the CUSTOM VALUE field.
 *
 * The value also doubles as the slot fallback, but only for campaigns that ship
 * no position key-value — when custom_kv.position is present it always wins.
 */
const TRIGGERS = [
  {slot: SLOTS.TOP, value: 'Top', label: 'Top', icon: 'chevron-up-outline'},
  {slot: SLOTS.FULL, value: 'Full', label: 'Full', icon: 'expand-outline'},
  {slot: SLOTS.BOTTOM, value: 'Bottom', label: 'Bottom', icon: 'chevron-down-outline'},
  {slot: SLOTS.CAROUSEL, value: 'Carousel', label: 'Carousel', icon: 'albums-outline'},
];

export default function NativeDisplayScreen({navigation}) {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const {bySlot, units, lastEvent, loading, fireEvent, refresh, dismiss, clear} =
    useNativeDisplay();

  const [eventName, setEventName] = useState(DEFAULT_EVENT);
  const [propKey, setPropKey] = useState(DEFAULT_PROP_KEY);
  const [propValue, setPropValue] = useState('');
  const [showPanel, setShowPanel] = useState(true);
  const [showPayload, setShowPayload] = useState(false);

  const trigger = useCallback(
    (value) => {
      const key = propKey.trim() || DEFAULT_PROP_KEY;
      fireEvent(eventName, {[key]: value}, value);
    },
    [eventName, propKey, fireEvent],
  );

  const topUnits = bySlot[SLOTS.TOP];
  const fullUnits = bySlot[SLOTS.FULL];
  const bottomUnits = bySlot[SLOTS.BOTTOM];
  const carouselUnits = bySlot[SLOTS.CAROUSEL];


  return (
    <View style={[s.root, {backgroundColor: colors.background, paddingTop: insets.top}]}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <View style={[s.header, {borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, {color: colors.text}]}>Native Display</Text>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={refresh} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={clear} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPanel((p) => !p)} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons
              name={showPanel ? 'options' : 'options-outline'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Trigger panel ──────────────────────────────────────── */}
      {showPanel && (
        <View style={[s.panel, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <View style={s.field}>
            <Text style={[s.fieldLabel, {color: colors.textSecondary}]}>EVENT NAME</Text>
            <TextInput
              value={eventName}
              onChangeText={setEventName}
              placeholder="Native Display"
              placeholderTextColor="#555"
              autoCapitalize="none"
              autoCorrect={false}
              style={[s.input, {color: colors.text, borderColor: colors.border}]}
            />
          </View>

          <View style={s.fieldRow}>
            <View style={[s.field, {flex: 1}]}>
              <Text style={[s.fieldLabel, {color: colors.textSecondary}]}>PROPERTY KEY</Text>
              <TextInput
                value={propKey}
                onChangeText={setPropKey}
                placeholder="layout"
                placeholderTextColor="#555"
                autoCapitalize="none"
                autoCorrect={false}
                style={[s.input, {color: colors.text, borderColor: colors.border}]}
              />
            </View>
            <View style={[s.field, {flex: 1}]}>
              <Text style={[s.fieldLabel, {color: colors.textSecondary}]}>CUSTOM VALUE</Text>
              <View style={s.customRow}>
                <TextInput
                  value={propValue}
                  onChangeText={setPropValue}
                  placeholder="any value"
                  placeholderTextColor="#555"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[s.input, {flex: 1, color: colors.text, borderColor: colors.border}]}
                />
                <TouchableOpacity
                  disabled={!propValue.trim()}
                  onPress={() => trigger(propValue.trim())}
                  style={[
                    s.sendBtn,
                    {backgroundColor: propValue.trim() ? colors.primary : colors.border},
                  ]}>
                  <Ionicons name="send" size={14} color={colors.ctaText} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={[s.fieldLabel, {color: colors.textSecondary, marginTop: 4}]}>
            FIRE TRIGGER
          </Text>
          <View style={s.triggerRow}>
            {TRIGGERS.map((t) => (
              <TouchableOpacity
                key={t.slot}
                onPress={() => trigger(t.value)}
                style={[s.trigger, {borderColor: colors.primary, backgroundColor: colors.primarySoft}]}>
                <Ionicons name={t.icon} size={16} color={colors.primary} />
                <Text style={[s.triggerText, {color: colors.primary}]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!lastEvent && (
            <Text style={s.lastEvent}>
              last fired: {lastEvent.name} {JSON.stringify(lastEvent.props)}
            </Text>
          )}
        </View>
      )}

      {/* ─── Storefront, with every non-overlay slot inside the scroll flow ───
        * TOP and BOTTOM live in here rather than pinned outside the ScrollView.
        * A banner that stays put while the page scrolls reads as chrome — i.e. an
        * in-app overlay. Scrolling with the content is what makes it feel native.
        */}
      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        keyboardShouldPersistTaps="handled">
        {/* TOP slot — first thing in the page, like a hero banner */}
        {topUnits.map((u) => (
          <NativeDisplayUnit key={u.key} unit={u} onDismiss={() => dismiss(u.unitId)} />
        ))}

        <View style={s.heroSpacer} />
        <DummyHero colors={colors} />
        <DummyChips colors={colors} />

        {/* Carousel units sit where a promo strip would live on a real storefront */}
        {carouselUnits.length > 0 && (
          <>
            <SectionLabel colors={colors} text="Sponsored" hint="Native Display" />
            {carouselUnits.map((u) => (
              <View key={u.key} style={s.slotItem}>
                <NativeDisplayUnit unit={u} onDismiss={() => dismiss(u.unitId)} />
              </View>
            ))}
          </>
        )}

        <DummyProductRow colors={colors} title="Deals of the Day" hint="See all" />
        <DummyGrid colors={colors} title="Recommended for You" />
        <DummyOrders colors={colors} />

        {/* BOTTOM slot — last thing in the page, in the flow rather than floating */}
        {bottomUnits.length > 0 && (
          <View style={s.bottomSlot}>
            {bottomUnits.map((u) => (
              <NativeDisplayUnit key={u.key} unit={u} onDismiss={() => dismiss(u.unitId)} />
            ))}
          </View>
        )}

        {units.length === 0 && (
          <View style={[s.empty, {borderColor: colors.border}]}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="tv-outline" size={22} color={colors.border} />
            )}
            <Text style={[s.emptyTitle, {color: colors.textSecondary}]}>
              {loading ? 'Waiting for campaign…' : 'No display units yet'}
            </Text>
            <Text style={s.emptyHint}>
              Fire a trigger above. The unit renders in the region named by its
              campaign custom key-value: position = Top / Bottom / Full / Carousel.
            </Text>
          </View>
        )}

        {units.length > 0 && (
          <TouchableOpacity style={s.payloadToggle} onPress={() => setShowPayload((p) => !p)}>
            <Ionicons
              name={showPayload ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={colors.textSecondary}
            />
            <Text style={[s.payloadToggleText, {color: colors.textSecondary}]}>
              raw payload ({units.length} unit{units.length > 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        )}

        {showPayload &&
          units.map((u) => (
            <View
              key={`raw-${u.key}`}
              style={[s.payloadCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
              <Text style={[s.payloadMeta, {color: colors.primary}]}>
                slot: {u.slot} · type: {u.type || 'n/a'} · id: {u.unitId}
              </Text>
              <Text style={s.payloadJson}>{JSON.stringify(u.raw, null, 2)}</Text>
            </View>
          ))}
      </ScrollView>

      {/* ─── FULL slot (overlay) ────────────────────────────────── */}
      {fullUnits.length > 0 && (
        <View
          style={[
            s.fullOverlay,
            {paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16},
          ]}>
          <NativeDisplayUnit
            unit={fullUnits[0]}
            onDismiss={() => dismiss(fullUnits[0].unitId)}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {flex: 1},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {flex: 1, fontSize: 17, fontWeight: '700'},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 16},

  panel: {margin: 16, padding: 14, borderRadius: 14, borderWidth: 1, gap: 10},
  field: {gap: 6},
  fieldRow: {flexDirection: 'row', gap: 10},
  fieldLabel: {fontSize: 10, fontWeight: '800', letterSpacing: 1},
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  customRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  sendBtn: {width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},

  triggerRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  triggerText: {fontSize: 12, fontWeight: '700'},
  lastEvent: {fontSize: 11, color: '#666', marginTop: 2},

  slotItem: {marginBottom: 12},
  body: {flex: 1},
  bodyContent: {paddingBottom: 28},
  // Sits after the TOP slot: gives the hero breathing room whether or not a unit
  // is present, while letting a present unit start flush at the top of the page.
  heroSpacer: {height: 16},
  bottomSlot: {marginTop: 24},

  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },

  empty: {
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyTitle: {fontSize: 13, fontWeight: '600'},
  emptyHint: {fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 17},

  payloadToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    marginHorizontal: 16,
  },
  payloadToggleText: {fontSize: 11, fontWeight: '700', letterSpacing: 0.5},
  payloadCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  payloadMeta: {fontSize: 10, fontWeight: '800', marginBottom: 8},
  payloadJson: {fontSize: 10, color: '#8A8A8E', fontFamily: 'Courier'},
});
