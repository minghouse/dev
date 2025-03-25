import mysql from 'mysql2/promise';

//資料庫連線資訊
const mysqlConfig = {
    host: process.env.MYSQL_AINEWS_HOST,
    user: process.env.MYSQL_AINEWS_ACC,
    password: process.env.MYSQL_AINEWS_PWD,
    database: 'ai_news',
    // compress: true  // 启用压缩
    waitForConnections: true, // 等待連線
    connectionLimit: 100, // 最大連線數
    queueLimit: 20, // 最大佇列長度
};

const pool = mysql.createPool(mysqlConfig);

// 在每次取得連線時執行初始化 SQL
// pool.on('acquire', (connection) => {
//     connection.query(`SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`)
//         .catch(err => console.error('Failed to set sql_mode:', err));
// });

export default pool