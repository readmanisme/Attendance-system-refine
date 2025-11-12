// src/lib/pocketbase.js
import PocketBase from "pocketbase";

const pb = new PocketBase(__BACKEND_API_URL__);
// 或者 const pb = new PocketBase(process.env.REACT_APP_BACKEND_API_URL);

export default pb;
