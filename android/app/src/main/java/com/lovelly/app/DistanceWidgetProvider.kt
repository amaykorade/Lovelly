package com.lovelly.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import org.json.JSONObject
import android.util.Log

class DistanceWidgetProvider : AppWidgetProvider() {
    
    companion object {
        private const val WIDGET_DATA_KEY = "lovelly_widget_data"
        private const val TAG = "DistanceWidget"
    }
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(TAG, "Widget enabled - initializing default state")
        // Initialize widget with default data when first added
        initializeDefaultWidgetData(context)
    }
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} widget(s)")
        for (appWidgetId in appWidgetIds) {
            try {
                updateWidget(context, appWidgetManager, appWidgetId)
            } catch (e: Exception) {
                Log.e(TAG, "Error updating widget $appWidgetId", e)
                e.printStackTrace()
            }
        }
    }
    
    private fun initializeDefaultWidgetData(context: Context) {
        try {
            val prefs = context.getSharedPreferences(WIDGET_DATA_KEY, Context.MODE_PRIVATE)
            // Only initialize if no data exists
            if (!prefs.contains(WIDGET_DATA_KEY)) {
                val defaultData = JSONObject().apply {
                    put("distance", 0.0)
                    put("formatted", "Not Connected")
                    put("partnerName", "Partner")
                    put("isConnected", false)
                    put("lastUpdate", System.currentTimeMillis())
                }
                prefs.edit().putString(WIDGET_DATA_KEY, defaultData.toString()).apply()
                Log.d(TAG, "Default widget data initialized")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing default widget data", e)
            e.printStackTrace()
        }
    }
    
    override fun onReceive(context: Context, intent: android.content.Intent) {
        super.onReceive(context, intent)
        
        // Handle widget update broadcast
        if (intent.action == "com.lovelly.app.WIDGET_UPDATE") {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, DistanceWidgetProvider::class.java)
            )
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }
    
    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        Log.d(TAG, "updateWidget called for widget $appWidgetId")
        
        // Initialize default data if needed
        initializeDefaultWidgetData(context)
        
        // Read from SharedPreferences (written by WidgetUpdateBridge.writeWidgetData)
        val prefs = context.getSharedPreferences(WIDGET_DATA_KEY, Context.MODE_PRIVATE)
        val widgetDataJson = prefs.getString(WIDGET_DATA_KEY, null)
        
        val views = try {
            RemoteViews(context.packageName, R.layout.widget_distance)
        } catch (e: Exception) {
            Log.e(TAG, "Error creating RemoteViews", e)
            e.printStackTrace()
            return
        }
        
        // Always show the visual representation (two circles and line)
        // This is the core design - always visible
        try {
            views.setViewVisibility(R.id.visual_container, android.view.View.VISIBLE)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting visual_container visibility", e)
        }
        
        // Always show the widget, even if no data exists
        try {
            if (widgetDataJson != null && widgetDataJson.isNotEmpty()) {
                val data = JSONObject(widgetDataJson)
                val distanceKm = data.optDouble("distance", 0.0) // Get actual distance in km, default to 0
                val distance = data.optString("formatted", "Not available")
                val direction = data.optString("direction", null)
                val partnerName = data.optString("partnerName", "Partner")
                val isConnected = data.optBoolean("isConnected", false)
                
                Log.d(TAG, "Widget data: connected=$isConnected, distance=$distanceKm, formatted=$distance")
                
                if (isConnected && distanceKm > 0) {
                    // Connected and has distance - show distance and partner name
                    views.setTextViewText(R.id.distance_text, distance)
                    views.setTextViewText(R.id.partner_name, partnerName)
                    
                    // Show distance text container, hide not connected
                    views.setViewVisibility(R.id.distance_text_container, android.view.View.VISIBLE)
                    views.setViewVisibility(R.id.not_connected, android.view.View.GONE)
                } else {
                    // Not connected - show "Not Connected" text, hide distance
                    views.setTextViewText(R.id.not_connected, "Not Connected")
                    views.setViewVisibility(R.id.distance_text_container, android.view.View.GONE)
                    views.setViewVisibility(R.id.not_connected, android.view.View.VISIBLE)
                }
            } else {
                // No data available - show not connected state but keep visual representation
                Log.d(TAG, "No widget data available, showing default state")
                views.setTextViewText(R.id.not_connected, "Not Connected")
                views.setViewVisibility(R.id.distance_text_container, android.view.View.GONE)
                views.setViewVisibility(R.id.not_connected, android.view.View.VISIBLE)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing widget data", e)
            e.printStackTrace()
            // On error, show not connected state but keep visual representation
            try {
                views.setTextViewText(R.id.not_connected, "Not Connected")
                views.setViewVisibility(R.id.distance_text_container, android.view.View.GONE)
                views.setViewVisibility(R.id.not_connected, android.view.View.VISIBLE)
            } catch (e2: Exception) {
                Log.e(TAG, "Error setting error state", e2)
            }
        }
        
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(TAG, "Widget updated successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error updating widget", e)
            e.printStackTrace()
        }
    }
}

