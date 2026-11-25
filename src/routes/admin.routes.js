const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const adminNav = require('../middleware/adminNav');
const { uploadImage } = require('../middleware/upload');

const dashboard = require('../controllers/admin.controller');
const users = require('../controllers/admin/users');
const students = require('../controllers/admin/students');
const teachers = require('../controllers/admin/teachers');
const parents = require('../controllers/admin/parents');
const classes = require('../controllers/admin/classes');
const subjects = require('../controllers/admin/subjects');
const years = require('../controllers/admin/years');
const news = require('../controllers/admin/news');
const events = require('../controllers/admin/events');
const inbox = require('../controllers/admin/inbox');

// ---- Everyone in the office: dashboard + enquiries inbox ----
router.use(requireAuth, requireRole('super_admin', 'admin', 'receptionist'), adminNav);

router.get('/', dashboard.dashboard);

router.get('/inbox', inbox.index);
router.post('/inbox/read-all', inbox.markAllRead);
router.post('/inbox/:id/read', inbox.toggleRead);
router.post('/inbox/:id/delete', inbox.remove);

// ---- Everything below: administrators only ----
router.use(requireRole('super_admin', 'admin'));

// User accounts
router.get('/users', users.index);
router.get('/users/new', users.newForm);
router.post('/users', users.create);
router.get('/users/:id/edit', users.editForm);
router.post('/users/:id', users.update);
router.post('/users/:id/reset-password', users.resetPassword);
router.post('/users/:id/status', users.toggleStatus);

// Students
router.get('/students', students.index);
router.get('/students/new', students.newForm);
router.post('/students', students.create);
router.get('/students/:id', students.show);
router.get('/students/:id/edit', students.editForm);
router.post('/students/:id', students.update);
router.post('/students/:id/parents', students.linkParent);
router.post('/students/:id/parents/:parentId/remove', students.unlinkParent);
router.post('/students/:id/login', students.createLogin);
router.post('/students/:id/reset-password', students.resetPassword);
router.post('/students/:id/status', students.toggleLogin);

// Teachers
router.get('/teachers', teachers.index);
router.get('/teachers/new', teachers.newForm);
router.post('/teachers', teachers.create);
router.get('/teachers/:id/edit', teachers.editForm);
router.post('/teachers/:id', teachers.update);
router.post('/teachers/:id/reset-password', teachers.resetPassword);
router.post('/teachers/:id/status', teachers.toggleStatus);

// Parents
router.get('/parents', parents.index);
router.get('/parents/new', parents.newForm);
router.post('/parents', parents.create);
router.get('/parents/:id/edit', parents.editForm);
router.post('/parents/:id', parents.update);
router.post('/parents/:id/reset-password', parents.resetPassword);
router.post('/parents/:id/status', parents.toggleStatus);

// Classes and the subjects taught in them
router.get('/classes', classes.index);
router.get('/classes/new', classes.newForm);
router.post('/classes', classes.create);
router.get('/classes/:id', classes.show);
router.get('/classes/:id/edit', classes.editForm);
router.post('/classes/:id', classes.update);
router.post('/classes/:id/delete', classes.remove);
router.post('/classes/:id/subjects', classes.addSubject);
router.post('/classes/:id/subjects/:csId', classes.setSubjectTeacher);
router.post('/classes/:id/subjects/:csId/remove', classes.removeSubject);

// Subjects
router.get('/subjects', subjects.index);
router.get('/subjects/new', subjects.newForm);
router.post('/subjects', subjects.create);
router.get('/subjects/:id/edit', subjects.editForm);
router.post('/subjects/:id', subjects.update);
router.post('/subjects/:id/delete', subjects.remove);

// Academic years
router.get('/years', years.index);
router.get('/years/new', years.newForm);
router.post('/years', years.create);
router.post('/years/:id/current', years.makeCurrent);

// News (cover image upload: the CSRF token travels in the URL, see middleware/csrf.js)
router.get('/news', news.index);
router.get('/news/new', news.newForm);
router.post('/news', uploadImage('cover'), news.create);
router.get('/news/:id/edit', news.editForm);
router.post('/news/:id', uploadImage('cover'), news.update);
router.post('/news/:id/publish', news.togglePublish);
router.post('/news/:id/delete', news.remove);

// Events
router.get('/events', events.index);
router.get('/events/new', events.newForm);
router.post('/events', events.create);
router.get('/events/:id/edit', events.editForm);
router.post('/events/:id', events.update);
router.post('/events/:id/publish', events.togglePublish);
router.post('/events/:id/delete', events.remove);

module.exports = router;
