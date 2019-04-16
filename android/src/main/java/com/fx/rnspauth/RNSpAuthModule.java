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
    public void removeByHost(String host, final Promise promise) {
        Map headers1 = new HashMap<String, List<String>>();
        // headers1.put("Set-Cookie", Collections.singletonList(java.text.MessageFormat.format("FedAuth=; Path=/; Expires={0}", CookieExpiration.milliseconds(100).toExpiresString())));
        headers1.put("Set-Cookie", Collections.singletonList("FedAuth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"));
        Map headers2 = new HashMap<String, List<String>>();
        headers2.put("Set-Cookie", Collections.singletonList("rtFa=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"));
        // headers2.put("Set-Cookie", Collections.singletonList(java.text.MessageFormat.format("rtFa=; Path=/; Expires={0}", CookieExpiration.milliseconds(100).toExpiresString())));
        try {
            this.cookieHandler.put(new URI(host), headers1);
            this.cookieHandler.put(new URI(host), headers2);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void clearCookies(final Promise promise) {
        this.cookieHandler.clearCookies(new Callback() {
            public void invoke(Object... args) {
                promise.resolve(null);
            }
        });
    }
}