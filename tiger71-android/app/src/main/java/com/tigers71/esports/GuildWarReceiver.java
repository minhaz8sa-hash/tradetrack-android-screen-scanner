package com.tigers71.esports;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class GuildWarReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!context.getSharedPreferences("t71", Context.MODE_PRIVATE)
                .getBoolean("guild_notifications_enabled", false)) return;
        T71Notifications.showLocal(context, "war");
        // One alarm per Guild War day; reschedule for the following week.
        T71Notifications.scheduleAll(context);
    }
}
