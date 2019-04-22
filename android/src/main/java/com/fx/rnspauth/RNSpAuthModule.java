package com.fx.rnspauth;

import com.facebook.react.modules.network.ForwardingCookieHandler;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Promise;

import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URI;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;

public class RNSpAuthModule extends ReactContextBaseJavaModule {

    private final ForwardingCookieHandler cookieHandler;

    public RNSpAuthModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.cookieHandler = new ForwardingCookieHandler(reactContext);
    }

    @Override
    public String getName() {
        return "RNSpAuthAndroid";
    }

    @ReactMethod
    public void set(String url, String value, final Promise promise) throws URISyntaxException, IOException{
        setCookie(url, value);
        promise.resolve(null);
    }

    @ReactMethod
    public void get(String url, final Promise promise) throws URISyntaxException, IOException {
        URI uri = new URI(url);
        Map<String, List<String>> cookieMap = this.cookieHandler.get(uri, new HashMap());
        // If only the variables were public
        List<String> cookieList = cookieMap.get("Cookie");
        WritableMap map = Arguments.createMap();
        if (cookieList != null) {
            String[] cookies = cookieList.get(0).split(";");
            for (int i = 0; i < cookies.length; i++) {
                String[] cookie = cookies[i].split("=", 2);
                if (cookie.length > 1) {
                  map.putString(cookie[0].trim(), cookie[1]);
                }
            }
        }
        promise.resolve(map);
    }

    @ReactMethod
    public void remove(String siteName, final Promise promise) {
        try {
            String uri = java.text.MessageFormat.format("https://{0}.sharepoint.com", siteName);
            setCookie(uri, java.text.MessageFormat.format("FedAuth=; Expires=Thu, 01 Jan 1970 00:00:00 GMT", siteName));
            setCookie(uri, "rtFa=; Domain=sharepoint.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    private void setCookie(String url, String value) throws URISyntaxException, IOException {
        URI uri = new URI(url);
        Map<String, List<String>> cookieMap = new HashMap<>();
        cookieMap.put("Set-Cookie", Collections.singletonList(value));
        this.cookieHandler.put(uri, cookieMap);
    }

    @ReactMethod
    public void clear(final Promise promise) {
        this.cookieHandler.clearCookies(new Callback() {
            public void invoke(Object... args) {
                promise.resolve(null);
            }
        });
    }
}