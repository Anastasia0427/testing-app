const Role = require('../models/Role');

const roles = ['student', 'teacher', 'admin'];

const seedRoles = async () => {
    for (const roleName of roles) {
        await Role.findOrCreate({
            where: { role: roleName }
        });
    }
    console.log('Роли инициализированы:', roles.join(', '));
};

module.exports = seedRoles;
