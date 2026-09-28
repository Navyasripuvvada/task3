import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/user.module';
import { TicketsModule } from './tickets/tickets.module';
import { User, UserSchema } from './users/schemas/user.schema';
import { Ticket, TicketSchema } from './tickets/schemas/ticket.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),

    MongooseModule.forRoot(process.env.MONGODB_URI as string),

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
