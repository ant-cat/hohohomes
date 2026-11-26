import { SITE_URL } from "../lib/seo";

// Everyone, AI search and assistant crawlers included, may read the pages. The API and the owner's
// admin page are left out, except the preview image that link previews and search results show.
const RULES = { allow: ["/", "/api/og"], disallow: ["/api/", "/admin"] };

// Search and AI assistant crawlers, named so the welcome is explicit, not just implied by "*".
const NAMED_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "MistralAI-User",
];

export default function robots() {
  return {
    rules: [
      { userAgent: "*", ...RULES },
      { userAgent: NAMED_CRAWLERS, ...RULES },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
