const authService = require('../services/auth.service');

async function register(req, res, next) {
    try {
        const { email, password } = req.body;
        const user = await authService.registerUser(email, password);
        res.status(201).json({ success: true, userId: user.id });
    } catch (error) {
        next(error);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const { token } = await authService.loginUser(email, password);
        res.json({ success: true, token });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    register,
    login
};
