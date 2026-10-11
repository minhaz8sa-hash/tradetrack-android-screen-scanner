package com.mirex.namazorbit;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;

public class PrayerSoundService extends Service {
    public static final String ACTION_START = "com.mirex.namazorbit.STRONG_ALARM_START";
    public static final String ACTION_STOP = "com.mirex.namazorbit.STRONG_ALARM_STOP";
    private static final String CHANNEL_ID = "strong_prayer_alarm_v1";
    private static final int NOTIFICATION_ID = 28117;

    private MediaPlayer player;
    private AudioManager audioManager;
    private int previousAlarmVolume = -1;
    private boolean changedVolume = false;

    public static void start(Context context, String title) {
        Intent i = new Intent(context, PrayerSoundService.class);
        i.setAction(ACTION_START);
        i.putExtra("title", title == null ? "Prayer alarm" : title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(i);
        else context.startService(i);
    }

    public static void stop(Context context) {
        try {
            context.stopService(new Intent(context, PrayerSoundService.class));
        } catch (Exception ignored) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        SharedPreferences prefs = getSharedPreferences("namaz_orbit_audio", Context.MODE_PRIVATE);
        if (!prefs.getBoolean("strong_enabled", true)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String title = intent != null ? intent.getStringExtra("title") : null;
        startForeground(NOTIFICATION_ID, buildNotification(title));
        startSound(prefs.getInt("min_volume_pct", 80));
        return START_NOT_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel c = new NotificationChannel(
                    CHANNEL_ID,
                    "Strong prayer alarm",
                    NotificationManager.IMPORTANCE_LOW
            );
            c.setDescription("Keeps strong prayer alarm audio active until dismissed.");
            c.setSound(null, null);
            c.enableVibration(false);
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            nm.createNotificationChannel(c);
        }
    }

    private Notification buildNotification(String title) {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent openPi = PendingIntent.getActivity(
                this, 28118, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stop = new Intent(this, PrayerSoundService.class);
        stop.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(
                this, 28119, stop,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        return b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title == null ? "Namaz Orbit • Prayer Alarm" : title)
                .setContentText("Strong alarm is sounding • tap Stop or open the app")
                .setContentIntent(openPi)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_ALARM)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPi)
                .build();
    }

    private void startSound(int minPercent) {
        stopPlayerOnly();

        if (audioManager != null) {
            int max = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            int current = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
            previousAlarmVolume = current;
            int floor = Math.max(1, Math.round(max * Math.max(10, Math.min(100, minPercent)) / 100f));
            if (current < floor) {
                try {
                    audioManager.setStreamVolume(AudioManager.STREAM_ALARM, floor, 0);
                    changedVolume = true;
                } catch (Exception ignored) {}
            }
        }

        Uri uri = Settings.System.DEFAULT_ALARM_ALERT_URI;
        if (uri == null) uri = Settings.System.DEFAULT_NOTIFICATION_URI;

        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            player.setDataSource(this, uri);
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            stopPlayerOnly();
        }
    }

    private void stopPlayerOnly() {
        if (player != null) {
            try { if (player.isPlaying()) player.stop(); } catch (Exception ignored) {}
            try { player.release(); } catch (Exception ignored) {}
            player = null;
        }
    }

    private void restoreVolume() {
        if (changedVolume && audioManager != null && previousAlarmVolume >= 0) {
            try {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, previousAlarmVolume, 0);
            } catch (Exception ignored) {}
        }
        changedVolume = false;
        previousAlarmVolume = -1;
    }

    @Override
    public void onDestroy() {
        stopPlayerOnly();
        restoreVolume();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
