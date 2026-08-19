package com.whiteboard.app.web;

import com.whiteboard.app.service.S3Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/board")
@CrossOrigin(origins = "*")
public class BoardController {

    private final S3Service s3Service;

    @Value("${aws.cloudfront.domain:}")
    private String cloudFrontDomain;

    public BoardController(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    public record SaveRequest(String imageDataUrl) {}
    public record SaveResponse(String key, String url) {}

    @PostMapping("/save")
    public SaveResponse save(@RequestBody SaveRequest request) {
        String key = s3Service.uploadBoardImage(request.imageDataUrl());
        String url = cloudFrontDomain.isBlank()
                ? key
                : "https://" + cloudFrontDomain + "/" + key;
        return new SaveResponse(key, url);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
