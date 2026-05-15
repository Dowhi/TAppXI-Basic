# ProGuard rules para TAppXI — Capacitor + WebView

# ── Capacitor core ────────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class com.tappxi.app.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod *;
}

# ── WebView JavaScript Interface ──────────────────────────────────────────────
# Necesario porque el WebView invoca métodos Java por nombre (reflexión)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── AndroidX / AppCompat ──────────────────────────────────────────────────────
-keep class androidx.appcompat.** { *; }
-dontwarn androidx.**

# ── Kotlin (requerido por Capacitor) ─────────────────────────────────────────
-keep class kotlin.** { *; }
-dontwarn kotlin.**

# ── Conservar información de stack trace en crashes ──────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
