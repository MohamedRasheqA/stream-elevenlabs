import { Pool } from 'pg';

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:2TYvAzNlt0Oy@ep-noisy-shape-a5hfgfjr.us-east-2.aws.neon.tech/documents?sslmode=require",
});

// Initialize the table if it doesn't exist
async function initializeTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS "acolyte-103-practice" (
      id SERIAL PRIMARY KEY,
      prompt TEXT NOT NULL,
      heading TEXT DEFAULT '👋 Hi There!',
      description TEXT DEFAULT '',
      page_title TEXT DEFAULT 'Teach Back : Testing agent',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pool.query(createTableQuery);
    // Insert default values if table is empty
    const checkEmpty = await pool.query('SELECT COUNT(*) FROM "acolyte-103-practice"');
    if (checkEmpty.rows[0].count === '0') {
      await pool.query(
        'INSERT INTO "acolyte-103-practice" (prompt, heading, description) VALUES ($1, $2, $3)', 
        ['', '👋 Hi There!', 'Welcome to the chat interface. Please click Begin to start.']
      );
    }
  } catch (error) {
    console.error('Error initializing table:', error);
  }
}

// Initialize table when module loads
initializeTable();

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT prompt, heading, description, page_title FROM "acolyte-103-practice" ORDER BY updated_at DESC LIMIT 1'
    );
    return new Response(JSON.stringify({
      prompt: result.rows[0]?.prompt || '',
      heading: result.rows[0]?.heading || '👋 Hi There!',
      description: result.rows[0]?.description || 'Welcome to the chat interface. Please click Begin to start.',
      pageTitle: result.rows[0]?.page_title || 'Teach Back : Testing agent'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch prompt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: Request) {
  try {
    const { prompt, heading, description, pageTitle } = await request.json();
    
    // Build dynamic update query based on provided fields
    let updateFields = [];
    let values = [];
    let paramCount = 1;
    
    if (prompt !== undefined) {
      updateFields.push(`prompt = $${paramCount}`);
      values.push(prompt);
      paramCount++;
    }
    if (heading !== undefined) {
      updateFields.push(`heading = $${paramCount}`);
      values.push(heading);
      paramCount++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (pageTitle !== undefined) {
      updateFields.push(`page_title = $${paramCount}`);
      values.push(pageTitle);
      paramCount++;
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    const updateQuery = `
      UPDATE "acolyte-103-practice" 
      SET ${updateFields.join(', ')}
      WHERE id = (SELECT id FROM "acolyte-103-practice" ORDER BY updated_at DESC LIMIT 1)
    `;
    
    await pool.query(updateQuery, values);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return new Response(JSON.stringify({ error: 'Failed to update prompt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 