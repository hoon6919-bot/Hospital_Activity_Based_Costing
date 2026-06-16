const {Pool}=require('pg');
require('dotenv').config();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
pool.query("INSERT INTO users (email, password_hash, hospital_name, role, join_date, status, contact_name, phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", ['admin', 'hash', '병원', '관리자', '2026-06-14', '정상', '이름', '010'])
  .then(res=>console.log('Success'))
  .catch(err=>console.error('Pg Error:',err));
