// src/api/axiosInstance.js
import axios from 'axios';
import { getToken } from './httpClient'; // if you use that httpClient


const baseURL = import.meta.env.VITE_FASTAPI_URL || 'http://127.0.0.1:8000';


const instance = axios.create({
baseURL,
timeout: 120000,
});


// attach auth token if available
instance.interceptors.request.use((cfg) => {
try {
const token = localStorage.getItem('token');
if (token) cfg.headers.Authorization = `Bearer ${token}`;
} catch (e) {
/* ignore */
}
return cfg;
});


export default instance;