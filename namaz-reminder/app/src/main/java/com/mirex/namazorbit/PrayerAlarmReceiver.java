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
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PrayerAlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_DISMISS = "com.mirex.namazorbit.DISMISS_ALARM";
    public static final String ACTION_COMPLETE = "com.mirex.namazorbit.COMPLETE_PRAYER";

    private static final Pattern PRAYER_EVENT = Pattern.compile(
            "^NO_(\\d{4}-\\d{2}-\\d{2})_(fajr|dhuhr|asr|maghrib|isha)_(start|end_20)$"
    );

    private static Vibrator getVibrator(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vm != null ? vm.getDefaultVibrator() : null;
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    private static void startAlarmVibration(Context context) {
        Vibrator vibrator = getVibrator(context);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        long[] pattern = new long[]{
                0, 700, 300, 700, 300, 900,
                450, 700, 300, 700, 300, 900
        };
        vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
    }

    private static void stopAlarmVibration(Context context) {
        Vibrator vibrator = getVibrator(context);
        if (vibrator != null) vibrator.cancel();
    }

    private static String[] parsePrayerTarget(String eventId) {
        if (eventId == null) return null;
        Matcher m = PRAYER_EVENT.matcher(eventId);
        if (!m.matches()) return null;
        return new String[]{m.group(1), m.group(2)};
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String action = intent.getAction();

        if (ACTION_DISMISS.equals(action)) {
            int notificationId = intent.getIntExtra("notification_id", -1);
            stopAlarmVibration(context);
            if (notificationId >= 0) nm.cancel(notificationId);
            return;
        }

        if (ACTION_COMPLETE.equals(action)) {
            int notificationId = intent.getIntExtra("notification_id", -1);
            String dateKey = intent.getStringExtra("date_key");
            String prayerKey = intent.getStringExtra("prayer_key");

            stopAlarmVibration(context);
            if (notificationId >= 0) nm.cancel(notificationId);

            if (dateKey != null && prayerKey != null) {
                Intent open = new Intent(context, MainActivity.class);
                open.setAction(ACTION_COMPLETE);
                open.putExtra("date_key", dateKey);
                open.putExtra("prayer_key", prayerKey);
                open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                context.startActivity(open);
            }
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

        if (vibrate) startAlarmVibration(context);

        String channelId = "prayer_v5_" + sound + "_" + (vibrate ? "v" : "n");
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
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
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

        String[] target = parsePrayerTarget(eventId);
        PendingIntent completePending = null;
        if (target != null) {
            Intent complete = new Intent(context, PrayerAlarmReceiver.class);
            complete.setAction(ACTION_COMPLETE);
            complete.putExtra("notification_id", notificationId);
            complete.putExtra("date_key", target[0]);
            complete.putExtra("prayer_key", target[1]);
            completePending = PendingIntent.getBroadcast(
                    context,
                    notificationId + 7000,
                    complete,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        Notification.Builder b = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, channelId)
                : new Notification.Builder(context);
        b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(prayer)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(content)
                .setDeleteIntent(dismissPending)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .setPriority(Notification.PRIORITY_MAX)
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC);

        if (completePending != null) {
            b.addAction(android.R.drawable.checkbox_on_background, "Complete", completePending);
        }
        b.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", dismissPending);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            if (!"silent".equals(sound)) b.setSound(uri);
            if (vibrate) b.setVibrate(new long[]{0, 450, 180, 450});
        }
        nm.notify(notificationId, b.build());
    }
}
