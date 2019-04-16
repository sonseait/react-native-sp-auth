package com.fx.rnspauth;

import java.util.Date;
import java.util.Locale;

import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;

public final class CookieExpiration {
    private DateTimeFormatter EXPIRES_FORMAT = DateTimeFormat
            .forPattern("EEE, dd MMM yyyy HH:mm:ss 'GMT'")
            .withLocale(Locale.US);
    private final DateTime date;
    private CookieExpiration(DateTime dateTime) {
        this.date = dateTime;
    }
    public static CookieExpiration milliseconds(int milliseconds) {
        DateTime withDays = new DateTime().plus(milliseconds);
        return new CookieExpiration(withDays);
    }
    public static CookieExpiration days(int days) {
        DateTime withDays = new DateTime().plusDays(days);
        return new CookieExpiration(withDays);
    }
    public static CookieExpiration date(DateTime dateTime) {
        if (dateTime == null) {
            throw new IllegalArgumentException();
        }
        return new CookieExpiration(dateTime);
    }
    public static CookieExpiration date(Date date) {
        if (date == null) {
            throw new IllegalArgumentException();
        }
        DateTime dateTime = new DateTime(date);
        return new CookieExpiration(dateTime);
    }
    String toExpiresString() {
        return date.toString(EXPIRES_FORMAT);
    }
}