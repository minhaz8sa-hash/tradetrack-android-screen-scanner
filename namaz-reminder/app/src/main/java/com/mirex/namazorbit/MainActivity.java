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
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.Settings;
import android.view.Surface;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;

public class MainActivity extends Activity implements SensorEventListener {
    private static final int REQ_LOCATION = 42;
    private static final int REQ_NOTIFICATION = 43;
    private static final int REQ_FILE = 44;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private ValueCallback<Uri[]> filePathCallback;
    private WebView web;
    private SensorManager sensorManager;
    private Sensor rotationSensor;
    private volatile Double compassLat = null;
    private volatile Double compassLon = null;
    private long lastCompassDispatchMs = 0L;
    private boolean hasSmoothedHeading = false;
    private double smoothedHeadingSin = 0.0;
    private double smoothedHeadingCos = 1.0;
    private volatile int compassAccuracy = SensorManager.SENSOR_STATUS_UNRELIABLE;
    private boolean pageLoaded = false;
    private String pendingCompleteDateKey = null;
    private String pendingCompletePrayerKey = null;

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

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                pageLoaded = true;
                applyPendingPrayerComplete();
            }
        });
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

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    Intent chooser = params.createIntent();
                    chooser.setType("image/*");
                    startActivityForResult(chooser, REQ_FILE);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        web.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
        handlePrayerCompleteIntent(getIntent());
        requestNotificationPermission();

        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        rotationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);

        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handlePrayerCompleteIntent(intent);
    }

    private void handlePrayerCompleteIntent(Intent intent) {
        if (intent == null || !PrayerAlarmReceiver.ACTION_COMPLETE.equals(intent.getAction())) return;
        String dateKey = intent.getStringExtra("date_key");
        String prayerKey = intent.getStringExtra("prayer_key");
        if (dateKey == null || prayerKey == null) return;
        if (!dateKey.matches("\\d{4}-\\d{2}-\\d{2}")) return;
        if (!prayerKey.matches("fajr|dhuhr|asr|maghrib|isha")) return;
        pendingCompleteDateKey = dateKey;
        pendingCompletePrayerKey = prayerKey;
        applyPendingPrayerComplete();
    }

    private void applyPendingPrayerComplete() {
        if (!pageLoaded || web == null || pendingCompleteDateKey == null || pendingCompletePrayerKey == null) return;
        final String dateKey = pendingCompleteDateKey;
        final String prayerKey = pendingCompletePrayerKey;
        pendingCompleteDateKey = null;
        pendingCompletePrayerKey = null;
        web.post(() -> web.evaluateJavascript(
                "if(window.markComplete){markComplete('" + dateKey + "','" + prayerKey + "',false);" +
                "if(window.showPage){showPage('home');}}",
                null
        ));
    }

    @Override
    protected void onResume() {
        super.onResume();
        stopAnyAlarmVibration();
        if (rotationSensor != null) sensorManager.registerListener(this, rotationSensor, SensorManager.SENSOR_DELAY_NORMAL);
        notifyLocationPermissionToWeb();
    }

    private void stopAnyAlarmVibration() {
        try {
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vm != null ? vm.getDefaultVibrator() : null;
            } else {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrator != null) vibrator.cancel();
        } catch (Exception ignored) {}
    }

    private void notifyLocationPermissionToWeb() {
        if (web == null) return;
        final boolean granted = Build.VERSION.SDK_INT < 23 ||
                checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        web.postDelayed(() -> web.evaluateJavascript(
                "window.onNativeLocationPermissionChanged && window.onNativeLocationPermissionChanged(" + granted + ");",
                null
        ), 250);
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
        if (requestCode == REQ_LOCATION) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (geoCallback != null) {
                geoCallback.invoke(geoOrigin, granted, false);
                geoCallback = null;
                geoOrigin = null;
            }
            notifyLocationPermissionToWeb();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE && filePathCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ROTATION_VECTOR || web == null) return;

        long nowMs = android.os.SystemClock.elapsedRealtime();
        if (nowMs - lastCompassDispatchMs < 120L) return;
        lastCompassDispatchMs = nowMs;

        float[] baseMatrix = new float[9];
        SensorManager.getRotationMatrixFromVector(baseMatrix, event.values);

        float[] screenMatrix = baseMatrix;
        float[] remapped = new float[9];
        int rotation = getWindowManager().getDefaultDisplay().getRotation();
        boolean ok = true;

        switch (rotation) {
            case Surface.ROTATION_90:
                ok = SensorManager.remapCoordinateSystem(
                        baseMatrix,
                        SensorManager.AXIS_Y,
                        SensorManager.AXIS_MINUS_X,
                        remapped
                );
                break;
            case Surface.ROTATION_180:
                ok = SensorManager.remapCoordinateSystem(
                        baseMatrix,
                        SensorManager.AXIS_MINUS_X,
                        SensorManager.AXIS_MINUS_Y,
                        remapped
                );
                break;
            case Surface.ROTATION_270:
                ok = SensorManager.remapCoordinateSystem(
                        baseMatrix,
                        SensorManager.AXIS_MINUS_Y,
                        SensorManager.AXIS_X,
                        remapped
                );
                break;
            case Surface.ROTATION_0:
            default:
                ok = true;
                break;
        }

        if (rotation != Surface.ROTATION_0 && ok) screenMatrix = remapped;

        // Android world axes: X = East, Y = magnetic North, Z = Up.
        // Project the top edge of the screen onto the horizontal plane. This
        // remains stable even when the phone is slightly tilted.
        double east = screenMatrix[1];
        double north = screenMatrix[4];
        double horizontalProjection = Math.hypot(east, north);

        double azimuth;
        if (horizontalProjection > 0.12) {
            azimuth = Math.toDegrees(Math.atan2(east, north));
        } else {
            float[] orientation = new float[3];
            SensorManager.getOrientation(screenMatrix, orientation);
            azimuth = Math.toDegrees(orientation[0]);
        }

        // Convert magnetic heading to true-north heading for Qibla bearing.
        if (compassLat != null && compassLon != null) {
            GeomagneticField field = new GeomagneticField(
                    compassLat.floatValue(),
                    compassLon.floatValue(),
                    0f,
                    System.currentTimeMillis()
            );
            azimuth += field.getDeclination();
        }

        azimuth = (azimuth + 360.0) % 360.0;

        // Circular low-pass filter avoids the 359°/0° jump and compass jitter.
        double radians = Math.toRadians(azimuth);
        double alpha = 0.28;
        if (!hasSmoothedHeading) {
            smoothedHeadingSin = Math.sin(radians);
            smoothedHeadingCos = Math.cos(radians);
            hasSmoothedHeading = true;
        } else {
            smoothedHeadingSin = (1.0 - alpha) * smoothedHeadingSin + alpha * Math.sin(radians);
            smoothedHeadingCos = (1.0 - alpha) * smoothedHeadingCos + alpha * Math.cos(radians);
        }

        double smoothed = Math.toDegrees(Math.atan2(smoothedHeadingSin, smoothedHeadingCos));
        smoothed = (smoothed + 360.0) % 360.0;
        final double heading = smoothed;

        web.post(() -> web.evaluateJavascript(
                "window.onNativeHeading && window.onNativeHeading(" + heading + ");",
                null
        ));
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        if (sensor == null || sensor.getType() != Sensor.TYPE_ROTATION_VECTOR) return;
        compassAccuracy = accuracy;
        if (web != null) {
            final int a = accuracy;
            web.post(() -> web.evaluateJavascript(
                    "window.onNativeCompassAccuracy && window.onNativeCompassAccuracy(" + a + ");",
                    null
            ));
        }
    }

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
        public int getCompassAccuracy() { return compassAccuracy; }

        @JavascriptInterface
        public boolean hasRotationSensor() { return rotationSensor != null; }

        @JavascriptInterface
        public void updatePrayerWidget(String nextPrayer, String startTime, String countdown, double qiblaBearing) {
            PrayerWidgetProvider.storeAndUpdate(
                    context,
                    nextPrayer == null ? "Next prayer" : nextPrayer,
                    startTime == null ? "—" : startTime,
                    countdown == null ? "—" : countdown,
                    qiblaBearing
            );
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
