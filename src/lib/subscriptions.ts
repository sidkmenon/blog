import { SITE_NAME, SITE_ORIGIN } from './site';

const RESEND_API_ORIGIN = 'https://api.resend.com';
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionEnv {
	RESEND_API_KEY: string;
	RESEND_FROM_EMAIL: string;
	RESEND_SEGMENT_ID: string;
	SUBSCRIBE_TOKEN_SECRET: string;
}

type Fetcher = typeof fetch;

interface TokenPayload {
	email: string;
	expiresAt: number;
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
	const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(base64 + padding);
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

export function normalizeEmail(value: unknown): string | null {
	if (typeof value !== 'string') return null;

	const email = value.trim().toLowerCase();
	if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

	return email;
}

export async function createSubscriptionToken(
	email: string,
	secret: string,
	now = Date.now()
): Promise<string> {
	const payload = bytesToBase64Url(
		new TextEncoder().encode(JSON.stringify({ email, expiresAt: now + TOKEN_LIFETIME_MS }))
	);
	const signature = await crypto.subtle.sign(
		'HMAC',
		await hmacKey(secret),
		new TextEncoder().encode(payload)
	);

	return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySubscriptionToken(
	token: string,
	secret: string,
	now = Date.now()
): Promise<string | null> {
	try {
		const [payload, signature, extra] = token.split('.');
		if (!payload || !signature || extra) return null;

		const valid = await crypto.subtle.verify(
			'HMAC',
			await hmacKey(secret),
			base64UrlToBytes(signature),
			new TextEncoder().encode(payload)
		);
		if (!valid) return null;

		const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as TokenPayload;
		const email = normalizeEmail(parsed.email);
		if (!email || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt < now) return null;

		return email;
	} catch {
		return null;
	}
}

function json(message: string, status: number): Response {
	return Response.json({ message }, { status });
}

function redirectWithStatus(status: 'confirmed' | 'invalid' | 'error'): Response {
	const url = new URL('/', SITE_ORIGIN);
	url.searchParams.set('subscription', status);
	url.hash = 'subscribe-heading';
	return Response.redirect(url, 303);
}

function requireEnv(env: SubscriptionEnv): boolean {
	return Boolean(
		env.RESEND_API_KEY &&
			env.RESEND_FROM_EMAIL &&
			env.RESEND_SEGMENT_ID &&
			env.SUBSCRIBE_TOKEN_SECRET
	);
}

async function resend(
	path: string,
	env: SubscriptionEnv,
	init: RequestInit,
	fetcher: Fetcher
): Promise<Response> {
	return fetcher(`${RESEND_API_ORIGIN}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json',
			'User-Agent': 'sid-menon-blog/1.0',
			...init.headers
		}
	});
}

async function confirmationIdempotencyKey(email: string, now: number): Promise<string> {
	const fifteenMinutes = Math.floor(now / (15 * 60 * 1000));
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(`${email}:${fifteenMinutes}`)
	);
	return `subscription-confirmation-${bytesToBase64Url(new Uint8Array(digest))}`;
}

export async function handleSubscribe(
	request: Request,
	env: SubscriptionEnv,
	fetcher: Fetcher = fetch,
	now = Date.now()
): Promise<Response> {
	if (!requireEnv(env)) return json('Email subscriptions are not configured yet.', 503);

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json('Enter a valid email address.', 400);
	}

	// A hidden honeypot keeps simple form bots from consuming the email allowance.
	if (formData.get('website')) return json('Check your inbox to confirm your subscription.', 202);

	const email = normalizeEmail(formData.get('email'));
	if (!email) return json('Enter a valid email address.', 400);

	const token = await createSubscriptionToken(email, env.SUBSCRIBE_TOKEN_SECRET, now);
	const confirmationUrl = new URL('/api/subscribe/confirm', SITE_ORIGIN);
	confirmationUrl.searchParams.set('token', token);

	const response = await resend(
		'/emails',
		env,
		{
			method: 'POST',
			headers: {
				'Idempotency-Key': await confirmationIdempotencyKey(email, now)
			},
			body: JSON.stringify({
				from: env.RESEND_FROM_EMAIL,
				to: [email],
				subject: `Confirm your subscription to ${SITE_NAME}`,
				html: `<p>One last step: confirm that you want to receive new essays from ${SITE_NAME}.</p><p><a href="${confirmationUrl.href}">Confirm subscription →</a></p><p>If you didn't request this, you can ignore this email.</p>`,
				text: `Confirm that you want to receive new essays from ${SITE_NAME}:\n\n${confirmationUrl.href}\n\nIf you didn't request this, you can ignore this email.`
			})
		},
		fetcher
	);

	if (!response.ok) return json('The confirmation email could not be sent. Try again later.', 502);

	return json('Check your inbox to confirm your subscription.', 202);
}

async function addConfirmedContact(
	email: string,
	env: SubscriptionEnv,
	fetcher: Fetcher
): Promise<boolean> {
	const createResponse = await resend(
		'/contacts',
		env,
		{
			method: 'POST',
			body: JSON.stringify({
				email,
				unsubscribed: false,
				segments: [{ id: env.RESEND_SEGMENT_ID }]
			})
		},
		fetcher
	);

	if (createResponse.ok) return true;
	if (createResponse.status !== 409) return false;

	const contactPath = `/contacts/${encodeURIComponent(email)}`;
	const updateResponse = await resend(
		contactPath,
		env,
		{
			method: 'PATCH',
			body: JSON.stringify({ unsubscribed: false })
		},
		fetcher
	);
	if (!updateResponse.ok) return false;

	const segmentResponse = await resend(
		`${contactPath}/segments/${encodeURIComponent(env.RESEND_SEGMENT_ID)}`,
		env,
		{ method: 'POST' },
		fetcher
	);

	return segmentResponse.ok || segmentResponse.status === 409;
}

export async function handleConfirm(
	request: Request,
	env: SubscriptionEnv,
	fetcher: Fetcher = fetch,
	now = Date.now()
): Promise<Response> {
	if (!requireEnv(env)) return redirectWithStatus('error');

	const token = new URL(request.url).searchParams.get('token');
	if (!token) return redirectWithStatus('invalid');

	const email = await verifySubscriptionToken(token, env.SUBSCRIBE_TOKEN_SECRET, now);
	if (!email) return redirectWithStatus('invalid');

	return redirectWithStatus(
		(await addConfirmedContact(email, env, fetcher)) ? 'confirmed' : 'error'
	);
}
