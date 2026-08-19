package com.whiteboard.app.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

// @Configuration tells Spring "this class defines beans/setup, scan it at startup" --
// similar in spirit to @SpringBootApplication but for a specific piece of configuration
// rather than the whole app.
@Configuration
// @EnableWebSocket turns on Spring's WebSocket support at all -- without this annotation
// somewhere in the app, WebSocket connections wouldn't be handled regardless of anything else.
@EnableWebSocket
// "implements WebSocketConfigurer" means this class promises to provide a
// registerWebSocketHandlers method (below) -- Spring calls that method automatically at
// startup to learn which URLs should be treated as WebSocket endpoints.
public class WebSocketConfig implements WebSocketConfigurer {

    // A reference to our actual message-handling logic (defined in DrawingWebSocketHandler.java).
    // "final" means this field is set once (in the constructor) and never reassigned.
    private final DrawingWebSocketHandler drawingWebSocketHandler;

    // Constructor. Spring automatically calls this when creating a WebSocketConfig instance,
    // and automatically supplies a DrawingWebSocketHandler instance as the argument -- this is
    // "constructor dependency injection": we never write `new DrawingWebSocketHandler()`
    // ourselves, Spring builds one (since it's annotated @Component) and hands it to us.
    public WebSocketConfig(DrawingWebSocketHandler drawingWebSocketHandler) {
        this.drawingWebSocketHandler = drawingWebSocketHandler;
    }

    // "@Override" confirms to the compiler that this method is actually fulfilling a promise
    // from the WebSocketConfigurer interface (catches typos like a misspelled method name).
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // /ws/board/{roomId} -- the room id is read from the URL by DrawingWebSocketHandler
        // This is the actual wiring: "any WebSocket connection to a URL matching /ws/board/*
        // should be handled by our drawingWebSocketHandler object." The "*" is a wildcard --
        // it matches exactly one more path segment, e.g. /ws/board/abc123.
        registry.addHandler(drawingWebSocketHandler, "/ws/board/*")
                // By default, browsers block WebSocket connections from a different origin
                // (domain) than the one serving the page, for security. Since our frontend
                // (Vercel) and backend (Render) are on completely different domains, we need
                // to explicitly allow that. "*" here means "allow connections from any origin" --
                // fine for a demo project, but in a stricter production setup you'd usually list
                // your actual frontend domain instead of a wildcard.
                .setAllowedOriginPatterns("*");
    }
}
