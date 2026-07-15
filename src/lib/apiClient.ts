import axios from 'axios';

let accessToken: string | null = null;
try {
  accessToken = localStorage.getItem('session_token');
} catch (e) {
  console.error('Failed to read session_token from localStorage', e);
}
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  try {
    if (token) {
      if (localStorage.getItem('remember_me') === 'true') {
        localStorage.setItem('session_token', token);
      }
    } else {
      localStorage.removeItem('session_token');
      localStorage.removeItem('remember_me');
    }
  } catch (e) {
    console.error('Failed to update localStorage token', e);
  }
};

export const getAccessToken = () => accessToken;

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // Needs to send refresh token cookie
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const isAuthRoute = originalRequest?.url && 
      originalRequest.url.includes('/auth/') && 
      !originalRequest.url.includes('/auth/jwt-me');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = 'Bearer ' + token;
            }
            return apiClient(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + data.accessToken;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = 'Bearer ' + data.accessToken;
        }
        processQueue(null, data.accessToken);
        
        // Dispatch an event so AuthContext can update its state if we refreshed
        window.dispatchEvent(new CustomEvent('auth:refresh', { detail: { accessToken: data.accessToken } }));

        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        setAccessToken(null);
        // Dispatch an event so AuthContext knows we got logged out
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
