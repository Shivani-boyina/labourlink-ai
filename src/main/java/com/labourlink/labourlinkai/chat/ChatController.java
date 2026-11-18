package com.labourlink.labourlinkai.chat;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatService chatService;
    private final ConcurrentHashMap<String, Window> requests = new ConcurrentHashMap<>();

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ChatResponse chat(@Valid @RequestBody ChatRequest request, HttpServletRequest httpRequest) {
        String address = httpRequest.getRemoteAddr();
        long now = System.currentTimeMillis();
        Window window = requests.compute(address, (key, current) ->
                current == null || now - current.startedAt > 60_000
                        ? new Window(now, 1) : new Window(current.startedAt, current.count + 1));
        if (window.count > 20) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Please wait a moment before sending more messages.");
        }
       Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

String role = authentication == null ? "guest" : authentication.getAuthorities().stream()
        .map(authority -> authority.getAuthority())
        .filter(authority -> authority.startsWith("ROLE_"))
        .map(authority -> authority.substring(5).toLowerCase())
        .findFirst()
        .orElse("guest");

String userPhone = ("worker".equals(role) || "contractor".equals(role))
        && authentication != null
        ? authentication.getName()
        : null;

return chatService.respond(request, role, userPhone);
 }

    private record Window(long startedAt, int count) {}
}
