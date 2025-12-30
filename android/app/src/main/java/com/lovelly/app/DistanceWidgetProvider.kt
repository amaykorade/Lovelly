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
        
        if (widgetDataJson != null) {
            try {
                val data = JSONObject(widgetDataJson)
                val distanceKm = data.getDouble("distance") // Get actual distance in km
                val distance = data.getString("formatted")
                val direction = data.optString("direction", null)
                val partnerName = data.getString("partnerName")
                val isConnected = data.getBoolean("isConnected")
                
                if (isConnected) {
                    // Calculate visual distance (line width) based on actual distance
                    // Max distance for scaling: 50km (adjust as needed)
                    val maxDistanceKm = 50.0
                    val minLineWidth = 20 // Minimum line width in dp (very close)
                    val maxLineWidth = 100 // Maximum line width in dp (far apart)
                    
                    // Calculate line width: closer = shorter line, farther = longer line
                    // Invert: closer distance = shorter line
                    val normalizedDistance = (distanceKm / maxDistanceKm).coerceIn(0.0, 1.0)
                    val lineWidth = (minLineWidth + (maxLineWidth - minLineWidth) * normalizedDistance).toInt()
                    
                    // Set line width dynamically
                    // Convert dp to pixels
                    val density = context.resources.displayMetrics.density
                    val lineWidthPx = (lineWidth * density).toInt()
                    val lineHeightPx = (2 * density).toInt()
                    
                    // Use setInt to set layout width (RemoteViews limitation workaround)
                    // We'll use a different approach - set padding or use a different method
                    // For now, just update the text - line width will be static in layout
                    
                    // Update distance text
                    views.setTextViewText(R.id.distance_text, distance)
                    views.setTextViewText(R.id.partner_name, partnerName)
                    
                    // Show visual representation
                    views.setViewVisibility(R.id.visual_container, android.view.View.VISIBLE)
                    views.setViewVisibility(R.id.distance_text_container, android.view.View.VISIBLE)
                    views.setViewVisibility(R.id.not_connected, android.view.View.GONE)
                } else {
                    // Hide visual representation, show not connected
                    views.setViewVisibility(R.id.visual_container, android.view.View.GONE)
                    views.setViewVisibility(R.id.distance_text_container, android.view.View.GONE)
                    views.setViewVisibility(R.id.not_connected, android.view.View.VISIBLE)
                }
            } catch (e: Exception) {
                Log.e("DistanceWidget", "Error parsing widget data", e)
                views.setTextViewText(R.id.distance_text, "Error")
            }
        } else {
            views.setTextViewText(R.id.distance_text, "Not available")
        }
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}

