import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'InboxOS API',
    version: '1.0.0',
    description: 'Auto‑generated API documentation for InboxOS backend',
  },
  servers: [
    { url: 'http://localhost:8000', description: 'Local development' },
    {
      url: process.env.BASE_URL ?? 'https://api.inboxos.com',
      description: 'Production',
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'JWT token stored in HttpOnly cookie',
      },
    },
  },
  security: [{ cookieAuth: [] }],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/**/*.ts'], // adjust if routes are elsewhere
};

export const swaggerSpec = swaggerJSDoc(options);

/** Mount Swagger UI and JSON spec */
export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
}
