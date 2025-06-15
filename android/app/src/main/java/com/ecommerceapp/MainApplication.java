package com.ecommerceapp;

import android.app.Application;
import android.content.Context;

import com.clevertap.android.sdk.ActivityLifecycleCallback;
import com.clevertap.react.CleverTapPackage;
import com.clevertap.android.sdk.CleverTapAPI;
import com.clevertap.react.CleverTapApplication;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultReactNativeHost;

import com.clevertap.react.CleverTapRnAPI;
import java.io.IOException; // for initReactNativeIntegration
import java.util.List;

// SoLoader imports for RN 0.79.2
import com.facebook.soloader.SoLoader;
import com.facebook.react.soloader.OpenSourceMergedSoMapping;

import com.clevertap.android.sdk.interfaces.NotificationHandler;
import com.clevertap.android.pushtemplates.PushTemplateNotificationHandler;

public class MainApplication extends CleverTapApplication implements ReactApplication {

    private final ReactNativeHost mReactNativeHost = new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            return new PackageList(this).getPackages();
        }

        @Override
        protected String getJSMainModuleName() {
            return "index";
        }

        // Match the return types exactly:

        @Override
        public boolean isNewArchEnabled() {
            return false;
        }

        @Override
        public Boolean isHermesEnabled() {
            return BuildConfig.IS_HERMES_ENABLED;
        }
    };

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    public void onCreate() {
        // Initialize SoLoader with the Kotlin-object INSTANCE
        try {
            SoLoader.init(this, OpenSourceMergedSoMapping.INSTANCE);
        } catch (IOException e) {
            // In dev, print the stack; in production you might log this to your
            // error-tracker
            e.printStackTrace();
        }

        super.onCreate();

        // DO NOT call DefaultNewArchitectureEntryPoint.load() (newArchEnabled=false)

        // CleverTap lifecycle registration (if using CleverTap)
        ActivityLifecycleCallback.register(this);
        CleverTapAPI.setDebugLevel(CleverTapAPI.LogLevel.VERBOSE);

        // Required to enable rich Push Templates
        CleverTapAPI.setNotificationHandler((NotificationHandler)new PushTemplateNotificationHandler());

        // Enable CleverTap push rendering in foreground
        // CleverTapAPI.getDefaultInstance(this).enablePushNotificationRendering(true);
    }

    // Must match ContextWrapper.attachBaseContext exactly
    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        // If you ever need multidex, add MultiDex.install(this) here
    }
}
