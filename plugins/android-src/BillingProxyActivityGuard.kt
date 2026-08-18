package com.braveheartinnovations.debateai

import android.app.Activity
import android.app.Application
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log

object BillingProxyActivityGuard {
  private const val TAG = "BillingProxyGuard"
  private const val PROXY_BILLING_ACTIVITY = "com.android.billingclient.api.ProxyBillingActivity"
  private const val BUY_INTENT = "BUY_INTENT"
  private const val IN_APP_MESSAGE_INTENT = "IN_APP_MESSAGE_INTENT"

  fun register(application: Application) {
    application.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
      override fun onActivityPreCreated(activity: Activity, savedInstanceState: Bundle?) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
          return
        }

        patchMalformedBillingIntent(activity)
      }

      override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
      override fun onActivityStarted(activity: Activity) = Unit
      override fun onActivityResumed(activity: Activity) = Unit
      override fun onActivityPaused(activity: Activity) = Unit
      override fun onActivityStopped(activity: Activity) = Unit
      override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
      override fun onActivityDestroyed(activity: Activity) = Unit
    })
  }

  private fun patchMalformedBillingIntent(activity: Activity) {
    if (activity.javaClass.name != PROXY_BILLING_ACTIVITY) {
      return
    }

    val intent = activity.intent ?: return
    if (intent.pendingIntentExtra(BUY_INTENT) != null || intent.pendingIntentExtra(IN_APP_MESSAGE_INTENT) != null) {
      return
    }

    intent.putExtra(BUY_INTENT, fallbackPendingIntent(activity))
    Log.w(TAG, "Inserted fallback PendingIntent for malformed Play Billing proxy intent")
  }

  private fun fallbackPendingIntent(activity: Activity): PendingIntent {
    val intent = Intent(activity, BillingFlowFallbackActivity::class.java)
      .setPackage(activity.packageName)

    return PendingIntent.getActivity(
      activity,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun Intent.pendingIntentExtra(key: String): PendingIntent? {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        getParcelableExtra(key, PendingIntent::class.java)
      } else {
        @Suppress("DEPRECATION")
        getParcelableExtra(key) as? PendingIntent
      }
    } catch (error: RuntimeException) {
      Log.w(TAG, "Unable to read Play Billing PendingIntent extra: $key", error)
      null
    }
  }
}
