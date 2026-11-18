package com.labourlink.labourlinkai.service;

final class ProfileText {
    private ProfileText() {
    }

    static String optional(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
