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

  await axios.post(
    baseURL,
    new URLSearchParams({
      username,
      to:      phone,
      message: `[DkDk] Votre code de vérification : ${otp}. Valide 10 min.`,
      from:    process.env.AT_SENDER || 'DikiDiki', /*DKDK_AT_SENDER*/
    }),
    {
      headers: {
        apiKey: process.env.AT_API_KEY!,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    },
  );
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
    await sendSMSOTP(phone, otp);
    console.log(`[AT] SMS envoyé avec succès à ${phone}`);
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
    .update({ is_verified: true })
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
  if (!user.is_verified) throw new Error('ACCOUNT_NOT_VERIFIED');

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
