import axios from "axios";

const server = axios.create({
  baseURL: "https://ecdsa-server.vercel.app",
});

export default server;
