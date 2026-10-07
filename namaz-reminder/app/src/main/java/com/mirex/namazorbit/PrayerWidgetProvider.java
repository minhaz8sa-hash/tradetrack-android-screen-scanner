package com.mirex.namazorbit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import java.util.Locale;

public class PrayerWidgetProvider extends AppWidgetProvider {
    private static final String PREFS = "namaz_orbit_widget";

    public static void storeAndUpdate(Context context, String nextPrayer, String startTime, String countdown, double qiblaBearing) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit()
                .putString("next_prayer", nextPrayer)
                .putString("start_time", startTime)
                .putString("countdown", countdown)
                .putFloat("qibla", (float) qiblaBearing)
                .apply();
        updateAll(context);
    }

    public static void storeAndUpdateV2(Context context, String nextPrayer, String startTime, String countdown, double qiblaBearing, int qazaDue, String currentPrayer) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit()
                .putString("next_prayer", nextPrayer)
                .putString("start_time", startTime)
                .putString("countdown", countdown)
                .putFloat("qibla", (float) qiblaBearing)
                .putInt("qaza_due", Math.max(0, qazaDue))
                .putString("current_prayer", currentPrayer == null ? "Between prayers" : currentPrayer)
                .apply();
        updateAll(context);
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PrayerWidgetProvider.class));
        for (int id : ids) update(context, manager, id);
    }

    private static void update(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String next = p.getString("next_prayer", "Open Namaz Orbit");
        String start = p.getString("start_time", "Prayer time");
        String count = p.getString("countdown", "—");
        float qibla = p.getFloat("qibla", 0f);
        int qazaDue = p.getInt("qaza_due", 0);
        String currentPrayer = p.getString("current_prayer", "Between prayers");

        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_prayer);
        v.setTextViewText(R.id.widget_next_prayer, next);
        v.setTextViewText(R.id.widget_start_time, start);
        v.setTextViewText(R.id.widget_countdown, count);
        v.setTextViewText(R.id.widget_qibla, String.format(Locale.US, "Qibla %.0f°", qibla));
        v.setTextViewText(R.id.widget_current, currentPrayer);
        v.setTextViewText(R.id.widget_qaza, "Qaza " + qazaDue);

        Intent open = new Intent(context, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(
                context, 6001, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        v.setOnClickPendingIntent(R.id.widget_root, pi);
        manager.updateAppWidget(appWidgetId, v);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) update(context, appWidgetManager, id);
    }
}
