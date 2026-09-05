package com.tradetracklive.scanner;

import android.app.*;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.hardware.display.DisplayManager;
import android.util.DisplayMetrics;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CaptureService extends Service {
    public static final String ACTION_START = "com.tradetracklive.scanner.START";
    public static final String ACTION_STOP = "com.tradetracklive.scanner.STOP";
    public static final String EXTRA_RESULT_CODE = "resultCode";
    public static final String EXTRA_RESULT_DATA = "resultData";

    private static final String CHANNEL_ID = "ttl_screen_scanner";
    private static final String ENDPOINT =
            "https://base44.app/api/apps/6a1d6d69aab915d09b7b082d/functions/analyzeMobileScreenCapture";
    private static final String APP_ID = "6a1d6d69aab915d09b7b082d";

    private WindowManager windowManager;
    private TextView bubble;
    private WindowManager.LayoutParams bubbleParams;
    private MediaProjection projection;
    private ImageReader imageReader;
    private VirtualDisplay virtualDisplay;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private boolean analyzing = false;
    private boolean stopping = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        startForeground(71, buildNotification("Scanner ready"));
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        if (ACTION_STOP.equals(intent.getAction())) {
            stopScanner();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(intent.getAction())) {
            int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED);
            Intent data;
            if (Build.VERSION.SDK_INT >= 33) {
                data = intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent.class);
            } else {
                data = intent.getParcelableExtra(EXTRA_RESULT_DATA);
            }

            if (resultCode == Activity.RESULT_OK && data != null) {
                MediaProjectionManager manager =
                        (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
                projection = manager.getMediaProjection(resultCode, data);
                setupCapture();
                showBubble();
            }
        }

        return START_STICKY;
    }

    private void setupCapture() {
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        int width = metrics.widthPixels;
        int height = metrics.heightPixels;
        int density = metrics.densityDpi;

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 3);

        // Android 14+ requires the callback to be registered before creating
        // the VirtualDisplay for a MediaProjection session.
        projection.registerCallback(new MediaProjection.Callback() {
            @Override public void onStop() {
                cleanupScanner(false);
            }
        }, new Handler(Looper.getMainLooper()));

        virtualDisplay = projection.createVirtualDisplay(
                "TradeTrackScanner",
                width,
                height,
                density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(),
                null,
                null
        );
    }

    private void showBubble() {
        if (!Settings.canDrawOverlays(this) || bubble != null) return;

        bubble = new TextView(this);
        bubble.setText("TT\nSCAN");
        bubble.setGravity(Gravity.CENTER);
        bubble.setTextColor(Color.WHITE);
        bubble.setTextSize(12);
        bubble.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.rgb(13, 50, 39));
        bg.setStroke(dp(1), Color.rgb(52, 211, 153));
        bg.setCornerRadius(dp(18));
        bubble.setBackground(bg);

        int type = Build.VERSION.SDK_INT >= 26
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        bubbleParams = new WindowManager.LayoutParams(
                dp(68), dp(68), type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
        );
        bubbleParams.gravity = Gravity.TOP | Gravity.END;
        bubbleParams.x = dp(12);
        bubbleParams.y = dp(180);

        final float[] downRawX = new float[1];
        final float[] downRawY = new float[1];
        final int[] startX = new int[1];
        final int[] startY = new int[1];
        final boolean[] moved = new boolean[1];

        bubble.setOnTouchListener((v, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    downRawX[0] = event.getRawX();
                    downRawY[0] = event.getRawY();
                    startX[0] = bubbleParams.x;
                    startY[0] = bubbleParams.y;
                    moved[0] = false;
                    return true;

                case MotionEvent.ACTION_MOVE:
                    float dx = event.getRawX() - downRawX[0];
                    float dy = event.getRawY() - downRawY[0];
                    if (Math.abs(dx) > dp(4) || Math.abs(dy) > dp(4)) moved[0] = true;

                    // Gravity is TOP|END, so horizontal movement is reversed.
                    bubbleParams.x = Math.max(0, startX[0] - Math.round(dx));
                    bubbleParams.y = Math.max(0, startY[0] + Math.round(dy));
                    try { windowManager.updateViewLayout(bubble, bubbleParams); } catch (Exception ignored) {}
                    return true;

                case MotionEvent.ACTION_UP:
                    if (!moved[0]) captureAndAnalyze();
                    return true;
            }
            return false;
        });

        windowManager.addView(bubble, bubbleParams);
    }

    private void captureAndAnalyze() {
        if (analyzing || imageReader == null || bubble == null) return;

        analyzing = true;
        bubble.setText("…\nSCAN");
        bubble.setVisibility(View.INVISIBLE);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Image image = imageReader.acquireLatestImage();
            if (image == null) {
                bubble.setVisibility(View.VISIBLE);
                bubble.setText("TT\nSCAN");
                analyzing = false;
                return;
            }

            Bitmap bitmap = imageToBitmap(image);
            image.close();

            if (bitmap == null) {
                bubble.setVisibility(View.VISIBLE);
                bubble.setText("TT\nSCAN");
                analyzing = false;
                return;
            }

            io.submit(() -> {
                try {
                    Bitmap scaled = scaleForUpload(bitmap, 1080);
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    scaled.compress(Bitmap.CompressFormat.JPEG, 82, bos);
                    byte[] jpeg = bos.toByteArray();

                    JSONObject result = postFrame(jpeg, scaled.getWidth(), scaled.getHeight());
                    JSONObject scan = result.optJSONObject("scan");

                    if (scan == null) throw new IOException(result.optString("error", "No scan result"));

                    String decision = scan.optString("decision", "SKIP").toUpperCase();
                    int score = (int) Math.round(scan.optDouble("setupScore", 0));
                    String asset = scan.optString("asset", "—");
                    int payout = (int) Math.round(scan.optDouble("payout", 0));
                    String rationale = scan.optString("rationale", "");

                    new Handler(Looper.getMainLooper()).post(() -> {
                        bubble.setVisibility(View.VISIBLE);
                        if ("UP".equals(decision)) bubble.setText("↑\nUP\n" + score);
                        else if ("DOWN".equals(decision)) bubble.setText("↓\nDOWN\n" + score);
                        else bubble.setText("—\nSKIP\n" + score);

                        bubble.setContentDescription(asset + " " + payout + "% " + decision + ". " + rationale);
                        analyzing = false;

                        new Handler(Looper.getMainLooper()).postDelayed(() -> {
                            if (bubble != null && !analyzing) bubble.setText("TT\nSCAN");
                        }, 12000);
                    });
                } catch (Exception e) {
                    new Handler(Looper.getMainLooper()).post(() -> {
                        bubble.setVisibility(View.VISIBLE);
                        bubble.setText("!\nERROR");
                        bubble.setContentDescription(e.getMessage());
                        analyzing = false;
                        new Handler(Looper.getMainLooper()).postDelayed(() -> {
                            if (bubble != null && !analyzing) bubble.setText("TT\nSCAN");
                        }, 5000);
                    });
                }
            });
        }, 180);
    }

    private Bitmap imageToBitmap(Image image) {
        try {
            Image.Plane plane = image.getPlanes()[0];
            ByteBuffer buffer = plane.getBuffer();
            int pixelStride = plane.getPixelStride();
            int rowStride = plane.getRowStride();
            int rowPadding = rowStride - pixelStride * image.getWidth();
            Bitmap padded = Bitmap.createBitmap(
                    image.getWidth() + rowPadding / pixelStride,
                    image.getHeight(),
                    Bitmap.Config.ARGB_8888
            );
            padded.copyPixelsFromBuffer(buffer);
            Bitmap cropped = Bitmap.createBitmap(
                    padded, 0, 0, image.getWidth(), image.getHeight()
            );
            if (cropped != padded) padded.recycle();
            return cropped;
        } catch (Exception e) {
            return null;
        }
    }

    private Bitmap scaleForUpload(Bitmap input, int maxWidth) {
        if (input.getWidth() <= maxWidth) return input;
        float ratio = maxWidth / (float) input.getWidth();
        int h = Math.round(input.getHeight() * ratio);
        return Bitmap.createScaledBitmap(input, maxWidth, h, true);
    }

    private JSONObject postFrame(byte[] jpeg, int width, int height) throws Exception {
        SharedPreferences prefs = getSharedPreferences("ttl_scanner", MODE_PRIVATE);
        String token = prefs.getString("bridgeToken", "");
        if (token == null || token.trim().isEmpty()) throw new IOException("Scanner Token missing");

        String boundary = "----TTL" + System.currentTimeMillis();
        HttpURLConnection conn = (HttpURLConnection) new URL(ENDPOINT).openConnection();
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(20000);
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("X-App-Id", APP_ID);
        conn.setRequestProperty("X-Bridge-Token", token);
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

        try (DataOutputStream out = new DataOutputStream(conn.getOutputStream())) {
            writeField(out, boundary, "bridgeToken", token);
            writeField(out, boundary, "capturedAt", Instant.now().toString());
            writeField(out, boundary, "imageWidth", String.valueOf(width));
            writeField(out, boundary, "imageHeight", String.valueOf(height));

            out.writeBytes("--" + boundary + "\r\n");
            out.writeBytes("Content-Disposition: form-data; name=\"frame\"; filename=\"screen.jpg\"\r\n");
            out.writeBytes("Content-Type: image/jpeg\r\n\r\n");
            out.write(jpeg);
            out.writeBytes("\r\n--" + boundary + "--\r\n");
            out.flush();
        }

        int code = conn.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
        String body = readAll(stream);
        JSONObject json = new JSONObject(body);
        if (code < 200 || code >= 300 || !json.optBoolean("success", false)) {
            throw new IOException(json.optString("error", "HTTP " + code));
        }
        return json;
    }

    private void writeField(DataOutputStream out, String boundary, String name, String value) throws IOException {
        out.writeBytes("--" + boundary + "\r\n");
        out.writeBytes("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n");
        out.write(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        out.writeBytes("\r\n");
    }

    private String readAll(InputStream stream) throws IOException {
        if (stream == null) return "";
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        return sb.toString();
    }

    private Notification buildNotification(String text) {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(
                this, 1, open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        return new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("TradeTrack Screen Scanner")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setContentIntent(pending)
                .setOngoing(true)
                .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Screen Scanner",
                    NotificationManager.IMPORTANCE_LOW
            );
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
    }

    private void stopScanner() {
        cleanupScanner(true);
    }

    private void cleanupScanner(boolean stopProjection) {
        if (stopping) return;
        stopping = true;

        try { if (bubble != null) windowManager.removeView(bubble); } catch (Exception ignored) {}
        bubble = null;

        try { if (virtualDisplay != null) virtualDisplay.release(); } catch (Exception ignored) {}
        virtualDisplay = null;

        try { if (imageReader != null) imageReader.close(); } catch (Exception ignored) {}
        imageReader = null;

        MediaProjection currentProjection = projection;
        projection = null;
        if (stopProjection && currentProjection != null) {
            try { currentProjection.stop(); } catch (Exception ignored) {}
        }

        try { stopForeground(STOP_FOREGROUND_REMOVE); } catch (Exception ignored) {}
        stopSelf();
    }

    @Override
    public void onDestroy() {
        cleanupScanner(false);
        io.shutdownNow();
        super.onDestroy();
    }

    @Override public android.os.IBinder onBind(Intent intent) { return null; }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}