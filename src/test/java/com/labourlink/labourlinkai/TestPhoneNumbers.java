package com.labourlink.labourlinkai;

import java.util.Locale;
import java.util.concurrent.atomic.AtomicLong;

/** Generates unique phone values so integration tests never delete fixture rows. */
public final class TestPhoneNumbers {
    private static final long PHONE_MODULUS = 1_000_000_000L;
    private static final AtomicLong SEQUENCE = new AtomicLong(System.currentTimeMillis() % PHONE_MODULUS);

    private TestPhoneNumbers() {
    }

    public static String next() {
        long suffix = Math.floorMod(SEQUENCE.getAndIncrement(), PHONE_MODULUS);
        return "9" + String.format(Locale.ROOT, "%09d", suffix);
    }
}
