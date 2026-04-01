const {DataTypes} = require('sequelize');
const sequelize = require('../config/database.js');

const Assignment = sequelize.define('Assignment', {
    asgn_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'asgn_id'
    },
    student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'student_id'
    },
    test_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'test_id'
    },
    assigned_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'assigned_at'
    },
    deadline: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'assignments',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['student_id', 'test_id']
        }
    ]
});

module.exports = Assignment;