const {Pool}=require('pg');
require('dotenv').config();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
pool.query("UPDATE users SET role = '관리자' WHERE email = 'admin@gmail.com'")
  .then(res=>console.log('Update success!', res.rowCount))
  .catch(err=>console.error('Pg Error:',err));
