package com.mirex.namazorbit;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.provider.Settings;
import android.os.Build;

public class PrayerAlarmReceiver extends BroadcastReceiver {
    private static final String ACTION_DISMISS = "com.mirex.namazorbit.DISMISS_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (ACTION_DISMISS.equals(intent.getAction())) {
            int notificationId = intent.getIntExtra("notification_id", -1);
            if (notificationId >= 0) nm.cancel(notificationId);
            return;
        }

        String eventId = intent.getStringExtra("id");
        String prayer = intent.getStringExtra("prayer");
        String body = intent.getStringExtra("body");
        String sound = intent.getStringExtra("sound");
        boolean vibrate = intent.getBooleanExtra("vibrate", true);
        if (prayer == null) prayer = "Prayer";
        if (body == null) body = "Open Namaz Orbit to update your prayer status.";
        if (sound == null) sound = "alarm";

        String notificationKey = eventId != null ? eventId : prayer + "_" + (System.currentTimeMillis() / 60000L);
        int notificationId = notificationKey.hashCode() & 0x7fffffff;

        String channelId = "prayer_v3_" + sound + "_" + (vibrate ? "v" : "n");
        Uri uri = "notification".equals(sound)
                ? Settings.System.DEFAULT_NOTIFICATION_URI
                : Settings.System.DEFAULT_ALARM_ALERT_URI;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Namaz Orbit alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(vibrate);
            if (vibrate) channel.setVibrationPattern(new long[]{0, 450, 180, 450});
            if ("silent".equals(sound)) {
                channel.setSound(null, null);
            } else {
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build();
                channel.setSound(uri, attrs);
            }
            nm.createNotificationChannel(channel);
        }

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(
                context,
                1001,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent dismiss = new Intent(context, PrayerAlarmReceiver.class);
        dismiss.setAction(ACTION_DISMISS);
        dismiss.putExtra("notification_id", notificationId);
        PendingIntent dismissPending = PendingIntent.getBroadcast(
                context,
                notificationId + 5000,
                dismiss,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, channelId)
                : new Notification.Builder(context);
        b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(prayer)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(content)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .setPriority(Notification.PRIORITY_MAX)
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", dismissPending);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            if (!"silent".equals(sound)) b.setSound(uri);
            if (vibrate) b.setVibrate(new long[]{0, 450, 180, 450});
        }
        nm.notify(notificationId, b.build());
    }
}
