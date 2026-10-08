const UserService = require('../services/userService');

class UserController {
  static renderIndex(req, res) {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '15', 10);
    const offset = (page - 1) * limit;

    const filters = {
      search: req.query.search || '',
      role: req.query.role || '',
      status: req.query.status || '',
      limit,
      offset
    };

    const result = UserService.getUsers(filters);
    const roles = UserService.getRoles();

    res.render('users/index', {
      title: 'User & Access Administration - AcxiomCRM',
      users: result.users,
      total: result.total,
      currentPage: page,
      totalPages: Math.ceil(result.total / limit) || 1,
      filters,
      roles
    });
  }

  static renderCreate(req, res) {
    const roles = UserService.getRoles();
    res.render('users/create', {
      title: 'Create User Account - AcxiomCRM',
      roles,
      errors: [],
      formData: {}
    });
  }

  static async handleCreate(req, res) {
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = await UserService.createUser(req.body, user, ipAddress);

    if (!result.success) {
      const roles = UserService.getRoles();
      return res.render('users/create', {
        title: 'Create User Account - AcxiomCRM',
        roles,
        errors: [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = `User account for ${result.user.name} (${result.user.email}) created successfully.`;
    res.redirect('/users');
  }

  static renderEdit(req, res) {
    const userId = req.params.id;
    const user = UserService.getUserById(userId);

    if (!user) {
      return res.status(404).render('errors/404', {
        title: 'User Not Found',
        message: 'User account not found.'
      });
    }

    const roles = UserService.getRoles();

    res.render('users/edit', {
      title: `Edit User - ${user.Name}`,
      user,
      roles,
      errors: [],
      formData: user
    });
  }

  static handleUpdate(req, res) {
    const userId = req.params.id;
    const currentUser = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = UserService.updateUser(userId, req.body, currentUser, ipAddress);

    if (!result.success) {
      const roles = UserService.getRoles();
      return res.render('users/edit', {
        title: 'Edit User - AcxiomCRM',
        user: { ...req.body, UserId: userId },
        roles,
        errors: result.errors || [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = 'User profile updated successfully.';
    res.redirect('/users');
  }

  static async handleResetPassword(req, res) {
    const userId = req.params.id;
    const { newPassword } = req.body;
    const currentUser = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = await UserService.resetPassword(userId, newPassword, currentUser, ipAddress);

    if (!result.success) {
      req.session.flashError = result.message;
    } else {
      req.session.flashSuccess = result.message;
    }

    res.redirect('/users');
  }

  static handleUnlock(req, res) {
    const userId = req.params.id;
    const currentUser = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = UserService.unlockAccount(userId, currentUser, ipAddress);

    if (!result.success) {
      req.session.flashError = result.message;
    } else {
      req.session.flashSuccess = result.message;
    }

    res.redirect('/users');
  }
}

module.exports = UserController;
