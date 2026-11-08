/**
 * Menerima data pendaftaran dari form landing page dan mengirimkannya ke WhatsApp
 * melalui gateway Fonnte.
 *
 * Environment variable yang dibutuhkan (diatur di dashboard Vercel):
 * - FONNTE_TOKEN : token perangkat dari dashboard Fonnte
 * - WA_TARGET    : nomor WhatsApp tujuan, format 62xxxxxxxxxx (atau nomor grup Fonnte)
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

const buildMessage = (fields) =>
  [
    '*Pendaftaran Baru Lokara POS*',
    '',
    `Paket: ${fields.plan || '-'}`,
    `Nama Usaha: ${fields.businessName}`,
    `Nama Pemilik: ${fields.ownerName}`,
    `Email: ${fields.email}`,
    `No. WhatsApp: ${fields.phone}`,
    `Jenis Usaha: ${fields.businessType}`,
    `Catatan: ${fields.notes || '-'}`,
  ].join('\n');

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

  const token = process.env.FONNTE_TOKEN;
  const target = process.env.WA_TARGET;
  if (!token || !target) {
    return res.status(500).json({ ok: false, message: 'Layanan pendaftaran belum dikonfigurasi.' });
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        target,
        message: buildMessage(fields),
        countryCode: '62',
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.status !== true) {
      return res.status(502).json({ ok: false, message: 'Gagal mengirim pendaftaran. Silakan coba lagi.' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(502).json({ ok: false, message: 'Gagal terhubung ke layanan WhatsApp. Silakan coba lagi.' });
  }
}
