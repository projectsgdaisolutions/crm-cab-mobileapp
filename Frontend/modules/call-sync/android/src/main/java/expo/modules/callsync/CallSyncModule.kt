package expo.modules.callsync

import android.Manifest
import android.content.pm.PackageManager
import android.provider.CallLog
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class CallSyncModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CallSync")

    AsyncFunction("getCallLogPermissionAsync") { promise: Promise ->
      Permissions.getPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        Manifest.permission.READ_CALL_LOG,
        Manifest.permission.READ_PHONE_STATE
      )
    }

    AsyncFunction("requestCallLogPermissionAsync") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        Manifest.permission.READ_CALL_LOG,
        Manifest.permission.READ_PHONE_STATE
      )
    }

    AsyncFunction("readCallLog") { limit: Int ->
      val context = appContext.reactContext ?: throw Exception("Android context is not available")
      val granted = context.checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
      if (!granted) {
        throw Exception("READ_CALL_LOG is not granted")
      }
      val projection = arrayOf(
        CallLog.Calls.NUMBER,
        CallLog.Calls.CACHED_NAME,
        CallLog.Calls.TYPE,
        CallLog.Calls.DATE,
        CallLog.Calls.DURATION
      )
      val cursor = context.contentResolver.query(
        CallLog.Calls.CONTENT_URI,
        projection,
        null,
        null,
        "${CallLog.Calls.DATE} DESC"
      ) ?: throw Exception("Call log is not available on this device")

      val max = if (limit <= 0) 40 else limit.coerceAtMost(200)
      val rows = mutableListOf<Map<String, Any?>>()
      cursor.use {
        val numberIdx = it.getColumnIndex(CallLog.Calls.NUMBER)
        val nameIdx = it.getColumnIndex(CallLog.Calls.CACHED_NAME)
        val typeIdx = it.getColumnIndex(CallLog.Calls.TYPE)
        val dateIdx = it.getColumnIndex(CallLog.Calls.DATE)
        val durationIdx = it.getColumnIndex(CallLog.Calls.DURATION)
        var count = 0
        while (it.moveToNext() && count < max) {
          val type = if (typeIdx >= 0) it.getInt(typeIdx) else CallLog.Calls.OUTGOING_TYPE
          val duration = if (durationIdx >= 0) it.getInt(durationIdx) else 0
          val direction = when (type) {
            CallLog.Calls.INCOMING_TYPE,
            CallLog.Calls.MISSED_TYPE,
            CallLog.Calls.REJECTED_TYPE,
            CallLog.Calls.BLOCKED_TYPE -> "incoming"
            else -> "outgoing"
          }
          val status = when (type) {
            CallLog.Calls.MISSED_TYPE, CallLog.Calls.REJECTED_TYPE, CallLog.Calls.BLOCKED_TYPE -> "Missed"
            else -> if (duration > 0) "Answered" else "Failed"
          }
          rows.add(
            mapOf(
              "number" to (if (numberIdx >= 0) it.getString(numberIdx) else ""),
              "name" to (if (nameIdx >= 0) it.getString(nameIdx) else null),
              "direction" to direction,
              "status" to status,
              "startedAt" to (if (dateIdx >= 0) it.getLong(dateIdx) else 0L),
              "durationSec" to duration
            )
          )
          count += 1
        }
      }
      rows
    }

    AsyncFunction("findRecordings") { limit: Int ->
      val folders = listOf(
        "/storage/emulated/0/Recordings/Call",
        "/storage/emulated/0/Recordings",
        "/storage/emulated/0/Call",
        "/storage/emulated/0/Music/Call Recordings",
        "/storage/emulated/0/MIUI/sound_recorder/call_rec",
        "/storage/emulated/0/Sounds/CallRecord"
      )
      val max = if (limit <= 0) 40 else limit.coerceAtMost(100)
      val found = mutableListOf<Map<String, Any?>>()
      for (folder in folders) {
        val dir = File(folder)
        if (!dir.isDirectory) continue
        val files = dir.listFiles() ?: continue
        for (file in files) {
          if (!file.isFile) continue
          val name = file.name.lowercase()
          val audio = name.endsWith(".mp3") || name.endsWith(".m4a") || name.endsWith(".amr") || name.endsWith(".wav") || name.endsWith(".aac")
          if (!audio) continue
          found.add(
            mapOf(
              "fileName" to file.name,
              "uri" to file.absolutePath,
              "size" to file.length(),
              "modifiedAt" to file.lastModified()
            )
          )
          if (found.size >= max) return@AsyncFunction found
        }
      }
      found
    }
  }
}
