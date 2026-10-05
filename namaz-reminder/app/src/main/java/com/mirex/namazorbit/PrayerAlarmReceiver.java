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
    @Override
    public void onReceive(Context context, Intent intent) {
        String prayer = intent.getStringExtra("prayer");
        String sound = intent.getStringExtra("sound");
        if (prayer == null) prayer = "Prayer";
        if (sound == null) sound = "alarm";

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "prayer_" + sound;
        Uri uri = "notification".equals(sound)
                ? Settings.System.DEFAULT_NOTIFICATION_URI
                : Settings.System.DEFAULT_ALARM_ALERT_URI;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Prayer alerts (" + sound + ")",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
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
                context, 1001, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, channelId)
                : new Notification.Builder(context);
        b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(prayer)
                .setContentText("It is time for prayer. Open Namaz Orbit to mark your status.")
                .setContentIntent(content)
                .setAutoCancel(true)
                .setPriority(Notification.PRIORITY_MAX)
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O && !"silent".equals(sound)) {
            b.setSound(uri).setVibrate(new long[]{0, 400, 250, 400});
        }
        nm.notify(Math.abs((prayer + System.currentTimeMillis()/60000).hashCode()), b.build());
    }
}
