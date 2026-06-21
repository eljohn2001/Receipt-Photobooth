package com.receiptbooth.app;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginCall;
import java.util.HashMap;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    private static final String ACTION_USB_PERMISSION = "com.receiptbooth.app.USB_PERMISSION";
    private byte[] pendingBytesToPrint = null;
    private PluginCall pendingPluginCall = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DirectPrinterPlugin.class);
        super.onCreate(savedInstanceState);

        hideSystemUI();

        // Register USB permission broadcast receiver
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(usbReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(usbReceiver, filter);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
        getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(usbReceiver);
        } catch (Exception e) {
            // Ignore if not registered
        }
    }

    public void printToUsbPrinterFromPlugin(String base64Data, PluginCall call) {
        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            pendingPluginCall = call;
            printToUsbPrinter(bytes);
        } catch (Exception e) {
            Log.e("MainActivity", "Failed to decode base64 print data", e);
            call.reject("Failed to decode base64 print data: " + e.getMessage());
        }
    }

    private void printToUsbPrinter(byte[] bytes) {
        UsbManager usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);
        if (usbManager == null) {
            Log.e("MainActivity", "UsbManager not available");
            if (pendingPluginCall != null) {
                pendingPluginCall.reject("UsbManager not available");
                pendingPluginCall = null;
            }
            return;
        }

        UsbDevice printerDevice = findPrinterDevice(usbManager);
        if (printerDevice == null) {
            Log.e("MainActivity", "No USB printer device found");
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, "No USB printer found! Reconnect OTG cable & turn on printer.", Toast.LENGTH_LONG).show();
                }
            });
            if (pendingPluginCall != null) {
                pendingPluginCall.reject("No USB printer device found");
                pendingPluginCall = null;
            }
            return;
        }

        if (!usbManager.hasPermission(printerDevice)) {
            pendingBytesToPrint = bytes;
            PendingIntent permissionIntent = PendingIntent.getBroadcast(
                this, 
                0, 
                new Intent(ACTION_USB_PERMISSION), 
                PendingIntent.FLAG_MUTABLE
            );
            usbManager.requestPermission(printerDevice, permissionIntent);
        } else {
            sendBytesToDevice(usbManager, printerDevice, bytes);
        }
    }

    private UsbDevice findPrinterDevice(UsbManager usbManager) {
        HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
        Log.i("MainActivity", "Total USB devices connected: " + deviceList.size());

        for (UsbDevice device : deviceList.values()) {
            Log.i("MainActivity", "Examining device: " + device.getDeviceName() + " (V: " + device.getVendorId() + ", P: " + device.getProductId() + ")");
            for (int i = 0; i < device.getInterfaceCount(); i++) {
                UsbInterface usbInterface = device.getInterface(i);
                if (usbInterface.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                    Log.i("MainActivity", "Found device matching Class 7 (Printer)");
                    return device;
                }
            }
        }

        for (UsbDevice device : deviceList.values()) {
            int devClass = device.getDeviceClass();
            if (devClass == UsbConstants.USB_CLASS_HID || 
                devClass == UsbConstants.USB_CLASS_AUDIO || 
                devClass == UsbConstants.USB_CLASS_HUB) {
                continue;
            }

            for (int i = 0; i < device.getInterfaceCount(); i++) {
                UsbInterface usbInterface = device.getInterface(i);
                int intfClass = usbInterface.getInterfaceClass();
                if (intfClass == UsbConstants.USB_CLASS_HID || 
                    intfClass == UsbConstants.USB_CLASS_AUDIO || 
                    intfClass == UsbConstants.USB_CLASS_MASS_STORAGE) {
                    continue;
                }

                for (int j = 0; j < usbInterface.getEndpointCount(); j++) {
                    UsbEndpoint ep = usbInterface.getEndpoint(j);
                    if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK && 
                        ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                        Log.i("MainActivity", "Found fallback bulk OUT interface on device: " + device.getDeviceName());
                        return device;
                    }
                }
            }
        }

        for (UsbDevice device : deviceList.values()) {
            if (device.getDeviceClass() != UsbConstants.USB_CLASS_HUB) {
                Log.i("MainActivity", "Absolute fallback to device: " + device.getDeviceName());
                return device;
            }
        }

        return null;
    }

    private void sendBytesToDevice(UsbManager usbManager, UsbDevice device, byte[] bytes) {
        UsbDeviceConnection connection = usbManager.openDevice(device);
        if (connection == null) {
            Log.e("MainActivity", "Failed to open USB device connection");
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, "Cannot connect! Please close other printing apps (like ESC Pos Hub) in the background.", Toast.LENGTH_LONG).show();
                }
            });
            if (pendingPluginCall != null) {
                pendingPluginCall.reject("Failed to open USB device connection");
                pendingPluginCall = null;
            }
            return;
        }

        UsbInterface usbInterface = null;
        UsbEndpoint outEndpoint = null;

        for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface uif = device.getInterface(i);
            for (int j = 0; j < uif.getEndpointCount(); j++) {
                UsbEndpoint ep = uif.getEndpoint(j);
                if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                    usbInterface = uif;
                    outEndpoint = ep;
                    break;
                }
            }
            if (outEndpoint != null) break;
        }

        if (usbInterface == null || outEndpoint == null) {
            Log.e("MainActivity", "No valid bulk OUT endpoint found on USB device");
            connection.close();
            if (pendingPluginCall != null) {
                pendingPluginCall.reject("No valid bulk OUT endpoint found on USB device");
                pendingPluginCall = null;
            }
            return;
        }

        boolean claimed = connection.claimInterface(usbInterface, true);
        if (!claimed) {
            Log.e("MainActivity", "Failed to claim USB interface");
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, "Failed to claim printer interface.", Toast.LENGTH_LONG).show();
                }
            });
            connection.close();
            if (pendingPluginCall != null) {
                pendingPluginCall.reject("Failed to claim USB interface");
                pendingPluginCall = null;
            }
            return;
        }

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(MainActivity.this, "Sending photo to printer...", Toast.LENGTH_SHORT).show();
            }
        });

        int chunkSize = 4096;
        int offset = 0;
        
        try {
            while (offset < bytes.length) {
                int length = Math.min(chunkSize, bytes.length - offset);
                byte[] chunk = new byte[length];
                System.arraycopy(bytes, offset, chunk, 0, length);
                
                int transferred = connection.bulkTransfer(outEndpoint, chunk, length, 10000);
                if (transferred < 0) {
                    Log.e("MainActivity", "USB bulk transfer failed at offset " + offset);
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(MainActivity.this, "USB printing failed.", Toast.LENGTH_SHORT).show();
                        }
                    });
                    if (pendingPluginCall != null) {
                        pendingPluginCall.reject("USB bulk transfer failed");
                        pendingPluginCall = null;
                    }
                    break;
                }
                offset += transferred;
            }
            Log.i("MainActivity", "Successfully printed " + offset + " bytes to USB device");
            if (pendingPluginCall != null) {
                pendingPluginCall.resolve();
                pendingPluginCall = null;
            }
        } catch (Exception e) {
            Log.e("MainActivity", "Error during USB print transfer", e);
            if (pendingPluginCall != null) {
                pendingPluginCall.reject("Error during USB print: " + e.getMessage());
                pendingPluginCall = null;
            }
        } finally {
            connection.releaseInterface(usbInterface);
            connection.close();
        }
    }

    public void savePhotoToGalleryFromPlugin(String base64Data, PluginCall call) {
        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                call.reject("Failed to decode bitmap from base64 data");
                return;
            }

            String filename = "Snapceipt_" + System.currentTimeMillis() + "_" + ((int)(Math.random() * 1000)) + ".png";
            OutputStream fos;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContentResolver();
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "image/png");
                contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Snapceipt");
                Uri imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues);
                if (imageUri == null) {
                    call.reject("Failed to create MediaStore entry");
                    return;
                }
                fos = resolver.openOutputStream(imageUri);
            } else {
                String imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES).toString() + "/Snapceipt";
                File file = new File(imagesDir);
                if (!file.exists()) {
                    file.mkdirs();
                }
                File image = new File(imagesDir, filename);
                fos = new FileOutputStream(image);
            }

            if (fos != null) {
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
                fos.flush();
                fos.close();
                
                // Trigger media scanner for older Android versions to update the gallery instantly
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    String imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES).toString() + "/Snapceipt";
                    File image = new File(imagesDir, filename);
                    android.media.MediaScannerConnection.scanFile(this, new String[]{image.toString()}, null, null);
                }
                
                call.resolve();
            } else {
                call.reject("OutputStream is null");
            }
        } catch (Exception e) {
            Log.e("MainActivity", "Failed to save photo to gallery", e);
            call.reject("Failed to save photo to gallery: " + e.getMessage());
        }
    }

    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice device = (UsbDevice) intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        if (device != null && pendingBytesToPrint != null) {
                            UsbManager usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);
                            if (usbManager != null) {
                                sendBytesToDevice(usbManager, device, pendingBytesToPrint);
                            }
                        }
                    } else {
                        Log.e("MainActivity", "Permission denied for USB device " + device);
                        if (pendingPluginCall != null) {
                            pendingPluginCall.reject("USB permission denied by user");
                            pendingPluginCall = null;
                        }
                    }
                    pendingBytesToPrint = null;
                }
            }
        }
    };
}
