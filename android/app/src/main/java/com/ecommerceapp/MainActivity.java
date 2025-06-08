package com.ecommerceapp;

import android.os.Bundle;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.clevertap.react.CleverTapRnAPI;  // for deep-link integration

public class MainActivity extends ReactActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
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
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            false // or .isFabricEnabled()
        );
    }
}
