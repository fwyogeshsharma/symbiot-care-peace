package com.symbiot.care;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.symbiot.care.sync.BackgroundSyncPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge starts.
        registerPlugin(BackgroundSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
