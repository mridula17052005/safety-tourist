import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailPayload {
  to: string;
  touristName: string;
  message: string;
  time: string;
  latitude: number;
  longitude: number;
  mapLink: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: EmailPayload = await req.json();

    if (!body.to || !body.touristName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #e11d48); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">SafeTour AI — Emergency Alert</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 16px;">
            <strong>${body.touristName}</strong> has triggered an emergency SOS alert.
          </p>
          <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;"><strong>Message:</strong></p>
            <p style="margin: 0 0 16px; color: #1e293b; font-size: 14px;">${body.message}</p>
            <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;"><strong>Time:</strong></p>
            <p style="margin: 0 0 16px; color: #1e293b; font-size: 14px;">${body.time}</p>
            <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;"><strong>Current Location:</strong></p>
            <p style="margin: 0 0 16px; color: #1e293b; font-size: 14px;">
              ${body.latitude.toFixed(5)}, ${body.longitude.toFixed(5)}
            </p>
            <a href="${body.mapLink}" style="display: inline-block; background: #0d9488; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              View Location on Map
            </a>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
            This alert was sent automatically by SafeTour AI. If you believe this is a real emergency, please contact local authorities immediately.
          </p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SafeTour AI <alerts@safetour.ai>",
        to: [body.to],
        subject: `EMERGENCY: ${body.touristName} triggered an SOS alert`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: "Email send failed", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
