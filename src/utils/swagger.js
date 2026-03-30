const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Notes SaaS API',
    version: '1.0.0',
    description: 'Production-ready note taking backend API',
  },
  servers: [{ url: 'http://localhost:5000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/auth/login': { post: { summary: 'Login' } },
    '/api/auth/register': { post: { summary: 'Register' } },
    '/api/notes': {
      get: { summary: 'List notes', security: [{ bearerAuth: [] }] },
      post: { summary: 'Create note', security: [{ bearerAuth: [] }] },
    },
  },
};

export default swaggerSpec;
