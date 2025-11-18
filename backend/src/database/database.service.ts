import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database Service
 * Manages SQLite database connection and provides query methods
 */
export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Default to data/wedding-helper.db in project root
    // Can be overridden with DATABASE_PATH environment variable
    this.dbPath = dbPath ||
                  process.env.DATABASE_PATH ||
                  path.join(process.cwd(), 'data', 'wedding-helper.db');
  }

  /**
   * Initialize database connection and schema
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info('Created data directory', { path: dataDir });
      }

      // Open database connection
      this.db = new Database(this.dbPath);
      logger.info('Database connection established', { path: this.dbPath });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Run migrations
      await this.runMigrations();

      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed', { error });
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Read schema file
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      // Execute schema (creates tables if not exist)
      this.db.exec(schema);

      logger.info('Database migrations completed');

      // Create default admin user if not exists
      await this.createDefaultAdmin();

      // Migrate orphaned sessions to admin
      await this.migrateOrphanedSessions();
    } catch (error) {
      logger.error('Migration failed', { error });
      throw error;
    }
  }

  /**
   * Create default admin user with bcrypt hashed password
   * Uses environment variables for configuration:
   * - DEFAULT_ADMIN_USERNAME: Admin username (optional, skips creation if not set)
   * - DEFAULT_ADMIN_PASSWORD: Admin password (optional, generates random if not set)
   */
  private async createDefaultAdmin(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const adminUsername = process.env.DEFAULT_ADMIN_USERNAME;
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

      if (!adminUsername) {
        logger.info('DEFAULT_ADMIN_USERNAME not set, skipping admin creation');
        return;
      }

      // Check if admin already exists
      const stmt = this.db.prepare('SELECT id FROM users WHERE username = ?');
      const admin = stmt.get(adminUsername);

      if (!admin) {
        // Import required modules
        const bcrypt = await import('bcrypt');
        const crypto = await import('crypto');

        // Generate random password if not provided
        const password = adminPassword || crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert default admin
        const insertStmt = this.db.prepare(`
          INSERT INTO users (username, password_hash, role)
          VALUES (?, ?, ?)
        `);
        insertStmt.run(adminUsername, passwordHash, 'admin');

        if (!adminPassword) {
          logger.warn('⚠️  DEFAULT ADMIN CREDENTIALS ⚠️', {
            username: adminUsername,
            password: password,
            message: 'SAVE THESE CREDENTIALS! Password was auto-generated.',
          });
          console.warn('\n' + '='.repeat(80));
          console.warn('⚠️  AUTO-GENERATED ADMIN CREDENTIALS - SAVE IMMEDIATELY! ⚠️');
          console.warn('='.repeat(80));
          console.warn(`Username: ${adminUsername}`);
          console.warn(`Password: ${password}`);
          console.warn('='.repeat(80) + '\n');
        } else {
          logger.info('Default admin user created', { username: adminUsername });
          logger.warn('SECURITY: Please change the default admin password immediately!');
        }
      } else {
        logger.debug('Admin user already exists, skipping creation', { username: adminUsername });
      }
    } catch (error) {
      logger.error('Failed to create default admin', { error });
      // Don't throw - allow app to continue even if admin creation fails
    }
  }

  /**
   * Migrate orphaned sessions to admin
   * Handles sessions that don't have a valid user_id by reassigning them to admin
   */
  private async migrateOrphanedSessions(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      logger.info('Checking for orphaned sessions');

      // Find all sessions where user_id doesn't exist in users table
      const orphanedSessionsStmt = this.db.prepare(`
        SELECT s.*
        FROM sessions s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE u.id IS NULL
      `);
      const orphanedSessions = orphanedSessionsStmt.all();

      if (orphanedSessions.length === 0) {
        logger.debug('No orphaned sessions found');
        return;
      }

      logger.warn('Found orphaned sessions', { count: orphanedSessions.length });

      // Find first admin user
      const adminStmt = this.db.prepare(`
        SELECT id, username, role
        FROM users
        WHERE role = 'admin'
        ORDER BY id ASC
        LIMIT 1
      `);
      const admin: any = adminStmt.get();

      if (!admin) {
        logger.error('Cannot migrate orphaned sessions: No admin user found', {
          orphanedCount: orphanedSessions.length,
        });
        return;
      }

      logger.info('Migrating orphaned sessions to admin', {
        adminId: admin.id,
        adminUsername: admin.username,
        sessionCount: orphanedSessions.length,
      });

      // Migrate each orphaned session to admin
      const updateSessionStmt = this.db.prepare('UPDATE sessions SET user_id = ? WHERE id = ?');
      const updateMessagesStmt = this.db.prepare('UPDATE messages SET user_id = ? WHERE session_id = ?');

      let migratedCount = 0;

      for (const session of orphanedSessions) {
        const sessionData = session as any;
        try {
          updateSessionStmt.run(admin.id, sessionData.id);
          updateMessagesStmt.run(admin.id, sessionData.id);
          migratedCount++;

          logger.debug('Migrated orphaned session', {
            sessionId: sessionData.id,
            oldUserId: sessionData.user_id,
            newUserId: admin.id,
          });
        } catch (error) {
          logger.error('Failed to migrate orphaned session', {
            sessionId: sessionData.id,
            error,
          });
        }
      }

      if (migratedCount > 0) {
        logger.warn(`Migrated ${migratedCount} orphaned session(s) to admin`, {
          adminUsername: admin.username,
        });
        console.warn('\n' + '='.repeat(80));
        console.warn('⚠️  ORPHANED SESSIONS MIGRATED ⚠️');
        console.warn('='.repeat(80));
        console.warn(`Migrated ${migratedCount} orphaned session(s) to admin: ${admin.username}`);
        console.warn('These sessions were not associated with any existing user.');
        console.warn('='.repeat(80) + '\n');
      }
    } catch (error) {
      logger.error('Failed to migrate orphaned sessions', { error });
      // Don't throw - allow app to continue
    }
  }

  /**
   * Get database instance
   */
  public getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Execute a query and return all results
   */
  public query<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      const results = stmt.all(...params) as T[];
      return results;
    } catch (error) {
      logger.error('Query failed', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute a query and return the first result
   */
  public queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.get(...params) as T | undefined;
      return result;
    } catch (error) {
      logger.error('Query failed', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute an insert/update/delete query
   */
  public execute(sql: string, params: any[] = []): Database.RunResult {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);
      return result;
    } catch (error) {
      logger.error('Execute failed', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute multiple statements in a transaction
   */
  public transaction<T>(callback: () => T): T {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const fn = this.db.transaction(callback);
    return fn();
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  /**
   * Check if database is initialized
   */
  public isInitialized(): boolean {
    return this.db !== null;
  }
}

// Export singleton instance
export const db = new DatabaseService();

// Initialize on module load
db.initialize().catch((error) => {
  logger.error('Failed to initialize database on startup', { error });
  process.exit(1);
});
