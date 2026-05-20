const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('SqlQuestion', {
    sq_id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    author_id:     { type: DataTypes.INTEGER, allowNull: false },
    schema_name:   { type: DataTypes.STRING(50), allowNull: false },
    title:         { type: DataTypes.STRING(200), allowNull: false },
    question_text: { type: DataTypes.TEXT, allowNull: false },
    reference_sql: { type: DataTypes.TEXT, allowNull: false },
}, {
    tableName: 'sql_question_bank',
    createdAt: 'created_at',
    updatedAt: false,
});
