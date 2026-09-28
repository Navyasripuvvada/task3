import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in .env');
}

const mongoUri: string = MONGODB_URI;
const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    passwordHash: String,
    role: String,
  },
  { timestamps: true },
);

const TicketSchema = new mongoose.Schema(
  {
    ticketId: String,
    customerName: String,
    customerEmail: String,
    subject: String,
    description: String,
    createdAt: Date,
    urgency: String,
    status: String,
    customerId: mongoose.Schema.Types.ObjectId,
    assignedAgent: mongoose.Schema.Types.ObjectId,
    slaDeadline: Date,
    isOverdue: Boolean,
  },
  { timestamps: true },
);

const User = mongoose.model('User', UserSchema);
const Ticket = mongoose.model('Ticket', TicketSchema);

async function seed() {
  try {
   await mongoose.connect(mongoUri);

    console.log('Connected to MongoDB');

    /*
     * Create/find mock customers
     */

    const ravi = await User.findOneAndUpdate(
      { email: 'ravi@example.com' },
      {
        $setOnInsert: {
          name: 'Ravi Kumar',
          email: 'ravi@example.com',
          passwordHash: 'mock-password',
          role: 'CUSTOMER',
        },
      },
      { new: true, upsert: true },
    );

    const anita = await User.findOneAndUpdate(
      { email: 'anita@example.com' },
      {
        $setOnInsert: {
          name: 'Anita Desai',
          email: 'anita@example.com',
          passwordHash: 'mock-password',
          role: 'CUSTOMER',
        },
      },
      { new: true, upsert: true },
    );

    const vikram = await User.findOneAndUpdate(
      { email: 'vikram@example.com' },
      {
        $setOnInsert: {
          name: 'Vikram Singh',
          email: 'vikram@example.com',
          passwordHash: 'mock-password',
          role: 'CUSTOMER',
        },
      },
      { new: true, upsert: true },
    );

    /*
     * Mock ticket data
     */

    const tickets = [
      {
        ticketId: 'TKT-9001',
        customerName: 'Ravi Kumar',
        customerEmail: 'ravi@example.com',
        subject: 'Payment deducted but order failed',
        description:
          'I tried to buy a premium subscription, my card was charged, but my account still says free.',
        createdAt: new Date('2026-09-21T10:30:00Z'),
        urgency: 'High',
        status: 'Open',
        customerId: ravi._id,
        slaDeadline: new Date('2026-09-22T10:30:00Z'),
        isOverdue: true,
      },
      {
        ticketId: 'TKT-9002',
        customerName: 'Anita Desai',
        customerEmail: 'anita@example.com',
        subject: 'Cannot change password',
        description:
          'The password reset link in my email is giving me a 404 error.',
        createdAt: new Date('2026-09-22T08:15:00Z'),
        urgency: 'Medium',
        status: 'Open',
        customerId: anita._id,
        slaDeadline: new Date('2026-09-23T08:15:00Z'),
        isOverdue: true,
      },
      {
        ticketId: 'TKT-9003',
        customerName: 'Vikram Singh',
        customerEmail: 'vikram@example.com',
        subject: 'Feature request: Dark Mode',
        description:
          'Please add a dark mode to the dashboard, it is too bright at night.',
        createdAt: new Date('2026-09-22T12:00:00Z'),
        urgency: 'Low',
        status: 'Open',
        customerId: vikram._id,
        slaDeadline: new Date('2026-09-23T12:00:00Z'),
        isOverdue: true,
      },
    ];

    for (const ticket of tickets) {
      await Ticket.findOneAndUpdate(
        { ticketId: ticket.ticketId },
        { $set: ticket },
        { upsert: true, new: true },
      );
    }

    console.log('Mock data seeded successfully');
    console.log('Created/updated: TKT-9001, TKT-9002, TKT-9003');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();