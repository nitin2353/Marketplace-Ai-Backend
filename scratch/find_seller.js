const pool = require('../config/database');
async function check() {
    const res = await pool.query('SELECT id, email, name FROM public.users WHERE email = $1', ['nitin.v@ibirdsservices.com']);
    console.table(res.rows);
    process.exit();
}
check();
