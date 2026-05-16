// NAPI PÉNZTÁRJELENTÉS PDF generálás (B.13-25 stílus)
// Bemenet: { closing_id }
// Manuálisan deployolandó: supabase functions deploy penztarjelentes-pdf
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PDFDocument, rgb } from 'npm:pdf-lib@1.17.1'
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1'
import { z } from 'npm:zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PUBLIC_URL = 'https://api.hunthorde.com'
const FONT_URL = 'https://cdn.jsdelivr.net/npm/dejavu-sans@1.0.0/fonts/dejavu-sans.ttf'
const FONT_URL_FALLBACK = 'https://raw.githubusercontent.com/dejavu-fonts/dejavu-fonts/version_2_37/ttf/DejaVuSans.ttf'
const FONT_URL_BOLD = 'https://raw.githubusercontent.com/dejavu-fonts/dejavu-fonts/version_2_37/ttf/DejaVuSans-Bold.ttf'

const BodySchema = z.object({ closing_id: z.string().uuid() })

let cachedFont: Uint8Array | null = null
let cachedFontBold: Uint8Array | null = null

async function loadFont(url: string, fallback?: string): Promise<Uint8Array> {
  try {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`)
    return new Uint8Array(await r.arrayBuffer())
  } catch (e) {
    if (fallback) {
      const r = await fetch(fallback)
      if (!r.ok) throw new Error(`fetch ${fallback} -> ${r.status}`)
      return new Uint8Array(await r.arrayBuffer())
    }
    throw e
  }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 }).format(Math.round(n))

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('hu-HU') : ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Bejelentkezés szükséges' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Hibás bemeneti adatok' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // RLS-en keresztül ellenőrizzük a hozzáférést
    const { data: closing, error: closingErr } = await userClient
      .from('cash_closings')
      .select('*')
      .eq('id', parsed.data.closing_id)
      .single()
    if (closingErr || !closing) {
      return new Response(JSON.stringify({ error: 'Zárás nem található' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const [{ data: register }, { data: society }, { data: entries }, { data: denoms }, { data: closer }] = await Promise.all([
      admin.from('cash_registers').select('register_code, name').eq('id', closing.cash_register_id).single(),
      admin.from('profiles').select('company_name, full_name').eq('id', closing.hunter_society_id).single(),
      admin.from('cash_entries')
        .select('document_number, document_type, entry_type, amount, event_date, category, partner_name, description, related_document_ref, status, seq_number')
        .eq('cash_register_id', closing.cash_register_id)
        .gte('event_date', closing.period_start)
        .lte('event_date', closing.period_end)
        .in('status', ['veglegesitett', 'stornozott', 'helyesbitett'])
        .order('event_date', { ascending: true })
        .order('seq_number', { ascending: true }),
      admin.from('cash_denominations').select('denomination, count').eq('closing_id', closing.id).order('denomination', { ascending: false }),
      admin.from('profiles').select('full_name').eq('id', closing.closed_by).single(),
    ])

    // Fontok
    if (!cachedFont) cachedFont = await loadFont(FONT_URL, FONT_URL_FALLBACK)
    if (!cachedFontBold) {
      try { cachedFontBold = await loadFont(FONT_URL_BOLD) } catch { cachedFontBold = cachedFont }
    }

    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const font = await pdfDoc.embedFont(cachedFont, { subset: true })
    const fontBold = await pdfDoc.embedFont(cachedFontBold!, { subset: true })

    const PAGE_W = 595.28
    const PAGE_H = 841.89
    const MARGIN = 36

    // Oszlopok: # | Bevétel biz. | Kiadás biz. | Mell | Szöveg | Bevétel | Kiadás | Egyenleg
    const cols = [
      { key: '#', label: 'Sor', w: 26, align: 'right' as const },
      { key: 'bin', label: 'Bevétel biz.sz.', w: 78, align: 'left' as const },
      { key: 'kin', label: 'Kiadás biz.sz.', w: 78, align: 'left' as const },
      { key: 'mell', label: 'Mell', w: 30, align: 'right' as const },
      { key: 'text', label: 'Szöveg', w: 165, align: 'left' as const },
      { key: 'bev', label: 'Bevétel Ft', w: 65, align: 'right' as const },
      { key: 'kia', label: 'Kiadás Ft', w: 65, align: 'right' as const },
      { key: 'egy', label: 'Egyenleg Ft', w: 70, align: 'right' as const },
    ]
    const tableW = cols.reduce((s, c) => s + c.w, 0)
    const tableX = MARGIN

    type Row = {
      idx?: string; bin?: string; kin?: string; mell?: string; text: string;
      bev?: string; kia?: string; egy: string; bold?: boolean;
    }

    // Sorok összeállítása
    let running = Number(closing.opening_balance)
    const rows: Row[] = []
    rows.push({ text: 'Nyitó egyenleg', egy: fmt(running), bold: true })
    ;(entries ?? []).forEach((e: any, i: number) => {
      const amt = Number(e.amount)
      const isBev = e.entry_type === 'bevetel'
      if (isBev) running += amt; else running -= amt
      const desc = [e.category, e.partner_name, e.description].filter(Boolean).join(' • ')
      const suffix = e.status === 'stornozott' ? ' (stornózva)' : e.status === 'helyesbitett' ? ' (helyesbítve)' : ''
      rows.push({
        idx: String(i + 1),
        bin: isBev ? (e.document_number ?? '') : '',
        kin: !isBev ? (e.document_number ?? '') : '',
        mell: e.related_document_ref ? '1' : '',
        text: (desc || '-') + suffix,
        bev: isBev ? fmt(amt) : '',
        kia: !isBev ? fmt(amt) : '',
        egy: fmt(running),
      })
    })
    rows.push({
      text: 'Forgalom összesen',
      bev: fmt(Number(closing.total_income)),
      kia: fmt(Number(closing.total_expense)),
      egy: '',
      bold: true,
    })
    rows.push({ text: 'Záró egyenleg (könyv szerinti)', egy: fmt(Number(closing.closing_balance)), bold: true })

    const rowH = 16
    const headerH = 60
    const footerH = 30
    const rowsPerPage = Math.floor((PAGE_H - MARGIN - headerH - footerH - 80) / rowH) // 80 a fejléchez/blokkhoz

    let page = pdfDoc.addPage([PAGE_W, PAGE_H])
    let pageNum = 1
    const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage))

    const drawText = (p: any, t: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: any } = {}) => {
      p.drawText(t ?? '', { x, y, size: opts.size ?? 9, font: opts.bold ? fontBold : font, color: opts.color ?? rgb(0, 0, 0) })
    }
    const widthOf = (t: string, size: number, bold: boolean) =>
      (bold ? fontBold : font).widthOfTextAtSize(t ?? '', size)

    const drawHeader = (p: any) => {
      drawText(p, 'NAPI PÉNZTÁRJELENTÉS', PAGE_W / 2 - widthOf('NAPI PÉNZTÁRJELENTÉS', 14, true) / 2, PAGE_H - MARGIN - 4, { size: 14, bold: true })
      drawText(p, `Sorszám: ${closing.closing_number}`, PAGE_W - MARGIN - widthOf(`Sorszám: ${closing.closing_number}`, 10, true), PAGE_H - MARGIN - 4, { size: 10, bold: true })

      const meta = [
        `Gazdálkodó: ${society?.company_name ?? society?.full_name ?? '-'}`,
        `Pénztár: ${register?.name ?? ''} (${register?.register_code ?? ''})`,
        `Időszak: ${fmtDate(closing.period_start)} – ${fmtDate(closing.period_end)}`,
      ]
      meta.forEach((m, i) => drawText(p, m, MARGIN, PAGE_H - MARGIN - 22 - i * 12, { size: 9 }))
    }

    const drawTableHeader = (p: any, y: number) => {
      let x = tableX
      cols.forEach(c => {
        p.drawRectangle({ x, y: y - rowH + 4, width: c.w, height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 0.5 })
        const tw = widthOf(c.label, 8, true)
        const tx = c.align === 'right' ? x + c.w - tw - 3 : x + 3
        drawText(p, c.label, tx, y - 8, { size: 8, bold: true })
        x += c.w
      })
    }

    const drawRow = (p: any, r: Row, y: number) => {
      let x = tableX
      const vals: Record<string, string | undefined> = {
        '#': r.idx, bin: r.bin, kin: r.kin, mell: r.mell, text: r.text, bev: r.bev, kia: r.kia, egy: r.egy,
      }
      cols.forEach(c => {
        p.drawRectangle({ x, y: y - rowH + 4, width: c.w, height: rowH, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.3 })
        let v = vals[c.key] ?? ''
        // truncate text col
        const size = 8.5
        const maxW = c.w - 6
        if (widthOf(v, size, !!r.bold) > maxW) {
          while (v.length > 1 && widthOf(v + '…', size, !!r.bold) > maxW) v = v.slice(0, -1)
          v = v + '…'
        }
        const tw = widthOf(v, size, !!r.bold)
        const tx = c.align === 'right' ? x + c.w - tw - 3 : x + 3
        drawText(p, v, tx, y - 9, { size, bold: !!r.bold })
        x += c.w
      })
    }

    const drawFooter = (p: any, pn: number, tp: number) => {
      const f = `Készítette: ${closer?.full_name ?? ''} | Zárás: ${new Date(closing.closed_at).toLocaleString('hu-HU')} | Verzió: ${closing.version} | Oldal ${pn} / ${tp}`
      drawText(p, f, MARGIN, MARGIN - 12, { size: 7, color: rgb(0.3, 0.3, 0.3) })
    }

    drawHeader(page)
    let y = PAGE_H - MARGIN - headerH
    drawTableHeader(page, y)
    y -= rowH

    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && i % rowsPerPage === 0) {
        drawFooter(page, pageNum, totalPages)
        page = pdfDoc.addPage([PAGE_W, PAGE_H])
        pageNum++
        drawHeader(page)
        y = PAGE_H - MARGIN - headerH
        drawTableHeader(page, y)
        y -= rowH
      }
      drawRow(page, rows[i], y)
      y -= rowH
    }

    // Rovancs blokk az utolsó oldalra
    if ((denoms?.length ?? 0) > 0 || closing.counted_cash != null) {
      if (y < MARGIN + footerH + 140) {
        drawFooter(page, pageNum, totalPages)
        page = pdfDoc.addPage([PAGE_W, PAGE_H])
        pageNum++
        drawHeader(page)
        y = PAGE_H - MARGIN - headerH
      }
      y -= 10
      drawText(page, 'CÍMLETJEGYZÉK (rovancs)', tableX, y, { size: 11, bold: true })
      y -= 14
      const dCols = [{ l: 'Címlet', w: 80 }, { l: 'Darab', w: 60 }, { l: 'Összeg Ft', w: 90 }]
      let x = tableX
      dCols.forEach(c => {
        page.drawRectangle({ x, y: y - rowH + 4, width: c.w, height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 0.5 })
        drawText(page, c.l, x + 3, y - 8, { size: 8, bold: true })
        x += c.w
      })
      y -= rowH
      let denomSum = 0
      ;(denoms ?? []).forEach((d: any) => {
        const sub = Number(d.denomination) * Number(d.count)
        denomSum += sub
        let xx = tableX
        const vals = [String(d.denomination), String(d.count), fmt(sub)]
        dCols.forEach((c, i) => {
          page.drawRectangle({ x: xx, y: y - rowH + 4, width: c.w, height: rowH, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.3 })
          const tw = widthOf(vals[i], 9, false)
          drawText(page, vals[i], xx + c.w - tw - 3, y - 9, { size: 9 })
          xx += c.w
        })
        y -= rowH
      })
      y -= 6
      drawText(page, `Tényleges készpénz: ${fmt(Number(closing.counted_cash ?? denomSum))} Ft`, tableX, y, { size: 10, bold: true })
      y -= 14
      drawText(page, `Könyv szerinti: ${fmt(Number(closing.closing_balance))} Ft`, tableX, y, { size: 10 })
      y -= 14
      const diff = Number(closing.difference ?? 0)
      drawText(page, `Eltérés: ${fmt(diff)} Ft`, tableX, y, { size: 10, bold: true, color: diff === 0 ? rgb(0, 0.4, 0) : rgb(0.7, 0, 0) })
      if (closing.difference_note) {
        y -= 14
        drawText(page, `Megjegyzés: ${closing.difference_note}`, tableX, y, { size: 9 })
      }
    }

    drawFooter(page, pageNum, totalPages)

    const pdfBytes = await pdfDoc.save()

    const path = `${closing.hunter_society_id}/${closing.closing_number}.pdf`
    const { error: upErr } = await admin.storage.from('cash-reports').upload(path, pdfBytes, {
      contentType: 'application/pdf', upsert: true,
    })
    if (upErr) {
      return new Response(JSON.stringify({ error: 'PDF feltöltési hiba', details: upErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await admin.from('cash_closings').update({ pdf_path: path }).eq('id', closing.id)

    const { data: signed } = await admin.storage.from('cash-reports').createSignedUrl(path, 3600, { download: true })
    const publicSignedUrl = signed?.signedUrl?.replace(/^https?:\/\/[^/]+/, PUBLIC_URL) ?? null

    return new Response(JSON.stringify({
      success: true,
      closing_number: closing.closing_number,
      pdf_path: path,
      url: publicSignedUrl,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ismeretlen hiba'
    return new Response(JSON.stringify({ error: 'Szerverhiba', details: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
