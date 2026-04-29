const app = require('./app.js');
const { sequelize, syncDatabase } = require('../models');
const seedRoles = require('../seeders/roleSeeder');
const seedQuestionTypes = require('../seeders/questionTypeSeeder');
const seedDemo = require('../seeders/demoSeeder');

const PORT = process.env.PORT || 3000;

// start server
const startServer = async() => {
    try {
        // test database connection
        await sequelize.authenticate();
        console.log('Установлено подключение к базе данных');

        // Sync models with database
        // WARNING: { force: true } will DROP ALL TABLES! Use only in development
        // await syncDatabase({ force: true }); // Пересоздать все таблицы
        await syncDatabase(process.env.DB_ALTER === 'true' ? { alter: true } : {});
        // seeders не должны ронять сервер — только логируем ошибку
        try { await seedRoles(); } catch (e) { console.error('seedRoles failed:', e.message); }
        try { await seedQuestionTypes(); } catch (e) { console.error('seedQuestionTypes failed:', e.message); }
        try { await seedDemo(); } catch (e) { console.error('seedDemo failed:', e.message); }

        // start listening
        app.listen(PORT, '127.0.0.1', () => {
            console.log(`Server is running on http://127.0.0.1:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Health check: http://127.0.0.1:${PORT}/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', async() => {
    console.log('SIGTERM signal received: closing HTTP server');
    await sequelize.close();
    process.exit(0);
});

process.on('SIGINT', async() => {
    console.log('SIGINT signal received: closing HTTP server');
    await sequelize.close();
    process.exit(0);
});

startServer();