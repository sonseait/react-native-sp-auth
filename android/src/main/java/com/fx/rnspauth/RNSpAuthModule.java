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

    private static final String EXPIRES_FIELD = "=; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    private static final String DOMAIN_FIELD = "; Domain=";
    private static final String PATH_FIELD = "; Path=";

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
            String url = java.text.MessageFormat.format("https://{0}.sharepoint.com", siteName);

            setCookie(url, java.text.MessageFormat.format("FedAuth=; Domain={0}.sharepoint.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT", siteName));
            setCookie(url, java.text.MessageFormat.format("FedAuth=; Domain=.{0}.sharepoint.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT", siteName));
            setCookie(url, "FedAuth=; Domain=sharepoint.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
            setCookie(url, "FedAuth=; Domain=.sharepoint.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
            setCookie(url, "FedAuth=; Expires=Thu, 01 Jan 1970 00:00:00 GMT");

            setCookie(url, "rtFa=; Domain=sharepoint.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");

            // URI uri = new URI(url);
            // List<String> cookieList = cookieHandler.get(uri, new HashMap<String, List<String>>()).get("Cookie");
            // String domainURI = uri.getScheme() + "://" + uri.getHost() + (uri.getPort() == -1 ? "" : ":" + uri.getPort());

            // if (cookieList != null) {
            //     String[] cookies = cookieList.get(0).split(";");

            //     // Expires each cookie with every possible domain and path option
            //     for (String cookie : cookies) {
            //         String[] parts = cookie.split("=");
            //         String path = "";
            //         String[] subPaths = uri.getPath().split("/");
            //         String name = parts[0].trim();
            //         String base = name + EXPIRES_FIELD;

            //         setCookie(domainURI, base);

            //         if (subPaths.length == 0) {
            //             subPaths = new String[]{""};
            //         }

            //         for (String subPath : subPaths) {
            //             path += "/" + subPath;

            //             String[] domains = uri.getHost().split("\\.");
            //             String domain = domains[domains.length - 1];

            //             for (int i = domains.length - 1; i > 0; i--) {
            //                 domain = domains[i - 1] + "." + domain;
            //                 setCookie(domainURI, base + DOMAIN_FIELD + "." + domain + PATH_FIELD + path);
            //                 setCookie(domainURI, base + DOMAIN_FIELD + "." + domain + PATH_FIELD + path);
            //             }

            //             setCookie(domainURI, base + DOMAIN_FIELD + domain + PATH_FIELD + path);

            //             if (path.equals("/")) {
            //                 path = "";
            //             }
            //         }
            //     }
            // }
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    private void setCookie(String url, String value) throws URISyntaxException, IOException {
        URI uri = new URI(url);
        System.out.println("COOKIE VALUE: " + value);
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