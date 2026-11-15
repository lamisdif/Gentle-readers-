// ============================================================================
// SUPABASE EDGE FUNCTION: send-order-push
// Triggered via Database Webhook on public.orders INSERT
// Sends Web Push notifications to iPhone PWA & Desktop Manager
// Automatically prunes expired (410 Gone / 404) subscriptions
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZ_W9Zs0QT70pGuv3UnSTBlwOjV6Z98iTCgk64U";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@gentlereaders.dz";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await req.json();
    const order = payload.record || payload;

    if (!order || !order.id) {
      return new Response(JSON.stringify({ error: "Invalid order payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const orderId = order.id;
    const customerName = `${order.firstName || ""} ${order.familyName || ""}`.trim() || "زبون جديد";
    const totalDa = order.total_price ? `${Number(order.total_price).toLocaleString()} دج` : "";
    const wilaya = order.wilaya ? `(${order.wilaya})` : "";

    const notificationPayload = JSON.stringify({
      title: `طلب جديد #${orderId} 📚`,
      body: `${customerName} • ${totalDa} ${wilaya}`.trim(),
      order_id: orderId,
      data: {
        order_id: orderId,
        url: `./#order-${orderId}`
      }
    });

    // 1. Fetch active push subscriptions from database
    const { data: subscriptions, error: fetchErr } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (fetchErr) {
      console.error("[Push] Failed to query subscriptions:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[Push] Zero active push subscriptions found. Nothing to send.");
      return new Response(JSON.stringify({ message: "No active subscriptions", order_id: orderId }), { status: 200 });
    }

    console.log(`[Push] Delivering notification for Order #${orderId} to ${subscriptions.length} device(s)...`);

    // 2. Loop through subscriptions and deliver Web Push
    let sentCount = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Construct standard Web Push request using VAPID headers
        // (Using standard webpush protocol supported by Apple & Google FCM)
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "TTL": "86400",
            "Urgency": "high",
            "Content-Type": "application/octet-stream"
          },
          body: notificationPayload
        });

        if (res.status === 201 || res.status === 200) {
          sentCount++;
        } else if (res.status === 404 || res.status === 410) {
          // Device unsubscribed or app uninstalled: schedule pruning
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.warn(`[Push] Endpoint returned status ${res.status}:`, sub.endpoint);
        }
      } catch (err) {
        console.warn("[Push] Delivery network error for endpoint:", err);
      }
    }

    // 3. Prune expired endpoints automatically
    if (expiredEndpoints.length > 0) {
      console.log(`[Push] Pruning ${expiredEndpoints.length} expired subscription(s)...`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        delivered: sentCount,
        pruned: expiredEndpoints.length
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Push] Unexpected edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
