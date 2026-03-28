/**
 * InboxService — CleverTap App Inbox SDK wrapper (Dashboard 1).
 *
 * ─── WHAT THIS FILE DOES ─────────────────────────────────────────────────────
 *  Thin wrapper around the `clevertap-react-native` Inbox API so the rest of
 *  the app never imports CleverTap directly for inbox operations.
 *  All calls go to Dashboard 1 (primary instance).
 *
 * ─── FUNCTION OVERVIEW ───────────────────────────────────────────────────────
 *  initialize()          → CleverTap.initializeInbox()
 *                          Must be called once at app start (App.js) before
 *                          any fetch is attempted.
 *
 *  fetchAll(callback)    → Returns all inbox messages (read + unread).
 *                          Raw payload is normalized via normalizeMessage()
 *                          before being handed to the caller.
 *
 *  fetchUnread(callback) → Returns only unread messages.
 *
 *  getTotalCount(cb)     → Integer count of all messages.
 *  getUnreadCount(cb)    → Integer count of unread messages.
 *
 *  markRead(id)          → Marks a single message as read by its ID.
 *  markReadBatch(ids)    → Marks multiple messages as read at once.
 *
 *  deleteMessage(id)     → Deletes a single message.
 *  deleteBatch(ids)      → Deletes multiple messages at once.
 *
 *  trackClick(id)        → Fires a 'Notification Clicked' analytics event.
 *  trackView(id)         → Fires a 'Notification Viewed' analytics event.
 *
 *  dismissNativeInbox()  → Dismisses the native (non-custom) inbox UI if shown.
 *
 *  addListener(evt, fn)  → Subscribes to inbox lifecycle events.
 *                          Available event keys are in the EVENTS constant below.
 *
 * ─── EVENTS CONSTANT ─────────────────────────────────────────────────────────
 *  INITIALIZED      → inbox SDK is ready; safe to fetch messages
 *  UPDATED          → server pushed new messages; refetch to sync UI
 *  MESSAGE_TAPPED   → user tapped a message card
 *  BUTTON_TAPPED    → user tapped a CTA button inside a message
 *
 * ─── normalizeMessage(raw) ───────────────────────────────────────────────────
 *  The CleverTap SDK returns raw inbox payloads with inconsistent shapes across
 *  Android / iOS and message types (simple / image / carousel).
 *  normalizeMessage() converts any raw payload into a stable shape:
 *    { id, title, body, mediaUrl, mediaType, iconUrl, isRead,
 *      date, tags, type, actionUrl, buttons }
 *  This is the only shape the rest of the app (useInbox, InboxItemCard, etc.)
 *  ever works with.
 */
import {Platform} from 'react-native';
import CleverTap from 'clevertap-react-native';

export function initialize() { CleverTap.initializeInbox(); }

export function fetchAll(callback) {
  CleverTap.getAllInboxMessages((err, raw) => {
    if (err) { callback([]); return; }
    const list = safeParse(raw);
    // Debug log to see the actual payload shape
    if (__DEV__ && list.length > 0) {
      console.log('=== INBOX RAW [0] ===');
      console.log(JSON.stringify(list[0], null, 2));
    }
    callback(list);
  });
}

export function fetchUnread(callback) {
  CleverTap.getUnreadInboxMessages((err, raw) => {
    callback(err ? [] : safeParse(raw));
  });
}

export function getTotalCount(cb) { CleverTap.getInboxMessageCount((e, c) => cb(e ? 0 : c)); }
export function getUnreadCount(cb) { CleverTap.getInboxMessageUnreadCount((e, c) => cb(e ? 0 : c)); }
export function markRead(id) { CleverTap.markReadInboxMessageForId(id); }
export function markReadBatch(ids) { CleverTap.markReadInboxMessagesForIDs(ids); }
export function deleteMessage(id) { CleverTap.deleteInboxMessageForId(id); }
export function deleteBatch(ids) { CleverTap.deleteInboxMessagesForIDs(ids); }
export function trackClick(id) { CleverTap.pushInboxNotificationClickedEventForId(id); }
export function trackView(id) { CleverTap.pushInboxNotificationViewedEventForId(id); }
export function dismissNativeInbox() { CleverTap.dismissInbox(); }

export const EVENTS = {
  INITIALIZED: CleverTap.CleverTapInboxDidInitialize,
  UPDATED: CleverTap.CleverTapInboxMessagesDidUpdate,
  MESSAGE_TAPPED: CleverTap.CleverTapInboxMessageTapped,
  BUTTON_TAPPED: CleverTap.CleverTapInboxMessageButtonTapped,
};

export function addListener(event, handler) {
  return CleverTap.addListener(event, handler);
}

// ─── Internal helpers ────────────────────────────────────────────────────────

// Safely parses the raw response from the CleverTap SDK.
// The SDK returns messages as a JSON string on some platforms and as a plain
// array on others — this normalizes both cases to an array.
function safeParse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try { return JSON.parse(data) || []; } catch (e) { return []; }
  }
  return [];
}

// Extracts a plain string from a value that might be:
//   "hello"          → "hello"
//   { text: "hello"} → "hello"
//   null/undefined   → ""
// Used extensively in normalizeMessage() because CleverTap wraps text fields
// in objects ({ text: "..." }) on Android but sends raw strings on iOS.
function str(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v.text) return String(v.text);
  if (v.Text) return String(v.Text);
  return '';
}

/**
 * normalizeMessage — converts a raw CleverTap inbox payload to a stable shape.
 *
 * Raw CleverTap SDK structure (Android example):
 * {
 *   id: "xxx",
 *   date: 1234567890,
 *   isRead: false,
 *   tags: ["promo"],
 *   msg: {
 *     type: "simple"|"image"|"carousel",
 *     content: [{
 *       title:   { text: "Title here" },
 *       message: { text: "Body here" },
 *       media:   { content_type: "image/jpeg", url: "https://..." },
 *       icon:    { url: "https://..." },
 *       action:  { url: { android: { text: "deeplink" } }, links: [...] }
 *     }]
 *   },
 *   wzrk_id: "xxx"
 * }
 *
 * Output shape (what useInbox and UI components consume):
 * {
 *   id, title, body, mediaUrl, mediaType, iconUrl,
 *   isRead, date, tags, type, actionUrl, buttons[]
 * }
 */
export function normalizeMessage(raw) {
  if (!raw) return null;

  const id = raw.id || raw._id || raw.messageId || '';
  if (!id) return null;

  // The actual message payload lives under `msg`
  const msgObj = raw.msg || {};
  const contentArr = msgObj.content || raw.content || [];
  const c = Array.isArray(contentArr) && contentArr.length > 0 ? contentArr[0] : {};

  // Extract fields using str() to handle {text: "..."} objects
  const title = str(c.title) || str(c.message?.title) || str(raw.title) || '';
  let body = str(c.message) || str(c.body) || str(c.description) || str(raw.body) || '';

  // If body equals title, don't duplicate
  if (body === title) body = '';

  // Media
  const mediaObj = c.media || {};
  const mediaUrl = mediaObj.url || mediaObj.content_url || '';
  const mediaType = mediaObj.content_type || '';

  // Icon
  const iconUrl = c.icon?.url || '';

  // Action / deep link — try every known path
  const action = c.action || {};

  // Log action object in dev to debug deep link structure
  if (__DEV__ && Object.keys(action).length > 0) {
    console.log('[InboxService] action object:', JSON.stringify(action));
  }

  // Deep link URL extraction — CleverTap nests it differently per platform
  // and message type, so we try every known path before falling back to ''.
  const actionUrl =
    // Direct string
    (typeof action === 'string' ? action : '') ||
    // Nested url object with platform keys
    action.url?.android?.text ||
    action.url?.ios?.text ||
    action.url?.text ||
    // Direct url string
    (typeof action.url === 'string' ? action.url : '') ||
    // Sometimes deep link is under action.android or action.ios directly
    (typeof action.android === 'string' ? action.android : '') ||
    action.android?.text ||
    (typeof action.ios === 'string' ? action.ios : '') ||
    action.ios?.text ||
    // Fallback: first link in links array
    (() => {
      const firstLink = (action.links || [])[0];
      if (!firstLink) return '';
      return typeof firstLink.url === 'string' ? firstLink.url
        : (firstLink.url?.android?.text || firstLink.url?.ios?.text || firstLink.url?.text || '');
    })() ||
    '';

  // CTA buttons — each link in action.links becomes a button object
  const links = action.links || [];
  const buttons = (Array.isArray(links) ? links : []).map(l => ({
    text: str(l.text) || str(l.label) || 'Open',
    url: typeof l.url === 'string' ? l.url
      : (l.url?.android?.text || l.url?.ios?.text || l.url?.text || typeof l.url === 'object' ? '' : ''),
    kv: l.kv || {},
  }));

  return {
    id,
    title,
    body,
    mediaUrl,
    mediaType,
    iconUrl,
    isRead: !!raw.isRead,
    date: typeof raw.date === 'number' ? raw.date : parseInt(raw.date || raw.wzrk_dt, 10) || 0,
    tags: raw.tags || [],
    type: msgObj.type || '',
    actionUrl,
    buttons,
  };
}
