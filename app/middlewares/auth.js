const jwt = require('jsonwebtoken');
const authConfig = require('../../config/auth');
const { runWithUser } = require('../../config/context');
const { User, UserToken } = require('../models');
const logger = require('../../config/logger');

module.exports = async (req, res, next) => {
    // Verificar si el token existe en los encabezados de la solicitud
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ msg: "Acceso no autorizado: token no proporcionado" });
    }

    try {
        // Verificar si el token está en la base de datos y si no ha sido revocado
        const userToken = await UserToken.findOne({ where: { token } });

        if (!userToken || userToken.revoked) {
            return res.status(401).json({ msg: 'Acceso no autorizado: token revocado o no válido' });
        }

        // Verificar si el token ha expirado
        const currentTime = new Date().toISOString(); // Fecha y hora actual en UTC
        const expiresAt = new Date(userToken.expires_at).toISOString(); // Fecha de expiración en UTC
        
        if (expiresAt < currentTime) {
            return res.status(401).json({ msg: 'Acceso no autorizado: token expirado' });
        }

        // Verificar la validez del token usando jwt.verify
        jwt.verify(token, authConfig.secret, async (err, decoded) => {
            if (err) {
                return res.status(500).json({ msg: "Error al verificar el token", err });
            }

            // Almacenar el ID del usuario en el contexto
            runWithUser(decoded.user.id, async () => {
                req.user = decoded.user; // Puedes mantenerlo si necesitas acceder a otros datos del usuario
                req.worker = decoded.user.worker; // Datos adicionales si es necesario

                next();
                /*try {
                    // Obtener el usuario de la base de datos
                    const user = await User.findOne({ where: { id: decoded.user.id } });
            
                    if (!user) {
                        return res.status(404).json({ msg: 'Usuario no encontrado' });
                    }
            
                    // Verificar si el idioma es diferente al de la base de datos
                    if (user.language !== decoded.user.language) {
                        // Actualizar el idioma en el objeto del usuario
                        req.user.language = decoded.user.language;
            
                        // Establecer el idioma en i18n
                        i18n.setLocale(user.language);
                    } else {
                        // Si el idioma es el mismo, solo establece el idioma en i18n
                        i18n.setLocale(decoded.user.language);
                    }
            
                    // Llamar a next() para continuar con el siguiente middleware
                    next();
            
                } catch (error) {
                    logger.error(`Error al obtener el usuario: ${error.message}`);
                    return res.status(500).json({ msg: 'Error al actualizar el idioma en la base de datos', error });
                }*/
            });

        });
    } catch (error) {
        logger.error(`Error al verificar el token: ${error.message}`);
        return res.status(500).json({ msg: "Error en el servidor", error });
    }
};
