package com.mirex.namazorbit;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

public final class AlarmScheduler {
    private static final String PREFS = "namaz_orbit_alarms";
    private static final String KEY = "items";

    private AlarmScheduler() {}

    public static void schedule(Context context, String id, String prayerName, long atMillis, String soundType, boolean persist) {
        schedule(context, id, prayerName, "It is time for prayer. Open Namaz Orbit to update your status.", atMillis, soundType, true, persist);
    }

    public static void schedule(Context context, String id, String title, String body, long atMillis, String soundType, boolean vibrate, boolean persist) {
        if (atMillis <= System.currentTimeMillis() + 500) return;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(context, PrayerAlarmReceiver.class);
        i.putExtra("id", id);
        i.putExtra("prayer", title);
        i.putExtra("body", body);
        i.putExtra("sound", soundType);
        i.putExtra("vibrate", vibrate);
        PendingIntent pi = PendingIntent.getBroadcast(
                context,
                Math.abs(id.hashCode()),
                i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pi);
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pi);
        }
        if (persist) save(context, id, title, body, atMillis, soundType, vibrate);
    }

    private static void save(Context context, String id, String title, String body, long atMillis, String soundType, boolean vibrate) {
        try {
            SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray old = new JSONArray(p.getString(KEY, "[]"));
            JSONArray next = new JSONArray();
            for (int x = 0; x < old.length(); x++) {
                JSONObject item = old.getJSONObject(x);
                if (!id.equals(item.optString("id"))) next.put(item);
            }
            JSONObject item = new JSONObject();
            item.put("id", id);
            item.put("prayer", title);
            item.put("body", body);
            item.put("at", atMillis);
            item.put("sound", soundType);
            item.put("vibrate", vibrate);
            next.put(item);
            p.edit().putString(KEY, next.toString()).apply();
        } catch (Exception ignored) {}
    }

    public static void cancel(Context context, String id) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent i = new Intent(context, PrayerAlarmReceiver.class);
            PendingIntent pi = PendingIntent.getBroadcast(context, Math.abs(id.hashCode()), i,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
            if (pi != null) {
                am.cancel(pi);
                pi.cancel();
            }
            SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray old = new JSONArray(p.getString(KEY, "[]"));
            JSONArray next = new JSONArray();
            for (int x = 0; x < old.length(); x++) {
                JSONObject item = old.getJSONObject(x);
                if (!id.equals(item.optString("id"))) next.put(item);
            }
            p.edit().putString(KEY, next.toString()).apply();
        } catch (Exception ignored) {}
    }

    public static void cancelByPrefix(Context context, String prefix) {
        try {
            SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray old = new JSONArray(p.getString(KEY, "[]"));
            for (int x = 0; x < old.length(); x++) {
                String id = old.getJSONObject(x).optString("id");
                if (id.startsWith(prefix)) cancelPendingOnly(context, id);
            }
            JSONArray refreshed = new JSONArray(p.getString(KEY, "[]"));
            JSONArray next = new JSONArray();
            for (int x = 0; x < refreshed.length(); x++) {
                JSONObject item = refreshed.getJSONObject(x);
                if (!item.optString("id").startsWith(prefix)) next.put(item);
            }
            p.edit().putString(KEY, next.toString()).apply();
        } catch (Exception ignored) {}
    }

    public static void clearAll(Context context) {
        try {
            SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray old = new JSONArray(p.getString(KEY, "[]"));
            for (int x = 0; x < old.length(); x++) cancelPendingOnly(context, old.getJSONObject(x).optString("id"));
            p.edit().putString(KEY, "[]").apply();
        } catch (Exception ignored) {}
    }

    private static void cancelPendingOnly(Context context, String id) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(context, PrayerAlarmReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(context, Math.abs(id.hashCode()), i,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pi != null) {
            am.cancel(pi);
            pi.cancel();
        }
    }

    public static void rescheduleAll(Context context) {
        try {
            SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray items = new JSONArray(p.getString(KEY, "[]"));
            long now = System.currentTimeMillis();
            for (int x = 0; x < items.length(); x++) {
                JSONObject item = items.getJSONObject(x);
                long at = item.optLong("at", 0);
                if (at > now) {
                    schedule(context,
                            item.optString("id"),
                            item.optString("prayer"),
                            item.optString("body", "Open Namaz Orbit to update your prayer status."),
                            at,
                            item.optString("sound", "alarm"),
                            item.optBoolean("vibrate", true),
                            false);
                }
            }
        } catch (Exception ignored) {}
    }
}
