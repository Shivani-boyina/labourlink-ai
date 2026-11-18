package com.labourlink.labourlinkai.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.service.WorkerService;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChatService {
    private static final String PLATFORM_CONTEXT = "You are LabourLinkAI's concise platform assistant. " +
            "Explain how to use the platform; do not invent worker profiles, availability, ratings, contacts, or job status. " +
            "For finding workers, direct contractors to /workers/search and request a service area. " +
            "Workers can manage profile at /worker/profile and opportunities at /jobs. " +
            "Contractors can post jobs at /contractor/jobs/create and track them in their dashboard. " +
            "Never claim to have searched or contacted anyone. Keep responses clear and simple.";

    private final ObjectMapper mapper;
    private final String apiKey;
    private final String apiUrl;
    private final String model;
    private final WorkerService workerService;
    private volatile HttpClient client;

    public ChatService(ObjectMapper mapper,
                       @Value("${app.chat.api-key:}") String apiKey,
                       @Value("${app.chat.api-url:https://api.openai.com/v1/chat/completions}") String apiUrl,
                       @Value("${app.chat.model:gpt-4o-mini}") String model,
                       WorkerService workerService) {
        this.mapper = mapper;
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.model = model;
        this.workerService = workerService;
    }

    public ChatResponse respond(ChatRequest request, String role) {
        return respond(request, role, null);
    }

   public ChatResponse respond(ChatRequest request, String role, String userPhone) {
        String text = request.message().trim();
        boolean telugu = "te".equalsIgnoreCase(request.language());
        String action = suggestedAction(text, role);
        if ("contractor".equals(role)) {
            String skill = requestedSkill(text);
            if (skill != null) {
                String location = requestedLocation(text);
                String searchAction = "/workers/search?skill=" + URLEncoder.encode(skill, StandardCharsets.UTF_8)
                        + (location == null ? "" : "&location=" + URLEncoder.encode(location, StandardCharsets.UTF_8));
                if (location == null && Pattern.compile("(?i)\\b(near me|nearby|close to me|close by|closest|around me|my location)\\b").matcher(text).find()) {
                    return new ChatResponse(telugu
                            ? skillTelugu(skill) + " కార్మికుల కోసం వెతకగలను. దయచేసి ప్రాంతాన్ని ఎంచుకోండి లేదా కార్మికుల శోధనలో మీ పరికర స్థానాన్ని ఉపయోగించండి. ఆ తర్వాత ధృవీకరించిన ఫలితాలను చూడండి."
                            : "I can search for " + skill + "s. Please choose your area or use device location on worker search, then view verified matching workers.", searchAction, telugu ? "ప్రాంతాన్ని ఎంచుకుని వెతకండి" : "Choose location and search", List.of());
                }
                List<ChatWorkerResult> results = workerService.searchWorkers(skill, location).stream()
                        .limit(10).map(this::toChatWorker).toList();
                String message = telugu
                        ? (results.isEmpty()
                            ? "కార్మికుల జాబితాలో " + skillTelugu(skill) + " సరిపోలికలు లేవు" + (location == null ? "." : " " + location + " ప్రాంతంలో లేవు.")
                            : "లేబర్‌లింక్ AI జాబితాలో " + results.size() + " నిజమైన సరిపోలిన కార్మికులు దొరికారు.")
                        : (results.isEmpty()
                            ? "I searched the worker directory. There are no matching " + skill + " workers" + (location == null ? " yet." : " listed in " + location + ".")
                            : "I found " + results.size() + " matching worker" + (results.size() == 1 ? "." : "s.") + " These results came from the LabourLinkAI directory.");
                return new ChatResponse(message, searchAction, telugu ? "అన్ని ఫలితాలు తెరవండి" : "Open all search results", results);
            }
        }
        if (!apiKey.isBlank()) {
            try {
                return new ChatResponse(callProvider(request, role), action, action == null ? null : (telugu ? "ఈ పేజీని తెరవండి" : "Open this page"), List.of());
            } catch (Exception ignored) {
                // Provider outages safely fall back to platform guidance.
            }
        }
        return new ChatResponse(fallback(text, role, telugu), action, action == null ? null : (telugu ? "ఈ పేజీని తెరవండి" : "Open this page"), List.of());
    }

    private String callProvider(ChatRequest request, String role) throws Exception {
        List<Map<String, String>> messages = new ArrayList<>();
        String responseLanguage = "te".equalsIgnoreCase(request.language()) ? "Telugu (తెలుగు)" : "English";
        messages.add(Map.of("role", "system", "content", PLATFORM_CONTEXT + " Authenticated audience role: " + role + ". Always answer in " + responseLanguage + "."));
        if (request.history() != null) {
            request.history().stream().limit(10).filter(item -> "user".equals(item.role()) || "assistant".equals(item.role()))
                    .forEach(item -> messages.add(Map.of("role", item.role(), "content", item.text())));
        }
        messages.add(Map.of("role", "user", "content", request.message().trim()));
        Map<String, Object> payload = Map.of("model", model, "messages", messages, "max_tokens", 250, "temperature", 0.3);
        HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(apiUrl))
                .timeout(Duration.ofSeconds(12))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)))
                .build();
        HttpResponse<String> response = httpClient()
                .send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) throw new IllegalStateException("Chat provider unavailable");
        JsonNode content = mapper.readTree(response.body()).path("choices").path(0).path("message").path("content");
        if (!content.isTextual() || content.asText().isBlank()) throw new IllegalStateException("Empty chat response");
        return content.asText().trim();
    }

    private HttpClient httpClient() {
        HttpClient current = client;
        if (current == null) {
            synchronized (this) {
                current = client;
                if (current == null) {
                    current = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
                    client = current;
                }
            }
        }
        return current;
    }

    private ChatWorkerResult toChatWorker(Worker worker) {
        return new ChatWorkerResult(worker.getWorkerId(), worker.getName(), worker.getSkill(), worker.getLocation(),
                worker.getExperience(), worker.getAvailability(), worker.getExpectedWagePerDay());
    }

    private String requestedSkill(String text) {
        String q = text.toLowerCase();
        if (q.matches(".*(\\b(plumber|plumbing)\\b|ప్లంబర్).*")) return "Plumber";
        if (q.matches(".*(\\b(electrician|electrical)\\b|ఎలక్ట్రీషియన్).*")) return "Electrician";
        if (q.matches(".*(\\b(carpenter|carpentry)\\b|కార్పెంటర్).*")) return "Carpenter";
        if (q.matches(".*(\\b(mason|masonry)\\b|మేస్త్రీ).*")) return "Mason";
        if (q.matches(".*(\\b(painter|painting)\\b|పెయింటర్).*")) return "Painter";
        if (q.matches(".*(\\b(welder|welding)\\b|వెల్డర్).*")) return "Welder";
        if (q.matches(".*(\\b(helper|labourer|laborer)\\b|హెల్పర్).*")) return "Helper";
        return null;
    }

    private String skillTelugu(String skill) {
        return switch (skill) {
            case "Plumber" -> "ప్లంబర్";
            case "Electrician" -> "ఎలక్ట్రీషియన్";
            case "Carpenter" -> "కార్పెంటర్";
            case "Mason" -> "మేస్త్రీ";
            case "Painter" -> "పెయింటర్";
            case "Welder" -> "వెల్డర్";
            default -> "హెల్పర్";
        };
    }

    private String requestedLocation(String text) {
        Matcher matcher = Pattern.compile("(?i)\\b(?:in|around|at|near(?!\\s+me\\b))\\s+([\\p{L}][\\p{L} .'-]{1,40})").matcher(text);
        if (!matcher.find()) return null;
        String area = matcher.group(1).replaceAll("(?i)\\b(near me|nearby|within \\d+ ?km|please|today)\\b.*$", "").trim();
        return area.isBlank() ? null : area;
    }

    private String fallback(String text, String role, boolean telugu) {
        String q = text.toLowerCase();
        if (q.matches("(?iu).*(\\b(hi|hello|hey|good morning|good evening)\\b|నమస్కారం|హలో|హాయ్).*$")) {
            return telugu
                    ? "నమస్కారం! నేను LabourLinkAI సహాయకుడిని. మీరు పని వెతుకుతున్నారా, కార్మికుడిని వెతుకుతున్నారా, లేక పని పోస్ట్ చేయాలనుకుంటున్నారా?"
                    : "Hi! I’m the LabourLinkAI assistant. Are you looking for work, searching for a worker, or trying to post a job?";
        }
        if (q.matches("(?iu).*(\\b(thanks|thank you|ధన్యవాదాలు|థాంక్స్)\\b|ధన్యవాదాలు).*$")) {
            return telugu ? "సంతోషం! ఉద్యోగాలు, దరఖాస్తులు లేదా కార్మికుల శోధనలో ఇంకేమైనా సహాయం కావాలా?"
                    : "You’re welcome! Do you need help with jobs, applications, or finding workers?";
        }
        if (q.contains("job requirement") || q.contains("job requirements") || q.contains("required for job")
                || q.contains("పని అవసరాలు") || q.contains("ఉద్యోగ అర్హత") || q.contains("ఏం కావాలి")) {
            return "worker".equals(role)
                    ? (telugu
                        ? "ప్రతి ఉద్యోగంలో కావలసిన నైపుణ్యం, ప్రాంతం, రోజువారీ వేతనం, పని తేదీలు ఉంటాయి. ఉద్యోగాన్ని తెరిచి వివరాలు చూసి, మీ నైపుణ్యాలు సరిపోతే దరఖాస్తు చేయండి."
                        : "Each job lists its required skill, location, daily wage, and work dates. Open a job to review the details, then apply if your skills match.")
                    : (telugu
                        ? "పని పోస్ట్‌లో అవసరమైన నైపుణ్యం, కార్మికుల సంఖ్య, ప్రాంతం, రోజువారీ వేతనం, పని తేదీలు ఇవ్వండి. కార్మికులు ఇవే వివరాలు చూసి దరఖాస్తు చేస్తారు."
                        : "A useful job post includes the trade or skill, number of workers, location, daily wage, and work dates. Workers use those details to decide whether to apply.");
        }
        if (q.contains("wage") || q.contains("salary") || q.contains("pay rate") || q.contains("రోజువారీ వేతనం") || q.contains("జీతం")) {
            return telugu
                    ? "వేతనం ఉద్యోగానికి ఉద్యోగం మారుతుంది. ఉద్యోగ వివరాల్లో రోజువారీ వేతనం (₹/రోజు) చూడండి; కాంట్రాక్టర్లు పని పోస్ట్ చేసేటప్పుడు వేతనాన్ని పేర్కొంటారు."
                    : "Pay varies by job. Check the job details for its daily rate (₹/day); contractors specify the rate when they post a job.";
        }
        if (q.contains("apply") || q.contains("application") || q.contains("దరఖాస్తు") || q.contains("అప్లికేషన్")) {
            return "worker".equals(role)
                    ? (telugu ? "పని పేజీలో ఉద్యోగాన్ని తెరిచి, వివరాలు పరిశీలించి దరఖాస్తు నొక్కండి. మీ దరఖాస్తుల స్థితిని My Applicationsలో చూడండి."
                        : "Open a job on Find Work, review its details, and select Apply. Track your applications under My Applications.")
                    : (telugu ? "మీరు పోస్ట్ చేసిన పనుల దరఖాస్తులను కాంట్రాక్టర్ డాష్‌బోర్డ్‌లో చూడవచ్చు."
                        : "You can review applicants for your posted jobs from the contractor dashboard.");
        }
        if (q.contains("register") || q.contains("sign up") || q.contains("create account") || q.contains("నమోదు") || q.contains("రిజిస్టర్")) {
            return "worker".equals(role)
                    ? (telugu ? "మీ కార్మిక ఖాతా ఇప్పటికే ఉంది. ప్రొఫైల్‌లో నైపుణ్యాలు, ప్రాంతం, అందుబాటును నవీకరించండి."
                        : "You already have a worker account. Update your skills, area, and availability in your profile.")
                    : (telugu ? "కార్మికుడిగా లేదా కాంట్రాక్టర్‌గా నమోదు ఎంచుకుని, ఫారమ్‌లో అడిగిన వివరాలు పూరించండి."
                        : "Choose Register as Worker or Register as Contractor, then complete the requested details.");
        }
        if (telugu) {
            if ("worker".equals(role) && (q.contains("near me") || q.contains("find") || requestedSkill(text) != null || q.contains("పని")))
                return "కార్మికుల శోధన కాంట్రాక్టర్ల కోసం. మీరు పని కోసం తెరిచి ఉన్న ఉద్యోగాలను చూడండి. మీ ప్రొఫైల్‌లో నైపుణ్యాలు, ప్రాంతం, అందుబాటును నవీకరించండి.";
            if (q.contains("పని") || q.contains("ఉద్యోగం") || q.contains("job"))
                return "కార్మికులు తెరిచి ఉన్న పనులను చూడవచ్చు. కాంట్రాక్టర్లు డాష్‌బోర్డ్‌లో 'కొత్త పని' ద్వారా పని పోస్ట్ చేయవచ్చు.";
            if (q.contains("ప్రొఫైల్") || q.contains("నైపుణ్యం") || q.contains("ప్రాంతం") || q.contains("లొకేషన్"))
                return "మీ ప్రొఫైల్ పేజీలో మీ వివరాలు మరియు ప్రాంతాన్ని నిర్వహించండి. కార్మికులు అక్కడ సుమారు స్థానాన్ని పంచుకోవడం ఆపివేయవచ్చు లేదా ప్రారంభించవచ్చు.";
            if (q.contains("అందుబాటు") || q.contains("available"))
                return "కార్మికుల శోధన ఫలితాల్లో అందుబాటు కనిపిస్తుంది. సంప్రదించే ముందు ప్రొఫైల్ వివరాలను చూడండి.";
            if (q.contains("పోస్ట్") || q.contains("కాంట్రాక్టర్"))
                return "కాంట్రాక్టర్లు డాష్‌బోర్డ్‌లో కొత్త పనిని పోస్ట్ చేయవచ్చు. కార్మికులు పని పేజీలో దరఖాస్తుల స్థితిని చూడవచ్చు.";
            if (requestedSkill(text) != null)
                return "నిజమైన కార్మికుల వివరాల కోసం కాంట్రాక్టర్ లాగిన్‌తో కార్మికుల శోధనను ఉపయోగించి ప్రాంతాన్ని ఎంచుకోండి.";
            return "ఈ ప్రశ్నకు ఖచ్చితమైన సమాధానం ఇవ్వడానికి నాకు తగిన సమాచారం లేదు: “" + text + "”. ఉద్యోగాలు, దరఖాస్తులు, ప్రొఫైల్ లేదా కార్మికుల శోధన గురించి అడగండి.";
        }
        if ("worker".equals(role) && (q.contains("near me") || q.contains("nearby") || q.contains("find") || q.contains("search") || requestedSkill(text) != null)) {
            return "Worker discovery is for contractors. As a worker, browse open opportunities on the Find Work page and keep your profile location and availability up to date.";
        }
        if (q.contains("near me") || q.contains("nearby") || q.contains("find") || q.contains("search") || q.contains("plumber") || q.contains("electrician") || q.contains("carpenter")) {
            return "I can help you look for workers. Open worker search and choose a skill and area. " +
                    "You can also choose device location to filter by distance. Only workers who opted into approximate map sharing appear as map pins.";
        }
        if (q.contains("availability") || q.contains("available")) return "Worker availability is shown on worker search results. Open a worker profile to review the details before contacting them.";
        if (q.contains("skill") || q.contains("profile") || q.contains("location")) return "You can manage your own information from My Profile. Workers can update their skills, availability and area there.";
        if (q.contains("post") || q.contains("job")) return "Contractors can post a job from the dashboard using Create Job. Workers can browse open opportunities from Find Work.";
        if (q.contains("track") || q.contains("application")) return "Workers can review applications in My Applications. Contractors can track job activity from their dashboard.";
        if (q.contains("worker") || q.contains("labour") || q.contains("laborer") || q.contains("కార్మిక")) {
            return "contractor".equals(role)
                    ? "To find workers, open Find Workers, choose a trade, and select an area. Only directory matches are shown; check each profile for availability."
                    : "You can browse job openings from Find Work. Worker search is available to contractors.";
        }
        if (q.contains("profile") || q.contains("skill") || q.contains("location") || q.contains("ప్రొఫైల్")) {
            return "worker".equals(role)
                    ? "Open My Profile to update your trade, experience, area, daily wage expectation, and availability."
                    : "Open My Profile to update your contractor details and service area.";
        }
        return "I don’t have enough information to answer “" + text + "” accurately. I can help with finding work, job requirements, wages, applications, profiles, or searching for workers.";
    }

    private String suggestedAction(String message, String role) {
        String q = message.toLowerCase();
        if (q.contains("job requirement") || q.contains("job requirements") || q.contains("పని అవసరాలు")) {
            return "worker".equals(role) ? "/jobs" : ("contractor".equals(role) ? "/contractor/jobs/create" : "/jobs");
        }
        if ("worker".equals(role) && (q.contains("near me") || q.contains("nearby") || q.contains("find") || q.contains("search") || requestedSkill(message) != null)) return "/jobs";
        if (q.contains("worker") || q.contains("plumber") || q.contains("electrician") || q.contains("carpenter")) return "/workers/search";
        if (q.contains("profile") || q.contains("skill") || q.contains("availability")) return "/worker/profile";
        if (q.contains("post") || q.contains("create job")) return "/contractor/jobs/create";
        if (q.contains("job") || q.contains("work")) return "/jobs";
        return null;
    }
}
