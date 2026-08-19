package com.whiteboard.app.web;

// Importing our own S3Service class from a different package (service) within the same project.
import com.whiteboard.app.service.S3Service;
// @Value lets us inject a value from application.properties (or an environment variable)
// directly into a field, instead of manually reading config files ourselves.
import org.springframework.beans.factory.annotation.Value;
// ".*" imports EVERY class from this package at once (RestController, RequestMapping,
// PostMapping, GetMapping, RequestBody, CrossOrigin all come from here) -- a shorthand instead
// of listing each one on its own line.
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// @RestController: marks this class as handling HTTP requests, where every method's return
// value gets automatically converted to a JSON response body (instead of, say, rendering an
// HTML template -- that would be plain @Controller instead).
@RestController
// @RequestMapping sets a shared URL prefix for every endpoint defined in this class -- so
// the two methods below actually live at /api/board/save and /api/board/health.
@RequestMapping("/api/board")
// Same origin-restriction concern as the WebSocket config: by default browsers block a
// frontend on one domain from calling an API on another domain (this is "CORS" -- Cross-Origin
// Resource Sharing). This annotation tells Spring to add the necessary response headers so
// requests from ANY origin ("*") are allowed through.
@CrossOrigin(origins = "*")
public class BoardController {

    // Same dependency-injection pattern as WebSocketConfig: Spring creates one S3Service
    // (since it's @Service-annotated) and hands it to us here.
    private final S3Service s3Service;

    // Reads the "aws.cloudfront.domain" property from application.properties. The ":" followed
    // by nothing after it (${aws.cloudfront.domain:}) means "default to an empty string if this
    // property isn't set" -- without that colon, Spring would throw a startup error if the
    // property were missing entirely.
    @Value("${aws.cloudfront.domain:}")
    private String cloudFrontDomain;

    // Constructor, again used for Spring's dependency injection -- it automatically supplies
    // an S3Service instance when creating this controller.
    public BoardController(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    // Java "records" (a newer, concise language feature) -- a one-line way to define a simple
    // immutable data class. This one line automatically generates: a constructor, a getter
    // method imageDataUrl(), equals(), hashCode(), and toString(). It exists purely to describe
    // the shape of the JSON body the frontend sends: {"imageDataUrl": "data:image/png;..."}.
    public record SaveRequest(String imageDataUrl) {}
    // Same idea, but for the shape of what we send BACK to the frontend: {"key": "...", "url": "..."}.
    public record SaveResponse(String key, String url) {}

    // @PostMapping("/save") means this method handles HTTP POST requests to /api/board/save
    // (remember, /api/board comes from the class-level @RequestMapping above).
    @PostMapping("/save")
    // @RequestBody tells Spring "parse the incoming JSON request body into a SaveRequest object
    // automatically" -- we never manually parse JSON ourselves anywhere in this codebase.
    // The return type SaveResponse is automatically serialized back to JSON in the HTTP response.
    public SaveResponse save(@RequestBody SaveRequest request) {
        // request.imageDataUrl() calls the auto-generated getter from the record above.
        // Delegate the actual upload work to S3Service, get back the S3 object key it was saved under.
        String key = s3Service.uploadBoardImage(request.imageDataUrl());
        // Decide what URL to hand back to the frontend: if no CloudFront domain is configured,
        // just return the raw S3 key (frontend/README explains how to build a full URL from it
        // manually); if CloudFront IS configured, build a proper CDN URL.
        String url = cloudFrontDomain.isBlank()
                ? key
                : "https://" + cloudFrontDomain + "/" + key;
        // Construct and return the response record -- Spring turns this into
        // {"key": "boards/...", "url": "https://..."} as the actual HTTP response body.
        return new SaveResponse(key, url);
    }

    // A simple health-check endpoint: GET /api/board/health. Useful for confirming the backend
    // is actually up and responding (we used this earlier to detect when Render's free-tier
    // instance had finished waking up from a cold start).
    @GetMapping("/health")
    public Map<String, String> health() {
        // Map.of(...) is a concise way to build a small, immutable Map -- here producing
        // {"status": "ok"} as the JSON response.
        return Map.of("status", "ok");
    }
}
