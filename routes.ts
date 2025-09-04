import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertComplaintSchema, 
  insertMeetingSchema, 
  insertScenarioSchema,
  insertUserSchema 
} from "@shared/schema";
import { analyzeComplaint, generateScenarioResponse, generateHRResponse } from "./services/openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Users
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Complaints
  app.get("/api/complaints", async (req, res) => {
    try {
      const complaints = await storage.getComplaints();
      res.json(complaints);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch complaints" });
    }
  });

  app.get("/api/complaints/:id", async (req, res) => {
    try {
      const complaint = await storage.getComplaint(req.params.id);
      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch complaint" });
    }
  });

  app.post("/api/complaints", async (req, res) => {
    try {
      const complaintData = insertComplaintSchema.parse(req.body);
      const complaint = await storage.createComplaint(complaintData);
      
      // Analyze complaint with AI
      try {
        const analysis = await analyzeComplaint(complaint.title, complaint.description);
        await storage.updateComplaint(complaint.id, {
          category: analysis.category,
          priority: analysis.priority,
          aiAnalysis: analysis.summary,
          aiRecommendations: JSON.stringify(analysis.recommendations),
          sentimentScore: analysis.sentiment,
          confidenceScore: analysis.confidence,
        });
      } catch (aiError) {
        console.error("AI analysis failed:", aiError);
        // Continue without AI analysis
      }
      
      res.status(201).json(complaint);
    } catch (error) {
      res.status(400).json({ message: "Invalid complaint data" });
    }
  });

  app.patch("/api/complaints/:id", async (req, res) => {
    try {
      const updates = req.body;
      const complaint = await storage.updateComplaint(req.params.id, updates);
      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      res.status(500).json({ message: "Failed to update complaint" });
    }
  });

  // Meetings
  app.get("/api/meetings", async (req, res) => {
    try {
      const meetings = await storage.getMeetings();
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  app.get("/api/meetings/:id", async (req, res) => {
    try {
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meeting" });
    }
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      console.log("Meeting creation request body:", JSON.stringify(req.body, null, 2));
      
      // Convert scheduledDate string to Date object if it's a string
      if (req.body.scheduledDate && typeof req.body.scheduledDate === 'string') {
        console.log("Converting scheduledDate from string to Date:", req.body.scheduledDate);
        req.body.scheduledDate = new Date(req.body.scheduledDate);
        console.log("Converted scheduledDate:", req.body.scheduledDate, "Type:", typeof req.body.scheduledDate);
      }
      
      const meetingData = insertMeetingSchema.parse(req.body);
      console.log("Parsed meeting data:", JSON.stringify(meetingData, null, 2));
      const meeting = await storage.createMeeting(meetingData);
      res.status(201).json(meeting);
    } catch (error: any) {
      console.error("Meeting validation error:", error);
      if (error.errors) {
        console.error("Validation errors:", error.errors);
      }
      res.status(400).json({ message: "Invalid meeting data", error: error.message });
    }
  });

  // Scenarios
  app.get("/api/scenarios", async (req, res) => {
    try {
      const scenarios = await storage.getScenarios();
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scenarios" });
    }
  });

  app.get("/api/scenarios/:id", async (req, res) => {
    try {
      const scenario = await storage.getScenario(req.params.id);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }
      res.json(scenario);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scenario" });
    }
  });

  app.post("/api/scenarios", async (req, res) => {
    try {
      const scenarioData = insertScenarioSchema.parse(req.body);
      const scenario = await storage.createScenario(scenarioData);
      
      // Generate AI response
      try {
        const aiResult = await generateScenarioResponse(scenario.scenario);
        await storage.updateScenario(scenario.id, {
          aiResponse: aiResult.response,
          recommendedActions: JSON.stringify(aiResult.recommendedActions),
          riskLevel: aiResult.riskLevel,
        });
      } catch (aiError) {
        console.error("AI scenario analysis failed:", aiError);
      }
      
      res.status(201).json(scenario);
    } catch (error) {
      res.status(400).json({ message: "Invalid scenario data" });
    }
  });

  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { question } = z.object({ question: z.string() }).parse(req.body);
      const response = await generateHRResponse(question);
      res.json({ response });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ message: "Phone number and password are required" });
      }

      const users = await storage.getUsers();
      const user = users.find(u => u.phone === phone && u.password === password);
      
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid phone number or password" });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });
      
      // Store user session (in a real app, use proper session management)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, message: "Login successful" });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if phone number already exists
      const users = await storage.getUsers();
      const existingUser = users.find(u => u.phone === userData.phone || u.email === userData.email);
      
      if (existingUser) {
        return res.status(400).json({ 
          message: existingUser.phone === userData.phone 
            ? "Phone number already registered" 
            : "Email already registered" 
        });
      }

      const user = await storage.createUser(userData);
      
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, message: "Registration successful" });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logout successful" });
  });

  app.get("/api/auth/me", async (req, res) => {
    // For development, return a default user
    // In production, implement proper session management
    res.json({ 
      user: { 
        id: "default-user-id", 
        name: "Demo User", 
        role: "hr_manager", 
        phone: "+1234567890" 
      } 
    });
  });

  // Admin endpoints (HR Manager only)
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const complaints = await storage.getComplaints();
      const meetings = await storage.getMeetings();
      
      const stats = {
        totalUsers: users.length,
        totalComplaints: complaints.length,
        activeComplaints: complaints.filter(c => c.status === "open" || c.status === "in_progress").length,
        totalMeetings: meetings.filter(m => m.status === "scheduled").length,
        pendingReviews: complaints.filter(c => c.status === "open").length,
        resolvedComplaints: complaints.filter(c => c.status === "resolved").length,
        inProgressComplaints: complaints.filter(c => c.status === "in_progress").length,
        openComplaints: complaints.filter(c => c.status === "open").length,
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/activity", async (req, res) => {
    try {
      // Mock activity data for now
      const activity = [
        { title: "New complaint submitted", time: "2 hours ago" },
        { title: "Meeting scheduled", time: "4 hours ago" },
        { title: "User registered", time: "6 hours ago" },
      ];
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/stats", async (req, res) => {
    try {
      const complaints = await storage.getComplaints();
      const meetings = await storage.getMeetings();
      
      const activeIssues = complaints.filter(c => c.status === "open" || c.status === "in_progress").length;
      const resolvedThisMonth = complaints.filter(c => {
        const createdDate = new Date(c.createdAt!);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        return c.status === "resolved" && 
               createdDate.getMonth() === currentMonth && 
               createdDate.getFullYear() === currentYear;
      }).length;
      
      const upcomingMeetings = meetings.filter(m => {
        const meetingDate = new Date(m.scheduledDate);
        const today = new Date();
        return meetingDate >= today && m.status === "scheduled";
      }).length;
      
      const aiRecommendations = complaints.filter(c => c.aiRecommendations).length;
      
      res.json({
        activeIssues,
        resolvedThisMonth,
        upcomingMeetings,
        aiRecommendations
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Notifications
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.params.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
