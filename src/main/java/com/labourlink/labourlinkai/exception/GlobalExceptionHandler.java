package com.labourlink.labourlinkai.exception;

import com.labourlink.labourlinkai.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Handle runtime exceptions with appropriate HTTP status codes
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<String>> handleRuntimeException(RuntimeException ex) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        String msg = ex.getMessage();
        if (msg != null) {
            String lower = msg.toLowerCase();
            if (lower.contains("access denied") || lower.contains("unauthorized") || lower.contains("do not own")) {
                status = HttpStatus.FORBIDDEN;
            } else if (lower.contains("not found")) {
                status = HttpStatus.NOT_FOUND;
            }
        }
        return ResponseEntity.status(status).body(new ApiResponse<>(
                ex.getMessage(),
                "error",
                null
        ));
    }

    // Handle validation errors (@Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationErrors(MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiResponse<>(
                "Validation failed",
                "error",
                errors
        ));
    }
}
