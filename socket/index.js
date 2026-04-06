const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

module.exports = {
    initServer: (server) => {
        const corsOrigins = process.env.CORS_ORIGIN 
            ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
            : ['http://localhost:3000', 'http://localhost:3001'];

        const io = new Server(server, {
            cors: {
                origin: corsOrigins,
                credentials: true
            }
        });

        io.use((socket, next) => {
            let token = socket.handshake.auth?.token;
            if (!token && socket.handshake.headers.cookie) {
               // Extract token from cookie as fallback if not in auth
               const cookies = socket.handshake.headers.cookie.split(';');
               for (let cookie of cookies) {
                   const [name, val] = cookie.trim().split('=');
                   if (name === 'accessToken') token = val;
               }
            }
            if (!token) return next(new Error("Authentication error"));

            try {
                let result = jwt.verify(token, "secret");
                socket.userId = result.id;
                next();
            } catch (err) {
                next(new Error("Authentication error"));
            }
        });

        io.on("connection", (socket) => {
            console.log(`[Socket] connected: ${socket.id} (user: ${socket.userId})`);
            
            socket.join(socket.userId.toString());

            socket.on("disconnect", () => {
                console.log(`[Socket] disconnected: ${socket.id}`);
            });
        });

        return io;
    }
};
