import { NextRequest, NextResponse } from 'next/server'
import { REPORTS } from '@/lib/reports'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '').split(',').map(s => s.trim())

const API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`

// ─── Send a text message ─────────────────────────────────────────────────
async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  })
}

// ─── Send a file (Excel) ─────────────────────────────────────────────────
async function sendDocument(chatId: number, buffer: Buffer, filename: string, caption: string) {
  const form = new FormData()
  form.append('chat_id', String(chatId))
  form.append('caption', caption)
  form.append('document', new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }), filename)
  await fetch(`${API}/sendDocument`, { method: 'POST', body: form })
}

// ─── Send typing indicator ───────────────────────────────────────────────
async function sendTyping(chatId: number) {
  await fetch(`${API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'upload_document' }),
  })
}

// ─── Main menu keyboard ──────────────────────────────────────────────────
function mainMenuKeyboard() {
  const buttons = Object.entries(REPORTS).map(([key, report]) => ([{
    text: `${report.emoji} ${report.label}`,
    callback_data: `report_${key}`
  }]))
  return {
    inline_keyboard: [
      ...buttons,
      [{ text: '❌ إلغاء', callback_data: 'cancel' }]
    ]
  }
}

// ─── Webhook Handler ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Handle regular messages
    if (body.message) {
      const msg = body.message
      const chatId: number = msg.chat.id
      const text: string = (msg.text || '').trim()

      // Security: only allow configured chat IDs
      if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(String(chatId))) {
        await sendMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت.')
        return NextResponse.json({ ok: true })
      }

      if (text === '/start' || text === 'تقرير' || text === 'قائمة') {
        await sendMessage(
          chatId,
          '👋 <b>مرحباً!</b>\n\nاختر التقرير الذي تريد استلامه:',
          mainMenuKeyboard()
        )
      } else {
        await sendMessage(
          chatId,
          'أرسل <b>تقرير</b> أو <b>/start</b> لعرض قائمة التقارير.',
        )
      }
    }

    // Handle button clicks (callback queries)
    if (body.callback_query) {
      const query = body.callback_query
      const chatId: number = query.message.chat.id
      const data: string = query.data

      // Security check
      if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(String(chatId))) {
        return NextResponse.json({ ok: true })
      }

      // Answer the callback to remove the loading spinner on the button
      await fetch(`${API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: query.id }),
      })

      if (data === 'cancel') {
        await sendMessage(chatId, '✅ تم الإلغاء. أرسل <b>تقرير</b> في أي وقت.')
        return NextResponse.json({ ok: true })
      }

      if (data.startsWith('report_')) {
        const reportKey = data.replace('report_', '')
        const report = REPORTS[reportKey]

        if (!report) {
          await sendMessage(chatId, '❌ التقرير غير موجود.')
          return NextResponse.json({ ok: true })
        }

        // Show typing indicator
        await sendTyping(chatId)
        await sendMessage(chatId, `⏳ جاري تجهيز <b>${report.label}</b>...`)

        try {
          const { buffer, filename } = await report.fetch()
          const date = new Date().toLocaleDateString('ar-SA')
          await sendDocument(
            chatId,
            buffer,
            filename,
            `${report.emoji} ${report.label}\n📅 ${date}`
          )
        } catch (err) {
          console.error('Report generation error:', err)
          await sendMessage(chatId, '❌ حدث خطأ أثناء تجهيز التقرير. حاول مرة أخرى.')
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}
