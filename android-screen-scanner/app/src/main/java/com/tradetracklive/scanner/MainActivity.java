package com.tradetracklive.scanner;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final int REQ_CAPTURE = 1201;
    private MediaProjectionManager projectionManager;
    private EditText tokenInput;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);

        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 99);
        }

        SharedPreferences prefs = getSharedPreferences("ttl_scanner", MODE_PRIVATE);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(28), dp(20), dp(24));
        root.setBackgroundColor(Color.rgb(14,17,23));
        root.setGravity(Gravity.TOP);

        TextView title = text("TradeTrack Live Scanner", 24, Color.WHITE, true);
        TextView subtitle = text("Quotex app screen → TT Scan → UP / DOWN / SKIP", 13, Color.rgb(148,163,184), false);

        tokenInput = new EditText(this);
        tokenInput.setHint("Paste 8-hour Scanner Token");
        tokenInput.setHintTextColor(Color.rgb(100,116,139));
        tokenInput.setTextColor(Color.WHITE);
        tokenInput.setSingleLine(true);
        tokenInput.setText(prefs.getString("bridgeToken", ""));
        tokenInput.setBackgroundColor(Color.rgb(24,30,39));
        tokenInput.setPadding(dp(12),0,dp(12),0);

        Button save = button("Save Token");
        save.setOnClickListener(v -> {
            prefs.edit().putString("bridgeToken", tokenInput.getText().toString().trim()).apply();
            save.setText("Saved ✓");
        });

        Button start = button("Enable Screen Share + Floating TT Scan");
        start.setOnClickListener(v -> startScanner());

        Button stop = button("Stop Scanner");
        stop.setOnClickListener(v -> {
            Intent intent = new Intent(this, CaptureService.class);
            intent.setAction(CaptureService.ACTION_STOP);
            startService(intent);
        });

        TextView note = text(
                "How it works:\n1. Create a Scanner Token in TradeTrack Live → Phone Screen Scan.\n" +
                "2. Paste it here.\n3. Enable screen capture and overlay permission.\n" +
                "4. Open Quotex Broker App.\n5. Tap the floating TT Scan button whenever you want a scan.\n\n" +
                "Only one frame is uploaded when you tap Scan. The scanner does not tap Quotex buttons or place trades.",
                12, Color.rgb(148,163,184), false
        );

        root.addView(title, lp(-1, dp(42), 0));
        root.addView(subtitle, lp(-1, dp(42), 0));
        root.addView(tokenInput, lp(-1, dp(48), dp(12)));
        root.addView(save, lp(-1, dp(48), dp(10)));
        root.addView(start, lp(-1, dp(52), dp(18)));
        root.addView(stop, lp(-1, dp(48), dp(10)));
        root.addView(note, lp(-1, ViewGroup.LayoutParams.WRAP_CONTENT, dp(20)));
        setContentView(root);
    }

    private void startScanner() {
        String token = tokenInput.getText().toString().trim();
        if (token.isEmpty()) {
            tokenInput.setError("Scanner Token required");
            return;
        }
        getSharedPreferences("ttl_scanner", MODE_PRIVATE).edit().putString("bridgeToken", token).apply();

        if (!Settings.canDrawOverlays(this)) {
            Intent overlay = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName())
            );
            startActivity(overlay);
            return;
        }

        startActivityForResult(projectionManager.createScreenCaptureIntent(), REQ_CAPTURE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_CAPTURE && resultCode == RESULT_OK && data != null) {
            Intent service = new Intent(this, CaptureService.class);
            service.setAction(CaptureService.ACTION_START);
            service.putExtra(CaptureService.EXTRA_RESULT_CODE, resultCode);
            service.putExtra(CaptureService.EXTRA_RESULT_DATA, data);
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(service);
            else startService(service);
            moveTaskToBack(true);
        }
    }

    private Button button(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextColor(Color.rgb(7,18,13));
        b.setTextSize(13);
        b.setAllCaps(false);
        b.setBackgroundColor(Color.rgb(52,211,153));
        return b;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(color);
        if (bold) t.setTypeface(t.getTypeface(), android.graphics.Typeface.BOLD);
        return t;
    }

    private LinearLayout.LayoutParams lp(int width, int height, int top) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(width, height);
        p.topMargin = top;
        return p;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}