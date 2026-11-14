package expo.modules.corpussms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CorpusSmsModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Corpus is not ready")

  private fun sharedText(intent: Intent?): String? =
    if (intent?.action == Intent.ACTION_SEND && intent.type?.startsWith("text/") == true) intent.getStringExtra(Intent.EXTRA_TEXT) else null

  override fun definition() = ModuleDefinition {
    Name("CorpusSms")
    Events("onShare")

    // false in normal builds (no SMS permission in the manifest) — only Share → Corpus works there
    Function("smsAvailable") {
      val pm = ctx.packageManager
      val info = if (Build.VERSION.SDK_INT >= 33)
        pm.getPackageInfo(ctx.packageName, PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong()))
      else @Suppress("DEPRECATION") pm.getPackageInfo(ctx.packageName, PackageManager.GET_PERMISSIONS)
      info.requestedPermissions?.contains(Manifest.permission.RECEIVE_SMS) == true
    }
    Function("isEnabled") { SmsStore.enabled(ctx) }
    Function("setEnabled") { on: Boolean -> SmsStore.setEnabled(ctx, on) }
    Function("getPending") { SmsStore.pending(ctx) }
    Function("removePending") { ids: List<String> -> SmsStore.remove(ctx, ids) }

    // Bank SMS already in the inbox (for catching up). Only bank transaction SMS are returned.
    AsyncFunction("readInbox") { sinceMs: Double, max: Int ->
      val out = mutableListOf<Map<String, Any>>()
      val cur = ctx.contentResolver.query(
        Uri.parse("content://sms/inbox"), arrayOf("_id", "address", "body", "date"),
        "date > ?", arrayOf(sinceMs.toLong().toString()), "date DESC"
      )
      cur?.use {
        var seen = 0
        while (it.moveToNext() && seen < 3000 && out.size < max) {
          seen++
          val from = it.getString(1) ?: continue
          val body = it.getString(2) ?: continue
          if (!SmsStore.isBankSms(from, body)) continue
          val ts = it.getLong(3)
          out.add(SmsStore.toMap("$ts-${body.hashCode()}", from, body, ts))
        }
      }
      out
    }

    // Text shared to Corpus from another app (Messages → Share → Corpus)
    Function("takeSharedText") {
      val i = appContext.currentActivity?.intent
      val t = sharedText(i)
      if (t != null) { i?.removeExtra(Intent.EXTRA_TEXT); i?.action = Intent.ACTION_MAIN }
      t
    }
    OnNewIntent { intent ->
      sharedText(intent)?.let { sendEvent("onShare", mapOf("text" to it)) }
    }
  }
}
