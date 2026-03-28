/**
 * useInbox — React hook for CleverTap App Inbox state management (Dashboard 1).
 *
 * ─── WHAT THIS HOOK DOES ─────────────────────────────────────────────────────
 *  Manages all App Inbox state in one place so screens (InboxScreen) and
 *  components (InboxIcon) don't need to call InboxService directly.
 *
 * ─── RETURNED VALUES ─────────────────────────────────────────────────────────
 *  messages      → normalized message array (see InboxService.normalizeMessage)
 *                  sorted: unread first, then newest first by timestamp
 *  unreadCount   → integer; drives the badge on InboxIcon
 *  loading       → true during the first fetch; used to show Shimmer in InboxScreen
 *  refresh()     → manually re-fetch (called on pull-to-refresh and screen focus)
 *  markRead(id)  → marks a message read locally + fires a click analytics event;
 *                  updates unreadCount optimistically without a full refetch
 *  deleteMsg(id) → removes message from local state + calls SDK delete;
 *                  re-fetches unread count to keep badge accurate
 *  trackView(id) → fires a 'Notification Viewed' event when a card enters viewport
 *                  (used by FlatList viewability tracking in InboxScreen)
 *  trackClick(id)→ fires a 'Notification Clicked' event on explicit user tap
 *
 * ─── AUTO-REFRESH TRIGGERS ───────────────────────────────────────────────────
 *  Mount                          → initial fetch
 *  CleverTapInboxDidInitialize    → SDK finished setting up; first real fetch
 *  CleverTapInboxMessagesDidUpdate → server pushed new messages mid-session
 *
 * ─── CLEANUP ─────────────────────────────────────────────────────────────────
 *  mountedRef prevents setState calls after unmount (avoids memory leaks).
 *  All listeners are removed in the useEffect cleanup function.
 */
import {useState, useEffect, useCallback, useRef} from 'react';
import * as Inbox from '../services/InboxService';

export default function useInbox() {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Prevents setState calls after the component using this hook has unmounted
  const mountedRef = useRef(true);

  // ─── Fetch and normalize all messages ──────────────────────────
  const refresh = useCallback(() => {
    setLoading(true);
    Inbox.fetchAll(raw => {
      if (!mountedRef.current) return;

      const normalized = raw.map(Inbox.normalizeMessage).filter(m => m.id);

      // Sort: unread first, then newest first
      normalized.sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return (b.date || 0) - (a.date || 0);
      });

      setMessages(normalized);
      setLoading(false);
    });

    Inbox.getUnreadCount(count => {
      if (mountedRef.current) setUnreadCount(count);
    });
  }, []);

  // ─── Mark a message as read ────────────────────────────────────
  // Optimistically updates local state immediately so the UI responds
  // without waiting for a full refetch. Also decrements unreadCount.
  const markRead = useCallback((id) => {
    Inbox.markRead(id);
    Inbox.trackClick(id);
    setMessages(prev =>
      prev.map(m => (m.id === id ? {...m, isRead: true} : m)),
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // ─── Delete a message ──────────────────────────────────────────
  // Removes from local state immediately, then re-fetches unread count
  // from the SDK to ensure the badge stays accurate.
  const deleteMsg = useCallback((id) => {
    Inbox.deleteMessage(id);
    setMessages(prev => prev.filter(m => m.id !== id));
    // Refresh unread count
    Inbox.getUnreadCount(count => {
      if (mountedRef.current) setUnreadCount(count);
    });
  }, []);

  // ─── Track viewed (for visible messages) ───────────────────────
  // Called by FlatList's onViewableItemsChanged in InboxScreen when
  // a message card becomes ≥50% visible in the viewport.
  const trackView = useCallback((id) => {
    Inbox.trackView(id);
  }, []);

  // ─── Track click ───────────────────────────────────────────────
  const trackClick = useCallback((id) => {
    Inbox.trackClick(id);
  }, []);

  // ─── Listeners ─────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    refresh();

    // INITIALIZED fires once after CleverTap.initializeInbox() completes.
    // UPDATED fires whenever the server pushes new messages mid-session.
    // Both trigger a full re-fetch so the local state stays in sync.
    const initListener = Inbox.addListener(Inbox.EVENTS.INITIALIZED, refresh);
    const updateListener = Inbox.addListener(Inbox.EVENTS.UPDATED, refresh);

    // MESSAGE_TAPPED fires when the native inbox card is tapped (buttonIndex -1
    // means the card body was tapped, not a CTA button).
    const tapListener = Inbox.addListener(Inbox.EVENTS.MESSAGE_TAPPED, event => {
      const parsed = Inbox.parseTapEvent(event);
      if (!parsed) return;
      const {msg, buttonIndex} = parsed;
      const msgId = msg?.id || msg?.messageId || msg?._id;
      if (!msgId) return;

      if (buttonIndex === -1) {
        // Full message click
        Inbox.markRead(msgId);
        Inbox.trackClick(msgId);
      }
      // buttonIndex >= 0 means a CTA button was tapped
    });

    // BUTTON_TAPPED fires when a KV-action button inside a message is tapped.
    const btnListener = Inbox.addListener(Inbox.EVENTS.BUTTON_TAPPED, event => {
      // Handle KV button taps
      console.log('Inbox button tapped:', event);
    });

    return () => {
      mountedRef.current = false;
      initListener?.remove?.();
      updateListener?.remove?.();
      tapListener?.remove?.();
      btnListener?.remove?.();
    };
  }, [refresh]);

  return {
    messages,
    unreadCount,
    loading,
    refresh,
    markRead,
    deleteMsg,
    trackView,
    trackClick,
  };
}
