package com.labourlink.labourlinkai.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.service.WorkerService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChatServiceTest {
    private final WorkerService workers = mock(WorkerService.class);
    private final ChatService service = new ChatService(new ObjectMapper(), "", "https://api.openai.com/v1/chat/completions", "gpt-4o-mini", workers);

    @Test
    void fallbackGivesWorkerSearchGuidanceWithoutInventingResults() {
        ChatResponse response = service.respond(new ChatRequest("I need a plumber near me", List.of()), "contractor");

        assertTrue(response.message().contains("choose your area"));
        assertTrue(response.action().contains("skill=Plumber"));
    }

    @Test
    void fallbackProvidesWorkerSpecificProfileHelp() {
        ChatResponse response = service.respond(new ChatRequest("How do I update my skills?", List.of()), "worker");

        assertEquals("/worker/profile", response.action());
        assertTrue(response.message().contains("My Profile"));
    }

    @Test
    void contractorSearchReturnsVerifiedDirectoryWorkers() {
        Worker worker = new Worker();
        worker.setWorkerId(42L); worker.setName("Ravi"); worker.setSkill("Plumber");
        worker.setLocation("Vijayawada"); worker.setExperience(5); worker.setAvailability(true);
        when(workers.searchWorkers("Plumber", "Vijayawada")).thenReturn(List.of(worker));

        ChatResponse response = service.respond(new ChatRequest("Find a plumber near Vijayawada", List.of()), "contractor");

        assertEquals(1, response.workers().size());
        assertEquals("Ravi", response.workers().get(0).name());
        assertEquals("/workers/search?skill=Plumber&location=Vijayawada", response.action());
    }
}
