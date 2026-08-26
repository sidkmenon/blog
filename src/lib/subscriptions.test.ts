import { describe, expect, it, vi } from 'vitest';
import {
	createSubscriptionToken,
	handleConfirm,
	handleSubscribe,
	normalizeEmail,
	type SubscriptionEnv,
	verifySubscriptionToken
} from './subscriptions';

const now = Date.UTC(2026, 7, 16, 12);
const env: SubscriptionEnv = {
	RESEND_API_KEY: 're_test',
	RESEND_FROM_EMAIL: 'Sid Menon <writing@sidharthkmenon.com>',
	RESEND_SEGMENT_ID: 'segment_blog',
	SUBSCRIBE_TOKEN_SECRET: 'a-long-test-secret'
};

function subscriptionRequest(email: string, website = ''): Request {
	const formData = new FormData();
	formData.set('email', email);
	formData.set('website', website);
	return new Request('https://sidharthkmenon.com/api/subscribe', {
		method: 'POST',
		body: formData
	});
}

describe('subscription tokens', () => {
	it('normalizes addresses and rejects malformed input', () => {
		expect(normalizeEmail('  SID@Example.COM ')).toBe('sid@example.com');
		expect(normalizeEmail('not-an-email')).toBeNull();
	});

	it('verifies an untampered token before it expires', async () => {
		const token = await createSubscriptionToken('sid@example.com', env.SUBSCRIBE_TOKEN_SECRET, now);

		expect(await verifySubscriptionToken(token, env.SUBSCRIBE_TOKEN_SECRET, now)).toBe(
			'sid@example.com'
		);
		expect(await verifySubscriptionToken(`${token}x`, env.SUBSCRIBE_TOKEN_SECRET, now)).toBeNull();
		expect(
			await verifySubscriptionToken(
				token,
				env.SUBSCRIBE_TOKEN_SECRET,
				now + 24 * 60 * 60 * 1000 + 1
			)
		).toBeNull();
	});
});

describe('handleSubscribe', () => {
	it('sends a confirmation email without storing an unconfirmed contact', async () => {
		const fetcher = vi.fn<typeof fetch>();
		fetcher.mockResolvedValue(new Response('{}', { status: 200 }));
		const response = await handleSubscribe(
			subscriptionRequest('SID@example.com'),
			env,
			fetcher,
			now
		);

		expect(response.status).toBe(202);
		expect(fetcher).toHaveBeenCalledOnce();
		const [url, init] = fetcher.mock.calls[0]!;
		expect(url).toBe('https://api.resend.com/emails');
		expect(init?.method).toBe('POST');
		const body = JSON.parse(init?.body as string);
		expect(body.to).toEqual(['sid@example.com']);
		expect(body.text).toContain('https://sidharthkmenon.com/api/subscribe/confirm?token=');
		expect(init?.headers).toMatchObject({
			Authorization: 'Bearer re_test',
			'User-Agent': 'sid-menon-blog/1.0'
		});
	});

	it('rejects malformed addresses without calling Resend', async () => {
		const fetcher = vi.fn();
		const response = await handleSubscribe(subscriptionRequest('nope'), env, fetcher, now);

		expect(response.status).toBe(400);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('silently accepts honeypot submissions without calling Resend', async () => {
		const fetcher = vi.fn();
		const response = await handleSubscribe(
			subscriptionRequest('bot@example.com', 'https://spam.example'),
			env,
			fetcher,
			now
		);

		expect(response.status).toBe(202);
		expect(fetcher).not.toHaveBeenCalled();
	});
});

describe('handleConfirm', () => {
	it('creates a confirmed contact in the newsletter segment', async () => {
		const token = await createSubscriptionToken('sid@example.com', env.SUBSCRIBE_TOKEN_SECRET, now);
		const fetcher = vi.fn<typeof fetch>();
		fetcher.mockResolvedValue(new Response('{}', { status: 201 }));
		const response = await handleConfirm(
			new Request(`https://sidharthkmenon.com/api/subscribe/confirm?token=${token}`),
			env,
			fetcher,
			now
		);

		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe(
			'https://sidharthkmenon.com/?subscription=confirmed#subscribe-heading'
		);
		const [url, init] = fetcher.mock.calls[0]!;
		expect(url).toBe('https://api.resend.com/contacts');
		expect(JSON.parse(init?.body as string)).toEqual({
			email: 'sid@example.com',
			unsubscribed: false,
			segments: [{ id: 'segment_blog' }]
		});
	});

	it('reactivates and segments an existing contact', async () => {
		const token = await createSubscriptionToken('sid@example.com', env.SUBSCRIBE_TOKEN_SECRET, now);
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(new Response('{}', { status: 409 }))
			.mockResolvedValueOnce(new Response('{}', { status: 200 }))
			.mockResolvedValueOnce(new Response('{}', { status: 200 }));

		const response = await handleConfirm(
			new Request(`https://sidharthkmenon.com/api/subscribe/confirm?token=${token}`),
			env,
			fetcher,
			now
		);

		expect(response.headers.get('location')).toContain('subscription=confirmed');
		expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
			'https://api.resend.com/contacts',
			'https://api.resend.com/contacts/sid%40example.com',
			'https://api.resend.com/contacts/sid%40example.com/segments/segment_blog'
		]);
	});

	it('rejects invalid confirmation links before calling Resend', async () => {
		const fetcher = vi.fn();
		const response = await handleConfirm(
			new Request('https://sidharthkmenon.com/api/subscribe/confirm?token=invalid'),
			env,
			fetcher,
			now
		);

		expect(response.headers.get('location')).toContain('subscription=invalid');
		expect(fetcher).not.toHaveBeenCalled();
	});
});
