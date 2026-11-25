// Builds the sidebar menu for the admin area (depends on the signed-in role).
const contact = require('../models/contact.model');

module.exports = async (req, res, next) => {
  const role = req.session.user.role;

  let unread = 0;
  try {
    unread = await contact.unreadCount();
  } catch (err) {
    /* the menu still works without the badge */
  }

  const nav = [
    {
      title: 'Overview',
      items: [
        { href: '/admin', label: 'Dashboard', icon: 'layout' },
        { href: '/admin/inbox', label: 'Inbox', icon: 'mail', badge: unread },
      ],
    },
  ];

  if (role !== 'receptionist') {
    nav.push(
      {
        title: 'People',
        items: [
          { href: '/admin/students', label: 'Students', icon: 'graduation' },
          { href: '/admin/teachers', label: 'Teachers', icon: 'briefcase' },
          { href: '/admin/parents', label: 'Parents', icon: 'users' },
          { href: '/admin/users', label: 'User accounts', icon: 'user' },
        ],
      },
      {
        title: 'Academics',
        items: [
          { href: '/admin/classes', label: 'Classes', icon: 'layout' },
          { href: '/admin/subjects', label: 'Subjects', icon: 'book' },
          { href: '/admin/years', label: 'Academic years', icon: 'calendar' },
        ],
      },
      {
        title: 'Website',
        items: [
          { href: '/admin/news', label: 'News', icon: 'globe' },
          { href: '/admin/events', label: 'Events', icon: 'bell' },
        ],
      }
    );
  }

  res.locals.nav = nav;
  next();
};
