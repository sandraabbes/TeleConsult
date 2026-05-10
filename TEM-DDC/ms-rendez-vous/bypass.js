const { Client } = require('pg');

async function runBypass() {
  const client = new Client({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'rendezvouDb' });
  
  try {
    await client.connect();
    console.log('Bypass started. Checking for new appointments every 2 seconds...');
    
    setInterval(async () => {
      try {
        const result = await client.query("UPDATE rendezvous SET status='confirmed' WHERE status='scheduled' RETURNING id");
        if (result.rowCount > 0) {
          console.log(`Bypass successful: Confirmed appointments with IDs: ${result.rows.map(r => r.id).join(', ')}`);
        }
      } catch (err) {
        console.error('Query error:', err.message);
      }
    }, 2000);
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

runBypass();
