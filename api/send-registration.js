/**
 * Menerima data pendaftaran dari form landing page dan mengirimkannya ke email
 * melalui Resend.
 *
 * Environment variable (di .env untuk lokal dan di dashboard Vercel untuk produksi):
 * - RESEND_API_KEY          : API key dari resend.com (wajib)
 * - REGISTRATION_EMAIL_TO   : alamat email tujuan (default: muhammadrandykarna@gmail.com)
 * - REGISTRATION_EMAIL_FROM : pengirim; tanpa domain terverifikasi gunakan onboarding@resend.dev
 */
const MAX_LENGTH = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value, max = MAX_LENGTH) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const normalizePhone = (value) => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return digits;
};

const buildSummaryLines = (fields) => [
  `Paket: ${fields.plan || '-'}`,
  `Nama Usaha: ${fields.businessName}`,
  `Nama Pemilik: ${fields.ownerName}`,
  `Email: ${fields.email}`,
  `No. WhatsApp: ${fields.phone}`,
  `Jenis Usaha: ${fields.businessType}`,
  `Catatan: ${fields.notes || '-'}`,
];

const sendEmail = async (fields) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.REGISTRATION_EMAIL_FROM || 'Lokara POS <onboarding@resend.dev>',
      to: [process.env.REGISTRATION_EMAIL_TO || 'muhammadrandykarna@gmail.com'],
      reply_to: fields.email,
      subject: `Pendaftaran Baru Lokara POS: ${fields.businessName}`,
      text: ['Ada pendaftaran baru dari landing page Lokara POS.', '', ...buildSummaryLines(fields)].join('\n'),
    }),
  });
  return response.ok;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Metode tidak diizinkan.' });
  }

  const body = req.body || {};

  // Honeypot: field tersembunyi yang hanya diisi bot.
  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  const fields = {
    businessName: clean(body.businessName),
    ownerName: clean(body.ownerName),
    email: clean(body.email),
    phone: normalizePhone(clean(body.phone)),
    businessType: clean(body.businessType),
    plan: clean(body.plan, 40),
    notes: clean(body.notes, 500),
  };

  if (!fields.businessName || !fields.ownerName || !fields.businessType) {
    return res.status(400).json({ ok: false, message: 'Nama usaha, nama pemilik, dan jenis usaha wajib diisi.' });
  }
  if (!EMAIL_PATTERN.test(fields.email)) {
    return res.status(400).json({ ok: false, message: 'Format email belum benar.' });
  }
  if (!/^\d{9,15}$/.test(fields.phone)) {
    return res.status(400).json({ ok: false, message: 'Nomor WhatsApp belum benar.' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ ok: false, message: 'Layanan pendaftaran belum dikonfigurasi.' });
  }

  try {
    const sent = await sendEmail(fields);
    if (!sent) {
      return res.status(502).json({ ok: false, message: 'Gagal mengirim pendaftaran. Silakan coba lagi.' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(502).json({ ok: false, message: 'Gagal terhubung ke layanan email. Silakan coba lagi.' });
  }
}
