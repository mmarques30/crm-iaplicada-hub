import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { html, instruction } = await req.json();

    if (!html || typeof html !== "string") {
      return new Response(
        JSON.stringify({ error: "HTML content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (html.length > 512000) {
      return new Response(
        JSON.stringify({ error: "HTML too large (max 500KB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert email HTML developer. Your job is to take raw HTML and optimize it for maximum compatibility across email clients (Gmail, Outlook, Apple Mail, Yahoo).

Rules:
1. Convert all CSS classes and <style> blocks to inline styles on each element.
2. Use <table> based layouts instead of divs for structural elements (columns, containers).
3. Ensure responsive design with max-width on tables and media queries in a <style> tag inside <head>.
4. Keep all template tokens like {{contact.first_name}}, {{contact.email}}, etc. intact — do NOT modify them.
5. Use web-safe fonts with fallbacks.
6. Add alt attributes to all images.
7. Use absolute URLs for images (keep existing URLs as-is).
8. Ensure proper DOCTYPE and meta charset.
9. Remove any JavaScript.
10. Keep the visual design as close to the original as possible while making it email-compatible.

Return ONLY the corrected HTML. No explanations, no markdown code blocks, no comments — just the raw HTML starting with <!DOCTYPE html> or <html>.`;

    const userMessage = instruction
      ? `Fix this email HTML for email client compatibility. Additional instruction: ${instruction}\n\nHTML:\n${html}`
      : `Fix this email HTML for email client compatibility:\n\n${html}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again in a few seconds." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds at Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let fixedHtml = data.choices?.[0]?.message?.content || "";

    // Strip markdown code blocks if the model wrapped it
    fixedHtml = fixedHtml.replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    return new Response(
      JSON.stringify({ html: fixedHtml }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fix-email-html error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
