// Every Java file's first non-comment line declares which "package" (namespace/folder) it
// belongs to. This matches the folder structure: com/whiteboard/app/WhiteboardApplication.java.
package com.whiteboard.app;

// Import statements: pull in classes defined elsewhere (here, from the Spring Boot framework
// itself) so we can reference them by their short name instead of the full path every time.
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// An "annotation" -- metadata attached to the class below that Spring reads at startup.
// @SpringBootApplication is actually a bundle of three other annotations: it marks this as
// the app's main configuration class, enables Spring's "auto-configuration" (which guesses
// sensible defaults based on what's on the classpath, e.g. "I see spring-boot-starter-web,
// so set up an embedded Tomcat server"), and tells Spring to scan this package (and subpackages)
// for other annotated classes like @RestController, @Service, @Component, etc.
@SpringBootApplication
// "public class X" -- a top-level class, visible from any other file in the project.
public class WhiteboardApplication {
    // "public static void main(String[] args)" is the exact, fixed signature the JVM looks
    // for to know where to start running a Java program -- every runnable Java app has one.
    public static void main(String[] args) {
        // Hand control over to Spring Boot: this single call boots the entire embedded web
        // server, scans for all the @Component/@RestController/@Configuration classes in this
        // package, wires them together (dependency injection), and starts listening for
        // HTTP/WebSocket connections. Everything else in this codebase runs as a result of
        // this one line executing.
        SpringApplication.run(WhiteboardApplication.class, args);
    }
}
