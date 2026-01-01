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
    }
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
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
        // Read from SharedPreferences (written by WidgetUpdateBridge.writeWidgetData)
        val prefs = context.getSharedPreferences(WIDGET_DATA_KEY, Context.MODE_PRIVATE)
        val widgetDataJson = prefs.getString(WIDGET_DATA_KEY, null)
        
        val views = RemoteViews(context.packageName, R.layout.widget_distance)
        
        // Always show the visual representation (two circles and line)
        // This is the core design - always visible
        views.setViewVisibility(R.id.visual_container, android.view.View.VISIBLE)
        
        // Always show the widget, even if no data exists
        try {
            if (widgetDataJson != null && widgetDataJson.isNotEmpty()) {
                val data = JSONObject(widgetDataJson)
                val distanceKm = data.optDouble("distance", 0.0) // Get actual distance in km, default to 0
                val distance = data.optString("formatted", "Not available")
                val direction = data.optString("direction", null)
                val partnerName = data.optString("partnerName", "Partner")
                val isConnected = data.optBoolean("isConnected", false)
                
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
                views.setTextViewText(R.id.not_connected, "Not Connected")
                views.setViewVisibility(R.id.distance_text_container, android.view.View.GONE)
                views.setViewVisibility(R.id.not_connected, android.view.View.VISIBLE)
            }
        } catch (e: Exception) {
            Log.e("DistanceWidget", "Error parsing widget data", e)
            e.printStackTrace()
            // On error, show not connected state but keep visual representation
            views.setTextViewText(R.id.not_connected, "Not Connected")
            views.setViewVisibility(R.id.distance_text_container, android.view.View.GONE)
            views.setViewVisibility(R.id.not_connected, android.view.View.VISIBLE)
        }
        
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
        } catch (e: Exception) {
            Log.e("DistanceWidget", "Error updating widget", e)
            e.printStackTrace()
        }
    }
}

