const userService = require('../services/userService');

const getStudents = async (_req, res) => {
    const students = await userService.getStudents();
    res.json(students);
};

const updateProfile = async (req, res) => {
    const user = await userService.updateProfile(req.user.user_id, req.body.name);
    res.json(user);
};

module.exports = { getStudents, updateProfile };
