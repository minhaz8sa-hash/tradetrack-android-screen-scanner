package com.tradetracklive.scanner;

import android.app.*;
import android.content.Context;
import android.content.Intent;
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
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CaptureService extends Service {
    public static final String ACTION_START = "com.tradetracklive.scanner.START";
    public static final String ACTION_STOP = "com.tradetracklive.scanner.STOP";
    public static final String EXTRA_RESULT_CODE = "resultCode";
    public static final String EXTRA_RESULT_DATA = "resultData";

    private static final String CHANNEL_ID = "ttl_screen_scanner";
    private static final String ENDPOINT = BuildConfig.TT_ENGINE_ENDPOINT;
    private static final String CLIENT_TOKEN = BuildConfig.TT_CLIENT_TOKEN;

    private WindowManager windowManager;
    private TextView bubble;
    private WindowManager.LayoutParams bubbleParams;
    private MediaProjection projection;
    private ImageReader imageReader;
    private VirtualDisplay virtualDisplay;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private boolean analyzing = false;
    private boolean armed = false;
    private String scanSessionId = null;
    private int scanAttempt = 0;
    private int fullRetries = 0;
    private int verifyRetries = 0;
    private boolean fullAnalysisDone = false;
    private boolean verifyScheduled = false;
    private boolean verifyAnalysisDone = false;
    private String earlyDirection = "";
    private long verifyCompletedEpochMs = 0L;
    private long estimatedCloseEpochMs = 0L;
    private long scanStartedEpochMs = 0L;
    private boolean heldCandidateReady = false;
    private String heldDirection = "";
    private int heldUp = 50;
    private int heldDown = 50;
    private int heldInstability = 100;
    private double heldSourceSeconds = -1;
    private String heldAsset = "—";
    private int heldPayout = 0;
    private String heldAnalysisId = "";
    private boolean stopping = false;
    private static final long CANDLE_MS = 60_000L;
    private static final long VERIFY_LEAD_MS = 12_000L;
    private static final long FINAL_SIGNAL_START_MS = 5_000L;
    private static final long FINAL_SIGNAL_END_MS = 2_000L;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private final Runnable finalWindowWatcher = new Runnable() {
        @Override public void run() {
            if (!armed || bubble == null || estimatedCloseEpochMs <= 0L) return;

            long remainingMs = estimatedCloseEpochMs - System.currentTimeMillis();

            if (
                    remainingMs <= FINAL_SIGNAL_START_MS
                    && remainingMs >= FINAL_SIGNAL_END_MS
                    && heldCandidateReady
                    && verifyAnalysisDone
                    && verifyCompletedEpochMs >= estimatedCloseEpochMs - 18_000L
            ) {
                releaseHeldSignal();
                return;
            }

            if (remainingMs < FINAL_SIGNAL_END_MS) {
                finishNoTrade("No stable late verification before the locked target candle.");
                return;
            }

            mainHandler.postDelayed(this, 250);
        }
    };

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
                dp(108), dp(88), type,
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
                    if (!moved[0]) {
                        if (armed) cancelArmedScan();
                        else armScanner();
                    }
                    return true;
            }
            return false;
        });

        windowManager.addView(bubble, bubbleParams);
    }

    private void armScanner() {
        if (imageReader == null || bubble == null) return;
        if (ENDPOINT == null || ENDPOINT.trim().isEmpty()) {
            bubble.setVisibility(View.VISIBLE);
            bubble.setText("ENGINE URL\nMISSING");
            bubble.setContentDescription("TT Intelligence Engine endpoint is not configured in this APK build.");
            return;
        }
        armed = true;
        scanAttempt = 0;
        fullRetries = 0;
        verifyRetries = 0;
        fullAnalysisDone = false;
        verifyScheduled = false;
        verifyAnalysisDone = false;
        earlyDirection = "";
        verifyCompletedEpochMs = 0L;
        scanSessionId = UUID.randomUUID().toString();

        long now = System.currentTimeMillis();
        scanStartedEpochMs = now;
        // One tap = exactly one target candle. Lock to the next 1M boundary
        // immediately; never let a late cloud response roll the target forward.
        estimatedCloseEpochMs = ((now / CANDLE_MS) + 1L) * CANDLE_MS;

        heldCandidateReady = false;
        heldDirection = "";
        heldUp = 50;
        heldDown = 50;
        heldInstability = 100;
        heldSourceSeconds = -1;
        heldAsset = "—";
        heldPayout = 0;
        heldAnalysisId = "";

        mainHandler.removeCallbacks(finalWindowWatcher);
        mainHandler.post(finalWindowWatcher);
        bubble.setText("ARMED\nNEXT " + formatTargetTime(estimatedCloseEpochMs));
        bubble.setContentDescription(
                "Scanner armed. Target candle is locked to " +
                        formatTargetTime(estimatedCloseEpochMs) + "."
        );
        captureAndAnalyze("full");
    }

    private void cancelArmedScan() {
        armed = false;
        scanSessionId = null;
        scanAttempt = 0;
        fullRetries = 0;
        verifyRetries = 0;
        fullAnalysisDone = false;
        verifyScheduled = false;
        verifyAnalysisDone = false;
        earlyDirection = "";
        verifyCompletedEpochMs = 0L;
        estimatedCloseEpochMs = 0L;
        scanStartedEpochMs = 0L;
        heldCandidateReady = false;
        heldAnalysisId = "";
        mainHandler.removeCallbacks(finalWindowWatcher);
        if (bubble != null) {
            bubble.setVisibility(View.VISIBLE);
            bubble.setText("TT\nSCAN");
            bubble.setContentDescription("Scanner cancelled");
        }
    }

    private void releaseHeldSignal() {
        if (!armed || bubble == null || !heldCandidateReady) return;

        final String direction = heldDirection;
        final String analysisId = heldAnalysisId;
        final String asset = heldAsset;
        final int up = heldUp;
        final int down = heldDown;
        final int instability = heldInstability;
        final long targetOpenMs = estimatedCloseEpochMs;
        final String arrow = "UP".equals(direction) ? "↑" : "↓";
        final String targetTime = formatTargetTime(targetOpenMs);

        bubble.setVisibility(View.VISIBLE);
        bubble.setText("NEXT " + targetTime + "\n" + arrow + " " + direction + " LOCKED");
        bubble.setContentDescription(
                asset + ". Locked signal for the next candle opening at " + targetTime + ". " +
                        direction + ". UP " + up + "%, DOWN " + down +
                        "%. Final instability " + instability + "."
        );

        armed = false;
        analyzing = false;
        scanSessionId = null;
        fullAnalysisDone = false;
        verifyScheduled = false;
        verifyAnalysisDone = false;
        earlyDirection = "";
        verifyCompletedEpochMs = 0L;
        estimatedCloseEpochMs = 0L;
        scanStartedEpochMs = 0L;
        heldCandidateReady = false;
        heldAnalysisId = "";
        mainHandler.removeCallbacks(finalWindowWatcher);

        long untilOpen = Math.max(0L, targetOpenMs - System.currentTimeMillis());
        mainHandler.postDelayed(() -> {
            if (bubble == null || armed) return;
            bubble.setVisibility(View.VISIBLE);
            bubble.setText("ENTER NEXT " + arrow + "\n" + direction + " • " + targetTime);
            bubble.setContentDescription("Entry window for the " + targetTime + " target candle. " + direction + ".");
        }, untilOpen);

        mainHandler.postDelayed(() -> {
            if (bubble == null || armed) return;
            bubble.setText("SIGNAL EXPIRED\nDO NOT CHASE");
            bubble.setContentDescription("The entry window for the target candle has expired.");
        }, untilOpen + 3000L);

        mainHandler.postDelayed(() -> {
            if (bubble != null && !armed && !analyzing) bubble.setText("TT\nSCAN");
        }, untilOpen + 9000L);

        if (analysisId != null && !analysisId.isEmpty() && targetOpenMs > 0L) {
            scheduleOutcomeCapture(analysisId, asset, targetOpenMs);
        }
    }

    private String formatTargetTime(long epochMs) {
        if (epochMs <= 0L) return "NEXT";
        try {
            return Instant.ofEpochMilli(epochMs)
                    .atZone(ZoneId.systemDefault())
                    .format(DateTimeFormatter.ofPattern("HH:mm"));
        } catch (Exception ignored) {
            return "NEXT";
        }
    }

    private void finishNoTrade(String reason) {
        if (bubble != null) {
            bubble.setVisibility(View.VISIBLE);
            bubble.setText("NO TRADE\nNEXT");
            bubble.setContentDescription(reason);
        }
        armed = false;
        analyzing = false;
        scanSessionId = null;
        fullAnalysisDone = false;
        verifyScheduled = false;
        verifyAnalysisDone = false;
        earlyDirection = "";
        verifyCompletedEpochMs = 0L;
        estimatedCloseEpochMs = 0L;
        scanStartedEpochMs = 0L;
        heldCandidateReady = false;
        heldAnalysisId = "";
        mainHandler.removeCallbacks(finalWindowWatcher);

        mainHandler.postDelayed(() -> {
            if (bubble != null && !armed && !analyzing) bubble.setText("TT\nSCAN");
        }, 7000);
    }

    private void scheduleSingleVerification() {
        if (!armed || bubble == null || verifyScheduled || estimatedCloseEpochMs <= 0L) return;

        long now = System.currentTimeMillis();
        long remainingMs = estimatedCloseEpochMs - now;
        if (remainingMs <= 7000L) {
            finishNoTrade("Full analysis finished too late for a safe late verification.");
            return;
        }

        verifyScheduled = true;
        long verifyAtMs = estimatedCloseEpochMs - VERIFY_LEAD_MS;
        long delayMs = Math.max(0L, verifyAtMs - now);

        if (earlyDirection != null && !earlyDirection.isEmpty()) {
            bubble.setText("CANDIDATE " + earlyDirection + "\nVERIFY T-12");
        } else {
            bubble.setText("WAIT\nVERIFY T-12");
        }

        mainHandler.postDelayed(() -> {
            if (!armed || analyzing || verifyAnalysisDone || bubble == null) return;
            captureAndAnalyze("verify");
        }, delayMs);
    }

    private void captureAndAnalyze(String analysisMode) {
        if (!armed || analyzing || imageReader == null || bubble == null) return;
        if (!"full".equals(analysisMode) && !"verify".equals(analysisMode)) return;

        long remainingBeforeCapture = estimatedCloseEpochMs - System.currentTimeMillis();
        if (remainingBeforeCapture <= FINAL_SIGNAL_END_MS) {
            finishNoTrade("Target candle deadline already reached.");
            return;
        }
        if ("full".equals(analysisMode) && fullAnalysisDone) return;
        if ("verify".equals(analysisMode) && (!fullAnalysisDone || verifyAnalysisDone)) return;

        analyzing = true;
        scanAttempt++;
        final String thisSessionId = scanSessionId;
        final String thisMode = analysisMode;
        bubble.setText("CAPTURING\n" + ("full".equals(thisMode) ? "FULL" : "VERIFY"));
        bubble.setVisibility(View.INVISIBLE);

        io.submit(() -> {
            try {
                // Fast mode: one screenshot contains the recent candle sequence.
                // A second OpenAI call at T-12 supplies the temporal/late verification.
                final int frameIntervalMs = 0;
                final int targetFrames = 1;
                final int maxWidth = "full".equals(thisMode) ? 768 : 640;
                final int jpegQuality = "full".equals(thisMode) ? 72 : 66;

                List<byte[]> frames = new ArrayList<>();
                int outWidth = 0;
                int outHeight = 0;

                for (int i = 0; i < targetFrames; i++) {
                    Thread.sleep(120);

                    Bitmap raw = acquireLatestBitmap();
                    if (raw == null) continue;

                    Bitmap cropped = cropForAnalysis(raw);
                    Bitmap scaled = scaleForUpload(cropped, maxWidth);
                    outWidth = scaled.getWidth();
                    outHeight = scaled.getHeight();

                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    scaled.compress(Bitmap.CompressFormat.JPEG, jpegQuality, bos);
                    frames.add(bos.toByteArray());

                    if (scaled != cropped) scaled.recycle();
                    if (cropped != raw) cropped.recycle();
                    raw.recycle();
                }

                if (frames.isEmpty()) throw new IOException("Unable to capture Quotex screen");

                mainHandler.post(() -> {
                    if (bubble != null && armed && thisSessionId != null && thisSessionId.equals(scanSessionId)) {
                        bubble.setVisibility(View.VISIBLE);
                        bubble.setText("ANALYZING\n" + ("full".equals(thisMode) ? "FULL" : "VERIFY"));
                    }
                });

                JSONObject result = postFrames(
                        frames, outWidth, outHeight, frameIntervalMs, thisSessionId, thisMode
                );
                JSONObject scan = result.optJSONObject("scan");
                if (scan == null) throw new IOException(result.optString("error", "No scan result"));

                int up = (int) Math.round(scan.optDouble("upConfirmation", 50));
                int down = (int) Math.round(scan.optDouble("downConfirmation", 50));
                String biasState = scan.optString("biasState", "SCANNING").toUpperCase();
                double sourceSeconds = scan.optDouble("secondsToCandleClose", -1);
                boolean candidateReady = scan.optBoolean("candidateReady", false);
                String candidateDirection = scan.optString("candidateDirection", "SKIP").toUpperCase();
                String decisionState = scan.optString("decisionState", "").toUpperCase();
                int instability = (int) Math.round(scan.optDouble("endInstabilityScore", 100));
                String asset = scan.optString("asset", "—");
                int payout = (int) Math.round(scan.optDouble("payout", 0));
                String rationale = scan.optString("rationale", "");
                String analysisId = scan.optString("analysisId", "");

                mainHandler.post(() -> {
                    if (bubble == null) return;
                    if (!armed || thisSessionId == null || !thisSessionId.equals(scanSessionId)) {
                        analyzing = false;
                        return;
                    }

                    bubble.setVisibility(View.VISIBLE);
                    bubble.setContentDescription(
                            asset + " " + payout + "%. NEXT candle technical scores: UP " +
                                    up + ", DOWN " + down + ". " + rationale
                    );

                    if ("full".equals(thisMode)) {
                        fullAnalysisDone = true;

                        if (
                                "CANDIDATE".equals(decisionState)
                                && ("UP".equals(candidateDirection) || "DOWN".equals(candidateDirection))
                                && !"NO_TRADE".equals(biasState)
                        ) {
                            earlyDirection = candidateDirection;
                            bubble.setText(
                                    "CANDIDATE " + candidateDirection + "\n" +
                                            "UP " + up + " • DOWN " + down
                            );
                        } else {
                            earlyDirection = "";
                            bubble.setText("WAIT\nLATE VERIFY");
                        }

                        analyzing = false;
                        scheduleSingleVerification();
                        return;
                    }

                    verifyAnalysisDone = true;
                    verifyCompletedEpochMs = System.currentTimeMillis();

                    boolean directionValid =
                            "UP".equals(candidateDirection) || "DOWN".equals(candidateDirection);
                    boolean sameAsEarly =
                            directionValid && earlyDirection != null && !earlyDirection.isEmpty()
                                    && earlyDirection.equals(candidateDirection);
                    boolean lateOnlyStrong =
                            directionValid
                                    && (earlyDirection == null || earlyDirection.isEmpty())
                                    && Math.max(up, down) >= 72
                                    && instability <= 35;

                    if (
                            candidateReady
                                    && directionValid
                                    && instability <= 60
                                    && (sameAsEarly || lateOnlyStrong)
                    ) {
                        heldCandidateReady = true;
                        heldDirection = candidateDirection;
                        heldUp = up;
                        heldDown = down;
                        heldInstability = instability;
                        heldSourceSeconds = sourceSeconds;
                        heldAsset = asset;
                        heldPayout = payout;
                        heldAnalysisId = analysisId;

                        bubble.setText(
                                "VERIFIED " + candidateDirection + "\nWAIT NEXT"
                        );
                        analyzing = false;
                        return;
                    }

                    analyzing = false;
                    heldCandidateReady = false;
                    heldAnalysisId = "";

                    if (
                            directionValid
                                    && earlyDirection != null
                                    && !earlyDirection.isEmpty()
                                    && !earlyDirection.equals(candidateDirection)
                    ) {
                        finishNoTrade("Late verification contradicted the early candidate; no direction flip.");
                    } else {
                        finishNoTrade("Late verification did not confirm a stable next-candle setup.");
                    }
                });
            } catch (Exception e) {
                mainHandler.post(() -> {
                    if (bubble == null) return;
                    analyzing = false;
                    if (!armed) return;

                    String message = e.getMessage() == null ? "unknown engine error" : e.getMessage();
                    // No rolling retries. A backend full analysis already has one bounded
                    // transient retry; late verification is one-shot by design.
                    finishNoTrade(
                            ("full".equals(thisMode) ? "Full analysis failed: " : "Late verification failed: ")
                                    + message
                    );
                });
            }
        });
    }

    private Bitmap acquireLatestBitmap() {
        if (imageReader == null) return null;
        Image image = imageReader.acquireLatestImage();
        if (image == null) return null;
        try {
            return imageToBitmap(image);
        } finally {
            image.close();
        }
    }

    private Bitmap cropForAnalysis(Bitmap input) {
        // Remove most of the top account/balance strip while keeping the chart and pair/payout UI.
        int top = Math.max(0, Math.round(input.getHeight() * 0.065f));
        int bottomTrim = Math.max(0, Math.round(input.getHeight() * 0.015f));
        int height = input.getHeight() - top - bottomTrim;
        if (height <= 0) return input;
        return Bitmap.createBitmap(input, 0, top, input.getWidth(), height);
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

    private JSONObject postFrames(
            List<byte[]> frames,
            int width,
            int height,
            int frameIntervalMs,
            String scanSessionId,
            String analysisMode
    ) throws Exception {
        String boundary = "----TTL" + System.currentTimeMillis();
        HttpURLConnection conn = (HttpURLConnection) new URL(ENDPOINT).openConnection();
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(30000);
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Accept", "application/json");
        if (CLIENT_TOKEN != null && !CLIENT_TOKEN.isEmpty()) {
            conn.setRequestProperty("X-TT-Client", CLIENT_TOKEN);
        }
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

        try (DataOutputStream out = new DataOutputStream(conn.getOutputStream())) {
            writeField(out, boundary, "capturedAt", Instant.now().toString());
            writeField(out, boundary, "imageWidth", String.valueOf(width));
            writeField(out, boundary, "imageHeight", String.valueOf(height));
            writeField(out, boundary, "frameIntervalMs", String.valueOf(frameIntervalMs));
            writeField(out, boundary, "scanSessionId", scanSessionId == null ? "" : scanSessionId);
            writeField(out, boundary, "analysisMode", analysisMode == null ? "full" : analysisMode);

            String[] names = {"frame", "frame2", "frame3"};
            for (int i = 0; i < frames.size() && i < names.length; i++) {
                out.writeBytes("--" + boundary + "\r\n");
                out.writeBytes(
                        "Content-Disposition: form-data; name=\"" + names[i] +
                                "\"; filename=\"screen-" + (i + 1) + ".jpg\"\r\n"
                );
                out.writeBytes("Content-Type: image/jpeg\r\n\r\n");
                out.write(frames.get(i));
                out.writeBytes("\r\n");
            }

            out.writeBytes("--" + boundary + "--\r\n");
            out.flush();
        }

        int code = conn.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
        String body = readAll(stream);
        JSONObject json = new JSONObject(body);
        if (code < 200 || code >= 300 || !json.optBoolean("success", false)) {
            String detail = json.optString("detail", "");
            String error = json.optString("error", "");
            String message = !detail.isEmpty() ? detail : (!error.isEmpty() ? error : "HTTP " + code);
            throw new IOException(message);
        }
        return json;
    }

    private void scheduleOutcomeCapture(String analysisId, String asset, long targetOpenMs) {
        long captureAtMs = targetOpenMs + 62000L;
        long delay = Math.max(0L, captureAtMs - System.currentTimeMillis());

        mainHandler.postDelayed(() -> io.submit(() -> {
            try {
                if (imageReader == null) return;

                mainHandler.post(() -> {
                    if (bubble != null && !armed) bubble.setVisibility(View.INVISIBLE);
                });
                Thread.sleep(180);

                Bitmap raw = acquireLatestBitmap();
                if (raw == null) return;
                Bitmap cropped = cropForAnalysis(raw);
                Bitmap scaled = scaleForUpload(cropped, 720);

                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                scaled.compress(Bitmap.CompressFormat.JPEG, 72, bos);

                if (scaled != cropped) scaled.recycle();
                if (cropped != raw) cropped.recycle();
                raw.recycle();

                postOutcomeSnapshot(bos.toByteArray(), analysisId, asset);
            } catch (Exception ignored) {
                // Learning feedback is best-effort and must never affect a live signal.
            } finally {
                mainHandler.post(() -> {
                    if (bubble != null && !armed) bubble.setVisibility(View.VISIBLE);
                });
            }
        }), delay);
    }

    private void postOutcomeSnapshot(byte[] frame, String analysisId, String asset) throws Exception {
        String outcomeEndpoint = ENDPOINT.endsWith("/v1/mobile-scan")
                ? ENDPOINT.substring(0, ENDPOINT.length() - "/v1/mobile-scan".length()) + "/v1/outcome-snapshot"
                : ENDPOINT.replace("/mobile-scan", "/outcome-snapshot");

        String boundary = "----TTLOutcome" + System.currentTimeMillis();
        HttpURLConnection conn = (HttpURLConnection) new URL(outcomeEndpoint).openConnection();
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(30000);
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Accept", "application/json");
        if (CLIENT_TOKEN != null && !CLIENT_TOKEN.isEmpty()) {
            conn.setRequestProperty("X-TT-Client", CLIENT_TOKEN);
        }
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

        try (DataOutputStream out = new DataOutputStream(conn.getOutputStream())) {
            writeField(out, boundary, "analysisId", analysisId);
            writeField(out, boundary, "pair", asset == null ? "" : asset);

            out.writeBytes("--" + boundary + "\r\n");
            out.writeBytes("Content-Disposition: form-data; name=\"frame\"; filename=\"outcome.jpg\"\r\n");
            out.writeBytes("Content-Type: image/jpeg\r\n\r\n");
            out.write(frame);
            out.writeBytes("\r\n");
            out.writeBytes("--" + boundary + "--\r\n");
            out.flush();
        }

        int code = conn.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
        String body = readAll(stream);
        if (code < 200 || code >= 300) {
            throw new IOException("Outcome feedback HTTP " + code + ": " + body);
        }
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
        armed = false;
        analyzing = false;
        scanSessionId = null;

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