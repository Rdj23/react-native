package com.ecommerceapp;

import android.util.Log;

import com.clevertap.android.sdk.CleverTapAPI;
import com.clevertap.android.sdk.CleverTapInstanceConfig;
import com.clevertap.android.sdk.product_config.CTProductConfigListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Native module that exposes a secondary CleverTap instance to React Native.
 * This allows sending events to a separate CleverTap dashboard while the
 * default instance (via clevertap-react-native) continues to use the primary dashboard.
 */
public class CleverTapSecondaryModule extends ReactContextBaseJavaModule {

    private static final String TAG = "CleverTapSecondary";
    private static final String MODULE_NAME = "CleverTapSecondary";

    // Secondary dashboard credentials
    private static final String ACCOUNT_ID = "TEST-K9K-Z94-R46Z";
    private static final String ACCOUNT_TOKEN = "TEST-4c1-3c3";

    private CleverTapAPI secondaryInstance;

    public CleverTapSecondaryModule(ReactApplicationContext reactContext) {
        super(reactContext);
        initializeSecondaryInstance(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Creates and configures the secondary CleverTap instance.
     * Must be called before any event recording methods.
     */
    private void initializeSecondaryInstance(ReactApplicationContext context) {
        try {
            CleverTapInstanceConfig config = CleverTapInstanceConfig.createInstance(
                context,
                ACCOUNT_ID,
                ACCOUNT_TOKEN
            );
            config.setDebugLevel(CleverTapAPI.LogLevel.VERBOSE);

            secondaryInstance = CleverTapAPI.instanceWithConfig(context, config);
            Log.d(TAG, "Secondary CleverTap instance initialized successfully");

            // Set Product Config listener — auto-activate on fetch, emit event on activate
            secondaryInstance.setCTProductConfigListener(new CTProductConfigListener() {
                @Override
                public void onInit() {
                    Log.d(TAG, "Product config INITIALIZED");
                }

                @Override
                public void onFetched() {
                    Log.d(TAG, "Product config FETCHED from server — activating now...");
                    secondaryInstance.productConfig().activate();
                }

                @Override
                public void onActivated() {
                    Log.d(TAG, "Product config ACTIVATED — values ready to read");
                    // Emit event to JS so useRemoteConfig can re-read values
                    try {
                        ReactApplicationContext ctx = getReactApplicationContext();
                        if (ctx != null && ctx.hasActiveReactInstance()) {
                            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                .emit("CleverTapSecondaryProductConfigActivated", null);
                            Log.d(TAG, "Emitted CleverTapSecondaryProductConfigActivated to JS");
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Failed to emit product config event to JS", e);
                    }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize secondary CleverTap instance", e);
        }
    }

    /**
     * Records a simple event (no properties) on the secondary dashboard.
     *
     * @param eventName Name of the event to record
     */
    @ReactMethod
    public void recordEvent(String eventName) {
        if (secondaryInstance == null) {
            Log.w(TAG, "Secondary instance not initialized, cannot record event: " + eventName);
            return;
        }
        secondaryInstance.pushEvent(eventName);
        Log.d(TAG, "Event recorded: " + eventName);
    }

    /**
     * Records an event with properties on the secondary dashboard.
     *
     * @param eventName  Name of the event
     * @param properties ReadableMap of event properties
     */
    @ReactMethod
    public void recordEventWithProps(String eventName, ReadableMap properties) {
        if (secondaryInstance == null) {
            Log.w(TAG, "Secondary instance not initialized, cannot record event: " + eventName);
            return;
        }
        HashMap<String, Object> props = properties.toHashMap();
        secondaryInstance.pushEvent(eventName, props);
        Log.d(TAG, "Event recorded with props: " + eventName);
    }

    /**
     * Sets user profile properties on the secondary dashboard.
     *
     * @param profile ReadableMap of profile key-value pairs
     */
    @ReactMethod
    public void profileSet(ReadableMap profile) {
        if (secondaryInstance == null) {
            Log.w(TAG, "Secondary instance not initialized, cannot set profile");
            return;
        }
        HashMap<String, Object> profileMap = profile.toHashMap();
        secondaryInstance.pushProfile(profileMap);
        Log.d(TAG, "Profile set on secondary instance");
    }

    /**
     * Performs a user login on the secondary dashboard.
     *
     * @param profile ReadableMap containing identity and profile properties
     */
    @ReactMethod
    public void onUserLogin(ReadableMap profile) {
        if (secondaryInstance == null) {
            Log.w(TAG, "Secondary instance not initialized, cannot perform onUserLogin");
            return;
        }
        HashMap<String, Object> profileMap = profile.toHashMap();
        secondaryInstance.onUserLogin(profileMap);
        Log.d(TAG, "onUserLogin called on secondary instance");
    }

    /**
     * Records a charged (purchase) event on the secondary dashboard.
     *
     * @param chargeDetails ReadableMap with charge details (Amount, Payment Mode, etc.)
     * @param items         ReadableArray of item maps
     */
    @ReactMethod
    public void recordChargedEvent(ReadableMap chargeDetails, ReadableArray items) {
        if (secondaryInstance == null) {
            Log.w(TAG, "Secondary instance not initialized, cannot record charged event");
            return;
        }

        HashMap<String, Object> details = chargeDetails.toHashMap();
        ArrayList<HashMap<String, Object>> itemList = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {
            ReadableMap item = items.getMap(i);
            if (item != null) {
                itemList.add(item.toHashMap());
            }
        }

        secondaryInstance.pushChargedEvent(details, itemList);
        Log.d(TAG, "Charged event recorded on secondary instance");
    }

    // ─── Product Config (Product Experiences) ─────────────────────────────

    /**
     * Triggers a fetch of the latest Product Config values from Dashboard 2.
     */
    @ReactMethod
    public void productConfigFetch() {
        if (secondaryInstance == null) {
            Log.w(TAG, "Secondary instance not initialized, cannot fetch product config");
            return;
        }
        secondaryInstance.productConfig().fetch();
        Log.d(TAG, "Product config fetch triggered");
    }

    /**
     * Activates the most recently fetched Product Config so values are readable.
     */
    @ReactMethod
    public void productConfigActivate() {
        if (secondaryInstance == null) {
            Log.w(TAG, "Secondary instance not initialized, cannot activate product config");
            return;
        }
        secondaryInstance.productConfig().activate();
        Log.d(TAG, "Product config activated");
    }

    /**
     * Convenience: fetches AND activates in one call.
     */
    @ReactMethod
    public void productConfigFetchAndActivate() {
        if (secondaryInstance == null) {
            Log.w(TAG, "Secondary instance not initialized");
            return;
        }
        secondaryInstance.productConfig().fetchAndActivate();
        Log.d(TAG, "Product config fetch and activate triggered");
    }

    /**
     * Sets the minimum interval between successive fetches.
     *
     * @param seconds Minimum fetch interval in seconds
     */
    @ReactMethod
    public void productConfigSetMinimumFetchIntervalInSeconds(double seconds) {
        if (secondaryInstance == null) return;
        secondaryInstance.productConfig().setMinimumFetchIntervalInSeconds((long) seconds);
        Log.d(TAG, "Product config minimum fetch interval set to " + seconds + "s");
    }

    /**
     * Reads a boolean value from the activated Product Config.
     *
     * @param key     The variable key
     * @param promise Resolves with the boolean value
     */
    @ReactMethod
    public void productConfigGetBoolean(String key, Promise promise) {
        if (secondaryInstance == null) {
            promise.resolve(false);
            return;
        }
        boolean value = secondaryInstance.productConfig().getBoolean(key);
        promise.resolve(value);
    }

    /**
     * Reads a long/number value from the activated Product Config.
     *
     * @param key     The variable key
     * @param promise Resolves with the numeric value
     */
    @ReactMethod
    public void productConfigGetLong(String key, Promise promise) {
        if (secondaryInstance == null) {
            promise.resolve(0.0);
            return;
        }
        long value = secondaryInstance.productConfig().getLong(key);
        promise.resolve((double) value);
    }

    /**
     * Reads a string value from the activated Product Config.
     *
     * @param key     The variable key
     * @param promise Resolves with the string value
     */
    @ReactMethod
    public void productConfigGetString(String key, Promise promise) {
        if (secondaryInstance == null) {
            Log.w(TAG, "getString(" + key + ") — instance null");
            promise.resolve("");
            return;
        }
        String value = secondaryInstance.productConfig().getString(key);
        Log.d(TAG, "getString(" + key + ") = \"" + value + "\"");
        promise.resolve(value);
    }

    /**
     * Resets the Product Config cache so the next fetch pulls fresh values.
     */
    @ReactMethod
    public void productConfigReset() {
        if (secondaryInstance == null) return;
        secondaryInstance.productConfig().reset();
        Log.d(TAG, "Product config reset");
    }

    /**
     * Debug: fetches, activates, then reads and logs all known keys.
     * Call from JS to diagnose Product Config issues.
     */
    @ReactMethod
    public void debugProductConfig(Promise promise) {
        if (secondaryInstance == null) {
            promise.resolve("ERROR: secondary instance is null");
            return;
        }

        Log.d(TAG, "=== DEBUG PRODUCT CONFIG START ===");

        // Try reading values directly (from whatever is currently activated)
        String[] testKeys = {
            "primary_color", "movie.primary_color",
            "background_color", "movie.background_color",
            "watch_cta_text", "movie.watch_cta_text",
            "allow_free_trailers", "movie.allow_free_trailers",
            "paywall_cta_text", "movie.paywall_cta_text",
            "trailer_preview_duration", "movie.trailer_preview_duration"
        };

        StringBuilder sb = new StringBuilder();
        sb.append("Product Config debug:\n");

        for (String key : testKeys) {
            String strVal = secondaryInstance.productConfig().getString(key);
            boolean boolVal = secondaryInstance.productConfig().getBoolean(key);
            long longVal = secondaryInstance.productConfig().getLong(key);
            sb.append("  ").append(key).append(" → str=\"").append(strVal)
              .append("\" bool=").append(boolVal)
              .append(" long=").append(longVal).append("\n");
            Log.d(TAG, "  " + key + " → str=\"" + strVal + "\" bool=" + boolVal + " long=" + longVal);
        }

        // Also log the last fetch time
        long lastFetch = secondaryInstance.productConfig().getLastFetchTimeStampInMillis();
        sb.append("  lastFetchTimestamp=").append(lastFetch).append(" (").append(new java.util.Date(lastFetch)).append(")\n");
        Log.d(TAG, "  lastFetchTimestamp=" + lastFetch + " (" + new java.util.Date(lastFetch) + ")");

        Log.d(TAG, "=== DEBUG PRODUCT CONFIG END ===");
        promise.resolve(sb.toString());
    }
}
