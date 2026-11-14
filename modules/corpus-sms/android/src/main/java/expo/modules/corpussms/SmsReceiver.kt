package expo.modules.corpussms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

// Runs even when Corpus is closed. Multi-part SMS are joined before reading.
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (parts.isEmpty()) return
    val from = parts[0].originatingAddress ?: return
    val body = parts.joinToString("") { it.messageBody ?: "" }
    SmsStore.handle(context, from, body, parts[0].timestampMillis)
  }
}
