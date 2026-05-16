import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BodySchema = z.object({
  invoice_id: z.string().uuid(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Bejelentkezés szükséges' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Érvénytelen munkamenet' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const json = await req.json()
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Hibás bemeneti adatok' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // RLS az invoice-on érvényesül a user kliensével
    const { data: invoice, error: invErr } = await userClient
      .from('invoices')
      .select('id, szamlazz_url, status')
      .eq('id', parsed.data.invoice_id)
      .single()

    if (invErr || !invoice || !invoice.szamlazz_url) {
      return new Response(JSON.stringify({ error: 'A számla nem található vagy nincs PDF' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: signed, error: signErr } = await admin.storage
      .from('invoices')
      .createSignedUrl(invoice.szamlazz_url, 3600, { download: true })

    if (signErr || !signed) {
      return new Response(JSON.stringify({ error: 'Nem sikerült aláírt URL-t generálni' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const PUBLIC_URL = 'https://api.hunthorde.com'
    const publicSignedUrl = signed.signedUrl.replace(/^https?:\/\/[^/]+/, PUBLIC_URL)

    return new Response(
      JSON.stringify({
        url: publicSignedUrl,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ismeretlen hiba'
    return new Response(JSON.stringify({ error: 'Szerverhiba', details: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
