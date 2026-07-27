package com.symbiot.care;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.TextView;

/**
 * Shown by Android Health Connect when the user checks why this app requests
 * health permissions (Settings > Health Connect > App permissions).
 */
public class PermissionsRationaleActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        TextView textView = new TextView(this);
        textView.setText(
            "Symbiot Care reads heart rate, steps, oxygen saturation and resting heart rate " +
            "from Health Connect to keep your caregiver informed. This data is never written " +
            "back to Health Connect and is only shared with people you've approved as caregivers."
        );
        textView.setTextColor(Color.BLACK);
        textView.setPadding(48, 96, 48, 48);
        textView.setGravity(Gravity.START);

        setContentView(textView);
    }
}
