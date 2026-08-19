package com.whiteboard.app.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final DrawingWebSocketHandler drawingWebSocketHandler;

    public WebSocketConfig(DrawingWebSocketHandler drawingWebSocketHandler) {
        this.drawingWebSocketHandler = drawingWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // /ws/board/{roomId} -- the room id is read from the URL by DrawingWebSocketHandler
        registry.addHandler(drawingWebSocketHandler, "/ws/board/*")
                .setAllowedOriginPatterns("*");
    }
}
