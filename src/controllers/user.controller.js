const authService = require('../services/auth.service');

async function getCurrentUser(req, res, next) {
    try {
        if (req.user?.isAIPortal) {
            return res.json({
                success: true,
                email: 'ai-portal@system',
                plan: 'unlimited',
                usage: 0
            });
        }

        const user = await authService.getUserProfile(req.user.userId);
        res.json({
            success: true,
            email: user.email,
            plan: user.plan,
            usage: user.usage_count
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getCurrentUser
};
