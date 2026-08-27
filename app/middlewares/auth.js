const jwt = require('jsonwebtoken');
const authConfig = require('../../config/auth');
const { runWithUser } = require('../../config/context');
const { UserToken } = require('../models');
const logger = require('../../config/logger');

module.exports = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ msg: "Acceso no autorizado: token no proporcionado" });
    }

    try {
        const userToken = await UserToken.findOne({ where: { token } });

        if (!userToken || userToken.revoked) {
            return res.status(401).json({ msg: 'Acceso no autorizado: token revocado o no válido' });
        }

        const currentTime = new Date();
        const expiresAt = userToken.expires_at ? new Date(userToken.expires_at) : null;

        if (expiresAt && expiresAt <= currentTime) {
            return res.status(401).json({ msg: 'Acceso no autorizado: token expirado' });
        }

        jwt.verify(token, authConfig.secret, async (err, decoded) => {
            if (err) {
                const status = err.name === 'TokenExpiredError' ? 401 : 500;
                const msg = err.name === 'TokenExpiredError'
                    ? 'Acceso no autorizado: token expirado'
                    : 'Error al verificar el token';

                return res.status(status).json({ msg, err });
            }

            runWithUser(decoded.user.id, async () => {
                req.user = decoded.user;
                req.worker = decoded.user.worker;

                next();
            });
        });
    } catch (error) {
        logger.error(`Error al verificar el token: ${error.message}`);
        return res.status(500).json({ msg: "Error en el servidor", error });
    }
};
