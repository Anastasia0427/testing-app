const {DataTypes} = require('sequelize');
const sequelize = require('../config/database.js');

const Role = sequelize.define('Role', {
    role_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'role_id'
    },
    role: {
        type: DataTypes.STRING(35),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    }
}, {
    tableName: 'roles',
    timestamps: false
});

module.exports = Role;