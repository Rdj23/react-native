/**
 * useNativeDisplay — subscribes to CleverTap Native Display and hands back
 * normalized units already bucketed by slot (top / full / bottom / carousel).
 *
 * Flow:
 *   mount        → arm CleverTapDisplayUnitsLoaded listener + pull whatever the
 *                  SDK already has cached via getAllDisplayUnits()
 *   fireEvent()  → records the trigger event on Dashboard 1 and remembers the
 *                  property value as a slot fallback (used only when the campaign
 *                  payload itself carries no position hint in custom_kv)
 *   listener     → merges newly delivered units in by unitId, so units received
 *                  from separate triggers can coexist on screen
 *   refresh()    → re-reads the authoritative set from the SDK (replaces state)
 *
 * Returned `bySlot` is always fully populated: {top: [], full: [], bottom: [], carousel: []}
 */
import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import CleverTap from 'clevertap-react-native';

import {
  SLOTS,
  normalizeDisplayUnit,
  getAllDisplayUnits,
  addDisplayUnitsListener,
} from '../services/NativeDisplayService';

/**
 * De-dupes one batch by unitId.
 *
 * Note we de-dupe *within* a batch and never merge across batches: the SDK
 * clears and replaces its display-unit cache on every response ("Cleared Display
 * Units Cache"), so accumulating in JS would leave campaigns from earlier
 * triggers on screen alongside the current one.
 */
const dedupe = (units) => {
  const byId = new Map();
  units.forEach((u) => byId.set(u.unitId || JSON.stringify(u.raw), u));
  return Array.from(byId.values());
};

export default function useNativeDisplay() {
  const [units, setUnits] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [lastEvent, setLastEvent] = useState(null);
  const [loading, setLoading] = useState(false);

  // Slot fallback taken from the most recently fired event property. Held in a
  // ref because the SDK listener closure is registered once, on mount.
  const slotHintRef = useRef(null);
  const mountedRef = useRef(true);
  // Bumped per fire so a late poll from an earlier trigger can't overwrite the
  // current one's results.
  const fireGenRef = useRef(0);

  const normalizeAll = useCallback(
    (raws) => raws.map((r) => normalizeDisplayUnit(r, slotHintRef.current)).filter(Boolean),
    [],
  );

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribe = addDisplayUnitsListener((raws) => {
      if (!mountedRef.current) return;
      console.log('[NativeDisplay] displayUnitsLoaded:', JSON.stringify(raws));
      const fresh = normalizeAll(raws);
      // An empty batch means "cache cleared"; the fire already blanked the page,
      // so ignore it rather than wiping a set that just arrived.
      if (!fresh.length) return;
      setUnits(dedupe(fresh));
    });

    // Units delivered before this screen mounted are still held by the SDK.
    getAllDisplayUnits().then((raws) => {
      if (!mountedRef.current || !raws.length) return;
      console.log('[NativeDisplay] getAllDisplayUnits (initial):', JSON.stringify(raws));
      setUnits(dedupe(normalizeAll(raws)));
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [normalizeAll]);

  /**
   * Fires the campaign trigger event on Dashboard 1.
   *
   * @param {string} name       event name, must match the campaign's "When" trigger
   * @param {object} [props]    event properties (e.g. {layout: 'carousel'})
   * @param {string} [slotHint] value used as a slot fallback if custom_kv has none
   */
  const fireEvent = useCallback((name, props, slotHint) => {
    const eventName = (name || '').trim();
    if (!eventName) return;

    slotHintRef.current = slotHint || null;
    const gen = ++fireGenRef.current;

    // Clean slate per trigger, so only the campaign this event resolves to shows.
    setUnits([]);
    // Re-firing must also un-dismiss: a re-delivered unit keeps its old unitId
    // and would stay filtered out, making dismiss look permanently broken.
    setDismissed(new Set());

    if (props && Object.keys(props).length) {
      CleverTap.recordEvent(eventName, props);
    } else {
      CleverTap.recordEvent(eventName);
    }
    console.log('[NativeDisplay] fired event:', eventName, props);
    setLastEvent({name: eventName, props: props || {}});

    // The campaign payload arrives asynchronously over the listener; poll the
    // SDK once shortly after in case the units were already cached locally.
    setLoading(true);
    setTimeout(() => {
      getAllDisplayUnits()
        .then((raws) => {
          // Ignore if a newer trigger has since fired, and don't clobber units the
          // listener already delivered for this one.
          if (!mountedRef.current || gen !== fireGenRef.current || !raws.length) return;
          setUnits((prev) => (prev.length ? prev : dedupe(normalizeAll(raws))));
        })
        .finally(() => {
          if (mountedRef.current && gen === fireGenRef.current) setLoading(false);
        });
    }, 1200);
  }, [normalizeAll]);

  /** Re-reads the authoritative unit list from the SDK, replacing local state. */
  const refresh = useCallback(() => {
    setLoading(true);
    return getAllDisplayUnits()
      .then((raws) => {
        if (!mountedRef.current) return;
        console.log('[NativeDisplay] getAllDisplayUnits (refresh):', JSON.stringify(raws));
        setUnits(dedupe(normalizeAll(raws)));
      })
      .finally(() => mountedRef.current && setLoading(false));
  }, [normalizeAll]);

  /** Hides a unit locally (does not affect the SDK's cache). */
  const dismiss = useCallback((unitId) => {
    setDismissed((prev) => new Set(prev).add(unitId));
  }, []);

  /** Clears everything on screen so the next trigger starts from a clean slate. */
  const clear = useCallback(() => {
    setUnits([]);
    setDismissed(new Set());
    setLastEvent(null);
  }, []);

  const visible = useMemo(
    () => units.filter((u) => !dismissed.has(u.unitId)),
    [units, dismissed],
  );

  const bySlot = useMemo(() => {
    const grouped = {
      [SLOTS.TOP]: [],
      [SLOTS.FULL]: [],
      [SLOTS.BOTTOM]: [],
      [SLOTS.CAROUSEL]: [],
    };
    visible.forEach((u) => {
      (grouped[u.slot] || grouped[SLOTS.TOP]).push(u);
    });
    return grouped;
  }, [visible]);

  return {units: visible, bySlot, lastEvent, loading, fireEvent, refresh, dismiss, clear};
}
