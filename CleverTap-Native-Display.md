# CleverTap Native Display — Integration Reference

Docs: https://developer.clevertap.com/docs/react-native-native-display

Drop-in reference for rendering CleverTap **Native Display** campaigns in a React Native app.
Unlike In-Apps, **CleverTap does NOT draw Native Display for you** — the SDK hands you a JSON
payload and your app owns the entire UI. This doc covers the logic, the files to copy, and the
wiring changes you need to make.

---

## 1. Required SDK

```
clevertap-react-native >= 0.5.0   (verified on 3.6.0)
```

No extra native setup beyond a working CleverTap SDK install (Account ID / Token in
`AndroidManifest.xml` + `Info.plist`). Native Display needs **no** new gradle deps, no
new pods, no manifest entries.

### SDK APIs used

| API | Purpose |
|-----|---------|
| `CleverTap.recordEvent(name, props)` | Fires the campaign's "When" trigger |
| `CleverTap.addListener(CleverTap.CleverTapDisplayUnitsLoaded, cb)` | Units delivered → `{displayUnits: [...]}` |
| `CleverTap.removeListener(CleverTap.CleverTapDisplayUnitsLoaded)` | Bulk remove (no per-handler remove exists) |
| `CleverTap.getAllDisplayUnits((err, res) => {})` | Read everything currently in the SDK cache |
| `CleverTap.getDisplayUnitForId(unitId, (err, res) => {})` | Read one unit by `wzrk_id` |
| `CleverTap.pushDisplayUnitViewedEventForID(unitId)` | Report impression (dashboard stats) |
| `CleverTap.pushDisplayUnitClickedEventForID(unitId)` | Report click (dashboard stats) |

---

## 2. How it works (end-to-end)

```
App fires event  ──►  CleverTap evaluates campaign server-side
                             │
                             ▼
              SDK receives Native Display payload
                             │
        ┌────────────────────┴────────────────────┐
        ▼                                         ▼
CleverTapDisplayUnitsLoaded listener      getAllDisplayUnits() (cache)
        │                                         │
        └────────────────────┬────────────────────┘
                             ▼
                 normalizeDisplayUnit(raw)
                  → flat, render-ready object
                             │
                             ▼
              slot resolution: top / full / bottom / carousel
                             │
                             ▼
                   YOUR component renders it
                             │
                             ▼
    pushDisplayUnitViewedEventForID / ...ClickedEventForID
```

---

## 3. Raw payload shape (as delivered by the SDK, both platforms)

```jsonc
{
  "wzrk_id": "1662_20260818",          // unit ID — used for viewed/clicked events
  "ti": 1662,                          // campaign (target) ID
  "bg": "#ffffff",                     // unit background
  "type": "simple" | "message-with-icon" | "carousel" | "carousel-image" | "custom-key-value",
  "custom_kv": { "position": "Top" },  // free-form key-values from the dashboard
  "content": [                         // ⚠ ROOT level on the wire (see gotcha #1)
    {
      "title":   { "text": "...", "color": "#000000" },
      "message": { "text": "...", "color": "#000000" },
      "icon":    { "url": "...", "content_type": "image/png" },
      "media":   { "url": "...", "content_type": "image/jpeg" },
      "action": {
        "hasUrl": true, "hasLinks": true,
        "url":   { "android": { "text": "app://..." }, "ios": { "text": "..." } },
        "links": [
          { "text": "Shop", "color": "#fff", "bg": "#000", "kv": {},
            "action": { "url": { "android": { "text": "..." } } } }
        ]
      }
    }
  ],
  "message": { "type": "carousel", "orientation": "l" | "p", "content": [ ... ] }
}
```

### Normalized shape produced by `normalizeDisplayUnit()`

```js
{
  unitId,        // raw.wzrk_id — pass this to viewed/clicked
  key,           // stable React key (unitId, else ti-<id>, else slot-count)
  campaignId,    // raw.ti
  type,          // 'simple' | 'carousel' | 'custom-key-value' | ...
  slot,          // 'top' | 'full' | 'bottom' | 'carousel'
  bg, orientation, customKv,
  items: [{
    key, title, titleColor, message, messageColor,
    iconUrl, mediaUrl,
    imageOnly,   // true when title+message empty but an image exists
    actionUrl,   // platform-correct deep link
    buttons: [{ key, text, color, bg, url, kv }],
  }],
  raw,           // original payload, kept for debugging
}
```

---

## 4. Slot resolution logic

The dashboard decides *where* the unit goes; the app just honours it. Resolution order:

1. **`custom_kv` hint** — first match among
   `position`, `layout`, `placement`, `slot`, `template`, `nd_position`, `display_position`.
   Then, as a last resort, **every** `custom_kv` value is scanned.
2. **Unit type** — `carousel` / `carousel-image`, or more than one `content` item → `carousel`.
3. **Caller fallback** — the property value of the event you just fired (`slotHint`).
4. **Default** — `top`.

Matching is case-insensitive after trimming. Exact match wins (`"Top"` → `top`); otherwise a
loose substring pass runs in this order (order matters, so `"bottom_carousel"` → `carousel`):

| Contains | → slot |
|----------|--------|
| `carousel`, `slider`, `swipe` | `carousel` |
| `full`, `interstitial`, `cover` | `full` |
| `bottom`, `footer` | `bottom` |
| `top`, `header`, `banner` | `top` |

---

## 5. Files to copy

Copy these four files as-is; they have no app-specific logic except the theme import (see §7).

| File | Lines | What it does | Required? |
|------|-------|--------------|-----------|
| `src/services/NativeDisplayService.js` | ~300 | SDK wrapper + payload normalization + slot resolution | **Yes** |
| `src/hooks/useNativeDisplay.js` | ~175 | Listener lifecycle, dedupe, `bySlot` bucketing, `fireEvent` / `refresh` / `dismiss` / `clear` | **Yes** |
| `src/components/nativedisplay/NativeDisplayUnit.js` | ~470 | The actual UI — one layout per slot | Yes (or write your own) |
| `src/screens/NativeDisplayScreen.js` | ~415 | Test harness: trigger panel + slot regions + raw-payload viewer | Optional (dev tool) |
| `src/components/nativedisplay/DummyStorefront.js` | ~300 | Inert filler storefront so units are judged against realistic surroundings | Optional (dev tool) |

**Minimum viable copy:** `NativeDisplayService.js` + `useNativeDisplay.js`, then render
`unit.items` however you like.

---

## 6. Changes to make in your codebase

### 6.1 Install (if not already)

```bash
npm install clevertap-react-native
cd ios && pod install
```

### 6.2 Add the screen to your navigator (only if you copy the test screen)

```diff
  // src/navigation/HomeStack.js
  import HomeScreen from '../screens/Home/HomeScreen';
+ import NativeDisplayScreen from '../screens/NativeDisplayScreen';

  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
+   <Stack.Screen name="NativeDisplay" component={NativeDisplayScreen} />
  </Stack.Navigator>
```

### 6.3 Add a drawer/menu entry to reach it

```diff
  // src/components/CustomDrawerContent.js
+ // Navigates to a screen nested inside HomeStack (which lives under the Home tab)
+ const goToHomeStackScreen = screen => {
+   navigation.closeDrawer();
+   navigation.navigate('MainTabs', {screen: 'Home', params: {screen}});
+ };

+ <DrawerItem
+   label="Native Display"
+   icon={({size}) => <Ionicons name="tv-outline" size={size} color={colors.primary} />}
+   onPress={() => goToHomeStackScreen('NativeDisplay')} />
```

### 6.4 No native changes required

Native Display works with a stock CleverTap install. Nothing to add in
`build.gradle`, `AndroidManifest.xml`, `Podfile`, or `AppDelegate`.

---

## 7. Dependencies to swap out for your app

`NativeDisplayUnit.js` and `NativeDisplayScreen.js` use this app's conventions. Replace or keep:

| Import | Used for | If you don't have it |
|--------|----------|----------------------|
| `useTheme()` from `src/context/ThemeContext` | `colors.primary / surface / text / textSecondary / border / ctaText / primarySoft` | Replace with a plain constant object of the same keys |
| `react-native-vector-icons/Ionicons` | Close ✕, placeholder glyphs | Swap for your icon set or plain `<Text>×</Text>` |
| `react-native-safe-area-context` | `useSafeAreaInsets()` in the screen | Only used by the optional test screen |

The service and the hook import **nothing** app-specific — just `react-native` and
`clevertap-react-native`.

---

## 8. Minimal usage (skip the test screen entirely)

```jsx
import React from 'react';
import {Text, Image, ScrollView, TouchableOpacity, Linking} from 'react-native';
import useNativeDisplay from './src/hooks/useNativeDisplay';
import {SLOTS, recordUnitViewed, recordUnitClicked} from './src/services/NativeDisplayService';

export default function HomeScreen() {
  const {bySlot, fireEvent} = useNativeDisplay();

  // Fire the campaign trigger once on mount (name + props must match the
  // campaign's "When" condition on the dashboard — property match is case-sensitive)
  React.useEffect(() => {
    fireEvent('Native Display', {layout: 'Top'}, 'Top');
  }, [fireEvent]);

  return (
    <ScrollView>
      {bySlot[SLOTS.TOP].map(u => <Banner key={u.key} unit={u} />)}
      {/* ...your page content... */}
      {bySlot[SLOTS.BOTTOM].map(u => <Banner key={u.key} unit={u} />)}
    </ScrollView>
  );
}

function Banner({unit}) {
  const item = unit.items[0];

  // Impression — fire once per unit id (hook must run before any early return)
  React.useEffect(() => { recordUnitViewed(unit.unitId); }, [unit.unitId]);

  if (!item) return null;

  const onPress = () => {
    recordUnitClicked(unit.unitId);            // click stat
    if (item.actionUrl) Linking.openURL(item.actionUrl);
  };

  return (
    <TouchableOpacity onPress={onPress}>
      {!!item.mediaUrl && <Image source={{uri: item.mediaUrl}} style={{width: '100%', height: 160}} />}
      <Text>{item.title}</Text>
      <Text>{item.message}</Text>
      {item.buttons.map(b => (
        <TouchableOpacity key={b.key} onPress={() => { recordUnitClicked(unit.unitId); b.url && Linking.openURL(b.url); }}>
          <Text style={{color: b.color, backgroundColor: b.bg}}>{b.text}</Text>
        </TouchableOpacity>
      ))}
    </TouchableOpacity>
  );
}
```

### Hook API

```js
const {
  units,      // flat array of visible (non-dismissed) normalized units
  bySlot,     // {top: [], full: [], bottom: [], carousel: []} — always fully populated
  lastEvent,  // {name, props} of the last fired trigger
  loading,    // true between fireEvent() and the follow-up poll settling
  fireEvent,  // (name, props?, slotHint?) => void — records the trigger, clears the page
  refresh,    // () => Promise — re-reads authoritative units from the SDK
  dismiss,    // (unitId) => void — hides locally, SDK cache untouched
  clear,      // () => void — blanks everything on screen
} = useNativeDisplay();
```

---

## 9. Dashboard setup

1. Create a **Native Display** campaign.
2. **When** → event based, e.g. event `Native Display` with property `layout` equals `Top`.
   Property matching on the dashboard is **case-sensitive** — match your `fireEvent` props exactly.
3. **Custom Key-Value** section → add the position hint (this is the authoritative source):

   ```
   position = Top | Bottom | Full | Carousel
   ```

4. Publish. Fire the event from the app; the unit arrives over
   `CleverTapDisplayUnitsLoaded` and renders into the matching region.

| Template on dashboard | `type` on the wire | Typical slot |
|---|---|---|
| Simple / Simple with image | `simple` | `top` / `bottom` |
| Message with icon | `message-with-icon` | `top` / `bottom` |
| Carousel / Image carousel | `carousel` / `carousel-image` | `carousel` |
| Custom key-value only | `custom-key-value` | no renderable content — read `unit.customKv` |

---

## 10. Gotchas (each one cost a debugging session)

1. **`content` sits at the ROOT of the payload**, not under `message`, on current SDK builds.
   Accept both: `raw.content ?? raw.message?.content ?? []`.
2. **The SDK clears and replaces its cache on every response** ("Cleared Display Units Cache").
   Do NOT accumulate units across batches in JS or campaigns from earlier triggers will linger
   on screen. De-dupe *within* a batch only.
3. **An empty batch means "cache cleared"**, not "no campaign". Ignore empty listener payloads
   instead of wiping units that just arrived.
4. **`removeListener` is bulk-only** — the RN SDK removes all handlers for an event name; there
   is no per-handler removal. Register the listener once, on mount.
5. **Impressions must fire once per unit id.** Guard with a ref; a re-render must not re-report.
6. **Never hardcode 16:9 for creatives.** Campaign artwork comes in whatever ratio the author
   uploaded — use `Image.getSize()` to resolve the natural aspect ratio or you silently crop it.
7. **Ignore `unit.bg` on full-bleed image creatives.** Campaigns commonly ship `#ffffff`, which
   paints a white slab across a dark app.
8. **Re-firing must un-dismiss.** A re-delivered unit keeps its old `unitId` and would stay
   filtered out, making dismiss look permanently broken.
9. **Guard against stale polls.** Bump a generation counter per `fireEvent` so a late
   `getAllDisplayUnits()` from an earlier trigger cannot overwrite the current one's results.
10. **Deep links are per-platform**: `action.url.android.text` vs `action.url.ios.text`.
    Read the platform's key and fall back to the other one.

---

## 11. UX notes (what makes a unit read as "native" and not an ad)

- Keep `top` / `bottom` / `carousel` **inside the scroll flow**, not pinned. A banner that holds
  position while content moves under it reads as chrome, i.e. an in-app overlay.
- Render image-only creatives **full-bleed** — no margin, radius, border or card background.
  Anything framing the creative makes it look like an overlay.
- `full` is the one intentional overlay — an interstitial is what that slot means.
- Keep the dismiss ✕ small and low-contrast, with a generous `hitSlop`. A big bright ✕ is
  exactly what makes a unit read as an ad.
- A slot with no unit must render nothing and occupy zero height.

---

## 12. Events this produces (Dashboard)

| Event | Source |
|-------|--------|
| your trigger event (e.g. `Native Display`) | `CleverTap.recordEvent` in `fireEvent` |
| `Display Unit Viewed` | SDK-internal, via `pushDisplayUnitViewedEventForID` |
| `Display Unit Clicked` | SDK-internal, via `pushDisplayUnitClickedEventForID` |
