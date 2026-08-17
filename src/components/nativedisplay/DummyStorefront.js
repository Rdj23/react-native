/**
 * DummyStorefront — filler storefront UI for NativeDisplayScreen.
 *
 * Purely presentational placeholder content (no network, no state, no navigation)
 * whose only job is to give the Native Display slots realistic surroundings — a
 * banner pinned to the bottom of an empty page tells you nothing about how it
 * will actually look above real content.
 *
 * Product "images" are deliberately colour blocks + Ionicons rather than remote
 * URLs so the page renders identically offline and never shows torn images while
 * you are judging a campaign's layout.
 *
 * Exported pieces, in the order the screen stacks them:
 *   SectionLabel      → small caps heading with optional right-side hint
 *   DummyHero         → greeting, balance card, inert search bar
 *   DummyChips        → category pills
 *   DummyProductRow   → horizontally scrolling product cards
 *   DummyGrid         → two-column product grid
 *   DummyOrders       → recent-orders list rows
 */
import React from 'react';
import {View, Text, ScrollView, StyleSheet, Dimensions} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width: SCREEN_W} = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_W = (SCREEN_W - 32 - GRID_GAP) / 2;
const ROW_CARD_W = 148;

const CATEGORIES = [
  {key: 'all', label: 'All', icon: 'grid-outline'},
  {key: 'tech', label: 'Electronics', icon: 'hardware-chip-outline'},
  {key: 'fashion', label: 'Fashion', icon: 'shirt-outline'},
  {key: 'home', label: 'Home', icon: 'bed-outline'},
  {key: 'beauty', label: 'Beauty', icon: 'sparkles-outline'},
  {key: 'sports', label: 'Sports', icon: 'football-outline'},
];

const DEALS = [
  {id: 'd1', name: 'Aurora Wireless Buds', price: '₹2,499', mrp: '₹4,999', off: '50% off', rating: '4.5', tint: '#5E35B1', icon: 'headset'},
  {id: 'd2', name: 'Nimbus Running Shoes', price: '₹3,199', mrp: '₹5,499', off: '42% off', rating: '4.3', tint: '#00897B', icon: 'walk'},
  {id: 'd3', name: 'Kettle Pro 1.7L', price: '₹1,299', mrp: '₹2,199', off: '41% off', rating: '4.1', tint: '#E65100', icon: 'cafe'},
  {id: 'd4', name: 'Orbit Smart Watch', price: '₹4,999', mrp: '₹8,999', off: '44% off', rating: '4.6', tint: '#1565C0', icon: 'watch'},
];

const RECOMMENDED = [
  {id: 'r1', name: 'Canvas Backpack 24L', price: '₹1,849', mrp: '₹2,999', rating: '4.4', tint: '#6D4C41', icon: 'bag-handle'},
  {id: 'r2', name: 'Mecha Keyboard TKL', price: '₹5,499', mrp: '₹7,499', rating: '4.7', tint: '#37474F', icon: 'keypad'},
  {id: 'r3', name: 'Cold Brew Tumbler', price: '₹899', mrp: '₹1,499', rating: '4.2', tint: '#AD1457', icon: 'beer'},
  {id: 'r4', name: 'Desk Lamp Halo', price: '₹1,599', mrp: '₹2,499', rating: '4.5', tint: '#F9A825', icon: 'bulb'},
];

const ORDERS = [
  {id: 'o1', name: 'Aurora Wireless Buds', status: 'Delivered', when: 'Aug 14', icon: 'checkmark-circle', tone: '#2E7D32'},
  {id: 'o2', name: 'Canvas Backpack 24L', status: 'Out for delivery', when: 'Aug 17', icon: 'bicycle', tone: '#F9A825'},
  {id: 'o3', name: 'Kettle Pro 1.7L', status: 'Processing', when: 'Aug 18', icon: 'time', tone: '#1565C0'},
];

/** Small caps section heading, optionally with a muted hint on the right. */
export function SectionLabel({colors, text, hint}) {
  return (
    <View style={d.sectionHead}>
      <Text style={[d.sectionTitle, {color: colors.text}]}>{text}</Text>
      {!!hint && <Text style={[d.sectionHint, {color: colors.primary}]}>{hint}</Text>}
    </View>
  );
}

/** Colour-block stand-in for a product photo. */
function Thumb({tint, icon, style}) {
  return (
    <View style={[style, {backgroundColor: tint + '33'}]}>
      <Ionicons name={icon} size={30} color={tint} />
    </View>
  );
}

function Stars({rating, colors}) {
  return (
    <View style={d.starRow}>
      <Ionicons name="star" size={11} color="#F9A825" />
      <Text style={[d.starText, {color: colors.textSecondary}]}>{rating}</Text>
    </View>
  );
}

export function DummyHero({colors}) {
  return (
    <View style={d.hero}>
      <View style={d.heroTop}>
        <View>
          <Text style={[d.heroGreeting, {color: colors.textSecondary}]}>Good evening</Text>
          <Text style={[d.heroName, {color: colors.text}]}>Rohan</Text>
        </View>
        <View style={[d.coinPill, {backgroundColor: colors.primarySoft, borderColor: colors.primary}]}>
          <Ionicons name="wallet-outline" size={14} color={colors.primary} />
          <Text style={[d.coinText, {color: colors.primary}]}>₹1,240</Text>
        </View>
      </View>

      {/* Inert search bar — visual filler, not a real input */}
      <View style={[d.search, {backgroundColor: colors.surface, borderColor: colors.border}]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <Text style={[d.searchText, {color: colors.textSecondary}]}>Search for products…</Text>
      </View>
    </View>
  );
}

export function DummyChips({colors}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={d.chipRow}>
      {CATEGORIES.map((c, i) => {
        const active = i === 0;
        return (
          <View
            key={c.key}
            style={[
              d.chip,
              {
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}>
            <Ionicons name={c.icon} size={13} color={active ? colors.ctaText : colors.textSecondary} />
            <Text style={[d.chipText, {color: active ? colors.ctaText : colors.textSecondary}]}>
              {c.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

export function DummyProductRow({colors, title, hint}) {
  return (
    <View>
      <SectionLabel colors={colors} text={title} hint={hint} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={d.rowScroll}>
        {DEALS.map((p) => (
          <View key={p.id} style={[d.rowCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <Thumb tint={p.tint} icon={p.icon} style={d.rowThumb} />
            <View style={d.rowBody}>
              <Text numberOfLines={2} style={[d.prodName, {color: colors.text}]}>{p.name}</Text>
              <View style={d.priceRow}>
                <Text style={[d.price, {color: colors.text}]}>{p.price}</Text>
                <Text style={d.mrp}>{p.mrp}</Text>
              </View>
              <Text style={d.off}>{p.off}</Text>
              <Stars rating={p.rating} colors={colors} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function DummyGrid({colors, title}) {
  return (
    <View>
      <SectionLabel colors={colors} text={title} />
      <View style={d.grid}>
        {RECOMMENDED.map((p) => (
          <View key={p.id} style={[d.gridCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <Thumb tint={p.tint} icon={p.icon} style={d.gridThumb} />
            <View style={d.rowBody}>
              <Text numberOfLines={1} style={[d.prodName, {color: colors.text}]}>{p.name}</Text>
              <View style={d.priceRow}>
                <Text style={[d.price, {color: colors.text}]}>{p.price}</Text>
                <Text style={d.mrp}>{p.mrp}</Text>
              </View>
              <Stars rating={p.rating} colors={colors} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function DummyOrders({colors}) {
  return (
    <View>
      <SectionLabel colors={colors} text="Recent Orders" hint="View all" />
      <View style={d.orderWrap}>
        {ORDERS.map((o) => (
          <View key={o.id} style={[d.orderRow, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <View style={[d.orderIcon, {backgroundColor: o.tone + '26'}]}>
              <Ionicons name={o.icon} size={16} color={o.tone} />
            </View>
            <View style={d.orderBody}>
              <Text numberOfLines={1} style={[d.orderName, {color: colors.text}]}>{o.name}</Text>
              <Text style={[d.orderMeta, {color: colors.textSecondary}]}>
                {o.status} · {o.when}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </View>
        ))}
      </View>
    </View>
  );
}

const d = StyleSheet.create({
  // headings
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {fontSize: 16, fontWeight: '700'},
  sectionHint: {fontSize: 12, fontWeight: '600'},

  // hero
  hero: {paddingHorizontal: 16, gap: 14},
  heroTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  heroGreeting: {fontSize: 12},
  heroName: {fontSize: 20, fontWeight: '800'},
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  coinText: {fontSize: 12, fontWeight: '700'},
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchText: {fontSize: 13},

  // chips
  chipRow: {paddingHorizontal: 16, gap: 8, marginTop: 16},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: {fontSize: 12, fontWeight: '600'},

  // shared product bits
  prodName: {fontSize: 12, fontWeight: '600', lineHeight: 16},
  priceRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4},
  price: {fontSize: 14, fontWeight: '800'},
  mrp: {fontSize: 11, color: '#777', textDecorationLine: 'line-through'},
  off: {fontSize: 11, fontWeight: '700', color: '#2E7D32', marginTop: 2},
  starRow: {flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5},
  starText: {fontSize: 11, fontWeight: '600'},
  rowBody: {padding: 10},

  // horizontal row
  rowScroll: {paddingHorizontal: 16, gap: 12},
  rowCard: {width: ROW_CARD_W, borderRadius: 12, borderWidth: 1, overflow: 'hidden'},
  rowThumb: {width: '100%', height: 100, alignItems: 'center', justifyContent: 'center'},

  // grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: 16,
  },
  gridCard: {width: GRID_W, borderRadius: 12, borderWidth: 1, overflow: 'hidden'},
  gridThumb: {width: '100%', height: 110, alignItems: 'center', justifyContent: 'center'},

  // orders
  orderWrap: {paddingHorizontal: 16, gap: 10},
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  orderIcon: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  orderBody: {flex: 1},
  orderName: {fontSize: 13, fontWeight: '600'},
  orderMeta: {fontSize: 11, marginTop: 2},
});
