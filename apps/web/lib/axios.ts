import axios from 'axios'
import { toApiError } from './errors'

const baseURL = process.env.NEXT_PUBLIC_SERVER_URL;

if (!baseURL && typeof window !== "undefined") {
    console.error("NEXT_PUBLIC_SERVER_URL is not set — API calls will fail.");
}

const api = axios.create({
    baseURL,
    withCredentials: true,
    timeout: 60_000, // agent calls (LLM) can take a while; other calls fail fast via AbortController if needed
});

// Normalize every failure into an ApiError with a human-readable message so
// components can `catch (e) { toast.error(getErrorMessage(e)) }` uniformly.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            // Let callers decide (getCurrentUser maps 401 -> null). No global
            // redirect here: it would fight the App Router navigation.
        }
        return Promise.reject(toApiError(error));
    }
);

export default api;
