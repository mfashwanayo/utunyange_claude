// ---------------------------------------------------------------
// Site content for the public homepage.
// All of this is SAMPLE content - replace with your real details.
// Later this data will come from the database (admin panel).
// ---------------------------------------------------------------

const school = {
  name: 'Utunyange',
  fullName: 'Utunyange School',
  tagline: "Nurturing Minds, Building Tomorrow's Leaders",
  motto: 'Excellence • Integrity • Service',
  phone: '+250 788 000 000',
  email: 'info@utunyange.rw',
  address: 'Your street address, City, Rwanda',
  hours: 'Mon – Fri: 7:30 AM – 5:00 PM',
  admissionYear: 2027,
  social: {
    facebook: '#',
    instagram: '#',
    twitter: '#',
    youtube: '#',
  },
};

const stats = [
  { value: 1200, suffix: '+', label: 'Students enrolled' },
  { value: 65, suffix: '', label: 'Qualified teachers' },
  { value: 20, suffix: '', label: 'Years of excellence' },
  { value: 98, suffix: '%', label: 'Exam pass rate' },
];

const programs = [
  {
    icon: 'heart',
    level: 'Nursery',
    ages: 'Ages 3 – 5',
    text: 'A warm, play-based start where little learners build confidence, language and a love for school.',
  },
  {
    icon: 'book',
    level: 'Primary School',
    ages: 'Grades P1 – P6',
    text: 'Strong foundations in literacy, numeracy and science, with art, music and sport every week.',
  },
  {
    icon: 'flask',
    level: 'Lower Secondary',
    ages: 'Grades S1 – S3',
    text: 'A broad curriculum with practical labs, ICT and leadership clubs that spark curiosity.',
  },
  {
    icon: 'graduation',
    level: 'Upper Secondary',
    ages: 'Grades S4 – S6',
    text: 'Focused subject combinations and career guidance that prepare students for university and life.',
  },
];

const features = [
  { icon: 'users', title: 'Dedicated Teachers', text: 'Experienced, caring educators who know every student by name.' },
  { icon: 'monitor', title: 'Digital Learning', text: 'Online portals for results, attendance, homework and fee statements.' },
  { icon: 'shield', title: 'Safe Environment', text: 'Secure campus, strong discipline and a culture of respect.' },
  { icon: 'flask', title: 'Modern Facilities', text: 'Science labs, a library, computer rooms and sports grounds.' },
  { icon: 'trophy', title: 'Proven Results', text: 'Consistently high national exam performance year after year.' },
  { icon: 'globe', title: 'Multilingual', text: 'Learning in Kinyarwanda, English and French to open global doors.' },
];

const portals = [
  { icon: 'graduation', title: 'Students', text: 'Timetable, results, assignments and learning materials.', href: '/auth/login?role=student' },
  { icon: 'users', title: 'Parents', text: 'Follow attendance, grades, fees and message teachers.', href: '/auth/login?role=parent' },
  { icon: 'layout', title: 'Teachers', text: 'Mark attendance, enter grades and share resources.', href: '/auth/login?role=teacher' },
  { icon: 'briefcase', title: 'Staff & Admin', text: 'Manage students, finance, reports and school settings.', href: '/auth/login?role=admin' },
];

const news = [
  {
    category: 'Achievement',
    date: '18 Nov 2026',
    title: 'Utunyange students shine at the national science fair',
    text: 'Our Senior 3 team won top honours for an innovative water-purification project.',
    icon: 'award',
  },
  {
    category: 'Admissions',
    date: '10 Nov 2026',
    title: 'Applications now open for the 2027 academic year',
    text: 'Limited places available in all levels. Apply online and book an entrance assessment.',
    icon: 'calendar',
  },
  {
    category: 'Campus',
    date: '2 Nov 2026',
    title: 'New computer lab opens to support digital learning',
    text: 'Forty new workstations give every class regular hands-on ICT lessons.',
    icon: 'monitor',
  },
];

const events = [
  { day: '03', month: 'Dec', title: 'End-of-Term Examinations Begin', time: '8:00 AM', place: 'All classrooms' },
  { day: '12', month: 'Dec', title: 'Annual Prize-Giving & Graduation', time: '10:00 AM', place: 'Main hall' },
  { day: '15', month: 'Jan', title: 'First Term 2027 Begins', time: '7:30 AM', place: 'Whole school' },
  { day: '24', month: 'Jan', title: "Parents' Orientation Day", time: '9:00 AM', place: 'Main hall' },
];

const gallery = [
  { icon: 'graduation', caption: 'Graduation day', variant: 1 },
  { icon: 'flask', caption: 'Science lab', variant: 2 },
  { icon: 'trophy', caption: 'Sports day', variant: 3 },
  { icon: 'music', caption: 'Music & arts', variant: 2 },
  { icon: 'book', caption: 'Library time', variant: 1 },
  { icon: 'users', caption: 'Student clubs', variant: 3 },
];

const testimonials = [
  {
    quote: 'My daughter has grown in confidence and results since joining. The parent portal makes it easy to stay involved.',
    name: 'Parent of a Senior 2 student',
    role: 'Sample testimonial',
  },
  {
    quote: 'Teachers here push you to do your best and also care about who you become. I am proud to be a Utunyange student.',
    name: 'Senior 5 student',
    role: 'Sample testimonial',
  },
  {
    quote: 'A well-organised school with a supportive staff team. Teaching here feels like being part of a family.',
    name: 'Member of teaching staff',
    role: 'Sample testimonial',
  },
];

const admissionSteps = [
  { n: 1, title: 'Apply online', text: 'Fill in the application form and upload the required documents.' },
  { n: 2, title: 'Assessment', text: 'Your child sits a short, friendly entrance assessment.' },
  { n: 3, title: 'Interview', text: 'Meet our admissions team and tour the campus.' },
  { n: 4, title: 'Enrol', text: 'Receive your offer, pay the fees and join the Utunyange family.' },
];

module.exports = {
  school,
  stats,
  programs,
  features,
  portals,
  news,
  events,
  gallery,
  testimonials,
  admissionSteps,
};
