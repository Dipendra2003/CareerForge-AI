import { PostHog } from 'posthog-node'

export let posthog: PostHog | null = null;

export const startPosthog = () => {
    if (process.env.POSTHOG_API_KEY) {
        posthog = new PostHog(
            process.env.POSTHOG_API_KEY,
             { host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com', flushAt: 1, flushInterval: 0 }
        )
    } else if (process.env.NODE_ENV === 'production') {
        console.warn("⚠️ POSTHOG_API_KEY is missing. Analytics will not function.");
    }
}
