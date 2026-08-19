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
// (This block comment above the class is a "Javadoc" comment -- tools can extract these to
// auto-generate documentation, and IDEs show them as tooltips when you hover the class name.)

// @Component tells Spring "create exactly one instance of this class (a 'singleton bean') and
// manage its lifecycle" -- this is what makes it eligible to be automatically injected into
// WebSocketConfig's constructor above.
@Component
// "extends TextWebSocketHandler" -- we're inheriting from a Spring base class that already
// handles the low-level WebSocket protocol details (handshakes, frame parsing, etc) and exposes
// simple methods we can override for the parts we actually care about: connection opened,
// text message received, connection closed.
public class DrawingWebSocketHandler extends TextWebSocketHandler {

    // roomId -> the sessions currently connected to that room
    // The core piece of shared state for this whole class: a map from room ID string to the
    // set of WebSocketSession objects (one per connected browser) currently in that room.
    // ConcurrentHashMap is used instead of a plain HashMap because MULTIPLE users can connect/
    // disconnect/send messages at the exact same time from different threads (Spring handles
    // each connection on its own thread) -- a plain HashMap isn't safe to modify from multiple
    // threads simultaneously and could corrupt its internal structure or throw exceptions.
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    // A small private helper method (not part of any Spring interface) that extracts the room
    // ID from a given session's connection URL.
    private String roomIdOf(WebSocketSession session) {
        // path looks like /ws/board/{roomId} -> take the last path segment
        // session.getUri() gives the full URL the client connected to; .getPath() gives just
        // the path portion, e.g. "/ws/board/abc123".
        String path = session.getUri().getPath();
        // lastIndexOf('/') finds the position of the FINAL slash in the path; +1 moves past
        // it; .substring(...) returns everything from there to the end -- i.e., "abc123".
        return path.substring(path.lastIndexOf('/') + 1);
    }

    // Called automatically by Spring the moment a new WebSocket handshake succeeds.
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String roomId = roomIdOf(session);
        // computeIfAbsent: "if this key doesn't have a value yet, create one using this
        // function, then return it (existing or newly created)." Here: if this room doesn't
        // have a session set yet, create a new empty thread-safe set for it. Either way, we
        // then .add(session) the new connection to that room's set.
        // "ConcurrentHashMap.newKeySet()" creates a Set that's safe for concurrent access,
        // matching the thread-safety of the outer map.
        rooms.computeIfAbsent(roomId, id -> ConcurrentHashMap.newKeySet()).add(session);
    }

    // Called automatically every time ANY connected client sends a text message.
    // "throws IOException" -- sending a message over a session can fail (e.g. if the
    // connection just dropped), and Java requires methods to declare checked exceptions they
    // might throw; Spring's WebSocket infrastructure handles catching this further up.
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        String roomId = roomIdOf(session);
        // Look up everyone currently in this sender's room. getOrDefault provides an empty
        // set as a fallback in the (shouldn't-really-happen) case the room isn't found, so the
        // loop below just does nothing instead of crashing on a null.
        Set<WebSocketSession> peers = rooms.getOrDefault(roomId, Set.of());
        // Loop over every session in that room...
        for (WebSocketSession other : peers) {
            // ...and forward the message to everyone EXCEPT the person who sent it (comparing
            // session IDs, since WebSocketSession objects represent unique connections), and
            // only if that connection is still actually open (it might have just disconnected
            // but not yet been removed from the set).
            if (!other.getId().equals(session.getId()) && other.isOpen()) {
                // Re-send the EXACT same TextMessage object we received -- we never parse or
                // even look at its contents. This handler is completely agnostic to what kind
                // of board message it is (draw, node-add, node-edit, etc) -- it's just a relay.
                other.sendMessage(message);
            }
        }
    }

    // Called automatically when a connection closes, for any reason (browser tab closed,
    // network drop, server shutting down, etc).
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roomId = roomIdOf(session);
        Set<WebSocketSession> peers = rooms.get(roomId);
        // Defensive null check: the room should exist if this session was ever added to it,
        // but guard against it anyway.
        if (peers != null) {
            peers.remove(session);
            // Cleanup: if that was the LAST person in the room, remove the room entry
            // entirely, so the `rooms` map doesn't slowly accumulate empty, abandoned rooms
            // forever as people create and leave boards.
            if (peers.isEmpty()) rooms.remove(roomId);
        }
    }
}
