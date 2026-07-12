package com.receiptbooth.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DirectPrinter")
public class DirectPrinterPlugin extends Plugin {
    @PluginMethod
    public void printRawUsb(PluginCall call) {
        String base64Data = call.getString("base64Data");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("base64Data parameter is missing or empty");
            return;
        }

        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.printToUsbPrinterFromPlugin(base64Data, call);
        } else {
            call.reject("MainActivity activity instance is null");
        }
    }

    @PluginMethod
    public void printRawBluetooth(PluginCall call) {
        String base64Data = call.getString("base64Data");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("base64Data parameter is missing or empty");
            return;
        }

        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.printToBluetoothPrinterFromPlugin(base64Data, call);
        } else {
            call.reject("MainActivity activity instance is null");
        }
    }

    @PluginMethod
    public void savePhotoToGallery(PluginCall call) {
        String base64Data = call.getString("base64Data");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("base64Data parameter is missing or empty");
            return;
        }

        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.savePhotoToGalleryFromPlugin(base64Data, call);
        } else {
            call.reject("MainActivity activity instance is null");
        }
    }
}
