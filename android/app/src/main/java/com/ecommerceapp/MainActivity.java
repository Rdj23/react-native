package com.ecommerceapp;
import android.os.Build;

import android.os.Bundle;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;


import com.clevertap.react.CleverTapRnAPI; // ✅ for deep-link integration
import com.facebook.soloader.SoLoader; // ✅ initialize SoLoader

import com.clevertap.android.sdk.CleverTapAPI;
import android.content.Intent;


public class MainActivity extends ReactActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SoLoader.init(this, /* native exopackage */ false);
        super.onCreate(savedInstanceState);

        // ✅ Notify CleverTap for deep-link
        CleverTapRnAPI.setInitialUri(getIntent().getData());
        
    }

    @Override
    protected String getMainComponentName() {
        return "ecommerceApp";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        // ✅ Fabric and TurboModule flags can be toggled here if needed
        boolean fabricEnabled = false;
        boolean turboModuleEnabled = false;

        return new DefaultReactActivityDelegate(
                this,
                getMainComponentName(),
                fabricEnabled,
                turboModuleEnabled);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            CleverTapAPI.getDefaultInstance(this).pushNotificationClickedEvent(intent.getExtras());
        }
    }

}
