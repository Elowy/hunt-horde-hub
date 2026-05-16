import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BuyerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().or(z.literal('')),
  tax_number: z.string().max(64).optional().or(z.literal('')),
  zip: z.string().min(1).max(16),
  city: z.string().min(1).max(128),
  address: z.string().min(1).max(255),
})

const ItemSchema = z.object({
  name: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(32),
  net_unit_price: z.number().nonnegative(),
  vat_rate: z.string().min(1).max(16),
  comment: z.string().max(1000).optional(),
})

const PaymentMethodSchema = z.enum(['Készpénz', 'Átutalás', 'Bankkártya', 'Utánvét'])

const BodySchema = z.object({
  source_type: z.string().min(1).max(64),
  source_id: z.string().uuid().optional(),
  buyer: BuyerSchema,
  items: z.array(ItemSchema).min(1).max(100),
  comment: z.string().max(2000).optional(),
  payment_method: PaymentMethodSchema.optional(),
  animal_ids: z.array(z.string().uuid()).max(500).optional(),
})

function xmlEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function vatToNumber(rate: string): number | null {
  // 'AAM', 'TAM', 'F.AFA' stb. nem numerikus
  const n = parseFloat(rate)
  return isFinite(n) ? n : null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildXml(params: {
  agentKey: string
  prefix: string
  comment?: string
  paymentMethod: string
  buyer: z.infer<typeof BuyerSchema>
  items: z.infer<typeof ItemSchema>[]
}): string {
  const today = new Date()
  const due = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000)

  const tetelek = params.items.map((it) => {
    const vatNum = vatToNumber(it.vat_rate)
    const net = round2(it.quantity * it.net_unit_price)
    const vat = vatNum !== null ? round2(net * (vatNum / 100)) : 0
    const gross = round2(net + vat)
    return `    <tetel>
      <megnevezes>${xmlEscape(it.name)}</megnevezes>
      <mennyiseg>${it.quantity}</mennyiseg>
      <mennyisegiEgyseg>${xmlEscape(it.unit)}</mennyisegiEgyseg>
      <nettoEgysegar>${it.net_unit_price}</nettoEgysegar>
      <afakulcs>${xmlEscape(it.vat_rate)}</afakulcs>
      <nettoErtek>${net}</nettoErtek>
      <afaErtek>${vat}</afaErtek>
      <bruttoErtek>${gross}</bruttoErtek>
      <megjegyzes>${xmlEscape(it.comment ?? '')}</megjegyzes>
    </tetel>`
  }).join('\n')

  const sendEmail = params.buyer.email && params.buyer.email.length > 0 ? 'true' : 'false'

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla xmlszamla.xsd">
  <beallitasok>
    <szamlaagentkulcs>${xmlEscape(params.agentKey)}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLetoltes>true</szamlaLetoltes>
    <szamlaLetoltesPld>1</szamlaLetoltesPld>
    <valaszVerzio>2</valaszVerzio>
  </beallitasok>
  <fejlec>
    <keltDatum>${formatDate(today)}</keltDatum>
    <teljesitesDatum>${formatDate(today)}</teljesitesDatum>
    <fizetesiHataridoDatum>${formatDate(due)}</fizetesiHataridoDatum>
    <fizmod>${xmlEscape(params.paymentMethod)}</fizmod>
    <penznem>HUF</penznem>
    <szamlaNyelve>hu</szamlaNyelve>
    <megjegyzes>${xmlEscape(params.comment ?? '')}</megjegyzes>
    <rendelesSzam></rendelesSzam>
    <elotag>${xmlEscape(params.prefix)}</elotag>
  </fejlec>
  <elado></elado>
  <vevo>
    <nev>${xmlEscape(params.buyer.name)}</nev>
    <irsz>${xmlEscape(params.buyer.zip)}</irsz>
    <telepules>${xmlEscape(params.buyer.city)}</telepules>
    <cim>${xmlEscape(params.buyer.address)}</cim>
    <email>${xmlEscape(params.buyer.email ?? '')}</email>
    <sendEmail>${sendEmail}</sendEmail>
    <adoszam>${xmlEscape(params.buyer.tax_number ?? '')}</adoszam>
  </vevo>
  <tetelek>
${tetelek}
  </tetelek>
</xmlszamla>`
}

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
    const userId = claims.claims.sub as string

    const json = await req.json()
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Hibás bemeneti adatok', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const body = parsed.data

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, szamlazz_agent_key, szamlazz_invoice_prefix, szamlazz_enabled')
      .eq('id', userId)
      .single()

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'A vadásztársaság profilja nem található' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!profile.szamlazz_enabled || !profile.szamlazz_agent_key) {
      return new Response(
        JSON.stringify({
          error: 'A Számlázz.hu integráció nincs aktiválva, vagy hiányzik az Agent kulcs.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Számoljuk az összegeket
    let net = 0
    let vat = 0
    for (const it of body.items) {
      const vatNum = vatToNumber(it.vat_rate)
      const itemNet = round2(it.quantity * it.net_unit_price)
      const itemVat = vatNum !== null ? round2(itemNet * (vatNum / 100)) : 0
      net += itemNet
      vat += itemVat
    }
    net = round2(net)
    vat = round2(vat)
    const gross = round2(net + vat)

    // Pending invoice rekord
    const { data: invoice, error: insertErr } = await admin
      .from('invoices')
      .insert({
        hunter_society_id: profile.id,
        created_by: userId,
        source_type: body.source_type,
        source_id: body.source_id ?? null,
        buyer_name: body.buyer.name,
        buyer_email: body.buyer.email || null,
        buyer_tax_number: body.buyer.tax_number || null,
        buyer_address: `${body.buyer.zip} ${body.buyer.city}, ${body.buyer.address}`,
        net_amount: net,
        vat_amount: vat,
        gross_amount: gross,
        currency: 'HUF',
        status: 'pending',
      })
      .select()
      .single()

    if (insertErr || !invoice) {
      return new Response(JSON.stringify({ error: 'Nem sikerült létrehozni a számla rekordot', details: insertErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // XML összeállítás
    const xml = buildXml({
      agentKey: profile.szamlazz_agent_key,
      prefix: profile.szamlazz_invoice_prefix ?? 'VG',
      comment: body.comment,
      paymentMethod: body.payment_method ?? 'Átutalás',
      buyer: body.buyer,
      items: body.items,
    })

    // Multipart/form-data POST
    const fd = new FormData()
    fd.append(
      'action-xmlagentxmlfile',
      new Blob([xml], { type: 'application/xml' }),
      'invoice.xml',
    )

    const szResp = await fetch('https://www.szamlazz.hu/szamla/', {
      method: 'POST',
      body: fd,
    })

    const errorCode = szResp.headers.get('szlahu_error_code')
    const errorMsg = szResp.headers.get('szlahu_error')
    const invoiceNumber = szResp.headers.get('szlahu_szamlaszam')
    const netResp = szResp.headers.get('szlahu_nettovegosszeg')
    const grossResp = szResp.headers.get('szlahu_bruttovegosszeg')

    if (errorCode || !invoiceNumber) {
      const decoded = errorMsg
        ? decodeURIComponent(errorMsg.replace(/\+/g, ' '))
        : `Számlázz.hu hiba (kód: ${errorCode ?? 'ismeretlen'})`
      await admin
        .from('invoices')
        .update({ status: 'failed', error_message: decoded })
        .eq('id', invoice.id)

      return new Response(
        JSON.stringify({ error: decoded, invoice_id: invoice.id }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // PDF feltöltés
    const pdfBytes = new Uint8Array(await szResp.arrayBuffer())
    const safeNumber = invoiceNumber.replace(/[^A-Za-z0-9_-]/g, '_')
    const storagePath = `${profile.id}/${safeNumber}.pdf`

    const { error: uploadErr } = await admin.storage
      .from('invoices')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadErr) {
      await admin
        .from('invoices')
        .update({
          status: 'failed',
          szamlazz_invoice_number: invoiceNumber,
          error_message: `PDF feltöltés sikertelen: ${uploadErr.message}`,
        })
        .eq('id', invoice.id)

      return new Response(
        JSON.stringify({ error: 'A számla kiállt, de a PDF mentése sikertelen', invoice_number: invoiceNumber }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const finalNet = netResp ? Number(netResp) : net
    const finalGross = grossResp ? Number(grossResp) : gross
    const finalVat = round2(finalGross - finalNet)

    const { data: updated } = await admin
      .from('invoices')
      .update({
        status: 'issued',
        szamlazz_invoice_number: invoiceNumber,
        szamlazz_url: storagePath,
        net_amount: finalNet,
        vat_amount: finalVat,
        gross_amount: finalGross,
      })
      .eq('id', invoice.id)
      .select()
      .single()

    if (body.animal_ids && body.animal_ids.length > 0) {
      const rows = body.animal_ids.map((aid) => ({ invoice_id: invoice.id, animal_id: aid }))
      await admin.from('invoice_animals').insert(rows)
    }

    return new Response(
      JSON.stringify({ success: true, invoice: updated }),
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
