package com.labourlink.labourlinkai.chat;

import java.util.List;

public record ChatResponse(String message, String action, String actionLabel, List<ChatWorkerResult> workers) {}
