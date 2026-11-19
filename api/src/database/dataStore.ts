import bcrypt from 'bcryptjs';
import { Role, TicketStatus, TicketPriority } from '../types/index.js';

export interface OrganisationEntity {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
  reopenWindowDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEntity {
  id: string;
  organisationId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  isActive: boolean;
  unitId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyEntity {
  id: string;
  organisationId: string;
  name: string;
  address: string;
  createdAt: Date;
}

export interface UnitEntity {
  id: string;
  organisationId: string;
  propertyId: string;
  unitNumber: string;
  floor?: number | null;
  createdAt: Date;
}

export interface MeetingRoomEntity {
  id: string;
  organisationId: string;
  propertyId: string;
  name: string;
  capacity: number;
  dailyWindowStart: string; // "08:00"
  dailyWindowEnd: string;   // "20:00"
  createdAt: Date;
}

export interface RoomBookingEntity {
  id: string;
  organisationId: string;
  meetingRoomId: string;
  memberName: string;
  memberEmail: string;
  startTime: Date;
  endTime: Date;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: Date;
}

export interface TicketEntity {
  id: string;
  organisationId: string;
  ticketNumber: number;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  propertyId: string;
  unitId?: string | null;
  meetingRoomId?: string | null;
  createdById: string;
  assignedTechnicianId?: string | null;
  holdReason?: string | null;
  resolutionNotes?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  version: number;
  mergedIntoTicketId?: string | null;
  isDuplicate: boolean;
  reopenedAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketEventEntity {
  id: string;
  organisationId: string;
  ticketId: string;
  actorId?: string | null;
  action: string;
  fromStatus?: TicketStatus | null;
  toStatus?: TicketStatus | null;
  metadata?: any;
  createdAt: Date;
}

export interface CommentEntity {
  id: string;
  organisationId: string;
  ticketId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttachmentEntity {
  id: string;
  organisationId: string;
  ticketId: string;
  uploadedById: string;
  filename: string;
  s3Key: string;
  url: string;
  thumbnailUrl?: string | null;
  mimeType: string;
  sizeBytes: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: Date;
}

export interface TicketWatcherEntity {
  id: string;
  organisationId: string;
  ticketId: string;
  userId: string;
  createdAt: Date;
}

export interface AuditEventEntity {
  id: string;
  organisationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
  ipAddress?: string | null;
  createdAt: Date;
}

export interface DeadLetterJobEntity {
  id: string;
  organisationId: string;
  queueName: string;
  jobName: string;
  payload: any;
  errorReason: string;
  failedAt: Date;
  replayedAt?: Date | null;
}

export class DataStore {
  public organisations = new Map<string, OrganisationEntity>();
  public users = new Map<string, UserEntity>();
  public properties = new Map<string, PropertyEntity>();
  public units = new Map<string, UnitEntity>();
  public meetingRooms = new Map<string, MeetingRoomEntity>();
  public roomBookings = new Map<string, RoomBookingEntity>();
  public tickets = new Map<string, TicketEntity>();
  public ticketEvents: TicketEventEntity[] = [];
  public comments = new Map<string, CommentEntity>();
  public attachments = new Map<string, AttachmentEntity>();
  public watchers = new Map<string, TicketWatcherEntity>();
  public auditEvents: AuditEventEntity[] = [];
  public deadLetterJobs = new Map<string, DeadLetterJobEntity>();

  private ticketCounter = 1000;
  private assignmentLocks = new Map<string, boolean>();

  constructor() {
    this.seedDefaultData();
  }

  public reset() {
    this.organisations.clear();
    this.users.clear();
    this.properties.clear();
    this.units.clear();
    this.meetingRooms.clear();
    this.roomBookings.clear();
    this.tickets.clear();
    this.ticketEvents = [];
    this.comments.clear();
    this.attachments.clear();
    this.watchers.clear();
    this.auditEvents = [];
    this.deadLetterJobs.clear();
    this.assignmentLocks.clear();
    this.ticketCounter = 1000;
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Org 1: Lumen Hatch Workspaces (Client assigned)
    const org1Id = 'org-lumen-hatch';
    const lumenHatchOrg: OrganisationEntity = {
      id: org1Id,
      organisationId: org1Id,
      name: 'Lumen Hatch Workspaces',
      slug: 'lumen-hatch',
      reopenWindowDays: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organisations.set(org1Id, lumenHatchOrg);

    // Org 2: Competitor facilities for tenant isolation testing
    const org2Id = 'org-greenfield';
    const greenfieldOrg: OrganisationEntity = {
      id: org2Id,
      organisationId: org2Id,
      name: 'Greenfield Facilities',
      slug: 'greenfield',
      reopenWindowDays: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organisations.set(org2Id, greenfieldOrg);

    const defaultPasswordHash = bcrypt.hashSync('Password@123', 10);

    // Org 1 Users
    const adminUser: UserEntity = {
      id: 'usr-admin-1',
      organisationId: org1Id,
      email: 'admin@lumenhatch.com',
      passwordHash: defaultPasswordHash,
      name: 'Ananya Deshpande (Admin)',
      role: 'ORG_ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const staffUser: UserEntity = {
      id: 'usr-staff-1',
      organisationId: org1Id,
      email: 'staff@lumenhatch.com',
      passwordHash: defaultPasswordHash,
      name: 'Devin DeskStaff',
      role: 'DESK_STAFF',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const techUser1: UserEntity = {
      id: 'usr-tech-1',
      organisationId: org1Id,
      email: 'tech1@lumenhatch.com',
      passwordHash: defaultPasswordHash,
      name: 'Alex Technician',
      role: 'TECHNICIAN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const techUser2: UserEntity = {
      id: 'usr-tech-2',
      organisationId: org1Id,
      email: 'tech2@lumenhatch.com',
      passwordHash: defaultPasswordHash,
      name: 'Sam Technician',
      role: 'TECHNICIAN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const residentUser: UserEntity = {
      id: 'usr-resident-1',
      organisationId: org1Id,
      email: 'resident@lumenhatch.com',
      passwordHash: defaultPasswordHash,
      name: 'Rohan Member',
      role: 'RESIDENT',
      unitId: 'unit-101',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Org 2 Users (for isolation testing)
    const org2Admin: UserEntity = {
      id: 'usr-org2-admin',
      organisationId: org2Id,
      email: 'admin@greenfield.com',
      passwordHash: defaultPasswordHash,
      name: 'Greenfield Admin',
      role: 'ORG_ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    [adminUser, staffUser, techUser1, techUser2, residentUser, org2Admin].forEach(
      (u) => this.users.set(u.id, u)
    );

    // Properties
    const prop1: PropertyEntity = {
      id: 'prop-1',
      organisationId: org1Id,
      name: 'Lumen Tower Downtown',
      address: '100 Silicon Ave, Innovation Hub',
      createdAt: new Date(),
    };
    const prop2Org2: PropertyEntity = {
      id: 'prop-org2-1',
      organisationId: org2Id,
      name: 'Greenfield Heights',
      address: '404 Isolated Way',
      createdAt: new Date(),
    };
    this.properties.set(prop1.id, prop1);
    this.properties.set(prop2Org2.id, prop2Org2);

    // Units
    const unit101: UnitEntity = {
      id: 'unit-101',
      organisationId: org1Id,
      propertyId: prop1.id,
      unitNumber: 'Suite 101',
      floor: 1,
      createdAt: new Date(),
    };
    this.units.set(unit101.id, unit101);

    // Lumen Hatch Workspaces: Meeting Rooms with Fixed Daily Windows
    const roomA: MeetingRoomEntity = {
      id: 'room-alpha',
      organisationId: org1Id,
      propertyId: prop1.id,
      name: 'Apollo Boardroom (Meeting Room A)',
      capacity: 12,
      dailyWindowStart: '08:00',
      dailyWindowEnd: '20:00',
      createdAt: new Date(),
    };
    const roomB: MeetingRoomEntity = {
      id: 'room-beta',
      organisationId: org1Id,
      propertyId: prop1.id,
      name: 'Tesla Collaboration Suite (Meeting Room B)',
      capacity: 6,
      dailyWindowStart: '09:00',
      dailyWindowEnd: '19:00',
      createdAt: new Date(),
    };
    this.meetingRooms.set(roomA.id, roomA);
    this.meetingRooms.set(roomB.id, roomB);

    // Pre-populate member bookings for Room A (Client Rule FR-1.08)
    // Booking 1: 09:00 to 11:30
    const today = new Date();
    const b1Start = new Date(today);
    b1Start.setHours(9, 0, 0, 0);
    const b1End = new Date(today);
    b1End.setHours(11, 30, 0, 0);

    // Booking 2: 14:00 to 17:00
    const b2Start = new Date(today);
    b2Start.setHours(14, 0, 0, 0);
    const b2End = new Date(today);
    b2End.setHours(17, 0, 0, 0);

    const booking1: RoomBookingEntity = {
      id: 'book-1',
      organisationId: org1Id,
      meetingRoomId: roomA.id,
      memberName: 'TechStars Inc.',
      memberEmail: 'events@techstars.io',
      startTime: b1Start,
      endTime: b1End,
      status: 'CONFIRMED',
      createdAt: new Date(),
    };
    const booking2: RoomBookingEntity = {
      id: 'book-2',
      organisationId: org1Id,
      meetingRoomId: roomA.id,
      memberName: 'FinTech Founders',
      memberEmail: 'chair@fintech.io',
      startTime: b2Start,
      endTime: b2End,
      status: 'CONFIRMED',
      createdAt: new Date(),
    };
    this.roomBookings.set(booking1.id, booking1);
    this.roomBookings.set(booking2.id, booking2);

    // Seed Initial Tickets
    const ticket1: TicketEntity = {
      id: 'tick-1001',
      organisationId: org1Id,
      ticketNumber: ++this.ticketCounter,
      title: 'AC leaking in Suite 101',
      description: 'Water dripping slowly near desk 3',
      category: 'HVAC',
      priority: 'HIGH',
      status: 'NEW',
      propertyId: prop1.id,
      unitId: unit101.id,
      createdById: residentUser.id,
      version: 1,
      isDuplicate: false,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 3600000),
    };
    this.tickets.set(ticket1.id, ticket1);
    this.ticketEvents.push({
      id: 'evt-1',
      organisationId: org1Id,
      ticketId: ticket1.id,
      actorId: residentUser.id,
      action: 'CREATED',
      fromStatus: null,
      toStatus: 'NEW',
      metadata: { initialPriority: 'HIGH' },
      createdAt: ticket1.createdAt,
    });

    // Org 2 ticket for cross-tenant isolation test (Org 1 user must get 404)
    const org2Ticket: TicketEntity = {
      id: 'tick-org2-999',
      organisationId: org2Id,
      ticketNumber: 999,
      title: 'Private Greenfield Secret Ticket',
      description: 'Confidential facilities ticket for Greenfield',
      category: 'SECURITY',
      priority: 'URGENT',
      status: 'NEW',
      propertyId: prop2Org2.id,
      createdById: org2Admin.id,
      version: 1,
      isDuplicate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tickets.set(org2Ticket.id, org2Ticket);
  }

  // Atomic assignment with row-locking / version concurrency control
  public async atomicAssignTicket(
    tenantId: string,
    ticketId: string,
    technicianId: string,
    actorId: string,
    expectedVersion?: number
  ): Promise<{ success: boolean; ticket?: TicketEntity; conflictReason?: string }> {
    const lockKey = `assign_lock:${ticketId}`;

    // Mutex lock simulation (guarantees atomic evaluation even under 20 parallel threads)
    if (this.assignmentLocks.get(lockKey)) {
      return { success: false, conflictReason: 'Concurrent assignment in progress' };
    }
    this.assignmentLocks.set(lockKey, true);

    try {
      const ticket = this.tickets.get(ticketId);
      if (!ticket || ticket.organisationId !== tenantId) {
        return { success: false, conflictReason: 'Ticket not found' };
      }

      if (ticket.status !== 'TRIAGED') {
        return {
          success: false,
          conflictReason: `Ticket cannot be assigned from status '${ticket.status}'. Must be TRIAGED.`,
        };
      }

      if (ticket.assignedTechnicianId) {
        return { success: false, conflictReason: 'Ticket is already assigned' };
      }

      if (expectedVersion !== undefined && ticket.version !== expectedVersion) {
        return { success: false, conflictReason: 'Ticket version conflict' };
      }

      // Verify technician exists and belongs to the same tenant
      const tech = this.users.get(technicianId);
      if (!tech || tech.organisationId !== tenantId || tech.role !== 'TECHNICIAN') {
        return { success: false, conflictReason: 'Invalid technician' };
      }

      // Perform assignment atomically
      ticket.assignedTechnicianId = technicianId;
      ticket.status = 'ASSIGNED';
      ticket.version += 1;
      ticket.updatedAt = new Date();

      // Record immutable TicketEvent
      this.ticketEvents.push({
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organisationId: tenantId,
        ticketId: ticket.id,
        actorId,
        action: 'ASSIGNED',
        fromStatus: 'TRIAGED',
        toStatus: 'ASSIGNED',
        metadata: { assignedTo: technicianId, technicianName: tech.name },
        createdAt: new Date(),
      });

      return { success: true, ticket };
    } finally {
      this.assignmentLocks.delete(lockKey);
    }
  }

  public nextTicketNumber(): number {
    return ++this.ticketCounter;
  }
}

export const db = new DataStore();
