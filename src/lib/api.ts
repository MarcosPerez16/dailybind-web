import axios from "axios";

//create an axios instance with our base config

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, //backend URL from .env
  withCredentials: true, //send cookies with every request - required for JWT auth
});

export default api;
