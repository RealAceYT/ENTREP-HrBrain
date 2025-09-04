import { 
  type User, 
  type InsertUser,
  type Complaint,
  type InsertComplaint,
  type Meeting,
  type InsertMeeting,
  type Scenario,
  type InsertScenario,
  type Notification,
  type InsertNotification
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Complaints
  getComplaints(): Promise<Complaint[]>;
  getComplaint(id: string): Promise<Complaint | undefined>;
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  updateComplaint(id: string, updates: Partial<Complaint>): Promise<Complaint | undefined>;
  getComplaintsByUser(userId: string): Promise<Complaint[]>;
  
  // Meetings
  getMeetings(): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | undefined>;
  getMeetingsByUser(userId: string): Promise<Meeting[]>;
  
  // Scenarios
  getScenarios(): Promise<Scenario[]>;
  getScenario(id: string): Promise<Scenario | undefined>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;
  updateScenario(id: string, updates: Partial<Scenario>): Promise<Scenario | undefined>;
  
  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private complaints: Map<string, Complaint>;
  private meetings: Map<string, Meeting>;
  private scenarios: Map<string, Scenario>;
  private notifications: Map<string, Notification>;

  constructor() {
    this.users = new Map();
    this.complaints = new Map();
    this.meetings = new Map();
    this.scenarios = new Map();
    this.notifications = new Map();
    
    // Initialize with default HR manager
    this.initializeDefaults();
  }

  private async initializeDefaults() {
    const hrManager = await this.createUser({
      username: "sarah.johnson",
      password: "password123",
      email: "sarah.johnson@company.com",
      phone: "+1234567890",
      name: "Sarah Johnson",
      role: "hr_manager",
      department: "Human Resources",
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phone === phone,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "employee",
      department: insertUser.department || null,
      isActive: insertUser.isActive ?? true,
      lastLogin: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  // Complaints
  async getComplaints(): Promise<Complaint[]> {
    return Array.from(this.complaints.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getComplaint(id: string): Promise<Complaint | undefined> {
    return this.complaints.get(id);
  }

  async createComplaint(insertComplaint: InsertComplaint): Promise<Complaint> {
    const id = randomUUID();
    const complaint: Complaint = {
      ...insertComplaint,
      id,
      status: insertComplaint.status || "open",
      priority: insertComplaint.priority || "medium",
      assignedTo: insertComplaint.assignedTo || null,
      aiAnalysis: null,
      aiRecommendations: null,
      sentimentScore: null,
      confidenceScore: null,
      isAnonymous: insertComplaint.isAnonymous ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.complaints.set(id, complaint);
    return complaint;
  }

  async updateComplaint(id: string, updates: Partial<Complaint>): Promise<Complaint | undefined> {
    const complaint = this.complaints.get(id);
    if (!complaint) return undefined;
    
    const updated = { ...complaint, ...updates, updatedAt: new Date() };
    this.complaints.set(id, updated);
    return updated;
  }

  async getComplaintsByUser(userId: string): Promise<Complaint[]> {
    return Array.from(this.complaints.values()).filter(
      complaint => complaint.submitterId === userId
    );
  }

  // Meetings
  async getMeetings(): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const id = randomUUID();
    const meeting: Meeting = {
      ...insertMeeting,
      id,
      status: insertMeeting.status || "scheduled",
      description: insertMeeting.description || null,
      duration: insertMeeting.duration || 30,
      attendeeIds: insertMeeting.attendeeIds || null,
      meetingLink: insertMeeting.meetingLink || null,
      relatedComplaintId: insertMeeting.relatedComplaintId || null,
      createdAt: new Date(),
    };
    this.meetings.set(id, meeting);
    return meeting;
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | undefined> {
    const meeting = this.meetings.get(id);
    if (!meeting) return undefined;
    
    const updated = { ...meeting, ...updates };
    this.meetings.set(id, updated);
    return updated;
  }

  async getMeetingsByUser(userId: string): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).filter(
      meeting => meeting.organizerId === userId || 
      (meeting.attendeeIds && meeting.attendeeIds.includes(userId))
    );
  }

  // Scenarios
  async getScenarios(): Promise<Scenario[]> {
    return Array.from(this.scenarios.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getScenario(id: string): Promise<Scenario | undefined> {
    return this.scenarios.get(id);
  }

  async createScenario(insertScenario: InsertScenario): Promise<Scenario> {
    const id = randomUUID();
    const scenario: Scenario = {
      ...insertScenario,
      id,
      aiResponse: null,
      recommendedActions: null,
      riskLevel: null,
      createdAt: new Date(),
    };
    this.scenarios.set(id, scenario);
    return scenario;
  }

  async updateScenario(id: string, updates: Partial<Scenario>): Promise<Scenario | undefined> {
    const scenario = this.scenarios.get(id);
    if (!scenario) return undefined;
    
    const updated = { ...scenario, ...updates };
    this.scenarios.set(id, updated);
    return updated;
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...insertNotification,
      id,
      isRead: insertNotification.isRead ?? false,
      relatedEntityId: insertNotification.relatedEntityId || null,
      relatedEntityType: insertNotification.relatedEntityType || null,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    return true;
  }
}

export const storage = new MemStorage();
