package com.whiteboard.app.ws;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Broadcasts every drawing message to other clients in the SAME room only.
 * The room id comes from the connection URL: /ws/board/{roomId}.
 * Message payload is opaque JSON produced by the frontend: {type, x, y, prevX, prevY, color, size}
 */
@Component
public class DrawingWebSocketHandler extends TextWebSocketHandler {

    // roomId -> the sessions currently connected to that room
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    private String roomIdOf(WebSocketSession session) {
        // path looks like /ws/board/{roomId} -> take the last path segment
        String path = session.getUri().getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String roomId = roomIdOf(session);
        rooms.computeIfAbsent(roomId, id -> ConcurrentHashMap.newKeySet()).add(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        String roomId = roomIdOf(session);
        Set<WebSocketSession> peers = rooms.getOrDefault(roomId, Set.of());
        for (WebSocketSession other : peers) {
            if (!other.getId().equals(session.getId()) && other.isOpen()) {
                other.sendMessage(message);
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roomId = roomIdOf(session);
        Set<WebSocketSession> peers = rooms.get(roomId);
        if (peers != null) {
            peers.remove(session);
            if (peers.isEmpty()) rooms.remove(roomId);
        }
    }
}
