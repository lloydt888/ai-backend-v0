# Chill Baby Naturals — Chat Widget Install Guide

A step-by-step guide for adding the AI chat widget to the Shopify store. No coding experience required.

---

## Step 1 — Upload the Widget File to Shopify

1. Log in to your Shopify Admin
2. In the left sidebar, go to **Content** → **Files**
3. Click **Upload files** (top right)
4. Select the file **chillbaby-widget.js** from your computer and upload it
5. Once uploaded, it will appear in the file list
6. Click the **Copy link** icon next to the file — this is your CDN URL
7. Paste that URL somewhere handy (Notepad, Notes app) — you'll need it in the next step

---

## Step 2 — Create a Snippet in Your Theme

1. In the left sidebar, go to **Online Store** → **Themes**
2. Next to your active theme, click **Customize** — then click the **three dots (⋯)** menu beside Customize and select **Edit code**
3. In the left panel, find the **Snippets** folder and click **Add a new snippet**
4. Name it exactly: `chillbaby-chat` (Shopify will add `.liquid` automatically)
5. Click **Done**
6. In the blank file that opens, paste the following — replacing `YOUR_CDN_URL_HERE` with the CDN URL you copied in Step 1:

```html
<script src="YOUR_CDN_URL_HERE" defer></script>
```

**Example of what it should look like after replacing:**
```html
<script src="https://cdn.shopify.com/s/files/1/0000/0000/files/chillbaby-widget.js" defer></script>
```

7. Click **Save**

---

## Step 3 — Add the Snippet to Your Theme

1. Still in the theme code editor, find the **Layout** folder in the left panel
2. Click **theme.liquid** to open it
3. Use **Ctrl+F** (Windows) or **Cmd+F** (Mac) to search for `</body>`
4. Click just before that closing tag to place your cursor there
5. On a new line, add:

```liquid
{% render 'chillbaby-chat' %}
```

It should look like this when done:

```liquid
  {% render 'chillbaby-chat' %}
</body>
```

6. Click **Save**

---

## Step 4 — Test the Widget

1. Open your storefront in a new browser tab (click **View your store** from the Shopify Admin)
2. **Pink bubble** — confirm a pink circle appears in the bottom-right corner of the page
3. **Open the chat** — click the bubble and confirm the chat window opens with a welcome message and quick reply buttons
4. **Quick replies** — click one of the quick reply buttons and confirm it sends as a message
5. **Send a message** — type a question and press Send. Confirm the AI responds with a relevant reply
6. **Mobile check** — open the store on your phone and confirm the widget fills the bottom of the screen correctly

If anything doesn't appear, do a hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac) to clear the browser cache.

---

## Step 5 — Note on Response Speed

The AI backend runs on **Render's free tier** at:
```
https://ai-backend-v0.onrender.com/chat
```

Free tier servers **spin down after periods of inactivity**. If no one has used the widget for a while, the first message may take **20–30 seconds** to get a response while the server wakes up. After that first response, replies will be fast.

**For a live client store**, upgrade the Render service to a paid tier (Starter plan, ~$7/month). This keeps the server always on and eliminates the cold-start delay entirely.

---

## Troubleshooting

| Problem | What to check |
|---------|--------------|
| Pink bubble doesn't appear | Confirm the CDN URL in the snippet is correct and the file uploaded successfully |
| Bubble appears but chat doesn't open | Open browser console (F12) and look for any errors related to the script |
| AI doesn't respond | The Render server may be cold-starting — wait 30 seconds and try again |
| Widget looks broken on mobile | Clear browser cache and reload |
| Changes don't show after saving | Hard refresh the page (Ctrl+Shift+R) |

---

*For support, contact the developer or raise an issue with the widget file.*
