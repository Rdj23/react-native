package com.ecommerceapp;

import android.os.Bundle;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;

import com.facebook.react.defaults.DefaultReactActivityDelegate;

import com.facebook.react.ReactRootView;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

import com.clevertap.react.CleverTapRnAPI;  // for deep-link integration

// SoLoader import (legacy overload, still valid for initializing before any JNI loads)
import com.facebook.soloader.SoLoader;

public class MainActivity extends ReactActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {

         SoLoader.init(this, /* native exopackage */ false);
        super.onCreate(savedInstanceState);

        // Tell CleverTap about any launch deep-link:
        CleverTapRnAPI.setInitialUri(getIntent().getData());
    }

    @Override
    protected String getMainComponentName() {
        return "ecommerceApp";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        // If you’re not yet using Fabric/JSI you can shorten this to
        //   return new ReactActivityDelegate(this, getMainComponentName());
        boolean fabricEnabled = false;
        boolean turboModuleEnabled = false;
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            fabricEnabled,
            turboModuleEnabled
        );
    }
}
