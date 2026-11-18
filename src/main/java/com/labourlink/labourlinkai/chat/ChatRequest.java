
package com.labourlink.labourlinkai.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ChatRequest(

        @NotBlank(message = "Please enter a message")
        @Size(max = 1000, message = "Message must be at most 1000 characters")
        String message,

        @Size(max = 20, message = "Conversation history is too long")
        List<@Valid ChatTurn> history,

        @Pattern(
                regexp = "(?i)^(en|te)(-[a-z]{2})?$",
                message = "Language must be en, te, en-IN, or te-IN"
        )
        String language

) {

    public ChatRequest(String message, List<ChatTurn> history) {
        this(message, history, "en");
    }
}
