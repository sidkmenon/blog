import { handleSubscribe, type SubscriptionEnv } from '../../src/lib/subscriptions';

interface PagesContext {
	request: Request;
	env: SubscriptionEnv;
}

export function onRequestPost({ request, env }: PagesContext): Promise<Response> {
	return handleSubscribe(request, env);
}
