import { NextRequest, NextResponse } from 'next/server'
import { REPORTS } from '@/lib/reports'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '').split(',').map(s => s.trim())
const API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`

async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup }),
  })
}

async function sendDocument(chatId: number, buffer: Buffer, filename: string, caption: string, mimeType: string) {
  const form = new FormData()
  form.append('chat_id', String(chatId))
  form.append('caption', caption)
  form.append('document', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename)
  await fetch(`${API}/sendDocument`, { method: 'POST', body: form })
}

async function sendTyping(chatId: number) {
  await fetch(`${API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'upload_document' }),
  })
}

function mainMenuKeyboard() {
  const buttons = Object.entries(REPORTS).map(([key, report]) => ([{
    text: `${report.emoji} ${report.label}`,
    callback_data: `pick_${key}`
  }]))
  return {
    inline_keyboard: [
      ...buttons,
      [{ text: '❌ إلغاء', callback_data: 'cancel' }]
    ]
  }
}

function formatMenuKeyboard(reportKey: string) {
  return {
    inline_keyboard: [
      [
        { text: '📊 Excel', callback_data: `excel_${reportKey}` },
        { text: '📄 PDF', callback_data: `pdf_${reportKey}` },
      ],
      [{ text: '🔙 رجوع', callback_data: 'back' }]
    ]
  }
}

function isAllowed(chatId: number): boolean {
  return ALLOWED_CHAT_IDS.length === 0 || ALLOWED_CHAT_IDS.includes(String(chatId))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Regular messages ──
    if (body.message) {
      const chatId: number = body.message.chat.id
      const text: string = (body.message.text || '').trim()
      if (!isAllowed(chatId)) { await sendMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت.'); return NextResponse.json({ ok: true }) }
      if (text === '/start' || text === 'تقرير' || text === 'قائمة') {
        await sendMessage(chatId, '👋 <b>مرحباً!</b>\n\nاختر التقرير الذي تريد استلامه:', mainMenuKeyboard())
      } else {
        await sendMessage(chatId, 'أرسل <b>تقرير</b> أو <b>/start</b> لعرض قائمة التقارير.')
      }
    }

    // ── Button clicks ──
    if (body.callback_query) {
      const query = body.callback_query
      const chatId: number = query.message.chat.id
      const data: string = query.data

      if (!isAllowed(chatId)) return NextResponse.json({ ok: true })

      await fetch(`${API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: query.id }),
      })

      // Cancel
      if (data === 'cancel') {
        await sendMessage(chatId, '✅ تم الإلغاء. أرسل <b>تقرير</b> في أي وقت.')
        return NextResponse.json({ ok: true })
      }

      // Back to main menu
      if (data === 'back') {
        await sendMessage(chatId, 'اختر التقرير الذي تريد استلامه:', mainMenuKeyboard())
        return NextResponse.json({ ok: true })
      }

      // User picked a report → ask format
      if (data.startsWith('pick_')) {
        const reportKey = data.replace('pick_', '')
        const report = REPORTS[reportKey]
        if (!report) return NextResponse.json({ ok: true })
        await sendMessage(chatId, `${report.emoji} <b>${report.label}</b>\n\nاختر صيغة الملف:`, formatMenuKeyboard(reportKey))
        return NextResponse.json({ ok: true })
      }

      // User picked Excel
      if (data.startsWith('excel_')) {
        const reportKey = data.replace('excel_', '')
        const report = REPORTS[reportKey]
        if (!report) return NextResponse.json({ ok: true })
        await sendTyping(chatId)
        await sendMessage(chatId, `⏳ جاري تجهيز <b>${report.label}</b> — Excel...`)
        try {
          const { buffer, filename } = await report.fetchExcel()
          await sendDocument(chatId, buffer, filename, `${report.emoji} ${report.label} — Excel\n📅 ${new Date().toLocaleDateString('ar-SA')}`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        } catch (err) {
          console.error(err)
          await sendMessage(chatId, '❌ حدث خطأ. حاول مرة أخرى.')
        }
        return NextResponse.json({ ok: true })
      }

      // User picked PDF
      if (data.startsWith('pdf_')) {
        const reportKey = data.replace('pdf_', '')
        const report = REPORTS[reportKey]
        if (!report) return NextResponse.json({ ok: true })
        await sendTyping(chatId)
        await sendMessage(chatId, `⏳ جاري تجهيز <b>${report.label}</b> — PDF...`)
        try {
          const { buffer, filename } = await report.fetchPDF()
          await sendDocument(chatId, buffer, filename, `${report.emoji} ${report.label} — PDF\n📅 ${new Date().toLocaleDateString('ar-SA')}`, 'application/pdf')
        } catch (err) {
          console.error(err)
          await sendMessage(chatId, '❌ حدث خطأ. حاول مرة أخرى.')
        }
        return NextResponse.json({ ok: true })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
