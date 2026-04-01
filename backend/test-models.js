const { 
    User, 
    Role, 
    Test,
    sequelize 
  } = require('./models');
  
  async function testModels() {
    try {
      await sequelize.authenticate();
      console.log('✅ Connected to database');
      
      // Проверить роли
      const roles = await Role.findAll();
      console.log('📋 Roles:', roles.map(r => r.role));
      
      // Попробовать создать тестового пользователя
      const studentRole = await Role.findOne({ where: { role: 'student' } });
      
      const testUser = await User.create({
        email: 'test@example.com',
        password: 'password123', // будет автоматически захэширован
        role_id: studentRole.role_id
      });
      
      console.log('✅ Test user created:', testUser.email);
      
      // Проверить что пароль захэширован
      console.log('🔒 Password is hashed:', testUser.password !== 'password123');
      
      // Удалить тестового пользователя
      await testUser.destroy();
      console.log('✅ Test user deleted');
      
      await sequelize.close();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  testModels();