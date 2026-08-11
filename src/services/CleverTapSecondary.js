/**
 * CleverTapSecondary — JS wrapper for the secondary CleverTap instance.
 *
 * ─── WHY A SECOND INSTANCE? ──────────────────────────────────────────────────
 *  CleverTap supports running two completely independent SDK instances in the
 *  same app, each pointing to a different dashboard account. This is useful
 *  when certain features (e.g. Product Experience) are only enabled on a
 *  separate dashboard plan.
 *
 *  Dashboard 1 (Primary)   → default `clevertap-react-native` import
 *  Dashboard 2 (Secondary) → this module (Account ID: TEST-K9K-Z94-R46Z)
 *
 * ─── HOW THE SECONDARY INSTANCE IS INITIALIZED ───────────────────────────────
 *  The secondary instance is created natively — NOT via the JS SDK — because
 *  `clevertap-react-native` only exposes one (default) instance through JS.
 *
 *  Android : CleverTapSecondaryModule.java
 *              Creates the instance with CleverTapAPI.getDefaultInstance(context, config)
 *              where `config` carries Dashboard 2 credentials.
 *              Registered as a NativeModule so React Native can call it from JS.
 *
 *  iOS     : CleverTapSecondary.swift + CleverTapSecondaryBridge.m
 *              Swift class creates the secondary instance; Obj-C bridge file
 *              exposes the methods to the React Native bridge via RCT_EXPORT_METHOD.
 *
 * ─── CURRENTLY EXPOSED METHODS ───────────────────────────────────────────────
 *  These are the methods already implemented in the native modules:
 *    recordEvent(name)                    → fires a basic event on Dashboard 2
 *    recordEventWithProps(name, props)    → fires an event with properties
 *    recordChargedEvent(chargeDetails, items) → Charged event (purchase)
 *    profileSet(profileData)              → updates user profile on Dashboard 2
 *
 *  Variables (Product Experiences) — resolve against Dashboard 2, where the
 *  PE Variables are actually defined:
 *    defineVariables(variablesObject)     → register variables with defaults
 *    syncVariables()                      → upload definitions (debug builds, test profile)
 *    fetchVariables()                     → returns a Promise<boolean> for fetch success
 *    onVariablesChanged()                 → arms the native listener; use
 *                                            addSecondaryVariablesChangedListener()
 *                                            below to receive the resolved values in JS
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *   import CleverTapSecondary, {addSecondaryVariablesChangedListener} from '../services/CleverTapSecondary';
 *   CleverTapSecondary.recordEvent('test instance');
 *   CleverTapSecondary.recordEventWithProps('Purchase', { amount: 100 });
 *
 *   CleverTapSecondary.defineVariables({ movie: { primary_color: '#5E35B1' } });
 *   CleverTapSecondary.syncVariables();
 *   const subscription = addSecondaryVariablesChangedListener((variables) => {
 *     console.log(variables.movie.primary_color);
 *   });
 *   CleverTapSecondary.onVariablesChanged();
 *   CleverTapSecondary.fetchVariables().then((success) => console.log(success));
 *   // later: subscription.remove();
 */
import {NativeModules, DeviceEventEmitter} from 'react-native';

const {CleverTapSecondary} = NativeModules;

if (!CleverTapSecondary) {
  console.warn(
    'CleverTapSecondary native module not found. ' +
      'Ensure native build is up to date (run npx react-native run-android/ios).',
  );
}

// The native side emits variable updates over RN's global device event channel
// (RCTDeviceEventEmitter / DeviceEventManagerModule) rather than a per-module
// NativeEventEmitter, so this listens the same way on both Android and iOS.
export const addSecondaryVariablesChangedListener = (callback) =>
  DeviceEventEmitter.addListener('CleverTapSecondaryVariablesChanged', callback);

export default CleverTapSecondary;
