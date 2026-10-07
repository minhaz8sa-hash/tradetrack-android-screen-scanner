package com.mirex.namazorbit;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class DhikrOverlayService extends Service {
    public static final String ACTION_START = "com.mirex.namazorbit.DHIKR_OVERLAY_START";
    public static final String ACTION_STOP = "com.mirex.namazorbit.DHIKR_OVERLAY_STOP";
    private static final String CHANNEL_ID = "dhikr_overlay_v1";
    private static final int NOTIFICATION_ID = 27181;

    private WindowManager windowManager;
    private View bubble;
    private WindowManager.LayoutParams params;
    private TextView countView;
    private TextView labelView;
    private TextView targetView;
    private final List<Item> items = new ArrayList<>();
    private int index = 0;
    private int count = 0;

    static class Item {
        String label;
        int target;
        Item(String label, int target) {
            this.label = label;
            this.target = Math.max(1, target);
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_STOP.equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        parseSequence(intent != null ? intent.getStringExtra("sequence_json") : null);
        startForeground(NOTIFICATION_ID, buildNotification());
        if (bubble == null) createBubble();
        render();
        return START_STICKY;
    }

    private void parseSequence(String json) {
        items.clear();
        try {
            JSONArray arr = new JSONArray(json == null ? "[]" : json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null) continue;
                String label = o.optString("label", "").trim();
                int target = o.optInt("target", 33);
                if (!label.isEmpty()) items.add(new Item(label, target));
            }
        } catch (Exception ignored) {}

        if (items.isEmpty()) {
            items.add(new Item("SubhanAllah", 33));
            items.add(new Item("Alhamdulillah", 33));
            items.add(new Item("Allahu Akbar", 34));
        }
        index = 0;
        count = 0;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel c = new NotificationChannel(
                    CHANNEL_ID,
                    "Floating Dhikr",
                    NotificationManager.IMPORTANCE_LOW
            );
            c.setDescription("Keeps the Dhikr floating circle active.");
            c.setSound(null, null);
            c.enableVibration(false);
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            nm.createNotificationChannel(c);
        }
    }

    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent openPi = PendingIntent.getActivity(
                this, 27182, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stop = new Intent(this, DhikrOverlayService.class);
        stop.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(
                this, 27183, stop,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        return b.setSmallIcon(android.R.drawable.ic_menu_compass)
                .setContentTitle("Namaz Orbit • Floating Dhikr")
                .setContentText("Tap the circle to count. Drag to move.")
                .setContentIntent(openPi)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_SERVICE)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPi)
                .build();
    }

    private GradientDrawable circleBackground() {
        GradientDrawable g = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{Color.rgb(28, 92, 72), Color.rgb(5, 31, 24)}
        );
        g.setShape(GradientDrawable.OVAL);
        g.setStroke(dp(2), Color.rgb(142, 240, 207));
        return g;
    }

    private void createBubble() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(6), dp(8), dp(6), dp(8));
        root.setBackground(circleBackground());
        root.setElevation(dp(12));

        countView = new TextView(this);
        countView.setTextColor(Color.rgb(142, 240, 207));
        countView.setTextSize(24);
        countView.setGravity(Gravity.CENTER);
        countView.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);

        labelView = new TextView(this);
        labelView.setTextColor(Color.WHITE);
        labelView.setTextSize(8);
        labelView.setGravity(Gravity.CENTER);
        labelView.setMaxLines(1);

        targetView = new TextView(this);
        targetView.setTextColor(Color.rgb(190, 211, 203));
        targetView.setTextSize(8);
        targetView.setGravity(Gravity.CENTER);

        root.addView(countView, new LinearLayout.LayoutParams(dp(78), dp(34)));
        root.addView(labelView, new LinearLayout.LayoutParams(dp(78), dp(18)));
        root.addView(targetView, new LinearLayout.LayoutParams(dp(78), dp(16)));

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        params = new WindowManager.LayoutParams(
                dp(92), dp(92), type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;

        SharedPreferences p = getSharedPreferences("dhikr_overlay", Context.MODE_PRIVATE);
        params.x = p.getInt("x", dp(280));
        params.y = p.getInt("y", dp(430));

        final int slop = ViewConfiguration.get(this).getScaledTouchSlop();
        root.setOnTouchListener(new View.OnTouchListener() {
            float downX, downY;
            int startX, startY;
            boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = e.getRawX();
                        downY = e.getRawY();
                        startX = params.x;
                        startY = params.y;
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - downX;
                        float dy = e.getRawY() - downY;
                        if (Math.abs(dx) + Math.abs(dy) > slop) moved = true;
                        if (moved) {
                            params.x = Math.max(0, startX + Math.round(dx));
                            params.y = Math.max(0, startY + Math.round(dy));
                            try { windowManager.updateViewLayout(bubble, params); } catch (Exception ignored) {}
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (moved) {
                            getSharedPreferences("dhikr_overlay", Context.MODE_PRIVATE)
                                    .edit().putInt("x", params.x).putInt("y", params.y).apply();
                        } else {
                            increment();
                        }
                        return true;
                    default:
                        return false;
                }
            }
        });

        bubble = root;
        windowManager.addView(bubble, params);
    }

    private void increment() {
        if (items.isEmpty()) return;
        if (index >= items.size()) {
            index = 0;
            count = 0;
        }
        Item item = items.get(index);
        count++;
        if (count >= item.target) {
            count = item.target;
            render();
            index++;
            count = 0;
            bubble.postDelayed(this::render, 260);
        } else {
            render();
        }
    }

    private void render() {
        if (countView == null) return;
        if (index >= items.size()) {
            countView.setText("✓");
            labelView.setText("Complete");
            targetView.setText("Tap to restart");
            return;
        }
        Item item = items.get(index);
        countView.setText(String.valueOf(count));
        labelView.setText(item.label);
        targetView.setText("of " + item.target);
    }

    @Override
    public void onDestroy() {
        if (bubble != null) {
            try { windowManager.removeView(bubble); } catch (Exception ignored) {}
            bubble = null;
        }
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
