package com.ecommerceapp;

import android.util.Log;

import com.clevertap.android.sdk.CleverTapAPI;
import com.clevertap.android.sdk.CleverTapInstanceConfig;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;

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
}
