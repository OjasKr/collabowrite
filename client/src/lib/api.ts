import axios, { AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let onUnauthorized: (() => void) | null = null;

export const setAuthLogoutCallback = (cb: () => void) => {
  onUnauthorized = cb;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config;
    if (err.response?.status !== 401 || !original || (original as { _retry?: boolean })._retry) {
      if (err.response?.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
      return Promise.reject(err);
    }
    (original as { _retry?: boolean })._retry = true;
    try {
      const { data } = await axios.post(
        `${BASE_URL}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const token = data.accessToken;
      if (token) {
        localStorage.setItem("accessToken", token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    } catch {
      // refresh failed
    }
    if (onUnauthorized) onUnauthorized();
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post("/auth/register", { name, email, password }),
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  refresh: () => api.post("/auth/refresh", {}, { withCredentials: true }),
  logout: () => api.post("/auth/logout", {}, { withCredentials: true }),
  me: () => api.get("/auth/me"),
  updateProfile: (data: { name?: string; bio?: string }) =>
    api.patch("/auth/me", data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
};

export const docsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get("/docs", { params }),
  listShared: (params?: { page?: number; limit?: number }) =>
    api.get("/docs/shared", { params }),
  listRecent: (params?: { limit?: number }) =>
    api.get("/docs/recent", { params }),
  listStarred: () => api.get("/docs/starred"),
  listTrash: () => api.get("/docs/trash"),
  restore: (id: string) => api.post(`/docs/${id}/restore`),
  permanentDelete: (id: string) => api.post(`/docs/${id}/permanent-delete`),
  star: (id: string) => api.post(`/docs/${id}/star`),
  unstar: (id: string) => api.delete(`/docs/${id}/star`),
  create: (title?: string) => api.post("/docs", { title: title || "Untitled" }),
  get: (id: string) => api.get(`/docs/${id}`),
  updateContent: (id: string, content: object) =>
    api.patch(`/docs/${id}`, { content }),
  updateTitle: (id: string, title: string) =>
    api.patch(`/docs/${id}/title`, { title }),
  getVersions: (id: string) => api.get(`/docs/${id}/versions`),
  restoreVersion: (id: string, versionId: string) =>
    api.post(`/docs/${id}/versions/${versionId}/restore`),
  listComments: (id: string) => api.get(`/docs/${id}/comments`),
  addComment: (id: string, content: string) =>
    api.post(`/docs/${id}/comments`, { content }),
  deleteComment: (id: string, commentId: string) =>
    api.delete(`/docs/${id}/comments/${commentId}`),
  share: (id: string, email: string, role: "viewer" | "editor") =>
    api.post(`/docs/${id}/share`, { email, role }),
  unshare: (id: string, userId: string) =>
    api.delete(`/docs/${id}/share/${userId}`),
  getCollaborators: (id: string) => api.get(`/docs/${id}/collaborators`),
  setVisibility: (id: string, isPublic: boolean, publicRole: "viewer" | "editor") =>
    api.patch(`/docs/${id}/visibility`, { isPublic, publicRole }),
  delete: (id: string, soft = true) =>
    api.delete(`/docs/${id}`, { params: { soft: soft ? "true" : "false" } }),
  copy: (id: string) => api.post(`/docs/${id}/copy`),
};
