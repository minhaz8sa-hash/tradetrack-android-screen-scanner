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
        if (atMillis <= System.currentTimeMillis() + 1000) return;
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(context, PrayerAlarmReceiver.class);
        i.putExtra("id", id);
        i.putExtra("prayer", prayerName);
        i.putExtra("sound", soundType);
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
        if (persist) save(context, id, prayerName, atMillis, soundType);
    }

    private static void save(Context context, String id, String prayerName, long atMillis, String soundType) {
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
            item.put("prayer", prayerName);
            item.put("at", atMillis);
            item.put("sound", soundType);
            next.put(item);
            p.edit().putString(KEY, next.toString()).apply();
        } catch (Exception ignored) {}
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
                            at,
                            item.optString("sound", "alarm"),
                            false);
                }
            }
        } catch (Exception ignored) {}
    }
}
