/**
 * NativeDisplayUnit — renders a single normalized CleverTap Native Display unit.
 *
 * CleverTap does NOT draw Native Display for you (unlike In-Apps): the SDK hands
 * over a payload and the app owns the UI. This component is that UI, with one
 * layout per slot:
 *
 *   top      → compact horizontal banner (thumbnail + title + message + CTAs)
 *   bottom   → same banner, styled to sit flush against the bottom of the screen
 *   full     → full-bleed card: large media, title, body, CTAs, close button
 *   carousel → horizontally paged media cards with dot indicators
 *
 * The slot comes off `unit.slot`, resolved in NativeDisplayService from the
 * campaign's custom_kv (see that file for the resolution order).
 *
 * Impressions and clicks are reported back to CleverTap so campaign stats fill in:
 *   pushDisplayUnitViewedEventForID  → once per unit, when it first renders
 *   pushDisplayUnitClickedEventForID → on any tap that has an action
 */
import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  Linking,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {useTheme} from '../../context/ThemeContext';
import {SLOTS, recordUnitViewed, recordUnitClicked} from '../../services/NativeDisplayService';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');
const CAROUSEL_W = SCREEN_W - 32;
const CAROUSEL_MEDIA_H = Math.round(CAROUSEL_W * 0.56); // 16:9
const FULL_MEDIA_H = Math.round(SCREEN_H * 0.32);

/** Opens a deep link / URL, reporting the click to CleverTap first. */
const useUnitPress = (unitId) =>
  useCallback(
    (url) => {
      recordUnitClicked(unitId);
      if (!url) return;
      Linking.openURL(url).catch((e) =>
        console.warn('[NativeDisplay] could not open url:', url, e),
      );
    },
    [unitId],
  );

/**
 * Resolves a remote image's natural aspect ratio so full-width creatives render
 * uncropped. Native Display artwork comes in whatever ratio the campaign author
 * uploaded, so hardcoding 16:9 would silently crop their creative.
 */
const useImageAspect = (url, fallback = 16 / 9) => {
  const [aspect, setAspect] = useState(fallback);
  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    Image.getSize(
      url,
      (w, h) => {
        if (alive && w > 0 && h > 0) setAspect(w / h);
      },
      (e) => console.warn('[NativeDisplay] could not size image:', url, e?.message),
    );
    return () => {
      alive = false;
    };
  }, [url]);
  return aspect;
};

/** Fires the viewed event exactly once per unit id. */
const useImpression = (unitId) => {
  const seenRef = useRef(null);
  useEffect(() => {
    if (!unitId || seenRef.current === unitId) return;
    seenRef.current = unitId;
    recordUnitViewed(unitId);
  }, [unitId]);
};

/**
 * Dismiss affordance. Deliberately small and low-contrast — a big bright ✕ is
 * what makes a unit read as an ad overlay — but with a generous hitSlop so it
 * stays comfortably tappable at this size.
 */
function DismissButton({onDismiss, style}) {
  if (!onDismiss) return null;
  return (
    <TouchableOpacity
      onPress={onDismiss}
      style={[s.dismiss, style]}
      hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
      <Ionicons name="close" size={14} color="rgba(255,255,255,0.9)" />
    </TouchableOpacity>
  );
}

/** CTA button row shared by every layout. */
function ActionButtons({buttons, colors, onPress, compact}) {
  if (!buttons?.length) return null;
  return (
    <View style={[s.btnRow, compact && s.btnRowCompact]}>
      {buttons.map((b) => (
        <TouchableOpacity
          key={b.key}
          activeOpacity={0.8}
          onPress={() => onPress(b.url)}
          style={[
            s.btn,
            compact && s.btnCompact,
            {backgroundColor: b.bg || colors.primary},
          ]}>
          <Text
            numberOfLines={1}
            style={[s.btnText, compact && s.btnTextCompact, {color: b.color || colors.ctaText}]}>
            {b.text || 'Open'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── top / bottom, image-only (simple-image): full-bleed hero ───────────────
 * Edge to edge, no margin, radius, border or card background — anything that
 * frames the creative makes it read as an in-app overlay rather than a native
 * strip of the screen. Note we deliberately ignore `unit.bg` here: campaigns
 * commonly ship "#ffffff", which would paint a white slab across a dark app,
 * and the creative covers the whole area anyway.
 */
function ImageBannerLayout({item, colors, onPress, onDismiss}) {
  const url = item.mediaUrl || item.iconUrl;
  const aspect = useImageAspect(url);

  return (
    <View>
      <TouchableOpacity
        activeOpacity={item.actionUrl ? 0.9 : 1}
        onPress={() => item.actionUrl && onPress(item.actionUrl)}>
        <Image
          source={{uri: url}}
          style={[s.imageBannerMedia, {aspectRatio: aspect}]}
          resizeMode="cover"
        />

        {/* CTA links still render below the creative when the campaign defines them */}
        {!!item.buttons?.length && (
          <View style={s.imageBannerBtns}>
            <ActionButtons buttons={item.buttons} colors={colors} onPress={onPress} compact />
          </View>
        )}
      </TouchableOpacity>

      {/* Outside the tappable area so dismissing never fires the unit's action */}
      <DismissButton onDismiss={onDismiss} style={s.dismissOverlay} />
    </View>
  );
}

/* ─── top / bottom: text banner, blended into the page ───────────────────────
 * Full width and borderless so it sits in the content flow, with a small
 * trailing ✕ so a unit can be dismissed on-device.
 */
function BannerLayout({unit, colors, onPress, onDismiss}) {
  const item = unit.items[0] || {};
  const thumb = item.iconUrl || item.mediaUrl;

  // simple-image / image-only creatives get the full-bleed treatment instead
  if (item.imageOnly) {
    return (
      <ImageBannerLayout
        item={item}
        colors={colors}
        onPress={onPress}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={item.actionUrl ? 0.85 : 1}
      onPress={() => item.actionUrl && onPress(item.actionUrl)}
      style={[s.banner, {backgroundColor: colors.surface}]}>
      {thumb ? (
        <Image source={{uri: thumb}} style={s.bannerThumb} resizeMode="cover" />
      ) : (
        <View style={[s.bannerThumb, s.bannerThumbEmpty, {backgroundColor: colors.primarySoft}]}>
          <Ionicons name="megaphone-outline" size={22} color={colors.primary} />
        </View>
      )}

      <View style={s.bannerBody}>
        {!!item.title && (
          <Text numberOfLines={1} style={[s.bannerTitle, {color: item.titleColor || colors.text}]}>
            {item.title}
          </Text>
        )}
        {!!item.message && (
          <Text
            numberOfLines={2}
            style={[s.bannerMsg, {color: item.messageColor || colors.textSecondary}]}>
            {item.message}
          </Text>
        )}
        <ActionButtons buttons={item.buttons} colors={colors} onPress={onPress} compact />
      </View>

      <DismissButton onDismiss={onDismiss} style={s.dismissInline} />
    </TouchableOpacity>
  );
}

/* ─── full: full-bleed card ─────────────────────────────────────────────────── */
function FullLayout({unit, colors, onPress, onDismiss}) {
  const item = unit.items[0] || {};
  const media = item.mediaUrl || item.iconUrl;
  const aspect = useImageAspect(media);

  return (
    <View style={[s.full, {backgroundColor: unit.bg || colors.surface, borderColor: colors.border}]}>
      {onDismiss && (
        <TouchableOpacity style={s.fullClose} onPress={onDismiss} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Ionicons name="close" size={20} color="#FFF" />
        </TouchableOpacity>
      )}

      <ScrollView bounces={false} contentContainerStyle={s.fullScroll}>
        {media ? (
          <Image
            source={{uri: media}}
            style={[s.fullMedia, {aspectRatio: aspect}]}
            resizeMode="cover"
          />
        ) : (
          <View style={[s.fullMedia, s.bannerThumbEmpty, {backgroundColor: colors.primarySoft}]}>
            <Ionicons name="image-outline" size={40} color={colors.primary} />
          </View>
        )}

        <View style={s.fullBody}>
          {!!item.title && (
            <Text style={[s.fullTitle, {color: item.titleColor || colors.text}]}>{item.title}</Text>
          )}
          {!!item.message && (
            <Text style={[s.fullMsg, {color: item.messageColor || colors.textSecondary}]}>
              {item.message}
            </Text>
          )}
          <ActionButtons buttons={item.buttons} colors={colors} onPress={onPress} />
          {!item.buttons?.length && !!item.actionUrl && (
            <TouchableOpacity
              style={[s.btn, {backgroundColor: colors.primary, marginTop: 16}]}
              onPress={() => onPress(item.actionUrl)}>
              <Text style={[s.btnText, {color: colors.ctaText}]}>Open</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── carousel: paged media cards ───────────────────────────────────────────── */
function CarouselLayout({unit, colors, onPress, onDismiss}) {
  const [page, setPage] = useState(0);

  const onScroll = useCallback((e) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / (CAROUSEL_W + 12));
    setPage(next);
  }, []);

  const renderItem = ({item}) => (
    <TouchableOpacity
      activeOpacity={item.actionUrl ? 0.9 : 1}
      onPress={() => item.actionUrl && onPress(item.actionUrl)}
      style={[s.slide, {backgroundColor: unit.bg || colors.surface, borderColor: colors.border}]}>
      {item.mediaUrl || item.iconUrl ? (
        <Image
          source={{uri: item.mediaUrl || item.iconUrl}}
          style={s.slideMedia}
          resizeMode="cover"
        />
      ) : (
        <View style={[s.slideMedia, s.bannerThumbEmpty, {backgroundColor: colors.primarySoft}]}>
          <Ionicons name="image-outline" size={32} color={colors.primary} />
        </View>
      )}
      {(!!item.title || !!item.message || !!item.buttons.length) && (
        <View style={s.slideBody}>
          {!!item.title && (
            <Text numberOfLines={1} style={[s.slideTitle, {color: item.titleColor || colors.text}]}>
              {item.title}
            </Text>
          )}
          {!!item.message && (
            <Text
              numberOfLines={2}
              style={[s.slideMsg, {color: item.messageColor || colors.textSecondary}]}>
              {item.message}
            </Text>
          )}
          <ActionButtons buttons={item.buttons} colors={colors} onPress={onPress} compact />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View>
      <FlatList
        data={unit.items}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_W + 12}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={s.carouselContent}
        ItemSeparatorComponent={() => <View style={{width: 12}} />}
      />
      {unit.items.length > 1 && (
        <View style={s.dots}>
          {unit.items.map((i, idx) => (
            <View
              key={i.key}
              style={[
                s.dot,
                {backgroundColor: idx === page ? colors.primary : colors.border},
                idx === page && s.dotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* One ✕ dismisses the whole unit, not just the visible slide */}
      <DismissButton onDismiss={onDismiss} style={s.dismissCarousel} />
    </View>
  );
}

export default function NativeDisplayUnit({unit, onDismiss}) {
  const {colors} = useTheme();
  const onPress = useUnitPress(unit?.unitId);
  useImpression(unit?.unitId);

  if (!unit) return null;

  // A custom-key-value-only campaign carries no renderable content — surface the
  // kv pairs so it's still obvious on screen that the campaign was delivered.
  if (!unit.items.length && Object.keys(unit.customKv).length) {
    return (
      <View style={[s.kvCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
        <Text style={[s.kvHeading, {color: colors.primary}]}>CUSTOM KEY-VALUE</Text>
        {Object.entries(unit.customKv).map(([k, v]) => (
          <Text key={k} style={[s.kvRow, {color: colors.text}]}>
            {k}: <Text style={{color: colors.textSecondary}}>{String(v)}</Text>
          </Text>
        ))}
      </View>
    );
  }

  if (!unit.items.length) return null;

  switch (unit.slot) {
    case SLOTS.CAROUSEL:
      return (
        <CarouselLayout unit={unit} colors={colors} onPress={onPress} onDismiss={onDismiss} />
      );
    case SLOTS.FULL:
      return <FullLayout unit={unit} colors={colors} onPress={onPress} onDismiss={onDismiss} />;
    case SLOTS.BOTTOM:
    case SLOTS.TOP:
    default:
      return (
        <BannerLayout unit={unit} colors={colors} onPress={onPress} onDismiss={onDismiss} />
      );
  }
}

const s = StyleSheet.create({
  // banner (top / bottom) — full width, borderless, sits in the content flow
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerThumb: {width: 56, height: 56, borderRadius: 10},
  bannerThumbEmpty: {alignItems: 'center', justifyContent: 'center'},
  bannerBody: {flex: 1},
  bannerTitle: {fontSize: 14, fontWeight: '700'},
  bannerMsg: {fontSize: 12, marginTop: 2, lineHeight: 16},

  // image-only banner (simple-image) — full-bleed, unframed
  imageBannerMedia: {width: '100%'},
  imageBannerBtns: {paddingHorizontal: 16, paddingVertical: 12},

  // dismiss ✕ — subtle by design; see DismissButton
  dismiss: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dismissOverlay: {position: 'absolute', top: 10, right: 10},
  dismissInline: {backgroundColor: 'rgba(255,255,255,0.12)'},
  dismissCarousel: {position: 'absolute', top: 10, right: 26},

  // full
  full: {flex: 1, borderRadius: 18, borderWidth: 1, overflow: 'hidden'},
  fullScroll: {paddingBottom: 24},
  fullMedia: {width: '100%', maxHeight: FULL_MEDIA_H * 2},
  fullBody: {padding: 20},
  fullTitle: {fontSize: 22, fontWeight: '800'},
  fullMsg: {fontSize: 14, marginTop: 10, lineHeight: 21},
  fullClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  // carousel
  carouselContent: {paddingHorizontal: 16},
  slide: {width: CAROUSEL_W, borderRadius: 16, borderWidth: 1, overflow: 'hidden'},
  slideMedia: {width: '100%', height: CAROUSEL_MEDIA_H},
  slideBody: {padding: 14},
  slideTitle: {fontSize: 15, fontWeight: '700'},
  slideMsg: {fontSize: 12, marginTop: 4, lineHeight: 17},
  dots: {flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12},
  dot: {width: 6, height: 6, borderRadius: 3},
  dotActive: {width: 18},

  // buttons
  btnRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16},
  btnRowCompact: {marginTop: 10, gap: 8},
  btn: {paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, alignItems: 'center'},
  btnCompact: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8},
  btnText: {fontSize: 14, fontWeight: '700'},
  btnTextCompact: {fontSize: 12},

  // custom key-value fallback
  kvCard: {marginHorizontal: 16, padding: 14, borderRadius: 14, borderWidth: 1},
  kvHeading: {fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8},
  kvRow: {fontSize: 13, fontWeight: '600', marginTop: 2},
});
