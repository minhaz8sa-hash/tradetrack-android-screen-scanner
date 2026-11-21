package com.tigers71.esports;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.content.pm.PackageManager;
import android.Manifest;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.Calendar;
import java.util.TimeZone;

public final class T71Notifications {
    private static final String CHANNEL = "t71_events";
    private static final int[] WAR_DAYS = {
        Calendar.WEDNESDAY, Calendar.FRIDAY, Calendar.SATURDAY
    };
    private T71Notifications() {}

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Tiger 71 Events", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Guild War, Glory and guild message alerts");
            manager.createNotificationChannel(channel);
        }
    }

    public static boolean isGranted(Context c) {
        return (Build.VERSION.SDK_INT < 33 ||
                c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
                && NotificationManagerCompat.from(c).areNotificationsEnabled();
    }

    public static void enable(Context context) {
        if (!isGranted(context)) return;
        context.getSharedPreferences("t71", Context.MODE_PRIVATE).edit()
                .putBoolean("guild_notifications_enabled", true).apply();
        ensureChannel(context);
        scheduleAll(context);
    }

    public static void scheduleAll(Context context) {
        if (!context.getSharedPreferences("t71", Context.MODE_PRIVATE)
                .getBoolean("guild_notifications_enabled", false)) return;
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        TimeZone dhaka = TimeZone.getTimeZone("Asia/Dhaka");
        for (int day : WAR_DAYS) {
            Calendar fire = Calendar.getInstance(dhaka);
            fire.set(Calendar.DAY_OF_WEEK, day);
            fire.set(Calendar.HOUR_OF_DAY, 19);
            fire.set(Calendar.MINUTE, 0);
            fire.set(Calendar.SECOND, 0);
            fire.set(Calendar.MILLISECOND, 0);
            if (fire.getTimeInMillis() <= System.currentTimeMillis()) fire.add(Calendar.WEEK_OF_YEAR, 1);
            Intent intent = new Intent(context, GuildWarReceiver.class);
            intent.setAction("com.tigers71.esports.GUILD_WAR_" + day);
            PendingIntent alarm = PendingIntent.getBroadcast(context, 7100 + day, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarms.canScheduleExactAlarms()) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fire.getTimeInMillis(), alarm);
                else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fire.getTimeInMillis(), alarm);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fire.getTimeInMillis(), alarm);
            } else {
                alarms.setExact(AlarmManager.RTC_WAKEUP, fire.getTimeInMillis(), alarm);
            }
        }
    }

    public static void showLocal(Context context, String kind) {
        if (!isGranted(context)) return;
        final String title, body, target;
        final int id;
        switch (kind) {
            case "war":
                title = "Guild War Is Started";
                body = "টিমের সাথে গেমে আসুন।";
                target = "/tournaments";
                id = 7101;
                break;
            case "glory":
                title = "Tigers 71 Glory Update";
                body = "নতুন গ্লোরি র‍্যাঙ্কিং প্রকাশিত হয়েছে।";
                target = "/glory";
                id = 7102;
                break;
            case "chat":
                title = "Tigers 71 Messenger";
                body = "তোমার জন্য নতুন মেসেজ এসেছে।";
                target = "/messenger";
                id = 7103;
                break;
            case "test":
                title = "Tigers 71 Notifications";
                body = "নোটিফিকেশন চালু হয়েছে। বুধবার, শুক্রবার ও শনিবার সন্ধ্যা ৭টায় Guild War মনে করিয়ে দেওয়া হবে।";
                target = "/";
                id = 7104;
                break;
            default: return;
        }
        Intent launch = new Intent(context, MainActivity.class);
        launch.setAction(Intent.ACTION_VIEW);
        launch.setData(android.net.Uri.parse("https://tiger-71.com" + target));
        launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, id, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        ensureChannel(context);
        NotificationCompat.Builder message = new NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(pending)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);
        try { NotificationManagerCompat.from(context).notify(id, message.build()); }
        catch (SecurityException ignored) {}
    }
}
