package com.braveheartinnovations.debateai

import android.app.Activity
import android.os.Bundle

class BillingFlowFallbackActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setResult(RESULT_CANCELED)
    finish()
  }
}
