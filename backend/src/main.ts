import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({ origin: corsOrigins,
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,});

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, 
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  
  const config = new DocumentBuilder()
    .setTitle('ticket API')
    .setDescription('API documentation for ticket Backend')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', description: 'Enter JWT access token', in: 'header', }, 'access-token',)
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  return app;
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 5000);

  console.log(
    `🚀 Application running at: http://localhost:${process.env.PORT ?? 5000}`,
  );
  console.log(
    `📚 Swagger available at: http://localhost:${process.env.PORT ?? 5000}/api`,
  );
}

if (require.main === module) {
  bootstrap().catch((error: unknown) => {
    console.error('Failed to start application', error);
    process.exit(1);
  });
}