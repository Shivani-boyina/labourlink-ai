package com.labourlink.labourlinkai.integration;

import java.util.Map;
import java.time.Duration;
import java.net.http.HttpClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.core.ParameterizedTypeReference;

@Component
public class MLPredictionClient {

    public java.util.List<Map<String, Object>> predictBatch(java.util.List<Map<String, Object>> inputs) {
        return restClient.post().uri("/predict-batch").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("items", inputs)).retrieve()
                .body(new ParameterizedTypeReference<java.util.List<Map<String, Object>>>() {});
    }

    private final RestClient restClient;

    public MLPredictionClient(
            RestClient.Builder builder,
            @Value("${labourlink.ml.url:http://127.0.0.1:8000}")
            String mlServiceUrl) {

        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofMillis(750))
                .build());
        factory.setReadTimeout(Duration.ofSeconds(2));
        this.restClient = builder
                .baseUrl(mlServiceUrl)
                .requestFactory(factory)
                .build();
    }

    public Map<String, Object> featureContract() {
        return restClient.get().uri("/feature-contract").retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    public Map<String, Object> checkHealth() {
        return restClient.get()
                .uri("/health")
                .retrieve()
                .body(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});
    }

    public Map<String, Object> predict(Map<String, Object> features) {
        try {
            String json = new ObjectMapper().writeValueAsString(features);

            return restClient.post()
                    .uri("/predict")
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(json)
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Cannot serialize ML features", e);
        }
    }
}
