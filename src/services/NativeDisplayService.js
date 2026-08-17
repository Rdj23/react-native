/**
 * NativeDisplayService — wrapper around the CleverTap Native Display API
 * (Dashboard 1 / primary instance, i.e. the default `clevertap-react-native` import).
 *
 * ─── HOW NATIVE DISPLAY WORKS ────────────────────────────────────────────────
 *  1. App fires an event (optionally with properties) that matches the "When"
 *     trigger of a Native Display campaign on the dashboard.
 *  2. CleverTap evaluates the campaign server-side and pushes the display unit
 *     payload down to the SDK.
 *  3. The SDK notifies JS through the `CleverTapDisplayUnitsLoaded` listener,
 *     and the units also stay available via getAllDisplayUnits().
 *  4. The app decides *where and how* to render them — unlike In-Apps, CleverTap
 *     does NOT draw Native Display for you. That rendering lives in
 *     src/components/nativedisplay/NativeDisplayUnit.js.
 *  5. App reports impressions/clicks back with pushDisplayUnitViewedEventForID /
 *     pushDisplayUnitClickedEventForID so campaign stats populate.
 *
 * ─── RAW PAYLOAD SHAPE (as delivered by the SDK, both platforms) ─────────────
 *  {
 *    "wzrk_id": "1662_20260818",          // unit ID — used for viewed/clicked events
 *    "ti": 1662,                          // campaign (target) ID
 *    "bg": "#ffffff",                     // unit background
 *    "type": "simple" | "message-with-icon" | "carousel" | "carousel-image"
 *            | "custom-key-value",
 *    "custom_kv": { "position": "top" },  // free-form key-values from the dashboard
 *    "message": {
 *      "type": "carousel",
 *      "orientation": "l" | "p",
 *      "content": [
 *        {
 *          "title":   { "text": "...", "color": "#000000" },
 *          "message": { "text": "...", "color": "#000000" },
 *          "icon":    { "url": "...", "content_type": "image/png" },
 *          "media":   { "url": "...", "content_type": "image/jpeg" },
 *          "action":  {
 *            "hasUrl": true, "hasLinks": true,
 *            "url":   { "android": { "text": "app://..." }, "ios": { "text": "..." } },
 *            "links": [ { "text": "Shop", "color": "#fff", "bg": "#000",
 *                         "kv": {}, "action": { "url": { ... } } } ]
 *          }
 *        }
 *      ]
 *    }
 *  }
 *
 * ─── SLOT RESOLUTION (top / full / bottom / carousel) ────────────────────────
 *  The dashboard decides the slot, the app just honours it. We look for a hint
 *  in this order:
 *    1. custom_kv — any of: position, layout, placement, slot, template, nd_position
 *    2. the unit's own type — carousel / carousel-image, or >1 content item
 *    3. caller-supplied fallback (e.g. the property value of the event just fired)
 *    4. 'top'
 */
import {Platform} from 'react-native';
import CleverTap from 'clevertap-react-native';

/** The four slots this app knows how to render. */
export const SLOTS = {
  TOP: 'top',
  FULL: 'full',
  BOTTOM: 'bottom',
  CAROUSEL: 'carousel',
};

/**
 * custom_kv keys that may carry the slot hint, in priority order.
 * `position` is what the campaigns in this app actually use:
 *     position = Top | Bottom | Full | Carousel
 */
const SLOT_KV_KEYS = [
  'position',
  'layout',
  'placement',
  'slot',
  'template',
  'nd_position',
  'display_position',
];

/**
 * Exact values the dashboard sends, compared case-insensitively after trimming.
 * The dashboard values are title-cased ("Top", "Carousel"); this map is the
 * primary lookup and the substring pass below is only a tolerance for variants.
 */
const EXACT_SLOTS = {
  top: SLOTS.TOP,
  full: SLOTS.FULL,
  bottom: SLOTS.BOTTOM,
  carousel: SLOTS.CAROUSEL,
};

/**
 * Maps a dashboard value to a known slot.
 * Exact match first ("Top" → top), then a loose substring pass so variants like
 * "FULL_SCREEN" or "bottom-banner" still land somewhere sensible. In the loose
 * pass order matters: 'carousel' before 'full' before 'bottom' before 'top', so
 * a value like "bottom_carousel" resolves to carousel rather than bottom.
 */
const matchSlot = (value) => {
  if (value === null || value === undefined) return null;
  const v = String(value).trim().toLowerCase();
  if (!v) return null;

  if (EXACT_SLOTS[v]) return EXACT_SLOTS[v];

  if (v.includes('carousel') || v.includes('slider') || v.includes('swipe')) return SLOTS.CAROUSEL;
  if (v.includes('full') || v.includes('interstitial') || v.includes('cover')) return SLOTS.FULL;
  if (v.includes('bottom') || v.includes('footer')) return SLOTS.BOTTOM;
  if (v.includes('top') || v.includes('header') || v.includes('banner')) return SLOTS.TOP;
  return null;
};

/** Picks the platform-appropriate deep link out of an `action.url` block. */
const readActionUrl = (action) => {
  if (!action) return null;
  const url = action.url;
  if (!url) return null;
  const platformUrl = Platform.OS === 'ios' ? url.ios : url.android;
  return platformUrl?.text || url.android?.text || url.ios?.text || null;
};

/** Flattens one `content[i]` entry into something a view can consume. */
const normalizeItem = (raw, index) => {
  const action = raw?.action;
  const title = raw?.title?.text || '';
  const message = raw?.message?.text || '';
  const mediaUrl = raw?.media?.url || null;
  const iconUrl = raw?.icon?.url || null;

  return {
    key: `item-${index}`,
    title,
    titleColor: raw?.title?.color || null,
    message,
    messageColor: raw?.message?.color || null,
    iconUrl,
    mediaUrl,
    // simple-image campaigns ship empty title/message strings and rely entirely
    // on the creative — those need an image-forward layout, not a thumbnail+text row.
    imageOnly: !title && !message && !!(mediaUrl || iconUrl),
    actionUrl: readActionUrl(action),
    buttons: Array.isArray(action?.links)
      ? action.links.map((link, i) => ({
          key: `btn-${index}-${i}`,
          text: link?.text || '',
          color: link?.color || null,
          bg: link?.bg || null,
          url: readActionUrl(link?.action) || readActionUrl(link),
          kv: link?.kv || null,
        }))
      : [],
  };
};

/**
 * Turns a raw display unit payload into a flat, render-ready object.
 *
 * @param {object} raw           the display unit JSON straight from the SDK
 * @param {string} [slotHint]    fallback slot when the payload carries no kv hint
 *                               (we pass the last-fired event property value here)
 * @returns {object|null}
 */
export const normalizeDisplayUnit = (raw, slotHint) => {
  if (!raw || typeof raw !== 'object') return null;

  const customKv = raw.custom_kv || raw.customKv || {};

  // `content` sits at the ROOT of the unit on the wire (verified against a live
  // simple-image campaign). Older/other SDK builds nest it under `message`, so
  // accept both rather than betting on one.
  const content = Array.isArray(raw.content)
    ? raw.content
    : Array.isArray(raw.message?.content)
    ? raw.message.content
    : [];

  const items = content.map(normalizeItem);
  const type = raw.type || raw.message?.type || null;

  // 1. explicit dashboard hint in custom_kv — `position` wins
  let slot = null;
  let slotSource = null;
  for (const key of SLOT_KV_KEYS) {
    slot = matchSlot(customKv[key]);
    if (slot) {
      slotSource = `custom_kv.${key}=${customKv[key]}`;
      break;
    }
  }
  // custom_kv may also use non-standard keys — scan every value as a last resort
  if (!slot) {
    for (const [key, value] of Object.entries(customKv)) {
      slot = matchSlot(value);
      if (slot) {
        slotSource = `custom_kv.${key}=${value}`;
        break;
      }
    }
  }
  // 2. infer from the unit's own template type
  if (!slot && (matchSlot(type) === SLOTS.CAROUSEL || items.length > 1)) {
    slot = SLOTS.CAROUSEL;
    slotSource = `type=${type} items=${items.length}`;
  }
  // 3. caller fallback (property value of the event just fired)
  if (!slot && matchSlot(slotHint)) {
    slot = matchSlot(slotHint);
    slotSource = `eventProperty=${slotHint}`;
  }
  // 4. default
  if (!slot) {
    slot = SLOTS.TOP;
    slotSource = 'default';
  }

  console.log(
    `[NativeDisplay] unit ${raw.wzrk_id} → slot "${slot}" (via ${slotSource}), ` +
      `${items.length} item(s), type=${type}`,
  );

  const unitId = raw.wzrk_id || raw.wzrkId || null;

  return {
    unitId,
    // Stable React key — wzrk_id is always present in practice, but a campaign
    // preview/test payload can arrive without one.
    key: unitId || (raw.ti != null ? `ti-${raw.ti}` : `${slot}-${items.length}`),
    campaignId: raw.ti ?? null,
    type,
    slot,
    bg: raw.bg || raw.message?.bg || null,
    orientation: raw.message?.orientation || null,
    customKv,
    items,
    raw,
  };
};

/** Fetches every display unit currently held by the SDK. */
export const getAllDisplayUnits = () =>
  new Promise((resolve) => {
    try {
      CleverTap.getAllDisplayUnits((err, res) => {
        if (err) console.warn('[NativeDisplay] getAllDisplayUnits error:', err);
        resolve(Array.isArray(res) ? res : []);
      });
    } catch (e) {
      console.warn('[NativeDisplay] getAllDisplayUnits threw:', e);
      resolve([]);
    }
  });

/** Fetches a single unit by its wzrk_id. */
export const getDisplayUnitForId = (unitId) =>
  new Promise((resolve) => {
    try {
      CleverTap.getDisplayUnitForId(unitId, (err, res) => {
        if (err) console.warn('[NativeDisplay] getDisplayUnitForId error:', err);
        resolve(res || null);
      });
    } catch (e) {
      console.warn('[NativeDisplay] getDisplayUnitForId threw:', e);
      resolve(null);
    }
  });

/**
 * Subscribes to the SDK's display-units-loaded callback.
 * Payload is `{ displayUnits: [ {...}, {...} ] }` on both platforms.
 *
 * @param {function(Array<object>): void} callback
 * @returns {function(): void} unsubscribe
 */
export const addDisplayUnitsListener = (callback) => {
  CleverTap.addListener(CleverTap.CleverTapDisplayUnitsLoaded, (event) => {
    const units = Array.isArray(event?.displayUnits)
      ? event.displayUnits
      : Array.isArray(event)
      ? event
      : [];
    callback(units);
  });
  // The RN SDK only exposes a bulk remover for a given event name.
  return () => CleverTap.removeListener(CleverTap.CleverTapDisplayUnitsLoaded);
};

/** Reports an impression so campaign stats populate on the dashboard. */
export const recordUnitViewed = (unitId) => {
  if (!unitId) return;
  CleverTap.pushDisplayUnitViewedEventForID(unitId);
};

/** Reports a click/tap on the unit. */
export const recordUnitClicked = (unitId) => {
  if (!unitId) return;
  CleverTap.pushDisplayUnitClickedEventForID(unitId);
};
