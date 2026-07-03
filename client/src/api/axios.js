import axios from "axios";

/**
 * Flow:
 * Suppose const res = await api.get("/pages")
 * Call api.get("/pages")
 * Interceptor runs, gets token from local storage, adds Authorization header
 * Axios buils GET http://localhost:5001/api/pages, headers: Authorization: Bearer jade246
 * Express receives req.headers.authorization
 * Middleware protect() verifies JWT
 * Controller runs
 * Res comes back
 * React displays the pages
 */
/**
 * Create custom Axios object that entire frontend uses to talk to Express
 */
const api = axios.create({
  baseURL: "http://localhost:5001/api",
  withCredentials: true, // include cookies if they exist
});

/**
 * Interceptor: every request has to pass interceptor before being sent to server
 * config = the request object that Axios about to send
 */
api.interceptors.request.use((config) => {
  // local storage = browser storage where frontend stores user token
  const token = localStorage.getItem("token");
  if (token) {
    // add Authorization header
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
