const authRoutes = require('./auth.routes');
const copyRoutes = require('./copy.routes');
const taxonomyRoutes = require('./taxonomy.routes');
const userRoutes = require('./user.routes');
const aiPortalRoutes = require('./aiportal.routes');
const metaRoutes = require('./meta.routes');
const brandRoutes = require('./brand.routes');
const projectRoutes = require('./project.routes');
const variantRoutes = require('./variant.routes');
const graphRoutes = require('./graph.routes');

function registerRoutes(app) {
    app.use('/api', metaRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api', taxonomyRoutes);
    app.use('/api', copyRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api', aiPortalRoutes);
    app.use('/api/brands', brandRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/variants', variantRoutes);
    app.use('/api/graph', graphRoutes);
}

module.exports = registerRoutes;
