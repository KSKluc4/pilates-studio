const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function request(path, { method = "GET", body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network-level failure (server unreachable, DNS error, etc.)
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Only redirect if the user has an active session (token in storage).
    // A plain failed login attempt also returns 401 but has no token to expire.
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      sessionStorage.setItem("sessionMessage", "Sua sessão expirou. Faça login novamente.");
      window.location.href = "/login";
    }
    const err = new Error(data.message || "Sessão expirada.");
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data.message || "Ocorreu um erro. Tente novamente.");
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  get: (path, token) => request(path, { token }),
  post: (path, body, token) => request(path, { method: "POST", body, token }),
  put: (path, body, token) => request(path, { method: "PUT", body, token }),
  delete: (path, token) => request(path, { method: "DELETE", token }),
};
