import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, text, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

const emails = pgTable("emails", {
  id: varchar("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  threadId: text("thread_id"),
  subject: text("subject").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  snippet: text("snippet"),
  body: text("body"),
  date: timestamp("date").notNull(),
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  category: text("category").notNull(),
  isUrgent: boolean("is_urgent").default(false),
  labels: text("labels").array(),
  attachmentCount: integer("attachment_count").default(0),
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});
const db = drizzle(pool);

async function testDuplicate() {
  try {
    const email1 = {
      id: 'test-email-1',
      messageId: 'DUP_TEST_MSG_001',
      threadId: 'DUP_TEST_THREAD',
      subject: 'First Subject',
      from: 'test@example.com',
      to: 'me@example.com',
      snippet: 'First snippet',
      body: 'First body',
      date: new Date(),
      isRead: false,
      isStarred: false,
      category: 'important',
      isUrgent: false,
      labels: ['INBOX'],
      attachmentCount: 0
    };

    console.log('Inserting first email...');
    const result1 = await db.insert(emails)
      .values(email1)
      .onConflictDoUpdate({
        target: emails.messageId,
        set: {
          subject: email1.subject,
          isRead: email1.isRead,
        }
      })
      .returning();
    console.log('First insert result:', result1[0].id, result1[0].subject);

    const email2 = {
      id: 'test-email-2',  // Different ID!
      messageId: 'DUP_TEST_MSG_001',  // SAME message_id - should trigger conflict
      threadId: 'DUP_TEST_THREAD',
      subject: 'UPDATED Subject',
      from: 'test@example.com',
      to: 'me@example.com',
      snippet: 'Updated snippet',
      body: 'Updated body',
      date: new Date(),
      isRead: true,  // Changed
      isStarred: true,
      category: 'urgent',
      isUrgent: true,
      labels: ['INBOX', 'STARRED'],
      attachmentCount: 1
    };

    console.log('Inserting duplicate (should update)...');
    const result2 = await db.insert(emails)
      .values(email2)
      .onConflictDoUpdate({
        target: emails.messageId,
        set: {
          subject: email2.subject,
          isRead: email2.isRead,
        }
      })
      .returning();
    console.log('Second insert result:', result2[0].id, result2[0].subject, 'isRead:', result2[0].isRead);
    
    if (result1[0].id === result2[0].id && result2[0].subject === 'UPDATED Subject') {
      console.log('✅ SUCCESS: Upsert is working! Original ID preserved, data updated.');
    } else {
      console.log('❌ FAILED: Upsert not working as expected');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

testDuplicate();
