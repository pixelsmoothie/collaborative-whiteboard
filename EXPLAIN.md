# How This Project Works (plain English)

Read this top to bottom once, then again on day 7. That's the whole prep plan.

## The one-sentence pitch

"Two browsers open a WebSocket connection to one Spring Boot server. Every
mouse-drag gets turned into a tiny JSON message (`{x, y, prevX, prevY, color,
size}`), sent to the server, and the server forwards it to every other
connected browser, which draws the same line on its own canvas."

That's the entire real-time part. Everything else (S3, CloudFront, Docker) is
just "save a picture of the canvas somewhere permanent."

## Where the code lives now (kept deliberately small)

- `frontend/src/App.tsx` — everything: the canvas, the WebSocket, drawing,
  saving. One file, top to bottom, no custom hooks or wrapper components to
  jump between.
- `frontend/src/Toolbar.tsx` — just the buttons/colors, pure UI.
- `backend/.../ws/DrawingWebSocketHandler.java` — the whole multiplayer
  relay, ~25 lines.
- `backend/.../web/BoardController.java` — the one `/api/board/save` endpoint.
- `backend/.../service/S3Service.java` — the S3 upload, one method.

## The 4 moving pieces

### 1. The canvas (`frontend/src/App.tsx`)
An HTML `<canvas>` is just a grid of pixels you can draw on with JavaScript.
- `onMouseMove` fires constantly while you drag → each time it fires, you get
  the previous mouse position and the current one.
- `ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke()` draws a tiny
  straight line segment between those two points. A "smooth" drawn line is
  actually hundreds of these tiny straight segments drawn 60 times a second.

### 2. The WebSocket (`frontend/src/App.tsx` + backend `ws/`)
A normal HTTP request is one-shot: ask, get answer, connection closes.
A WebSocket is a connection that **stays open**, so either side can send a
message to the other at any time, with no new "request" needed each time.
That's why it's used for real-time stuff (chat, games, live cursors) instead
of HTTP.

- `new WebSocket(url)` on the frontend opens the connection.
- `socket.send(json)` pushes a message to the server.
- `socket.onmessage` fires whenever the server pushes something back.

On the backend, `DrawingWebSocketHandler` keeps a list of every connected
browser (a `Map<sessionId, session>`). When one browser sends a message, the
handler loops over that list and re-sends the message to everyone **except**
the sender. That's the entire "multiplayer" logic — about 10 lines of code.

### 3. Saving to S3 (`backend/.../service/S3Service.java` + `web/BoardController.java`)
When you click "Save Board":
1. The frontend calls `canvas.toDataURL()` — this turns the whole canvas into
   one big base64 text string that represents a PNG image.
2. That string is POSTed to `/api/board/save`.
3. The backend decodes the base64 back into raw image bytes and uploads them
   to an S3 bucket (`s3Client.putObject(...)`) — S3 is just Amazon's "file
   storage in the cloud," think of it like a folder you can upload files to
   over the internet.

### 4. CloudFront (the CDN)
S3 can serve files directly, but every request goes all the way to Amazon's
storage servers. CloudFront sits in front of S3 and caches files at servers
physically closer to whoever is requesting them, so repeated loads are
faster and cheaper. It doesn't change your code's logic at all — it's just a
different URL to fetch the same image from.

## Data flow, start to finish

```
You drag mouse
   → Canvas.tsx computes (prevX, prevY, x, y)
   → draws line locally immediately (feels instant)
   → sends {type:"draw", ...} over the WebSocket
   → Spring Boot DrawingWebSocketHandler receives it
   → loops over all OTHER open sessions, re-sends the same message
   → other browser's onmessage fires
   → calls the same drawLine() function with the received coordinates
   → both canvases now show the identical line
```

## Why it's built this way (the decisions you should be able to defend)

- **Why WebSocket instead of polling the server every second?** Polling adds
  delay (up to your poll interval) and wastes requests when nothing changed.
  WebSocket pushes updates the instant they happen, with one persistent
  connection instead of hundreds of repeated HTTP requests.
- **Why send only line segments, not the whole canvas, on every move?**
  Bandwidth. A `{x,y,prevX,prevY,color,size}` message is maybe 60 bytes.
  Sending a full canvas image on every mouse move would be megabytes per
  second per user.
- **Why is the local draw immediate and not "wait for the server to echo it
  back"?** So your own screen doesn't feel laggy — you draw locally right
  away, and only *other* people's browsers wait on the network round trip.
- **Why store images in S3 instead of a database?** Databases are for
  structured, queryable data (rows/columns). Images are large binary blobs —
  object storage (S3) is built exactly for that and is far cheaper per GB.
- **Why CloudFront on top of S3?** Speed for end users (edge caching) and to
  take repeated load off S3/your backend.
- **What happens if the WebSocket disconnects?** The frontend hook
  (`useBoardSocket.ts`) catches the `onclose` event and automatically retries
  the connection after 1 second, forever, until it succeeds.

## 7-day plan to actually own this

- **Day 1** — Run it locally (`mvn spring-boot:run` + `npm run dev`), open
  two browser windows, draw in one, watch it appear in the other. Just watch
  it work before reading more code.
- **Day 2** — Read `App.tsx` top to bottom, just the drawing part
  (`drawLine`, `handleMouseMove`). Comment out the `socketRef.current?.send`
  line and see drawing still work locally but no longer sync — confirms you
  understand what that line is doing.
- **Day 3** — Read the WebSocket `useEffect` in `App.tsx` and
  `DrawingWebSocketHandler.java` side by side. Trace one message from
  `socket.send()` on the frontend to the `for (other : sessions)` loop on
  the backend.
- **Day 4** — Read `BoardController.java` and `S3Service.java`. Use your
  browser's Network tab to watch the actual POST request when you click
  Save, and look at the base64 string it sends.
- **Day 5** — Read the `Dockerfile` line by line and explain each line out
  loud to yourself (or a rubber duck). Look up what a "multi-stage Docker
  build" is and why it's used (smaller final image — the Maven build tools
  aren't shipped in the runtime image).
- **Day 6** — Draw the architecture diagram from `README.md` from memory on
  paper. Then check it against the real one.
- **Day 7** — Do a mock interview with yourself: answer the "why" questions
  above out loud, no notes.

## Likely interview questions

- "Walk me through what happens when a user draws." → use the data flow
  section above.
- "Why WebSocket over REST/polling?" → persistent connection, push not pull,
  lower latency, less overhead.
- "How would this scale to 1000 concurrent users on one board?" → honest
  answer: it wouldn't well as-is (broadcasting to every session is O(n) per
  message, and it's all in one server's memory — a second server instance
  wouldn't see the same sessions). You'd need a message broker (Redis
  pub/sub, or Spring's STOMP + a broker relay) so multiple backend instances
  can share broadcasts. Saying this shows you understand the limitation, which
  is a better answer than pretending it scales infinitely.
- "What if two users draw the same spot at once?" → there's no conflict
  resolution here — both strokes are just drawn in the order the server
  receives them (last write wins, visually). No merge logic needed since
  strokes don't overwrite state, they just paint pixels.
- "Why not store every stroke in a database for full history/undo?" → this
  version doesn't persist stroke-by-stroke, only a final flattened PNG
  snapshot. A "true" version would log each stroke so you could replay or
  undo — good follow-up to mention as a future improvement.
