/**
 * ==============================================================================
 * SERVICE CENTRALISÉ DE NOTIFICATIONS : SECONDE VIE (E-mail & WhatsApp)
 * ==============================================================================
 * Utilise les variables d'environnement Vite :
 * - VITE_WHATSAPP_API_URL
 * - VITE_WHATSAPP_TOKEN
 * - VITE_MAILZEET_API_KEY
 *
 * En l'absence de clés API configurées en local, les appels basculent en mode
 * prévisualisation/test transparent sans erreur bloquante.
 */

const WHATSAPP_API_URL = (import.meta.env.VITE_WHATSAPP_API_URL || '').trim();
const WHATSAPP_TOKEN = (import.meta.env.VITE_WHATSAPP_TOKEN || '').trim();
const MAILZEET_API_KEY = (import.meta.env.VITE_MAILZEET_API_KEY || '').trim();
const MAILZEET_FROM_EMAIL = (import.meta.env.VITE_MAILZEET_FROM_EMAIL || 'noreply@secondevie.ci').trim();

/**
 * Normalise un numéro ivoirien pour WhatsApp (ex: "+225 07 00 00 00 00" -> "2250700000000")
 */
export function formatIvorianWhatsAppNumber(rawPhone = '') {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('225')) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return `225${digits}`;
  return digits;
}

/**
 * Envoie un e-mail transactionnel via Mailzeet
 */
export async function sendEmailNotification({ to, toName = '', subject, html, text }) {
  if (!to) {
    return { sent: false, channel: 'email', mode: 'skipped', reason: 'Destinataire manquant' };
  }

  if (!MAILZEET_API_KEY) {
    const preview = { to, subject, text: text || html, from: MAILZEET_FROM_EMAIL };
    console.info('[Notifications Email - Mode Test Local]', preview);
    return {
      sent: false,
      channel: 'email',
      mode: 'test_preview',
      preview,
      message: 'Clé Mailzeet absente dans .env : notification préparée en mode prévisualisation locale.',
    };
  }

  try {
    const response = await fetch('https://api.mailzeet.com/v1/mails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MAILZEET_API_KEY}`,
      },
      body: JSON.stringify({
        sender: { email: MAILZEET_FROM_EMAIL, name: 'Seconde Vie Côte d’Ivoire' },
        recipients: [{ email: to, name: toName || to }],
        subject,
        html,
        text,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        sent: false,
        channel: 'email',
        mode: 'error',
        error: data?.message || `Erreur Mailzeet (${response.status})`,
      };
    }

    return { sent: true, channel: 'email', mode: 'live', data };
  } catch (err) {
    return { sent: false, channel: 'email', mode: 'error', error: err.message };
  }
}

/**
 * Envoie un message WhatsApp via l'API configurée (Cloud API / passerelle compatible)
 */
export async function sendWhatsAppNotification({ to, message }) {
  const normalizedPhone = formatIvorianWhatsAppNumber(to);
  if (!normalizedPhone) {
    return { sent: false, channel: 'whatsapp', mode: 'skipped', reason: 'Numéro WhatsApp manquant' };
  }

  if (!WHATSAPP_API_URL || !WHATSAPP_TOKEN) {
    const preview = { to: `+${normalizedPhone}`, message };
    console.info('[Notifications WhatsApp - Mode Test Local]', preview);
    return {
      sent: false,
      channel: 'whatsapp',
      mode: 'test_preview',
      preview,
      message: 'API WhatsApp non configurée dans .env : message généré en mode test local.',
    };
  }

  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'text',
        text: { preview_url: true, body: message },
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        sent: false,
        channel: 'whatsapp',
        mode: 'error',
        error: data?.error?.message || data?.message || `Erreur WhatsApp (${response.status})`,
      };
    }

    return { sent: true, channel: 'whatsapp', mode: 'live', data };
  } catch (err) {
    return { sent: false, channel: 'whatsapp', mode: 'error', error: err.message };
  }
}

/**
 * 1. Notification de demande de réinitialisation de mot de passe (E-mail ou WhatsApp)
 */
export async function notifyPasswordReset({ channel = 'email', email, phone, resetCode, resetUrl }) {
  if (channel === 'whatsapp') {
    const msg =
      `🔐 Seconde Vie — Réinitialisation de mot de passe\n` +
      `Votre code de vérification : ${resetCode}\n` +
      `Lien direct : ${resetUrl}\n` +
      `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
    return await sendWhatsAppNotification({ to: phone, message: msg });
  }

  const subject = 'Réinitialisation de votre mot de passe — Seconde Vie';
  const text =
    `Bonjour,\n\nVous avez demandé à réinitialiser votre mot de passe sur Seconde Vie.\n` +
    `Code / Lien de réinitialisation : ${resetUrl || resetCode}\n\n` +
    `À très bientôt sur Seconde Vie (Abidjan, Côte d'Ivoire).`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#15803d;margin-top:0;">Seconde Vie — Réinitialisation de mot de passe</h2>
      <p>Bonjour,</p>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#15803d;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Définir un nouveau mot de passe</a></p>
      <p style="font-size:12px;color:#64748b;">Code : <strong>${resetCode || 'Fourni par Strapi'}</strong></p>
    </div>
  `;
  return await sendEmailNotification({ to: email, subject, text, html });
}

/**
 * 2. Confirmation d'abonnement ou de boost UNIQUEMENT après paiement validé (`success`)
 */
export async function notifyPaymentConfirmed({ user, payment, label }) {
  if (!payment || !['confirmed', 'successful', 'success'].includes(payment.status)) {
    return { skipped: true, reason: 'Paiement non confirmé' };
  }

  const amountFormatted = `${Number(payment.amount || 0).toLocaleString('fr-FR')} FCFA`;
  const userName = user?.full_name || 'Cher membre';
  const ref = payment.transaction_id;

  const emailPromise = user?.email
    ? sendEmailNotification({
        to: user.email,
        toName: userName,
        subject: `Confirmation de paiement (${amountFormatted}) — Seconde Vie`,
        text: `Bonjour ${userName},\n\nVotre paiement de ${amountFormatted} pour "${label}" (Réf: ${ref}) est confirmé. Votre service est désormais actif sur Seconde Vie.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#15803d;margin-top:0;">Paiement Confirmé ✓</h2>
            <p>Bonjour <strong>${userName}</strong>,</p>
            <p>Votre règlement de <strong>${amountFormatted}</strong> pour <strong>${label}</strong> a bien été validé.</p>
            <p style="background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;">Référence : <strong>${ref}</strong></p>
            <p>Merci pour votre confiance sur <strong>Seconde Vie (Côte d'Ivoire)</strong>.</p>
          </div>
        `,
      })
    : Promise.resolve({ sent: false, channel: 'email', mode: 'skipped' });

  const whatsappPromise = user?.whatsapp || user?.phone
    ? sendWhatsAppNotification({
        to: user.whatsapp || user.phone,
        message:
          `✅ Seconde Vie — Paiement confirmé !\n` +
          `Bonjour ${userName}, votre achat "${label}" (${amountFormatted}) est activé.\n` +
          `Réf : ${ref}`,
      })
    : Promise.resolve({ sent: false, channel: 'whatsapp', mode: 'skipped' });

  const [emailResult, whatsappResult] = await Promise.all([emailPromise, whatsappPromise]);
  return { emailResult, whatsappResult };
}

/**
 * 3. Alerte de publication ou de validation d'une annonce
 */
export async function notifyAdStatusEvent({ ad, user, eventType = 'published' }) {
  const isApproved = eventType === 'approved';
  const title = ad?.title || 'Votre annonce';
  const targetEmail = user?.email;
  const targetWhatsapp = ad?.contactWhatsapp || ad?.contactPhone || user?.whatsapp || user?.phone;
  const priceLabel = ad?.type === 'don' ? 'Don gratuit (0 FCFA)' : `${Number(ad?.price || 0).toLocaleString('fr-FR')} FCFA`;

  const subject = isApproved
    ? `Votre annonce "${title}" est maintenant en ligne — Seconde Vie`
    : `Annonce reçue : "${title}" — Seconde Vie`;

  const message = isApproved
    ? `🎉 Seconde Vie : Bonne nouvelle ! Votre annonce "${title}" (${priceLabel}) vient d'être validée et est visible par tous les acheteurs à Abidjan.`
    : `📦 Seconde Vie : Votre annonce "${title}" (${priceLabel}) a bien été enregistrée sur la plateforme.`;

  const [emailResult, whatsappResult] = await Promise.all([
    targetEmail
      ? sendEmailNotification({
          to: targetEmail,
          toName: user?.full_name || ad?.contactName,
          subject,
          text: message,
          html: `<p>${message}</p>`,
        })
      : Promise.resolve({ sent: false, channel: 'email', mode: 'skipped' }),
    targetWhatsapp
      ? sendWhatsAppNotification({ to: targetWhatsapp, message })
      : Promise.resolve({ sent: false, channel: 'whatsapp', mode: 'skipped' }),
  ]);

  return { emailResult, whatsappResult };
}

