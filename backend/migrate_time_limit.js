const { sequelize } = require('./models');

sequelize.query('ALTER TABLE tests ALTER COLUMN time_limit TYPE INTEGER USING NULL')
    .then(() => {
        console.log('Готово: time_limit теперь INTEGER');
        process.exit(0);
    })
    .catch(e => {
        console.error('Ошибка:', e.message);
        process.exit(1);
    });
