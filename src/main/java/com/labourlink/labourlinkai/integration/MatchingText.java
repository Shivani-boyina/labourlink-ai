package com.labourlink.labourlinkai.integration;

import java.text.Normalizer;
import java.util.regex.Pattern;

public final class MatchingText {
    private static final Pattern SPACE = Pattern.compile("\\s+", Pattern.UNICODE_CHARACTER_CLASS);

    private MatchingText() {}

    public static String normalize(String value) {
        return value == null ? "" : SPACE.matcher(Normalizer.normalize(value, Normalizer.Form.NFC))
                .replaceAll(" ").strip();
    }
}
