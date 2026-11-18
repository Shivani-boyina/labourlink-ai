package com.labourlink.labourlinkai.exception;

import com.labourlink.labourlinkai.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
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
            } else if (lower.contains("already applied") || lower.contains("already registered") || lower.contains("capacity full") ||
                    lower.contains("reached its worker capacity") || lower.contains("job is closed") ||
                    lower.contains("only pending applications") || lower.contains("cannot delete a job") ||
                    lower.contains("cannot delete a contractor") ||
                    lower.contains("cannot be lower than accepted workers") ||
                    lower.contains("coverage is already confirmed") || lower.contains("offer is no longer pending") ||
                    lower.contains("replacement request is cancelled") || lower.contains("already received an offer") ||
                    lower.contains("replacement attendance has already been recorded") ||
                    lower.contains("replacement coverage conflicts") || lower.contains("no longer eligible") ||
                    lower.contains("changed after this offer") || lower.contains("use a reasoned correction") ||
                    lower.contains("attendance changed since") || lower.contains("review already exists") ||
                    lower.contains("requires verified present")) {
                status = HttpStatus.CONFLICT;
            }
        }
        return ResponseEntity.status(status).body(new ApiResponse<>(
                ex.getMessage(),
                "error",
                null
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<String>> handleConstraintViolation(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiResponse<>(
                "A record with those details already exists",
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
