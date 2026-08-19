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

//broadcasts to everyone in the SAME room only, room id comes off the connection url
@Component
public class DrawingWebSocketHandler extends TextWebSocketHandler
{
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();      //roomId -> sessions in it

    private String roomIdOf(WebSocketSession session)
    {
        //path looks like /ws/board/{roomId}, just grab the last segment
        String path = session.getUri().getPath();
        return path.substring(path.lastIndexOf('/') + 1);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session)
    {
        String roomId = roomIdOf(session);
        rooms.computeIfAbsent(roomId, id -> ConcurrentHashMap.newKeySet()).add(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException
    {
        String roomId = roomIdOf(session);
        Set<WebSocketSession> peers = rooms.getOrDefault(roomId, Set.of());
        for (WebSocketSession other : peers)
        {
            if (!other.getId().equals(session.getId()) && other.isOpen())
            {
                other.sendMessage(message);
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status)
    {
        String roomId = roomIdOf(session);
        Set<WebSocketSession> peers = rooms.get(roomId);
        if (peers != null)
        {
            peers.remove(session);
            if (peers.isEmpty()) rooms.remove(roomId);      //don't let dead rooms pile up
        }
    }
}
