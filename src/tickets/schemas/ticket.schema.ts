import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TicketDocument = HydratedDocument<Ticket>;

export enum TicketStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
}

export enum TicketUrgency {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

@Schema({ timestamps: true })
export class Ticket {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  ticketId: string;

  @Prop({ required: true, trim: true })
  customerName: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  customerEmail: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({
    required: true,
    enum: TicketUrgency,
  })
  urgency: TicketUrgency;

  @Prop({
    required: true,
    enum: TicketStatus,
    default: TicketStatus.OPEN,
    index: true,
  })
  status: TicketStatus;

  // Customer who created the ticket
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  customerId?: Types.ObjectId;

  // Agent currently working on the ticket
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  })
  assignedAgent?: Types.ObjectId;

  // When the agent started working
  @Prop()
  lockedAt?: Date;

  // Ticket becomes available again after this time
  @Prop({
    index: true,
  })
  lockExpiresAt?: Date;

  // 24-hour SLA deadline
  @Prop({
    required: true,
    index: true,
  })
  slaDeadline: Date;

  // Whether the SLA has expired
  @Prop({
    default: false,
    index: true,
  })
  isOverdue: boolean;

  // Set when ticket is resolved
  @Prop()
  resolvedAt?: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);