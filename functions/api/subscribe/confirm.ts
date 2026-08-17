import { handleConfirm, type SubscriptionEnv } from '../../../src/lib/subscriptions';

interface PagesContext {
	request: Request;
	env: SubscriptionEnv;
}

export function onRequestGet({ request, env }: PagesContext): Promise<Response> {
	return handleConfirm(request, env);
}
