package com.mirex.namazorbit;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity implements SensorEventListener {
    private static final int REQ_LOCATION = 42;
    private static final int REQ_NOTIFICATION = 43;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private WebView web;
    private SensorManager sensorManager;
    private Sensor rotationSensor;
    private volatile Double compassLat = null;
    private volatile Double compassLon = null;
    private long lastCompassDispatchMs = 0L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        web.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
        web.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (Build.VERSION.SDK_INT < 23 || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    geoOrigin = origin;
                    geoCallback = callback;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
                }
            }
        });

        web.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
        requestNotificationPermission();

        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        rotationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);

        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (rotationSensor != null) sensorManager.registerListener(this, rotationSensor, SensorManager.SENSOR_DELAY_NORMAL);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (sensorManager != null) sensorManager.unregisterListener(this);
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATION);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION && geoCallback != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            geoCallback.invoke(geoOrigin, granted, false);
            geoCallback = null;
            geoOrigin = null;
            if (granted && web != null) {
                web.post(() -> web.evaluateJavascript("window.hideLocationOnboarding && window.hideLocationOnboarding();", null));
            }
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ROTATION_VECTOR || web == null) return;
        long nowMs = android.os.SystemClock.elapsedRealtime();
        if (nowMs - lastCompassDispatchMs < 140L) return;
        lastCompassDispatchMs = nowMs;
        float[] matrix = new float[9];
        float[] orientation = new float[3];
        SensorManager.getRotationMatrixFromVector(matrix, event.values);
        SensorManager.getOrientation(matrix, orientation);
        double azimuth = Math.toDegrees(orientation[0]);
        if (compassLat != null && compassLon != null) {
            GeomagneticField field = new GeomagneticField(compassLat.floatValue(), compassLon.floatValue(), 0f, System.currentTimeMillis());
            azimuth += field.getDeclination();
        }
        azimuth = (azimuth + 360.0) % 360.0;
        final double heading = azimuth;
        web.post(() -> web.evaluateJavascript("window.onNativeHeading && window.onNativeHeading(" + heading + ");", null));
    }

    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    public class AndroidBridge {
        private final Context context;
        AndroidBridge(Context context) { this.context = context; }

        @JavascriptInterface
        public void scheduleAlarm(String id, String prayerName, long timestampMs, String soundType) {
            AlarmScheduler.schedule(context, id, prayerName, timestampMs, soundType, true);
        }

        @JavascriptInterface
        public void scheduleAlarmV2(String id, String title, String body, long timestampMs, String soundType, boolean vibrate) {
            AlarmScheduler.schedule(context, id, title, body, timestampMs, soundType, vibrate, true);
        }

        @JavascriptInterface
        public void cancelAlarm(String id) { AlarmScheduler.cancel(context, id); }

        @JavascriptInterface
        public void cancelByPrefix(String prefix) { AlarmScheduler.cancelByPrefix(context, prefix == null ? "" : prefix); }

        @JavascriptInterface
        public void clearAllScheduledAlarms() { AlarmScheduler.clearAll(context); }

        @JavascriptInterface
        public void testAlarm(String soundType, boolean vibrate) {
            AlarmScheduler.schedule(
                    context,
                    "NO_TEST_" + System.currentTimeMillis(),
                    "Namaz Orbit • Test Alarm",
                    "Alarm sound ও vibration test successful.",
                    System.currentTimeMillis() + 3000,
                    soundType == null ? "alarm" : soundType,
                    vibrate,
                    false
            );
        }

        @JavascriptInterface
        public void setCompassLocation(double lat, double lon) {
            compassLat = lat;
            compassLon = lon;
        }

        @JavascriptInterface
        public boolean hasFineLocationPermission() {
            return Build.VERSION.SDK_INT < 23 ||
                    context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public boolean hasBackgroundLocationPermission() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return hasFineLocationPermission();
            return context.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void openAppLocationSettings() {
            try {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(i);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public boolean hasExactAlarmAccess() {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            return am != null && am.canScheduleExactAlarms();
        }

        @JavascriptInterface
        public void requestExactAlarmPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (!am.canScheduleExactAlarms()) {
                    try {
                        Intent i = new Intent(
                                Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                                Uri.parse("package:" + context.getPackageName())
                        );
                        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(i);
                    } catch (Exception ignored) {}
                }
            }
        }

        @JavascriptInterface
        public String getPlatform() { return "android"; }
    }
}
