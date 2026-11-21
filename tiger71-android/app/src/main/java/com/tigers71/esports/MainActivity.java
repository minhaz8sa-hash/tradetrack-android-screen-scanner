package com.tigers71.esports;

import android.app.Activity;
import android.Manifest;
import android.os.Build;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://tiger-71.com";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 4302;
    private static final int FILE_CHOOSER_REQUEST = 4101;

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 9, 14));
        // Android 15+ enforces edge-to-edge for targetSdk 35. Give the WebView
        // its own safe rectangular area, outside status/navigation/cutout bars.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets safe = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
                );
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(8, 9, 14));
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);

        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                dp(3)
        );
        root.addView(progressBar, progressParams);
        setContentView(root);

        configureWebView();

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            Uri deepLink = getIntent() == null ? null : getIntent().getData();
            webView.loadUrl(isTrustedUrl(deepLink) ? deepLink.toString() : HOME_URL);
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        // Native notification permission and scheduled Guild War reminders.
        // No privileged user data or API key is exposed through this bridge.
        webView.addJavascriptInterface(new T71NativeBridge(), "T71Android");
        T71Notifications.ensureChannel(this);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " Tigers71Android/1.0");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();

                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    return false;
                }

                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                } catch (ActivityNotFoundException ignored) {
                    Toast.makeText(MainActivity.this, "No app found to open this link.", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
                progressBar.setProgress(15);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setProgress(100);
                progressBar.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent contentIntent = new Intent(Intent.ACTION_GET_CONTENT);
                contentIntent.addCategory(Intent.CATEGORY_OPENABLE);
                contentIntent.setType(resolveMimeType(fileChooserParams));

                Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                try {
                    File imageFile = File.createTempFile("t71_upload_", ".jpg", getCacheDir());
                    cameraUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            imageFile
                    );
                    cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                    cameraIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } catch (IOException e) {
                    cameraIntent = null;
                    cameraUri = null;
                }

                Intent chooser = Intent.createChooser(contentIntent, "Choose file");
                if (cameraIntent != null && cameraIntent.resolveActivity(getPackageManager()) != null) {
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraIntent});
                }

                startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                return true;
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Unable to open download.", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private String resolveMimeType(WebChromeClient.FileChooserParams params) {
        String[] accepted = params.getAcceptTypes();
        if (accepted != null && accepted.length == 1 && accepted[0] != null && !accepted[0].isEmpty()) {
            return accepted[0];
        }
        return "*/*";
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }

        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (data == null || data.getData() == null) {
                if (cameraUri != null) {
                    result = new Uri[]{cameraUri};
                }
            } else {
                ClipData clipData = data.getClipData();
                if (clipData != null) {
                    result = new Uri[clipData.getItemCount()];
                    for (int i = 0; i < clipData.getItemCount(); i++) {
                        result[i] = clipData.getItemAt(i).getUri();
                    }
                } else {
                    result = new Uri[]{data.getData()};
                }
            }
        }

        filePathCallback.onReceiveValue(result);
        filePathCallback = null;
        cameraUri = null;
    }

    private boolean isTrustedUrl(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        String host = uri.getHost();
        return "tiger-71.com".equalsIgnoreCase(host) || "www.tiger-71.com".equalsIgnoreCase(host);
    }

    private boolean isTrustedPage() {
        try { return isTrustedUrl(Uri.parse(webView.getUrl())); }
        catch (Exception ignored) { return false; }
    }

    private boolean notificationsGranted() {
        return Build.VERSION.SDK_INT < 33 ||
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private void refreshNotificationUi() {
        if (webView == null) return;
        webView.evaluateJavascript("window.dispatchEvent(new Event('t71-native-notification-change'))", null);
    }

    private final class T71NativeBridge {
        @JavascriptInterface public String getStatus() {
            if (!isTrustedPage()) return "unsupported";
            if (!getSharedPreferences("t71", MODE_PRIVATE).getBoolean("guild_notifications_enabled", false)) return "prompt";
            return notificationsGranted() ? "enabled" : "denied";
        }

        @JavascriptInterface public void enableNotifications() {
            runOnUiThread(() -> {
                if (!isTrustedPage()) return;
                if (notificationsGranted()) {
                    T71Notifications.enable(MainActivity.this);
                    refreshNotificationUi();
                } else if (Build.VERSION.SDK_INT >= 33) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
                }
            });
        }

        @JavascriptInterface public void testNotification() {
            runOnUiThread(() -> {
                if (!isTrustedPage() || !notificationsGranted()) return;
                T71Notifications.showLocal(MainActivity.this, "test");
            });
        }

        @JavascriptInterface public void showActivityNotification(String kind) {
            // Only predefined event kinds are accepted; no arbitrary text or URLs.
            if (!"chat".equals(kind) && !"glory".equals(kind)) return;
            runOnUiThread(() -> {
                if (!isTrustedPage() || !notificationsGranted()) return;
                if (getSharedPreferences("t71", MODE_PRIVATE).getBoolean("guild_notifications_enabled", false)) {
                    T71Notifications.showLocal(MainActivity.this, kind);
                }
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
                T71Notifications.enable(this);
            }
            refreshNotificationUi();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri link = intent == null ? null : intent.getData();
        if (webView != null && isTrustedUrl(link)) webView.loadUrl(link.toString());
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }

    private int dp(int value) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }
}
