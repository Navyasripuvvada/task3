import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/user.module';
import { TicketsModule } from './tickets/tickets.module';
import { User, UserSchema } from './users/schemas/user.schema';
import { Ticket, TicketSchema } from './tickets/schemas/ticket.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),

    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Ticket.name,
        schema: TicketSchema,
      },
    ]),
      UsersModule,
     AuthModule,
     TicketsModule,
  ],
})
export class AppModule {}