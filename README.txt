Planner (installable web app)

1. Go to app.netlify.com/drop
2. Unzip this file, then drag the whole folder onto the page.
3. Open your Netlify link on your phone.
   iPhone (Safari): Share > Add to Home Screen.
   Android (Chrome): menu > Install app / Add to Home screen.

Your data is stored in the browser on that device. Use Export on the Import tab to back it up.

Google Calendar: open Settings in the app and follow "How to get a Client ID". You paste the ID once; it stays on that device.

AI: open Settings > AI and paste your Groq API key (starts with gsk_; get one at console.groq.com/keys). It is stored only in that device's browser, never in the site files. Text uses llama-3.3-70b-versatile (changeable in Settings); screenshots use meta-llama/llama-4-scout-17b-16e-instruct. Without a key, the copy-and-paste option still works.


SHARED AI KEY (GitHub Pages: everyone uses your Groq key, nobody sees it)

GitHub Pages can't hide a key, so a free Cloudflare Worker holds it and forwards requests to Groq.

1. Make a free account at dash.cloudflare.com, then Workers & Pages > Create > Create Worker. Name it e.g. planner-ai, click Deploy.
2. Click Edit code, paste in everything from worker/worker.js, click Deploy.
3. Worker > Settings > Variables and Secrets > add:
   - GROQ_API_KEY  (type: Secret)  = your gsk_ key
   - ALLOWED_ORIGIN (type: Text)   = your site origin, e.g. https://yourname.github.io  (no path, no trailing slash)
4. Copy the worker URL (https://planner-ai.yourname.workers.dev).
5. In index.html set:  const PROXY_URL="https://planner-ai.yourname.workers.dev";
6. Commit and push to GitHub. Open the app once online to refresh the cache.

Users never enter a key. Anyone can still paste their own in Settings > AI to bypass yours.
Tip: set a spend limit in the Groq console, since anyone with the link can use your quota.
