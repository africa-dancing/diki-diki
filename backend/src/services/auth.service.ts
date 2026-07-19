// ============================================================
// PAC — Auth Service
// Register / Login / OTP / Social (Google + Facebook)
// ============================================================
import { supabase }    from '../../config/supabase';
import jwt             from 'jsonwebtoken';
import bcrypt          from 'bcryptjs';
import axios           from 'axios';
import admin           from 'firebase-admin';

// ─── OTP stocké en mémoire (remplace Redis) ──────────────────
const otpStore = new Map<string, { otp: string; expiresAt: number }>();
const redis = {
  setex: async (key: string, ttl: number, value: string) => {
    otpStore.set(key, { otp: value, expiresAt: Date.now() + ttl * 1000 });
  },
  get: async <T>(key: string): Promise<T | null> => {
    const entry = otpStore.get(key);
    if (!entry || Date.now() > entry.expiresAt) { otpStore.delete(key); return null; }
    return entry.otp as T;
  },
  del: async (key: string) => { otpStore.delete(key); },
};

const JWT_SECRET     = process.env.JWT_SECRET || 'pac-secret-change-me';
const JWT_EXPIRES_IN = '7d';
const OTP_TTL        = 600; // 10 minutes

// ─── Helpers ─────────────────────────────────────────────────
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSMSOTP(phone: string, otp: string): Promise<void> {
  const username = process.env.AT_USERNAME!;
  const apiKey   = process.env.AT_API_KEY!;
  const isSandbox = process.env.NODE_ENV !== 'production';
  const baseURL   = isSandbox
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';

  const _atRes = await axios.post(
    baseURL,
    new URLSearchParams({
      username,
      to:      phone,
      message: `Diki-Diki : votre code de verification est ${otp}. Valide 10 min.`, /*DKDK_SMS_TEXT*/
/*DKDK_NO_SENDER*/
      // Sender ID desactive : Africa's Talking repond InvalidSenderId tant que
      // "DikiDiki" n est pas valide chez eux (Product Requests -> SMS Sender ID).
      // Sans "from", AT utilise son expediteur par defaut et le SMS part.
      // POUR REACTIVER : decommenter la ligne ci-dessous.
      // from:    process.env.AT_SENDER || 'DikiDiki',
    }),
    {
      headers: {
        apiKey: process.env.AT_API_KEY!,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    },
  );

  /*DKDK_AT_RESPONSE*/
  // Africa's Talking repond 201 MEME quand il refuse le message.
  // Le vrai statut est dans le corps de la reponse. On le lit.
  const _atData: any = _atRes && _atRes.data ? _atRes.data : {};
  console.log('[AT_RAW] ' + JSON.stringify(_atData));

  const _recipients =
    _atData.SMSMessageData && Array.isArray(_atData.SMSMessageData.Recipients)
      ? _atData.SMSMessageData.Recipients
      : [];

  if (_recipients.length === 0) {
    const _msg = (_atData.SMSMessageData && _atData.SMSMessageData.Message) || 'aucun destinataire accepte';
    console.error('[AT] REFUS : ' + _msg);
    throw new Error('SMS_REJECTED: ' + _msg);
  }

  const _first = _recipients[0] || {};
  const _status = String(_first.status || '');
  console.log('[AT] statut=' + _status + ' | cout=' + (_first.cost || '?') + ' | numero=' + (_first.number || '?'));

  if (_status.toLowerCase() !== 'success') {
    throw new Error('SMS_REJECTED: ' + _status);
  }
}

// ─── REGISTER ────────────────────────────────────────────────
export async function registerUser(data: {
  name:     string;
  email:    string;
  phone:    string;
  password: string;
  country:  string;
}) {
  const { name, email, phone, password, country } = data;

  const { data: byEmail } = await supabase
    .from('users').select('id').eq('email', email).maybeSingle();
  if (byEmail) throw new Error('EMAIL_ALREADY_EXISTS');

  const { data: byPhone } = await supabase
    .from('users').select('id').eq('phone', phone).maybeSingle();
  if (byPhone) throw new Error('PHONE_ALREADY_EXISTS');

  const hashedPassword = await bcrypt.hash(password, 12);

  /*DKDK_REGISTER_RPC_FIX*/
  const { data: user, error } = await supabase
    .rpc('register_user_complete', {
      p_name:          name,
      p_email:         email,
      p_phone:         phone,
      p_password_hash: hashedPassword,
      p_country:       country,
    })
    .single();

  if (error) throw new Error('USER_CREATION_FAILED');

  const otp = generateOTP();
  await redis.setex(`otp:${phone}`, OTP_TTL, otp);

  if (process.env.NODE_ENV !== 'production') console.log(`[DEV] OTP pour ${phone}: ${otp}`); /*DKDK_OTP_GUARD*/
  try {
    /*DKDK_SMS_DIFF*/ // SMS RETIRE de l inscription.
  // Avant : 17 F par inscrit, meme pour un curieux qui ne revient pas.
  // Maintenant : l OTP est genere et stocke, mais le SMS ne part QUE
  // quand l utilisateur demande a verifier son numero (POST /auth/resend-otp),
  // c est-a-dire au moment de recharger, voter ou soumettre une video.
  // await sendSMSOTP(phone, otp);   <-- retire volontairement
    console.log(`[DKDK] Aucun SMS envoye a l inscription (economie 17 F). Code : ${otp}`);
  } catch (err) {
    console.error(`[AT] Erreur envoi SMS:`, err);
  }

  return { userId: (user as any).id, message: 'OTP_SENT' };
}

// ─── VERIFY OTP ───────────────────────────────────────────────
export async function verifyOTP(phone: string, otp: string) {
  const stored = await redis.get<string>(`otp:${phone}`);
  if (!stored) throw new Error('OTP_EXPIRED');
  if (String(stored) !== String(otp)) throw new Error('OTP_INVALID');

  const { data: user, error } = await supabase
    .from('users')
    .update({ is_verified: true, phone_verified: true }) /*DKDK_PHONE_VERIFIED*/
    .eq('phone', phone)
    .select('id, email, phone, name, role, avatar_url, country, wallet')
    .single();

  if (error || !user) throw new Error('USER_NOT_FOUND');

  await redis.del(`otp:${phone}`);

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { token, user };
}

// ─── LOGIN ───────────────────────────────────────────────────
export async function loginUser(identifier: string, password: string) {
  const isEmail = identifier.includes('@');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, phone, name, role, password, is_verified, avatar_url, country, wallet')
    .eq(isEmail ? 'email' : 'phone', identifier)
    .single();

  if (error || !user)    throw new Error('INVALID_CREDENTIALS');
  /*DKDK_SMS_DIFF*/
  // Un compte non verifie PEUT se connecter et regarder la plateforme.
  // La verification est exigee plus loin, par requireVerified, sur les
  // routes qui touchent a l argent.
  // if (!user.is_verified) throw new Error('ACCOUNT_NOT_VERIFIED');

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('INVALID_CREDENTIALS');

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const { password: _omit, ...safeUser } = user;
  return { token, user: safeUser };
}

// ─── SOCIAL AUTH (Google + Facebook) ─────────────────────────
export async function socialAuth(
  provider: 'google' | 'facebook',
  token:    string
) {
  let socialId:  string;
  let email:     string;
  let name:      string;
  let avatarUrl: string = '';

  if (provider === 'google') {
    const ticket = await admin.auth().verifyIdToken(token);
    socialId  = ticket.uid;
    email     = ticket.email!;
    name      = ticket.name || email;
    avatarUrl = ticket.picture || '';
  } else {
    const { data } = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${token}`
    );
    socialId  = data.id;
    email     = data.email;
    name      = data.name;
    avatarUrl = data.picture?.data?.url || '';
  }

  let { data: user } = await supabase
    .from('users')
    .select('id, email, phone, name, role, avatar_url, country, wallet, is_verified')
    .eq('email', email)
    .maybeSingle();

  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    /*DKDK_SOCIAL_ONETAP_RPC_FIX*/
    const { data: newUser, error } = await supabase
      .rpc('register_user_complete', {
        p_name:            name,
        p_email:           email,
        p_is_verified:     true,
        p_avatar_url:      avatarUrl,
        p_social_provider: provider,
        p_social_id:       socialId,
      })
      .single();

    if (error) throw new Error('SOCIAL_AUTH_FAILED');
    user = newUser as any;
  }

  const jwtToken = jwt.sign(
    { userId: user!.id, role: user!.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { token: jwtToken, user, isNewUser };
}

// ─── ONE-TAP : Envoyer OTP (compte implicite si nouveau) ────────
/*DKDK_ONETAP_SEND*/
export async function oneTapSend(phone: string) {
  // Verifier si l'utilisateur existe
  const { data: existing } = await supabase
    .from('users').select('id, name').eq('phone', phone).maybeSingle();

  // Creer un compte implicite si inexistant
  if (!existing) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    /*DKDK_SOCIAL_ONETAP_RPC_FIX*/
    const { error } = await supabase
      .rpc('register_user_complete', {
        p_name:        `Fan_${suffix}`,
        p_phone:       phone,
        p_is_verified: true,
      });
    if (error) throw new Error('ACCOUNT_CREATION_FAILED');
  }

  // Envoyer OTP
  const otp = generateOTP();
  await redis.setex(`otp:${phone}`, OTP_TTL, otp);
  if (process.env.NODE_ENV !== 'production') console.log(`[DEV] ONE-TAP OTP pour ${phone}: ${otp}`); /*DKDK_OTP_GUARD*/
  try { await sendSMSOTP(phone, otp); } catch (e) { console.error('[AT] SMS one-tap failed:', e); }

  return { message: 'OTP_SENT', is_new: !existing };
}

// ─── ONE-TAP : Verifier OTP → JWT immédiat ────────────────────
/*DKDK_ONETAP_VERIFY*/
export async function oneTapVerify(phone: string, otp: string) {
  const stored = await redis.get<string>(`otp:${phone}`);
  if (!stored) throw new Error('OTP_EXPIRED');
  if (String(stored) !== String(otp)) throw new Error('OTP_INVALID');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, phone, name, role, avatar_url, wallet, is_verified')
    .eq('phone', phone)
    .single();

  if (error || !user) throw new Error('USER_NOT_FOUND');

  await supabase.from('users').update({ is_verified: true, phone_verified: true }).eq('id', user.id); /*DKDK_PHONE_VERIFIED2*/

  await redis.del(`otp:${phone}`);

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { token, user };
}

// ─── RESEND OTP ───────────────────────────────────────────────
export async function resendOTP(phone: string) {
  const { data: user } = await supabase
    .from('users').select('id').eq('phone', phone).maybeSingle();
  if (!user) throw new Error('USER_NOT_FOUND');

  const otp = generateOTP();
  await redis.setex(`otp:${phone}`, OTP_TTL, otp);
  await sendSMSOTP(phone, otp);

  return { message: 'OTP_RESENT' };
}


/*DKDK_ATTACH_PHONE*/
// --- Attacher un numero a un compte existant -------------------------
// Necessaire pour les comptes crees via Google/Facebook, qui n ont aucun
// telephone. Le numero n est ecrit en base QU APRES validation du code,
// pour empecher qu un tiers squatte le numero de quelqu un d autre.
export async function attachPhoneSend(userId: string, phone: string) {
  const { data: existant } = await supabase
    .from('users').select('id').eq('phone', phone).maybeSingle();
  if (existant && existant.id !== userId) throw new Error('PHONE_ALREADY_USED');

  const otp = generateOTP();
  await redis.setex(`attach:${userId}`, OTP_TTL, `${phone}|${otp}`);
  await sendSMSOTP(phone, otp);
  return { message: 'OTP_SENT' };
}

export async function attachPhoneVerify(userId: string, otp: string) {
  const stored = await redis.get<string>(`attach:${userId}`);
  if (!stored) throw new Error('OTP_EXPIRED');
  const [phone, code] = String(stored).split('|');
  if (String(code) !== String(otp)) throw new Error('OTP_INVALID');

  const { error } = await supabase
    .from('users')
    .update({ phone, is_verified: true, phone_verified: true })
    .eq('id', userId);
  if (error) throw new Error(error.code === '23505' ? 'PHONE_ALREADY_USED' : 'ATTACH_FAILED');

  await redis.del(`attach:${userId}`);
  return { message: 'PHONE_VERIFIED', phone };
}
