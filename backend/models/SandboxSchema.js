const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('SandboxSchema', {
    schema_id:    { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    owner_id:     { type: DataTypes.INTEGER, allowNull: false },
    schema_key:   { type: DataTypes.STRING(100), allowNull: false, unique: true },
    display_name: { type: DataTypes.STRING(100), allowNull: false },
    ddl:          { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'sandbox_schemas',
    createdAt: 'created_at',
    updatedAt: false,
});
