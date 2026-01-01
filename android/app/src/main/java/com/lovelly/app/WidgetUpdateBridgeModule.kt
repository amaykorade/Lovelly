package com.lovelly.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.content.Intent
import android.content.SharedPreferences
import android.content.Context
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.util.Log

class WidgetUpdateBridgeModule(reactContext: ReactApplicationContext) 
    : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val WIDGET_DATA_KEY = "lovelly_widget_data"
    }
    
    override fun getName(): String {
        return "WidgetUpdateBridge"
    }
    
    @ReactMethod
    fun writeWidgetData(dataJson: String, promise: Promise) {
        try {
            val context: Context = reactApplicationContext
            val prefs: SharedPreferences = context.getSharedPreferences(WIDGET_DATA_KEY, Context.MODE_PRIVATE)
            prefs.edit().putString(WIDGET_DATA_KEY, dataJson).apply()
            Log.d("WidgetUpdateBridge", "Widget data written to SharedPreferences")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("WidgetUpdateBridge", "Error writing widget data", e)
            promise.reject("WRITE_ERROR", "Failed to write widget data", e)
        }
    }
    
    @ReactMethod
    fun updateWidget(promise: Promise) {
        try {
            val context: Context = reactApplicationContext
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, DistanceWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            // Request an update for all instances of the widget using standard action
            val updateIntent = Intent(context, DistanceWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
            }
            context.sendBroadcast(updateIntent)
            
            // Also send custom action for onReceive handler
            val customIntent = Intent("com.lovelly.app.WIDGET_UPDATE")
            context.sendBroadcast(customIntent)
            
            Log.d("WidgetUpdateBridge", "Widget update broadcast sent for ${appWidgetIds.size} widgets")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("WidgetUpdateBridge", "Error updating widget", e)
            promise.reject("UPDATE_ERROR", "Failed to update widget", e)
        }
    }
}

