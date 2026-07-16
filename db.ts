import pg from "pg";

const { Pool } = pg;

// Get connection details
const databaseUrl = process.env.DATABASE_URL;
let pool: pg.Pool | null = null;

if (databaseUrl) {
  console.log("Connecting to PostgreSQL database...");
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  });
} else {
  console.warn("WARNING: DATABASE_URL is not set. Falling back to local persistent JSON database file.");
}

export { pool };

// Schema definitions
export async function initPostgres(initialDb: any) {
  if (!pool) return;

  try {
    const client = await pool.connect();
    console.log("Connected successfully to PostgreSQL. Initializing tables...");

    try {
      // 1. Roles table
      await client.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        )
      `);

      // 2. Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(100) NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
          "avatarUrl" TEXT,
          "joinedAt" VARCHAR(100),
          "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
          "passwordHash" TEXT,
          "mfaEnabled" BOOLEAN DEFAULT FALSE,
          "mfaSecret" TEXT
        )
      `);

      // 3. Workspaces table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workspaces (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          "avatarUrl" VARCHAR(100),
          "createdAt" VARCHAR(100),
          "ownerId" VARCHAR(100)
        )
      `);

      // 4. Workspace Members table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workspace_members (
          "workspaceId" VARCHAR(100),
          "userId" VARCHAR(100),
          role VARCHAR(100),
          "joinedAt" VARCHAR(100),
          PRIMARY KEY ("workspaceId", "userId")
        )
      `);

      // 5. Documents table
      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          size INTEGER,
          type VARCHAR(100),
          "uploadDate" VARCHAR(100),
          "uploadedBy" VARCHAR(255),
          "workspaceId" VARCHAR(100),
          status VARCHAR(50),
          version INTEGER,
          "chunkCount" INTEGER,
          metadata TEXT
        )
      `);

      // 6. Document Chunks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id VARCHAR(100) PRIMARY KEY,
          "documentId" VARCHAR(100),
          "documentName" VARCHAR(255),
          "workspaceId" VARCHAR(100),
          "chunkIndex" INTEGER,
          text TEXT,
          "pageNumber" INTEGER
        )
      `);

      // 7. Chat Sessions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id VARCHAR(100) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          "workspaceId" VARCHAR(100),
          "userId" VARCHAR(100),
          "createdAt" VARCHAR(100)
        )
      `);

      // 8. Messages table
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(100) PRIMARY KEY,
          "sessionId" VARCHAR(100),
          role VARCHAR(50),
          content TEXT,
          timestamp VARCHAR(100),
          "confidenceScore" REAL,
          citations TEXT
        )
      `);

      // 9. Audit Logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(100) PRIMARY KEY,
          timestamp VARCHAR(100),
          action VARCHAR(255),
          details TEXT,
          "userId" VARCHAR(100)
        )
      `);

      // 10. Notifications table
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(100) PRIMARY KEY,
          "userId" VARCHAR(100),
          title VARCHAR(255),
          message TEXT,
          type VARCHAR(50),
          read BOOLEAN DEFAULT FALSE,
          timestamp VARCHAR(100)
        )
      `);

      // 11. API Keys table
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255),
          "keyPrefix" VARCHAR(100),
          role VARCHAR(50),
          "workspaceId" VARCHAR(100),
          "createdAt" VARCHAR(100),
          "lastUsedAt" VARCHAR(100)
        )
      `);

      // 12. Comments table
      await client.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id VARCHAR(100) PRIMARY KEY,
          "documentId" VARCHAR(100),
          "userId" VARCHAR(100),
          text TEXT,
          timestamp VARCHAR(100)
        )
      `);

      // 13. Invitations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS invitations (
          id VARCHAR(100) PRIMARY KEY,
          email VARCHAR(255),
          role VARCHAR(100),
          "workspaceId" VARCHAR(100),
          "invitedBy" VARCHAR(100),
          status VARCHAR(50),
          "createdAt" VARCHAR(100)
        )
      `);

      // 14. Shared Conversations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS shared_conversations (
          id VARCHAR(100) PRIMARY KEY,
          "sessionId" VARCHAR(100),
          title VARCHAR(255),
          "sharedBy" VARCHAR(100),
          "sharedAt" VARCHAR(100),
          messages TEXT
        )
      `);

      // 15. Sessions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id VARCHAR(100) PRIMARY KEY,
          "userId" VARCHAR(100),
          token TEXT,
          "expiresAt" VARCHAR(100),
          "createdAt" VARCHAR(100)
        )
      `);

      // 16. System Settings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(100) PRIMARY KEY,
          val TEXT
        )
      `);

      // Seed roles if empty
      const rolesRes = await client.query("SELECT COUNT(*) FROM roles");
      if (parseInt(rolesRes.rows[0].count, 10) === 0) {
        console.log("Seeding Roles table...");
        await client.query("INSERT INTO roles (id, name) VALUES ('Admin', 'Admin'), ('Manager', 'Manager'), ('Employee', 'Employee')");
      }

      // Check if users empty, and seed initial database content if empty
      const usersRes = await client.query("SELECT COUNT(*) FROM users");
      if (parseInt(usersRes.rows[0].count, 10) === 0) {
        console.log("PostgreSQL Database is empty. Seeding initial database tables...");
        await seedPostgresData(client, initialDb);
      }

      console.log("PostgreSQL tables successfully initialized and verified.");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("ERROR failed to initialize PostgreSQL database schema:", err);
  }
}

async function seedPostgresData(client: pg.PoolClient, initialDb: any) {
  // Insert users
  for (const u of initialDb.users || []) {
    await client.query(`
      INSERT INTO users (id, email, name, role, "isActive", "avatarUrl", "joinedAt", "emailVerified", "passwordHash", "mfaEnabled", "mfaSecret")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING
    `, [u.id, u.email, u.name, u.role, u.isActive, u.avatarUrl, u.joinedAt, u.emailVerified, u.passwordHash || null, u.mfaEnabled || false, u.mfaSecret || null]);
  }

  // Insert workspaces
  for (const ws of initialDb.workspaces || []) {
    await client.query(`
      INSERT INTO workspaces (id, name, description, "avatarUrl", "createdAt", "ownerId")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [ws.id, ws.name, ws.description, ws.avatarUrl, ws.createdAt, ws.ownerId]);
  }

  // Insert workspace members
  for (const m of initialDb.workspace_members || []) {
    await client.query(`
      INSERT INTO workspace_members ("workspaceId", "userId", role, "joinedAt")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("workspaceId", "userId") DO NOTHING
    `, [m.workspaceId, m.userId, m.role, m.joinedAt]);
  }

  // Insert documents
  for (const doc of initialDb.documents || []) {
    await client.query(`
      INSERT INTO documents (id, name, size, type, "uploadDate", "uploadedBy", "workspaceId", status, version, "chunkCount", metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING
    `, [doc.id, doc.name, doc.size, doc.type, doc.uploadDate, doc.uploadedBy, doc.workspaceId, doc.status, doc.version, doc.chunkCount, JSON.stringify(doc.metadata)]);
  }

  // Insert document chunks
  for (const chk of initialDb.document_chunks || []) {
    await client.query(`
      INSERT INTO document_chunks (id, "documentId", "documentName", "workspaceId", "chunkIndex", text, "pageNumber")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [chk.id, chk.documentId, chk.documentName, chk.workspaceId, chk.chunkIndex, chk.text, chk.pageNumber]);
  }

  // Insert API keys
  for (const key of initialDb.api_keys || []) {
    await client.query(`
      INSERT INTO api_keys (id, name, "keyPrefix", role, "workspaceId", "createdAt", "lastUsedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [key.id, key.name, key.keyPrefix, key.role, key.workspaceId, key.createdAt, key.lastUsedAt]);
  }

  // Insert system settings
  const settings = initialDb.systemSettings || {
    activeProvider: "gemini",
    failoverChain: ["gemini", "anthropic", "openai", "ollama"],
    mfaEnabled: false,
    rateLimit: 60,
    version: "2.1.0-prod"
  };

  for (const [key, val] of Object.entries(settings)) {
    await client.query(`
      INSERT INTO system_settings (key, val)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val
    `, [key, typeof val === "object" ? JSON.stringify(val) : String(val)]);
  }
}

// Function to fetch all database collections from PostgreSQL
export async function loadFromPostgres(fallbackDb: any): Promise<any> {
  if (!pool) return fallbackDb;

  try {
    const client = await pool.connect();
    try {
      const db: any = {};

      // Users
      const usersRes = await client.query("SELECT * FROM users");
      db.users = usersRes.rows.map(r => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        isActive: r.isActive,
        avatarUrl: r.avatarUrl,
        joinedAt: r.joinedAt,
        emailVerified: r.emailVerified,
        passwordHash: r.passwordHash,
        mfaEnabled: r.mfaEnabled,
        mfaSecret: r.mfaSecret
      }));

      // Workspaces
      const workspacesRes = await client.query("SELECT * FROM workspaces");
      db.workspaces = workspacesRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        avatarUrl: r.avatarUrl,
        createdAt: r.createdAt,
        ownerId: r.ownerId
      }));

      // Workspace Members
      const membersRes = await client.query("SELECT * FROM workspace_members");
      db.workspace_members = membersRes.rows.map(r => ({
        workspaceId: r.workspaceId,
        userId: r.userId,
        role: r.role,
        joinedAt: r.joinedAt
      }));

      // Documents
      const docsRes = await client.query("SELECT * FROM documents");
      db.documents = docsRes.rows.map(r => {
        let meta = {};
        try {
          meta = r.metadata ? JSON.parse(r.metadata) : {};
        } catch (e) {
          meta = {};
        }
        return {
          id: r.id,
          name: r.name,
          size: r.size,
          type: r.type,
          uploadDate: r.uploadDate,
          uploadedBy: r.uploadedBy,
          workspaceId: r.workspaceId,
          status: r.status,
          version: r.version,
          chunkCount: r.chunkCount,
          metadata: meta
        };
      });

      // Document Chunks
      const chunksRes = await client.query("SELECT * FROM document_chunks");
      db.document_chunks = chunksRes.rows.map(r => ({
        id: r.id,
        documentId: r.documentId,
        documentName: r.documentName,
        workspaceId: r.workspaceId,
        chunkIndex: r.chunkIndex,
        text: r.text,
        pageNumber: r.pageNumber
      }));

      // Chat Sessions
      const sessionsRes = await client.query("SELECT * FROM chat_sessions");
      db.chat_sessions = sessionsRes.rows.map(r => ({
        id: r.id,
        title: r.title,
        workspaceId: r.workspaceId,
        userId: r.userId,
        createdAt: r.createdAt
      }));

      // Messages
      const messagesRes = await client.query("SELECT * FROM messages");
      db.messages = messagesRes.rows.map(r => {
        let cites = [];
        try {
          cites = r.citations ? JSON.parse(r.citations) : [];
        } catch (e) {
          cites = [];
        }
        return {
          id: r.id,
          sessionId: r.sessionId,
          role: r.role,
          content: r.content,
          timestamp: r.timestamp,
          confidenceScore: r.confidenceScore,
          citations: cites
        };
      });

      // Audit Logs
      const logsRes = await client.query("SELECT * FROM audit_logs");
      db.audit_logs = logsRes.rows.map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        action: r.action,
        details: r.details,
        userId: r.userId
      }));

      // Notifications
      const notificationsRes = await client.query("SELECT * FROM notifications");
      db.notifications = notificationsRes.rows.map(r => ({
        id: r.id,
        userId: r.userId,
        title: r.title,
        message: r.message,
        type: r.type,
        read: r.read,
        timestamp: r.timestamp
      }));

      // API Keys
      const keysRes = await client.query("SELECT * FROM api_keys");
      db.api_keys = keysRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        keyPrefix: r.keyPrefix,
        role: r.role,
        workspaceId: r.workspaceId,
        createdAt: r.createdAt,
        lastUsedAt: r.lastUsedAt
      }));

      // Comments
      const commentsRes = await client.query("SELECT * FROM comments");
      db.comments = commentsRes.rows.map(r => ({
        id: r.id,
        documentId: r.documentId,
        userId: r.userId,
        text: r.text,
        timestamp: r.timestamp
      }));

      // Invitations
      const invitationsRes = await client.query("SELECT * FROM invitations");
      db.invitations = invitationsRes.rows.map(r => ({
        id: r.id,
        email: r.email,
        role: r.role,
        workspaceId: r.workspaceId,
        invitedBy: r.invitedBy,
        status: r.status,
        createdAt: r.createdAt
      }));

      // Shared Conversations
      const sharedRes = await client.query("SELECT * FROM shared_conversations");
      db.shared_conversations = sharedRes.rows.map(r => {
        let msgs = [];
        try {
          msgs = r.messages ? JSON.parse(r.messages) : [];
        } catch (e) {
          msgs = [];
        }
        return {
          id: r.id,
          sessionId: r.sessionId,
          title: r.title,
          sharedBy: r.sharedBy,
          sharedAt: r.sharedAt,
          messages: msgs
        };
      });

      // Sessions
      const activeSessionsRes = await client.query("SELECT * FROM sessions");
      db.sessions = activeSessionsRes.rows.map(r => ({
        id: r.id,
        userId: r.userId,
        token: r.token,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt
      }));

      // System Settings
      const settingsRes = await client.query("SELECT * FROM system_settings");
      const settings: any = {};
      settingsRes.rows.forEach(r => {
        try {
          if (r.key === "failoverChain") {
            settings[r.key] = JSON.parse(r.val);
          } else if (r.key === "mfaEnabled") {
            settings[r.key] = r.val === "true";
          } else if (r.key === "rateLimit") {
            settings[r.key] = parseInt(r.val, 10);
          } else {
            settings[r.key] = r.val;
          }
        } catch (e) {
          settings[r.key] = r.val;
        }
      });
      db.systemSettings = {
        activeProvider: settings.activeProvider || "gemini",
        failoverChain: settings.failoverChain || ["gemini", "anthropic", "openai", "ollama"],
        mfaEnabled: settings.mfaEnabled || false,
        rateLimit: settings.rateLimit || 60,
        version: settings.version || "2.1.0-prod"
      };

      return db;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error loading data from PostgreSQL, using local fallback DB:", err);
    return fallbackDb;
  }
}

// Function to save mutated database collections to PostgreSQL
export async function saveToPostgres(db: any) {
  if (!pool) return;

  try {
    const client = await pool.connect();
    try {
      // 1. Save users
      for (const u of db.users || []) {
        await client.query(`
          INSERT INTO users (id, email, name, role, "isActive", "avatarUrl", "joinedAt", "emailVerified", "passwordHash", "mfaEnabled", "mfaSecret")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            "isActive" = EXCLUDED."isActive",
            "avatarUrl" = EXCLUDED."avatarUrl",
            "emailVerified" = EXCLUDED."emailVerified",
            "passwordHash" = EXCLUDED."passwordHash",
            "mfaEnabled" = EXCLUDED."mfaEnabled",
            "mfaSecret" = EXCLUDED."mfaSecret"
        `, [u.id, u.email, u.name, u.role, u.isActive, u.avatarUrl, u.joinedAt, u.emailVerified, u.passwordHash, u.mfaEnabled, u.mfaSecret]);
      }

      // 2. Save workspaces
      for (const ws of db.workspaces || []) {
        await client.query(`
          INSERT INTO workspaces (id, name, description, "avatarUrl", "createdAt", "ownerId")
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            "avatarUrl" = EXCLUDED."avatarUrl"
        `, [ws.id, ws.name, ws.description, ws.avatarUrl, ws.createdAt, ws.ownerId]);
      }

      // 3. Save workspace members
      for (const m of db.workspace_members || []) {
        await client.query(`
          INSERT INTO workspace_members ("workspaceId", "userId", role, "joinedAt")
          VALUES ($1, $2, $3, $4)
          ON CONFLICT ("workspaceId", "userId") DO UPDATE SET
            role = EXCLUDED.role
        `, [m.workspaceId, m.userId, m.role, m.joinedAt]);
      }

      // 4. Save documents
      for (const doc of db.documents || []) {
        await client.query(`
          INSERT INTO documents (id, name, size, type, "uploadDate", "uploadedBy", "workspaceId", status, version, "chunkCount", metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            version = EXCLUDED.version,
            "chunkCount" = EXCLUDED."chunkCount",
            metadata = EXCLUDED.metadata
        `, [doc.id, doc.name, doc.size, doc.type, doc.uploadDate, doc.uploadedBy, doc.workspaceId, doc.status, doc.version, doc.chunkCount, JSON.stringify(doc.metadata)]);
      }

      // 5. Save document chunks
      for (const chk of db.document_chunks || []) {
        await client.query(`
          INSERT INTO document_chunks (id, "documentId", "documentName", "workspaceId", "chunkIndex", text, "pageNumber")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            text = EXCLUDED.text,
            "pageNumber" = EXCLUDED."pageNumber"
        `, [chk.id, chk.documentId, chk.documentName, chk.workspaceId, chk.chunkIndex, chk.text, chk.pageNumber]);
      }

      // 6. Save chat sessions
      for (const s of db.chat_sessions || []) {
        await client.query(`
          INSERT INTO chat_sessions (id, title, "workspaceId", "userId", "createdAt")
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title
        `, [s.id, s.title, s.workspaceId, s.userId, s.createdAt]);
      }

      // 7. Save messages
      for (const msg of db.messages || []) {
        await client.query(`
          INSERT INTO messages (id, "sessionId", role, content, timestamp, "confidenceScore", citations)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            "confidenceScore" = EXCLUDED."confidenceScore",
            citations = EXCLUDED.citations
        `, [msg.id, msg.sessionId, msg.role, msg.content, msg.timestamp, msg.confidenceScore, JSON.stringify(msg.citations)]);
      }

      // 8. Save audit logs
      for (const l of db.audit_logs || []) {
        await client.query(`
          INSERT INTO audit_logs (id, timestamp, action, details, "userId")
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [l.id, l.timestamp, l.action, l.details, l.userId]);
      }

      // 9. Save notifications
      for (const n of db.notifications || []) {
        await client.query(`
          INSERT INTO notifications (id, "userId", title, message, type, read, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            read = EXCLUDED.read
        `, [n.id, n.userId, n.title, n.message, n.type, n.read, n.timestamp]);
      }

      // 10. Save api keys
      for (const key of db.api_keys || []) {
        await client.query(`
          INSERT INTO api_keys (id, name, "keyPrefix", role, "workspaceId", "createdAt", "lastUsedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            "lastUsedAt" = EXCLUDED."lastUsedAt"
        `, [key.id, key.name, key.keyPrefix, key.role, key.workspaceId, key.createdAt, key.lastUsedAt]);
      }

      // 11. Save comments
      for (const c of db.comments || []) {
        await client.query(`
          INSERT INTO comments (id, "documentId", "userId", text, timestamp)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [c.id, c.documentId, c.userId, c.text, c.timestamp]);
      }

      // 12. Save invitations
      for (const inv of db.invitations || []) {
        await client.query(`
          INSERT INTO invitations (id, email, role, "workspaceId", "invitedBy", status, "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status
        `, [inv.id, inv.email, inv.role, inv.workspaceId, inv.invitedBy, inv.status, inv.createdAt]);
      }

      // 13. Save shared conversations
      for (const sc of db.shared_conversations || []) {
        await client.query(`
          INSERT INTO shared_conversations (id, "sessionId", title, "sharedBy", "sharedAt", messages)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            messages = EXCLUDED.messages
        `, [sc.id, sc.sessionId, sc.title, sc.sharedBy, sc.sharedAt, JSON.stringify(sc.messages)]);
      }

      // 14. Save sessions
      for (const s of db.sessions || []) {
        await client.query(`
          INSERT INTO sessions (id, "userId", token, "expiresAt", "createdAt")
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            token = EXCLUDED.token,
            "expiresAt" = EXCLUDED."expiresAt"
        `, [s.id, s.userId, s.token, s.expiresAt, s.createdAt]);
      }

      // 15. Save system settings
      const settings = db.systemSettings || {};
      for (const [key, val] of Object.entries(settings)) {
        await client.query(`
          INSERT INTO system_settings (key, val)
          VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val
        `, [key, typeof val === "object" ? JSON.stringify(val) : String(val)]);
      }

    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error background saving to PostgreSQL:", err);
  }
}
