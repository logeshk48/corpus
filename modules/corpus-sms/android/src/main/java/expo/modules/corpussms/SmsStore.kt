package expo.modules.corpussms

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

// Bank SMS → a short queue on the phone + a "log it?" notification. Nothing leaves the device.
object SmsStore {
  private const val PREFS = "corpus_sms"
  private const val CHANNEL = "corpus-bank-sms"
  private const val MAX = 60

  private val MONEY = Regex("(?i)(?:rs\\.?|inr|₹)\\s*([\\d,]+(?:\\.\\d{1,2})?)")
  private val DEBITED_BY = Regex("(?i)\\b(?:debited|credited)\\s+(?:by|with|for)\\s+([\\d,]+(?:\\.\\d{1,2})?)")
  private val TX_WORDS = Regex("(?i)\\b(debited|credited|spent|sent|paid|withdrawn|received|purchase|txn|transferred|deposited)\\b")
  private val OUT_WORDS = Regex("(?i)\\b(debited|spent|sent|paid|withdrawn|purchase|transferred to|txn of)\\b")
  private val SKIP = Regex("(?i)\\botp\\b|one time password|verification code|will be debited|is due|due on|due date|requested|collect request|has requested|e-?mandate|auto-?pay (?:is )?(?:set|scheduled)|min(?:imum)? amount due|statement")
  private val NOT_SPEND = Regex("(?i)(bal|balance|avl|avbl|available|limit|lmt|due|min)\\W*$")

  fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  fun enabled(c: Context) = prefs(c).getBoolean("enabled", false)
  fun setEnabled(c: Context, on: Boolean) = prefs(c).edit().putBoolean("enabled", on).apply()

  // A bank / payment sender: alphanumeric header like "AX-HDFCBK", never a personal phone number
  private fun bankSender(from: String): Boolean {
    val f = from.trim()
    if (f.isEmpty() || f.startsWith("+")) return false
    return f.any { it.isLetter() }
  }

  fun isBankSms(from: String, body: String): Boolean =
    bankSender(from) && TX_WORDS.containsMatchIn(body) && !SKIP.containsMatchIn(body) && amountOf(body) != null

  fun amountOf(body: String): Double? {
    for (m in MONEY.findAll(body)) {
      val before = body.substring(maxOf(0, m.range.first - 14), m.range.first)
      if (NOT_SPEND.containsMatchIn(before)) continue
      return m.groupValues[1].replace(",", "").toDoubleOrNull()
    }
    return DEBITED_BY.find(body)?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()
  }

  fun isOut(body: String) = OUT_WORDS.containsMatchIn(body)

  fun toMap(id: String, from: String, body: String, ts: Long): Map<String, Any> =
    mapOf("id" to id, "from" to from, "body" to body, "ts" to ts.toDouble())

  fun handle(c: Context, from: String, body: String, ts: Long) {
    if (!enabled(c) || !isBankSms(from, body)) return
    val id = "$ts-${body.hashCode()}"
    val list = load(c)
    for (i in 0 until list.length()) if (list.getJSONObject(i).optString("id") == id) return
    list.put(JSONObject().put("id", id).put("from", from).put("body", body).put("ts", ts))
    while (list.length() > MAX) list.remove(0)
    prefs(c).edit().putString("pending", list.toString()).apply()
    notify(c, id, body)
  }

  private fun load(c: Context): JSONArray =
    try { JSONArray(prefs(c).getString("pending", "[]")) } catch (e: Exception) { JSONArray() }

  fun pending(c: Context): List<Map<String, Any>> {
    val a = load(c)
    return (0 until a.length()).map { i ->
      val o = a.getJSONObject(i)
      toMap(o.optString("id"), o.optString("from"), o.optString("body"), o.optLong("ts"))
    }
  }

  fun remove(c: Context, ids: List<String>) {
    val a = load(c)
    val keep = JSONArray()
    for (i in 0 until a.length()) if (a.getJSONObject(i).optString("id") !in ids) keep.put(a.getJSONObject(i))
    prefs(c).edit().putString("pending", keep.toString()).apply()
    val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ids.forEach { nm.cancel(PREFS, it.hashCode()) }
  }

  private fun notify(c: Context, id: String, body: String) {
    try {
      val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Bank SMS", NotificationManager.IMPORTANCE_DEFAULT).apply {
          description = "Asks to log a payment when your bank sends an SMS"
        })
      }
      val amt = amountOf(body) ?: return
      val rupees = "₹" + NumberFormat.getNumberInstance(Locale("en", "IN")).apply { maximumFractionDigits = 2 }.format(amt)
      val title = if (isOut(body)) "$rupees paid — log it in Corpus?" else "$rupees received — log it in Corpus?"
      val open = Intent(Intent.ACTION_VIEW, Uri.parse("corpus://sms-review?id=" + Uri.encode(id))).apply {
        setPackage(c.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      val pi = PendingIntent.getActivity(c, id.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(c, CHANNEL) else @Suppress("DEPRECATION") Notification.Builder(c)
      val n = b.setSmallIcon(c.applicationInfo.icon)
        .setContentTitle(title)
        .setContentText(body.take(140))
        .setStyle(Notification.BigTextStyle().bigText(body.take(300)))
        .setContentIntent(pi)
        .setAutoCancel(true)
        .build()
      nm.notify(PREFS, id.hashCode(), n)
    } catch (e: SecurityException) {
      // notifications not allowed — the SMS still waits in Corpus
    }
  }
}
