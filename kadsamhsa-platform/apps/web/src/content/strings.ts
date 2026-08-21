/**
 * Public-page copy, ported from theme/kadsamhsa/lang/en/theme_kadsamhsa.php.
 *
 * Mustache called these via {{#str}}key, theme_kadsamhsa{{/str}}; here they are a
 * plain lookup. Keys are unchanged from the PHP file so the two stay diffable.
 * Only the strings the public pages use are included.
 */
export const strings = {
  // Navigation.
  catalogue: 'Course catalogue',
  verifycert: 'Verify certificate',
  dashboard: 'Dashboard',

  // Footer.
  footertagline: 'Building capacity in drug prevention, treatment and care across Nigeria.',
  allrightsreserved: 'All rights reserved.',

  // Landing nav.
  landingnavhome: 'Home',
  landingnavabout: 'About us',
  landingnavcourses: 'Courses',
  landingnavcontact: 'Contact',
  landingnavlogin: 'Login',

  // Landing hero.
  landingherotitle: 'Evidence-Based Drug Prevention, Treatment, and Care Training',
  landingherosubtitle:
    'Self-paced courses, module assessments, and verifiable certificates for health, justice, and community professionals.',
  landinggetstarted: 'Get started',

  // Landing about + stats.
  landingabouttitle: 'Turning a 200-page manual into training programmes that stick.',
  landingaboutbody:
    'KADSAMHSA LMS delivers structured Drug Prevention Training & Certification (DPTC) and related courses — built for low-bandwidth access, clear progression, and certificates organisations can trust.',
  landinglearnmore: 'Learn more',
  landingstat1num: '14,000+',
  landingstat1label: 'Learners supported',
  landingstat2label: 'Courses',
  landingstat3num: '100%',
  landingstat3label: 'Certificate verify',

  // Landing featured courses.
  landingfeaturedtitle: 'Featured courses',
  landingfeaturedsubtitle:
    'Start with DPTC sensitisation or explore specialised pathways for your team.',
  landingenrollnow: 'Enroll now',
  landingcourselessons: 'Self-paced modules',
  landingcourserating: 'Certificate track',
  landingcoursedefaultsummary:
    'Evidence-based learning with assessments and a verifiable certificate on completion.',

  // Landing plans.
  landingplanstitle: 'Select your plan',
  landingplanssubtitle:
    'Learn individually or equip your organisation with seats and progress reporting.',
  landingplan1name: 'Learner',
  landingplan1price: 'Free',
  landingplan1f1: 'Browse the public catalogue',
  landingplan1f2: 'Enrol in free courses',
  landingplan1f3: 'Earn verifiable certificates',
  landingplan2name: 'Professional',
  landingplan2price: 'Per course',
  landingplan2f1: 'Paid course checkout',
  landingplan2f2: 'Full assessments & progress',
  landingplan2f3: 'Certificate download & verify',
  landingchooseplan: 'Choose plan',

  // Landing FAQ + contact.
  landingfaqtitle: 'Common questions about our platform',
  landingfaq1q: 'Who is this platform for?',
  landingfaq1a:
    'Health workers, justice and community professionals, educators, and partner organisations delivering drug prevention, treatment and care in Nigeria.',
  landingfaq2q: 'Are courses free?',
  landingfaq2a:
    'Launch courses such as DPTC are free to enrol. Paid courses and organisation seat packs will appear clearly labelled in the catalogue.',
  landingfaq3q: 'How do certificates work?',
  landingfaq3a:
    'Complete required modules and pass the final assessment to receive a PDF certificate with a unique ID you can verify publicly.',
  landingfaq4q: 'Can my organisation enrol staff in bulk?',
  landingfaq4a:
    'Yes — organisation admins can invite staff, track progress, and export reports. Full bulk tools ship in a later phase; the UI shell is available now.',
  landingcontactblurb:
    'Need a walkthrough for your agency or training cohort? Reach the KADSAMHSA team.',
  landingcontactcta: 'Contact us',
  landingaddresslabel: 'Address',
  landingaddress: 'Kaduna, Nigeria',
  landingemaillabel: 'Email',
  landingphonelabel: 'Phone',
  landingphone: '+234 (0) 000 000 0000',

  // About page.
  aboutpagetitle: 'About us',
  aboutbadge: 'About KADSAMHSA Academy',
  abouttitle: 'Strengthening Capacity for Drug Prevention, Treatment, and Care',
  aboutlead:
    'A digital learning platform empowering communities and law enforcement across Nigeria with evidence-based e-learning in drug prevention, treatment and care.',
  aboutmissionlabel: 'Our mission',
  aboutmission:
    'To build a skilled, confident workforce through accessible, high-quality online training and verifiable certification aligned with national priorities.',
  aboutvisionlabel: 'Our vision',
  aboutvision:
    'A Nigeria where every community has professionals equipped with evidence-based knowledge to prevent drug use and support recovery with dignity.',
  aboutfaqtitle: 'Common questions we’ve been asked',
  aboutfaqpill: 'Frequently asked questions',
  aboutfaq1q: 'Is this course really free?',
  aboutfaq1a:
    'Launch courses such as DPTC sensitisation are free to enrol. Paid courses and organisation seat packs are labelled clearly in the catalogue.',
  aboutfaq2q: 'Do I need any experience to start?',
  aboutfaq2a:
    'No prior experience is required. Courses are built for beginners and working professionals, with self-paced modules you can resume anytime.',
  aboutfaq3q: 'How long does the DPTC course take?',
  aboutfaq3a:
    'Most learners complete modules over several weeks, depending on schedule. Progress is self-paced with clear module milestones.',
  aboutfaq4q: 'Will I get a certificate?',
  aboutfaq4a:
    'Yes. Complete required modules and pass the final assessment to receive a PDF certificate with a public verification ID.',
  aboutfaq5q: 'Can my organization enroll multiple staff?',
  aboutfaq5a:
    'Yes. Organisation admins can invite staff, track progress, and export reports. Full bulk tools continue to expand in later phases.',
  aboutlocation: 'Kaduna State',
  aboutphone: '+234 0803 808 6191',
  aboutfooterproduct: 'Product',

  // Courses page.
  coursespagetitle: 'Courses',
  coursesherotitle: 'Insights that move your learning forward',
  coursesherosubtitle:
    'Explore expert-led courses on drug prevention, treatment, care, and professional skill development.',
  coursesfilterlabel: 'Course type',
  coursesfilterfree: 'Free courses',
  coursesfilterpaid: 'Paid course',
  coursessearch: 'Search courses',
  coursessearchplaceholder: 'Search...',
  coursesenroll: 'Enroll for this course',
  coursesreadmore: 'Read more',
  coursesempty: 'No courses match your filters.',
  coursesbadgefree: 'Free',
  coursesbadgepaid: 'Paid',
  coursesphone: '+234 813 646 1373',

  // Course detail.
  onlinecourse: 'Online course',
  certincluded: 'Certificate included',
  certnotedetail:
    'Complete all modules and pass assessments to earn your verifiable certificate.',
  durationplaceholder: 'Self-paced',
  enrolme: 'Enrol me in this course',

  // Learner dashboard (student home).
  dashnavlabel: 'Student navigation',
  dashnavhome: 'Homepage',
  dashnavcourses: 'Courses',
  dashnavquiz: 'Quiz',
  dashlogout: 'Log out',
  dashsearchlabel: 'Search courses',
  dashsearchplaceholder: 'search course...',
  dashheroeyebrow: 'New here?',
  dashherotitle: 'Start with the DPTC Sensitization Course',
  dashprice: 'Price',
  dashenroll: 'Enroll for this course',
  dashreadmore: 'Read more',
  dashexplore: 'Explore more courses',
  dashcontinuesubtitle: 'Continue your learning journey',
  dashcontinuecta: 'Continue with this course',
  dashcontinueshort: 'Continue',
  dashalsostarted: 'You also started these courses',
  dashmodulelabel: 'Module',
  dashdurationlabel: 'Duration',
  dashemptysearch: 'No courses match your search.',
  dashmodaltitle: 'Select A Course',
  dashmodalstep: '1/3',
  dashmodalbody:
    'Choose a course you want to start with or start with the recommended course.',
  dashmodalcta: 'I understand',
  courseprogress: 'Course progress',

  // Shared.
  skiptomain: 'Skip to main content',
  togglenavigation: 'Toggle navigation',
  signupnavlabel: 'Site navigation',
  signupmediaplaceholder: 'Image',
} as const;

export type StringKey = keyof typeof strings;
