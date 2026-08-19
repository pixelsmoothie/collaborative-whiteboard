package com.whiteboard.app.web;

import com.whiteboard.app.service.S3Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/board")
@CrossOrigin(origins = "*")
public class BoardController
{
    private final S3Service s3Service;

    @Value("${aws.cloudfront.domain:}")
    private String cloudFrontDomain;

    public BoardController(S3Service s3Service)
    {
        this.s3Service = s3Service;
    }

    public record SaveRequest(String roomId, String imageDataUrl) {}
    public record SaveResponse(String key, String url) {}

    @PostMapping("/save")
    public SaveResponse save(@RequestBody SaveRequest request)
    {
        String key = s3Service.uploadBoardImage(request.roomId(), request.imageDataUrl());
        String url = cloudFrontDomain.isBlank()
                ? key
                : "https://" + cloudFrontDomain + "/" + key;
        return new SaveResponse(key, url);
    }

    //proxies the room's last saved snapshot through our own origin, so the frontend can draw it
    //onto the canvas without a cross-origin image tainting it
    @GetMapping(value = "/{roomId}/image", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getImage(@PathVariable String roomId) throws IOException
    {
        byte[] bytes = s3Service.downloadBoardImage(roomId);
        if (bytes == null) return ResponseEntity.notFound().build();      //nothing saved for this room yet
        return ResponseEntity.ok(bytes);
    }

    @GetMapping("/health")
    public Map<String, String> health()
    {
        return Map.of("status", "ok");
    }
}
