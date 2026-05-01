/**
 * University contact directory data.
 * Source: ASP-Liste für Studierende (15.04.2026)
 *       + Liste der Studiengänge und Studiengangsleiterinnen
 */

export interface CampusContact {
  campusId: string;
  service: string;
  person: string;
  email: string;
}

export interface ProgramDirector {
  school: string;
  campusId: string;
  degree: string;
  program: string;
  cluster: string;
  email: string;
  phone: string;
}

// ── University-wide contacts (not campus-specific) ────────────────────────────
export const generalContacts: CampusContact[] = [
  { campusId: 'general', service: 'Admission', person: 'Melanie Kunz (Teamleitung)', email: 'apply.hsg@srh.de' },
  { campusId: 'general', service: 'Assistant to School Board – AIM', person: 'Linda Metz', email: 'Linda.Metz@srh.de' },
  { campusId: 'general', service: 'Assistant to School Board – BLS', person: 'Julia Neef / Minh Phuong Phung', email: 'Julia.Neef@srh.de' },
  { campusId: 'general', service: 'Assistant to School Board – HES', person: 'Joann Jahr / Michaela Kuhn / Carmen Schlüter / Carolin Thiel', email: 'Joann.Jahr@srh.de' },
  { campusId: 'general', service: 'Assistant to School Board – PSY', person: 'Lilli Kolbe', email: 'Lilli.Kolbe@srh.de' },
  { campusId: 'general', service: 'Assistant to School Board – TEAC', person: 'Himanshu Khadse', email: 'HimanshuDilip.Khadse@srh.de' },
  { campusId: 'general', service: 'E-Campus Support', person: 'Kerstin Nakoinz / Jasmin Adler / Rosalie Wohlauf / Nicole Hofmann / Caroline Liss / Linus Theuringer', email: 'ecampus-support.hsg@srh.de' },
  { campusId: 'general', service: 'Erasmus (Heidelberg)', person: 'Adel Kovacs', email: 'Adel.Kovacs@srh.de' },
  { campusId: 'general', service: 'Erasmus (Gera)', person: 'Prof. Dr. Claudia Wahn', email: 'Claudia.Wahn@srh.de' },
  { campusId: 'general', service: 'Erasmus (Berlin)', person: 'Kirsten Matthes', email: 'outgoingexchange.hsg@srh.de' },
  { campusId: 'general', service: 'International Office', person: 'Kirsten Matthes (Teamlead)', email: 'internationaloffice.hsg@srh.de' },
  { campusId: 'general', service: 'PROMOS', person: 'Iris Ulbrich / María Doris Kolle', email: 'outgoingexchange.hsg@srh.de' },
  { campusId: 'general', service: 'Residence Permit / Visa', person: 'Anooth Prabagaran', email: 'residencepermit.hsg@srh.de' },
  { campusId: 'general', service: 'Rektorat', person: 'Kamilla Prutek', email: 'rektorat.hshd@srh.de' },
  { campusId: 'general', service: 'Scholarships', person: 'Sinje Peulings (Teamlead)', email: 'scholarship.hsg@srh.de' },
  { campusId: 'general', service: 'Student Service', person: 'Julia Brendler (Teamlead) und Team', email: 'student-service.hsg@srh.de' },
  { campusId: 'general', service: 'Career Service & Development', person: 'Sinje Peulings (Teamlead) und Team', email: 'careerservice.hsg@srh.de' },
  { campusId: 'general', service: 'Centre for Languages', person: 'Nathalie Vogelwiesche (Teamlead) und Team', email: 'languages.hsg@srh.de' },
];

// ── Campus-specific service contacts ──────────────────────────────────────────
export const campusContacts: CampusContact[] = [
  // Bamberg
  { campusId: 'bamberg', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'Pruefungsbuero.hsge@srh.de' },
  { campusId: 'bamberg', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hsge@srh.de' },
  { campusId: 'bamberg', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de' },
  // Berlin
  { campusId: 'berlin', service: 'Campus Management', person: 'Marika Graupe-Fröhlich', email: 'Marika.Graupe-Froehlich@srh.de' },
  { campusId: 'berlin', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'berlin.course-coordination.hsg@srh.de' },
  { campusId: 'berlin', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'berlin.examination-office.hsg@srh.de' },
  { campusId: 'berlin', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsbe@srh.de' },
  { campusId: 'berlin', service: 'International Office', person: 'Kirsten Matthes (Teamlead) und Team', email: 'internationaloffice.hsg@srh.de' },
  { campusId: 'berlin', service: 'University IT', person: 'Tom Zacharias Schiller (Teamlead) und Team', email: 'Itdesk.hsbe@srh.de' },
  { campusId: 'berlin', service: 'Library', person: 'Anne Fischer', email: 'library.hsg@srh.de' },
  // Bremen
  { campusId: 'bremen', service: 'Campus Management', person: 'Simon Ehlers', email: 'Simon.Ehlers@srh-hochschulen.de' },
  { campusId: 'bremen', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead) und Team', email: 'bremen.course-coordination.hsg@srh.de' },
  { campusId: 'bremen', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'bremen.examination-office.hsg@srh.de' },
  { campusId: 'bremen', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'Marion.Mueller@srh.de' },
  { campusId: 'bremen', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de' },
  // Dresden
  { campusId: 'dresden', service: 'Campus Management', person: 'Katja Kretzschmar', email: 'Katja.Kretzschmar@srh.de' },
  { campusId: 'dresden', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'dresden.course-coordination.hsg@srh.de' },
  { campusId: 'dresden', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'dresden.examination-office.hsg@srh.de' },
  { campusId: 'dresden', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsbe@srh.de' },
  { campusId: 'dresden', service: 'University IT', person: 'Tom Zacharias Schiller (Teamlead) und Team', email: 'Itdesk.hsbe@srh.de' },
  { campusId: 'dresden', service: 'Library', person: 'Anne Fischer', email: 'library.hsg@srh.de' },
  // Düsseldorf
  { campusId: 'duesseldorf', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'gera.examination-office.hsg@srh.de' },
  { campusId: 'duesseldorf', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hsge@srh.de' },
  { campusId: 'duesseldorf', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de' },
  // Fürth
  { campusId: 'fuerth', service: 'Campus Management', person: 'Rafael Titzler und Peter Jänsch', email: 'Rafael.Titzler@srh.de' },
  { campusId: 'fuerth', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead) und Team', email: 'fuerth.course-coordination.hsg@srh.de' },
  { campusId: 'fuerth', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'fuerth.examination-office.hsg@srh.de' },
  { campusId: 'fuerth', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'invoice.wlh@srh.de' },
  { campusId: 'fuerth', service: 'Library', person: 'Claudia Kunz', email: 'Claudia.Kunz@srh.de' },
  // Gera
  { campusId: 'gera', service: 'Campus Management', person: 'Juliane Neumann', email: 'Juliane.neumann@srh.de' },
  { campusId: 'gera', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'gera.course-coordination.hsg@srh.de' },
  { campusId: 'gera', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'gera.examination-office.hsg@srh.de' },
  { campusId: 'gera', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hsge@srh.de' },
  { campusId: 'gera', service: 'Library', person: 'Rosalie Wohlauf', email: 'Rosalie.Wohlauf@srh.de' },
  { campusId: 'gera', service: 'IT Service', person: 'Uwe Teichmann', email: 'Uwe.Teichmann@srh.de' },
  // Hamburg
  { campusId: 'hamburg', service: 'Campus Management', person: 'Liz Marie Leistikow', email: 'Lizmarie.Leistikow@srh.de' },
  { campusId: 'hamburg', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'hamburg.course-coordination.hsg@srh.de' },
  { campusId: 'hamburg', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'hamburg.examination-office.hsg@srh.de' },
  { campusId: 'hamburg', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsbe@srh.de' },
  { campusId: 'hamburg', service: 'Library', person: 'Britta Weißbrod', email: 'Britta.Weissbrod@srh.de' },
  { campusId: 'hamburg', service: 'University IT', person: 'Tom Zacharias Schiller (Teamlead) und Team', email: 'Itdesk.hsbe@srh.de' },
  // Hamm
  { campusId: 'hamm', service: 'Campus Management', person: 'Carina Stuckemeier', email: 'Carina.Stuckemeier@srh.de' },
  { campusId: 'hamm', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'hamm.course-coordination.hsg@srh.de' },
  { campusId: 'hamm', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'hamm.examination-office.hsg@srh.de' },
  { campusId: 'hamm', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsnrw@srh.de' },
  { campusId: 'hamm', service: 'Library', person: 'Armin Vetter (Teamlead) und Team', email: 'Armin.Vetter@srh.de' },
  // Heide
  { campusId: 'heide', service: 'Campus Management', person: 'Liz Marie Leistikow', email: 'Lizmarie.Leistikow@srh.de' },
  { campusId: 'heide', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'heide.examination-office.hsg@srh.de' },
  { campusId: 'heide', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hsge@srh.de' },
  { campusId: 'heide', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de' },
  // Heidelberg
  { campusId: 'heidelberg', service: 'Campus Management', person: 'Jörg Bethke und Sabine Westermann', email: 'Joerg.Bethke@srh.de' },
  { campusId: 'heidelberg', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'heidelberg.course-coordination.hsg@srh.de' },
  { campusId: 'heidelberg', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'heidelberg.examination-office.hsg@srh.de' },
  { campusId: 'heidelberg', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hshd@srh.de' },
  { campusId: 'heidelberg', service: 'Library', person: 'Armin Vetter / Maike Bremer', email: 'hshdbibliothek@srh.de' },
  // Köln
  { campusId: 'cologne', service: 'Campus Management', person: 'Isabell Rosenblatt', email: 'Isabell.Rosenblatt@srh.de' },
  { campusId: 'cologne', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'koeln.course-coordination.hsg@srh.de' },
  { campusId: 'cologne', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'koeln.examination-office.hsg@srh.de' },
  { campusId: 'cologne', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsnrw@srh.de' },
  { campusId: 'cologne', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de' },
  // Leipzig
  { campusId: 'leipzig', service: 'Campus Management', person: 'Raluca Eugenia Modoiu', email: 'Raluca.Modoiu@srh.de' },
  { campusId: 'leipzig', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead) und Team', email: 'leipzig.course-coordination.hsg@srh.de' },
  { campusId: 'leipzig', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'leipzig.examination-office.hsg@srh.de' },
  { campusId: 'leipzig', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsbe@srh.de' },
  { campusId: 'leipzig', service: 'Library', person: 'Anne Fischer', email: 'library.hsg@srh.de' },
  // München
  { campusId: 'munich', service: 'Campus Management', person: 'Christine Kainrath', email: 'Christine.Kainrath@srh.de' },
  { campusId: 'munich', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'muenchen.examination-office.hsg@srh.de' },
  { campusId: 'munich', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'invoice.wlh@srh.de' },
  { campusId: 'munich', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de' },
  // Stuttgart
  { campusId: 'stuttgart', service: 'Campus Management', person: 'Nicola Westermann', email: 'Nicola.Westermann@srh.de' },
  { campusId: 'stuttgart', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'stuttgart.course-coordination.hsg@srh.de' },
  { campusId: 'stuttgart', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'stuttgart.examination-office.hsg@srh.de' },
  { campusId: 'stuttgart', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hshd@srh.de' },
  { campusId: 'stuttgart', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de' },
  // Tübingen
  { campusId: 'tuebingen', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'gera.examination-office.hsg@srh.de' },
  { campusId: 'tuebingen', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hshd@srh.de' },
  { campusId: 'tuebingen', service: 'Library', person: 'Rosalie Wohlauf', email: 'Rosalie.Wohlauf@srh.de' },
];


// ── Program Directors ────────────────────────────────────────────────────────
export const programDirectors: ProgramDirector[] = [
  {
    school: "hes",
    campusId: "bamberg",
    degree: "Bachelor",
    program: "Pflege (ausbildungsbegleitend)",
    cluster: "Health",
    email: "tamara.gehring-vorbeck@srh.de",
    phone: "+49 172 / 750 3028"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Advertising & Brand Design",
    cluster: "Media",
    email: "markus.wente@srh.de",
    phone: "+49 30 51 56 50 906"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Audiodesign (DE) | Audio Design (EN)",
    cluster: "Arts",
    email: "tilman.ehrhorn@srh.de",
    phone: "+49 30 51 56 50 708"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Classical Music",
    cluster: "Arts",
    email: "robert.lingnau@srh.de",
    phone: "49 (0)177 927 0000"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Creative Industries Management",
    cluster: "Media",
    email: "brigitte.biehl@srh.de",
    phone: "+49 30 51 56 50 908"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Film und Fernsehen",
    cluster: "Arts",
    email: "rolf.teigler@srh.de",
    phone: "| lars.roth@srh.de -720"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Film & Motion Design",
    cluster: "Media",
    email: "gilbert.beronneau@srh.de",
    phone: "+49 30 51 56 50 700"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Fotografie (DE) | Photography (EN)",
    cluster: "Arts",
    email: "sebastian.denz@srh.de",
    phone: "+49 30 51 56 50 701"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Illustration (DE) | Illustration (EN)",
    cluster: "Arts",
    email: "nele.anders@srh.de",
    phone: "+49 30 51 56 50 725"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Kommunikationsdesign (Vollzeit & Dual)",
    cluster: "Media",
    email: "christopher.jung@srh.de",
    phone: "| gilbert.beronneau@sr -702"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Kreatives Schreiben und Texten",
    cluster: "Arts",
    email: "karl-wolfgang.flender@srh.de",
    phone: "+49 30 51 56 50 719"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "",
    cluster: "Media",
    email: "agnes.schipanski@srh.de",
    phone: "+49 30 51 56 50 914"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Musikproduktion (DE) | Music Production (EN)",
    cluster: "Arts",
    email: "robert.kessler@srh.de",
    phone: "+49 30 51 56 50 713"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Popularmusik (DE) | Popular Music (EN)",
    cluster: "Arts",
    email: "robert.kessler@srh.de",
    phone: "+49 30 51 56 50 713"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "User Experience Design and Content Creation",
    cluster: "Media",
    email: "gabor.kovacs@srh.de",
    phone: "+49 30 51 56 50 800"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Virtual Reality & Game Development",
    cluster: "Information",
    email: "anke.schuster@srh.de",
    phone: ""
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Web Development (Vollzeit & Dual)",
    cluster: "Media",
    email: "gabor.kovacs@srh.de",
    phone: "| (David Linner) -800"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Bachelor",
    program: "World Music",
    cluster: "Arts",
    email: "robert.lingnau@srh.de",
    phone: "49 (0)177 927 0000"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Master",
    program: "Classical Music",
    cluster: "Arts",
    email: "robert.lingnau@srh.de",
    phone: "49 (0)177 927 0000"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Master",
    program: "Film, Television and Digital Narratives",
    cluster: "Media",
    email: "gilbert.beronneau@srh.de",
    phone: "+49 30 51 56 50 700"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Master",
    program: "Marketing Management Dual",
    cluster: "Media",
    email: "benjamin.schwenn@srh.de",
    phone: "+49 30 51 56 50 905"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Master",
    program: "",
    cluster: "Media",
    email: "marcusS.kleiner@srh.de",
    phone: "+49 30 51 56 50 729"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Master",
    program: "Photography",
    cluster: "Arts",
    email: "sebastian.denz@srh.de",
    phone: "+49 30 51 56 50 701"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Master",
    program: "Social Design & Sustainable Innovation",
    cluster: "Media",
    email: "gilbert.beronneau@srh.de",
    phone: "+49 30 51 56 50 700"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Master",
    program: "Strategic Design",
    cluster: "Media",
    email: "katrin.androschin@srh.de",
    phone: "| julia.leihener@srh.de -703"
  },
  {
    school: "aim",
    campusId: "berlin",
    degree: "Master",
    program: "World Music",
    cluster: "Arts",
    email: "robert.lingnau@srh.de",
    phone: "49 (0)177 927 0000"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "AI in Business",
    cluster: "Business & Law",
    email: "torsten.beckern@srh-hochschulen.de",
    phone: "+49 30 51 56 50 947"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "franziska.schoelmerich@srh.de",
    phone: "+49 30 51 56 50 953"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "Executive MBA General Management",
    cluster: "International Business",
    email: "mile.vasic@srh.de",
    phone: "+49 30 51 56 50 953"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "General Management (MBA)",
    cluster: "International Business",
    email: "mile.vasic@srh.de",
    phone: "+49 30 51 56 50 953"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "Healthcare Management (MBA)",
    cluster: "International Business",
    email: "franz.hessel@srh.de",
    phone: "+49 30 51 56 50 953"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Bachelor",
    program: "",
    cluster: "International Business",
    email: "hannes.antonschmidt@srh.de",
    phone: "+49 351 / 40 76 17 - 43"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "International Management",
    cluster: "International Business",
    email: "bert.eichhorn@srh.de",
    phone: "+49 30 51 56 50 921"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "bert.eichhorn@srh.de",
    phone: "| brigitte.biehl@srh.de -921"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "Intrapreneurship | Entrepreneurship (Schwerpunkt",
    cluster: "International Business",
    email: "bert.eichhorn@srh.de",
    phone: "+49 30 51 56 50 921"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Bachelor",
    program: "(International Experience Track & Fast Track) - alle",
    cluster: "International Business",
    email: "dimitrios.zikos@srh.de",
    phone: "tbd"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Bachelor",
    program: "",
    cluster: "Tourism/Event and Hospitality",
    email: "alex.baumgaertner@srh.de",
    phone: "+49 30 51 56 50 916"
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Law, Economics and Governance",
    cluster: "Business & Law",
    email: "alexander.wulf@srh.de",
    phone: ""
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "Master of Laws - Law & Technology",
    cluster: "Business & Law",
    email: "alexander.wulf@srh.de",
    phone: ""
  },
  {
    school: "bls",
    campusId: "berlin",
    degree: "Master",
    program: "Supply Chain Management",
    cluster: "Supply Chain Management",
    email: "torsten.beckern@srh-hochschulen.de",
    phone: "+49 30 51 56 50 947"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Applied Mechatronic Systems",
    cluster: "Engineering & Architecture",
    email: "klaus-ulrich.neumann@srh.de",
    phone: "+49 30 51 56 50 654"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Bachelor",
    program: "",
    cluster: "Computer Science",
    email: "joel.dokmegang@srh.de",
    phone: "?"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Bachelor",
    program: "Management (International Experience Track & Fast",
    cluster: "Computer Science",
    email: "joel.dokmegang@srh-hochschulen.de",
    phone: "?"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Master",
    program: "",
    cluster: "Computer Science",
    email: "alexander.iliev@srh.de",
    phone: "+49 30 51 56 50 809"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Master",
    program: "",
    cluster: "Computer Science",
    email: "reiner.creutzburg@srh.de",
    phone: "+49 30 51 56 50 807"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Master",
    program: "",
    cluster: "Sustainable Technologies",
    email: "osvaldo.romero@srh.de",
    phone: "+49 30 51 56 50 817"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Master",
    program: "Management – Industry 4.0: Automation, Robotics &",
    cluster: "Sustainable Technologies",
    email: "adele.nasti@srh.de",
    phone: "+49 30 51 56 50 100"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Master",
    program: "",
    cluster: "Sustainable Technologies",
    email: "frank.wolter@srh.de",
    phone: "+49 30 51 56 50 828"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Master",
    program: "",
    cluster: "Sustainable Technologies",
    email: "stephan.szuppa@srh.de",
    phone: "+49 30 51 56 50 819"
  },
  {
    school: "teac",
    campusId: "berlin",
    degree: "Master",
    program: "Sustainable Battery Production Engineering - Dual",
    cluster: "Sustainable Technologies",
    email: "Minoo.Tasbihi@srh.de",
    phone: "+49 30 51 56 50 850"
  },
  {
    school: "hes",
    campusId: "bonn",
    degree: "Bachelor",
    program: "Logopädie (ausbildungsintegrierend)",
    cluster: "Therapy",
    email: "irene.ablinger@srh.de",
    phone: "+49 22 / 8969 6286"
  },
  {
    school: "bls",
    campusId: "bremen",
    degree: "Bachelor",
    program: "",
    cluster: "Business & Law",
    email: "thomas.zink@srh.de",
    phone: "+49 421 / 9499 1023"
  },
  {
    school: "bls",
    campusId: "bremen",
    degree: "Bachelor",
    program: "",
    cluster: "Business & Law",
    email: "thomas.zink@srh.de",
    phone: "+49 421 / 9499 1023"
  },
  {
    school: "bls",
    campusId: "dresden",
    degree: "Bachelor",
    program: "Global Hospitality Management (EN)",
    cluster: "Tourism/Event and Hospitality",
    email: "hartwig.bohne@srh.de",
    phone: "+49 30 51 56 50 45"
  },
  {
    school: "bls",
    campusId: "dresden",
    degree: "Master",
    program: "",
    cluster: "Tourism/Event and Hospitality",
    email: "farzaneh.soleimanizoghi@srh.de",
    phone: "+49 30 51 56 50 53"
  },
  {
    school: "bls",
    campusId: "dresden",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "farzaneh.soleimanizoghi@srh.de",
    phone: "+49 30 51 56 50 53"
  },
  {
    school: "bls",
    campusId: "dresden",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "farzaneh.soleimanizoghi@srh.de",
    phone: "+49 30 51 56 50 53"
  },
  {
    school: "bls",
    campusId: "dresden",
    degree: "Bachelor",
    program: "Internationales Hotelmanagement",
    cluster: "Tourism/Event and Hospitality",
    email: "matthias.straub@srh.de",
    phone: "+49 30 51 56 50 46"
  },
  {
    school: "bls",
    campusId: "dresden",
    degree: "Bachelor",
    program: "Internationales Hotelmanagement – Dual",
    cluster: "Tourism/Event and Hospitality",
    email: "hartwig.bohne@srh.de",
    phone: "+49 30 51 56 50 45"
  },
  {
    school: "bls",
    campusId: "dresden",
    degree: "Bachelor",
    program: "Internationales Tourismus- und Eventmanagement",
    cluster: "Tourism/Event and Hospitality",
    email: "susanne.gellweiler@srh.de",
    phone: "+49 30 51 56 50 20"
  },
  {
    school: "bls",
    campusId: "dresden",
    degree: "Bachelor",
    program: "",
    cluster: "Tourism/Event and Hospitality",
    email: "matthias.straub@srh.de",
    phone: "+49 30 51 56 50 46"
  },
  {
    school: "hes",
    campusId: "dresden",
    degree: "Bachelor",
    program: "Soziale Arbeit (Vollzeit & Dual)",
    cluster: "Social Sciences",
    email: "Brit.Reimann-Bernhardt@srh.de",
    phone: "+49 30 51 56 50 62"
  },
  {
    school: "psy",
    campusId: "dresden",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "andreas.david@srh.de",
    phone: "+4935140761720"
  },
  {
    school: "psy",
    campusId: "dresden",
    degree: "Bachelor",
    program: "Wirtschaftspsychologie",
    cluster: "Psychology",
    email: "andreas.david@srh.de",
    phone: "+4935140761720"
  },
  {
    school: "hes",
    campusId: "duesseldorf",
    degree: "Bachelor",
    program: "Logopädie (ausbildungsintegrierend)",
    cluster: "Therapy",
    email: "irene.ablinger@srh.de",
    phone: "+49 22 / 8969 6286"
  },
  {
    school: "aim",
    campusId: "fuerth",
    degree: "Master",
    program: "Applied Data Science and Artificial Intelligence",
    cluster: "Information",
    email: "clemens.werkmeister@srh.de",
    phone: ""
  },
  {
    school: "hes",
    campusId: "fuerth",
    degree: "Bachelor",
    program: "Berufspädagogik für Gesundheit (berufsbegleitend)",
    cluster: "Education",
    email: "yvonne.sedelmaier@srh.de",
    phone: ""
  },
  {
    school: "hes",
    campusId: "fuerth",
    degree: "Bachelor",
    program: "Heilpädagogik (berufsbegleitend)",
    cluster: "Education",
    email: "marion.wuechner-fuchs@srh.de",
    phone: "+49 30 51 56 50 15"
  },
  {
    school: "hes",
    campusId: "fuerth",
    degree: "Bachelor",
    program: "Pflege",
    cluster: "Health",
    email: "christine.fiedler@srh.de",
    phone: "+49 30 51 56 50 25"
  },
  {
    school: "hes",
    campusId: "fuerth",
    degree: "Bachelor",
    program: "Soziale Arbeit (Vollzeit & Dual)",
    cluster: "Social Sciences",
    email: "simon.kolbe@srh.de",
    phone: "+49 30 51 56 50 24"
  },
  {
    school: "hes",
    campusId: "fuerth",
    degree: "Master",
    program: "Digital Health and Data Analytics",
    cluster: "Health",
    email: "stefanie.scholz@srh.de",
    phone: "+49 30 51 56 50 52"
  },
  {
    school: "psy",
    campusId: "fuerth",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "martin.koellner@srh.de",
    phone: "+49 911 766069 -57"
  },
  {
    school: "psy",
    campusId: "fuerth",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "martin.koellner@srh.de",
    phone: "+49 911 766069 -57"
  },
  {
    school: "psy",
    campusId: "fuerth",
    degree: "Master",
    program: "Psychologie",
    cluster: "Psychology",
    email: "maren.weiss@srh.de",
    phone: "+49 911 766069 -37"
  },
  {
    school: "psy",
    campusId: "fuerth",
    degree: "Master",
    program: "Psychologie",
    cluster: "Psychology",
    email: "maren.weiss@srh.de",
    phone: "+49 911 766069 -37"
  },
  {
    school: "psy",
    campusId: "fuerth",
    degree: "Master",
    program: "Sexualwissenschaft",
    cluster: "Psychology",
    email: "philipp.stang@srh.de",
    phone: "+49 911 766069-47"
  },
  {
    school: "hes",
    campusId: "gera",
    degree: "Bachelor",
    program: "Medizinpädagogik",
    cluster: "Education",
    email: "maximilian.schochow@srh.de",
    phone: "| robert.leschows -13"
  },
  {
    school: "hes",
    campusId: "gera",
    degree: "Bachelor",
    program: "Pflege (ausbildungsbegleitend)",
    cluster: "Health",
    email: "tamara.gehring-vorbeck@srh.de",
    phone: "+49 172 / 750 3028"
  },
  {
    school: "hes",
    campusId: "gera",
    degree: "Bachelor",
    program: "Soziale Arbeit (praxisintegrierend)",
    cluster: "Social Sciences",
    email: "maren.zschach@srh.de",
    phone: "0365 7734070"
  },
  {
    school: "hes",
    campusId: "gera",
    degree: "Master",
    program: "",
    cluster: "Health",
    email: "tamara.gehring-vorbeck@srh.de",
    phone: "+49 172 / 750 3028"
  },
  {
    school: "hes",
    campusId: "gera",
    degree: "Master",
    program: "",
    cluster: "Education",
    email: "maximilian.schochow@srh.de",
    phone: "| robert.leschows -13"
  },
  {
    school: "hes",
    campusId: "gera",
    degree: "Master",
    program: "Neurorehabilitation (berufsbegleitend)",
    cluster: "Therapy",
    email: "claudia.barthel@srh.de",
    phone: ""
  },
  {
    school: "hes",
    campusId: "gera",
    degree: "Master",
    program: "Systemische Beratung und Management",
    cluster: "Social Sciences",
    email: "Kerstin.Mayhack@srh.de",
    phone: "+49 30 51 56 50 26"
  },
  {
    school: "psy",
    campusId: "gera",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "thomas.fankhaenel@srh.de",
    phone: "+49 365 773407-41"
  },
  {
    school: "psy",
    campusId: "gera",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "thomas.fankhaenel@srh.de",
    phone: "+49 365 773407-41"
  },
  {
    school: "psy",
    campusId: "gera",
    degree: "Master",
    program: "Psychologie",
    cluster: "Psychology",
    email: "susanne.hardecker@srh.de",
    phone: "+49 365 773407-23"
  },
  {
    school: "aim",
    campusId: "hamburg",
    degree: "Master",
    program: "Applied Data Science and Artificial Intelligence",
    cluster: "Information",
    email: "gayan.deSilva@srh.de",
    phone: "+49 30 51 56 50 430"
  },
  {
    school: "bls",
    campusId: "hamburg",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "christian.kapteyn@srh.de",
    phone: "+49 30 51 56 50 418"
  },
  {
    school: "bls",
    campusId: "hamburg",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "christian.kapteyn@srh.de",
    phone: "+49 30 51 56 50 418"
  },
  {
    school: "bls",
    campusId: "hamburg",
    degree: "Bachelor",
    program: "International Business",
    cluster: "International Business",
    email: "michael.schellenberg@srh.de",
    phone: ""
  },
  {
    school: "bls",
    campusId: "hamburg",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "farzaneh.soleimanizoghi@srh.de",
    phone: "+49 351 / 40 76 17 - 53"
  },
  {
    school: "bls",
    campusId: "hamburg",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "farzaneh.soleimanizoghi@srh.de",
    phone: "+49 351 / 40 76 17 - 53"
  },
  {
    school: "bls",
    campusId: "hamburg",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "farzaneh.soleimanizoghi@srh.de",
    phone: "+49 351 / 40 76 17 - 53"
  },
  {
    school: "bls",
    campusId: "hamburg",
    degree: "Master",
    program: "Supply Chain Management",
    cluster: "Supply Chain Management",
    email: "nnamdi.oguji@srh.de",
    phone: "+49 30 51 56 50 419"
  },
  {
    school: "teac",
    campusId: "hamburg",
    degree: "Master",
    program: "Architecture",
    cluster: "Engineering & Architecture",
    email: "urs.wedekind@srh.de",
    phone: "?"
  },
  {
    school: "bls",
    campusId: "hamm",
    degree: "Master",
    program: "Supply Chain Management (M.Sc.)",
    cluster: "Supply Chain Management",
    email: "lars.rickmann@srh.de",
    phone: "+49 30 51 56 50 167"
  },
  {
    school: "bls",
    campusId: "hamm",
    degree: "Master",
    program: "",
    cluster: "International Business",
    email: "arno.Lammerts@srh.de",
    phone: "+49 30 51 56 50 164"
  },
  {
    school: "hes",
    campusId: "hamm",
    degree: "Bachelor",
    program: "Soziale Arbeit (Vollzeit & berufsbegleitend)",
    cluster: "Social Sciences",
    email: "Petra.Richter2@srh.de",
    phone: "+49 30 51 56 50 510"
  },
  {
    school: "hes",
    campusId: "hamm",
    degree: "Bachelor",
    program: "Soziale Arbeit (Dual)",
    cluster: "Social Sciences",
    email: "tobias.falke@srh.de",
    phone: "+49 30 51 56 50 504"
  },
  {
    school: "hes",
    campusId: "hamm",
    degree: "Master",
    program: "New Work - Beraten, Coachen, Supervidieren",
    cluster: "Social Sciences",
    email: "Petra.Richter2@srh.de",
    phone: "+49 30 51 56 50 510"
  },
  {
    school: "psy",
    campusId: "hamm",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "sabrina.krauss@srh.de",
    phone: "+49 2381 9291 509"
  },
  {
    school: "psy",
    campusId: "hamm",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "sabrina.krauss@srh.de",
    phone: "+49 2381 9291 509"
  },
  {
    school: "hes",
    campusId: "heide",
    degree: "Bachelor",
    program: "Physician Assistant (mit Vorausbildung)",
    cluster: "Health",
    email: "henrik.herrmann@srh.de",
    phone: "tbd"
  },
  {
    school: "hes",
    campusId: "heide",
    degree: "Master",
    program: "Physician Assistant - Ambulante Versorgung",
    cluster: "Health",
    email: "henrik.herrmann@srh.de",
    phone: "tbd"
  },
  {
    school: "hes",
    campusId: "heide",
    degree: "Master",
    program: "Physician Assistant - Intensivmedizin",
    cluster: "Health",
    email: "felix.neuenfeldt@srh.de",
    phone: ""
  },
  {
    school: "hes",
    campusId: "heide",
    degree: "Master",
    program: "Physician Assistant - Kardiologie und Kardiochirurgie",
    cluster: "Health",
    email: "peter.rupp@srh.de",
    phone: ""
  },
  {
    school: "hes",
    campusId: "heide",
    degree: "Master",
    program: "Physician Assistant - Klinische Notfallmedizin",
    cluster: "Health",
    email: "thomas.fleischmann@srh.de",
    phone: "+49 365 / 773 4070"
  },
  {
    school: "aim",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Medien- und Kommunikationsmanagement",
    cluster: "Media",
    email: "christian.blum@srh.de",
    phone: "+49 30 51 56 50 220"
  },
  {
    school: "aim",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Virtual Reality & Game Development",
    cluster: "Information",
    email: "anke.schuster@srh.de",
    phone: "+49 30 51 56 50 211"
  },
  {
    school: "aim",
    campusId: "heidelberg",
    degree: "Master",
    program: "Applied Data Science and Artificial Intelligence",
    cluster: "Information",
    email: "swati.chandna@srh.de",
    phone: "+49 30 51 56 50 223"
  },
  {
    school: "aim",
    campusId: "heidelberg",
    degree: "Master",
    program: "Strategic Communication & Leadership",
    cluster: "Media",
    email: "jutta.milde@srh.de",
    phone: "+49 30 51 56 50 221"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Master",
    program: "Betreuungsrecht",
    cluster: "Business & Law",
    email: "Tobias.Noll@srh.de",
    phone: "+49 30 51 56 50 415"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Betriebswirtschatftslehre",
    cluster: "Business & Law",
    email: "Ziad.Bakhaya@srh.de",
    phone: "+49 30 51 56 50 143"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Master",
    program: "Business Law & Compliance",
    cluster: "Business & Law",
    email: "christoph.schaertl@srh.de",
    phone: "+49 30 51 56 50 440"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Master",
    program: "Global Business and Leadership",
    cluster: "International Business",
    email: "jochen.schwind@srh.de",
    phone: "(Kommisarisch) -120"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Master",
    program: "International Business & Leadership",
    cluster: "International Business",
    email: "jochen.schwind@srh.de",
    phone: "(Kommisarisch) -120"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "International Business Administration",
    cluster: "International Business",
    email: "stefanie.schubert@srh.de",
    phone: "+49 30 51 56 50 127"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Master",
    program: "Internationales Management & Entrepreneurship",
    cluster: "Business & Law",
    email: "andreas.klein@srh.de",
    phone: "+49 6221 6799-146"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Internationales Tourismus- und Eventmanagement",
    cluster: "Tourism/Event and Hospitality",
    email: "Bernhard.Bauer@srh.de",
    phone: "+49 30 51 56 50 918"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Master",
    program: "Management und Leadership",
    cluster: "Business & Law",
    email: "friedrich.preiss@srh.de",
    phone: "145"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Recht im Notariat",
    cluster: "Business & Law",
    email: "christoph.schaertl@srh.de",
    phone: "+49 30 51 56 50 440"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Master",
    program: "Wertschöpfungsmanagement",
    cluster: "Business & Law",
    email: "andreas.klein@srh.de",
    phone: "+49 6221 6799-146"
  },
  {
    school: "bls",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Wirtschaftsrecht",
    cluster: "Business & Law",
    email: "carolin.sutter@srh.de",
    phone: "+49 30 51 56 50 412"
  },
  {
    school: "hes",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Ergotherapie",
    cluster: "Therapy",
    email: "eliane.vonGunten@srh.de",
    phone: "(kommisarisch) -650"
  },
  {
    school: "hes",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Logopädie (ausbildungsintegrierend)",
    cluster: "Therapy",
    email: "Julia.Koenig@srh.de",
    phone: ""
  },
  {
    school: "hes",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Musiktherapie",
    cluster: "Therapy",
    email: "alexander.wormit@srh.de",
    phone: "+49 30 51 56 50 615"
  },
  {
    school: "hes",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Physiotherapie",
    cluster: "Therapy",
    email: "annika.jahn@srh.de",
    phone: "+49 30 51 56 50 626"
  },
  {
    school: "hes",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Soziale Arbeit (Vollzeit & Dual)",
    cluster: "Social Sciences",
    email: "sabine.zimmermann@srh.de",
    phone: "+49 30 51 56 50 420"
  },
  {
    school: "hes",
    campusId: "heidelberg",
    degree: "Master",
    program: "Musiktherapie (DE) | Music Therapy (EN)",
    cluster: "Therapy",
    email: "christine.gross2@srh.de",
    phone: "tbd"
  },
  {
    school: "hes",
    campusId: "heidelberg",
    degree: "Master",
    program: "",
    cluster: "Social Sciences",
    email: "friederike.beier@srh-hochschulen.de",
    phone: "+49 30 51 56 50 410"
  },
  {
    school: "hes",
    campusId: "heidelberg",
    degree: "Master",
    program: "",
    cluster: "Therapy",
    email: "fabian.chyle-silvestri@srh.de",
    phone: "+49 30 51 56 50 621"
  },
  {
    school: "psy",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "willi.neuthinger@srh.de",
    phone: "+49 6221 / 6799 515"
  },
  {
    school: "psy",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "willi.neuthinger@srh.de",
    phone: "+49 6221 / 6799 515"
  },
  {
    school: "psy",
    campusId: "heidelberg",
    degree: "Master",
    program: "Psychologie",
    cluster: "Psychology",
    email: "andres.steffanowski@srh.de",
    phone: "+49 6221-6799 513"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Master",
    program: "Applied Computer Science",
    cluster: "Computer Science",
    email: "gerd.moeckel@srh.de",
    phone: "+49 30 51 56 50 204"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Applied Mechatronic Systems",
    cluster: "Engineering & Architecture",
    email: "martin.kreschel@srh.de",
    phone: "956"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Architektur",
    cluster: "Engineering & Architecture",
    email: "marc.kirschbaum@srh.de",
    phone: "+49 30 51 56 50 304"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Climate Change Management and Engineering",
    cluster: "Sustainable Technologies",
    email: "thomas.sterr@srh.de",
    phone: "+49 30 51 56 50 343"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Computer Science",
    cluster: "Computer Science",
    email: "peter.dillinger@srh.de",
    phone: "+49 30 51 56 50 213"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Electrical Engineering",
    cluster: "Engineering & Architecture",
    email: "enis.yazici@srh.de",
    phone: "+49 30 51 56 50 345"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Master",
    program: "Engineering and Sustainble Technology Management",
    cluster: "Sustainable Technologies",
    email: "andreas.gerber@srh.de",
    phone: "+49 30 51 56 50 311"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Immobilien und Facility Management",
    cluster: "Engineering & Architecture",
    email: "christian.meysenburg@srh.de",
    phone: "+49 30 51 56 50 324"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Maschinenbau/Mechanical Engineering",
    cluster: "Engineering & Architecture",
    email: "eckart.theophile@srh.de",
    phone: "+49 30 51 56 50 317"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Bachelor",
    program: "Wirtschaftsingenieurwesen/Industrial Engineering",
    cluster: "Engineering & Architecture",
    email: "eckart.theophile@srh.de",
    phone: "+49 30 51 56 50 317"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Master",
    program: "Architecture",
    cluster: "Engineering & Architecture",
    email: "marc.kirschbaum@srh.de",
    phone: "+49 30 51 56 50 304"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Master",
    program: "International Business and Engineering",
    cluster: "Sustainable Technologies",
    email: "enrique.rumiche@srh.de",
    phone: "tbd"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Master",
    program: "Information Technology",
    cluster: "Computer Science",
    email: "achim.gottscheber@srh.de",
    phone: "+49 30 51 56 50 315"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Master",
    program: "Projektmanagement Bau",
    cluster: "Engineering & Architecture",
    email: "vladimir.jovanovic@srh.de",
    phone: "tbd"
  },
  {
    school: "teac",
    campusId: "heidelberg",
    degree: "Master",
    program: "Water Technology",
    cluster: "Sustainable Technologies",
    email: "ulrike.gayh@srh.de",
    phone: "+49 30 51 56 50 320"
  },
  {
    school: "hes",
    campusId: "karlsruhe",
    degree: "Bachelor",
    program: "Logopädie (ausbildungsintegrierend)",
    cluster: "Therapy",
    email: "claudia.wahn@srh.de",
    phone: "+49 6221 / 882 873"
  },
  {
    school: "hes",
    campusId: "karlsruhe",
    degree: "Bachelor",
    program: "Physiotherapie (ausbildungsintegrierend)",
    cluster: "Therapy",
    email: "tobias.erhardt@srh.de",
    phone: "+49 721 / 3545 328"
  },
  {
    school: "bls",
    campusId: "cologne",
    degree: "Bachelor",
    program: "International Business Administration",
    cluster: "International Business",
    email: "andreas.ledwon@srh.de",
    phone: "+49 214 / 3301 3945"
  },
  {
    school: "bls",
    campusId: "cologne",
    degree: "Master",
    program: "Supply Chain Management (M.Sc.)",
    cluster: "Supply Chain Management",
    email: "lars.rickmann@srh.de",
    phone: "+49 2381 / 9291 167"
  },
  {
    school: "hes",
    campusId: "cologne",
    degree: "Bachelor",
    program: "Dental Hygienist",
    cluster: "Health",
    email: "philipp.plugmann@srh.de",
    phone: "tbd"
  },
  {
    school: "hes",
    campusId: "cologne",
    degree: "Bachelor",
    program: "Ernährungstherapie und Ernährungsberatung",
    cluster: "Health",
    email: "marcus.grimm@srh.de",
    phone: "+49 365 / 773 4070"
  },
  {
    school: "hes",
    campusId: "cologne",
    degree: "Bachelor",
    program: "Medizinpädagogik",
    cluster: "Education",
    email: "sabine.hubbertz-josat@srh.de",
    phone: "tbd"
  },
  {
    school: "hes",
    campusId: "cologne",
    degree: "Bachelor",
    program: "Physician Assistant (mit Vorausbildung)",
    cluster: "Health",
    email: "henrik.herrmann@srh.de",
    phone: "tbd"
  },
  {
    school: "hes",
    campusId: "cologne",
    degree: "Bachelor",
    program: "Soziale Arbeit (Vollzeit; berufsbegleitend & Dual)",
    cluster: "Social Sciences",
    email: "Petra.Richter2@srh.de",
    phone: "+49 2381 / 9291 510"
  },
  {
    school: "hes",
    campusId: "cologne",
    degree: "Master",
    program: "",
    cluster: "Education",
    email: "sabine.hubbertz-josat@srh.de",
    phone: "tbd"
  },
  {
    school: "hes",
    campusId: "cologne",
    degree: "Master",
    program: "",
    cluster: "Health",
    email: "marcus.grimm@srh.de",
    phone: "+49 365 / 773 4070"
  },
  {
    school: "hes",
    campusId: "cologne",
    degree: "Master",
    program: "New Work - Beraten, Coachen, Supervidieren",
    cluster: "Social Sciences",
    email: "Petra.Richter2@srh.de",
    phone: "+49 2381 / 9291 510"
  },
  {
    school: "bls",
    campusId: "leipzig",
    degree: "Bachelor",
    program: "International Business Administration",
    cluster: "International Business",
    email: "eva.koscher@srh.de",
    phone: "+49 351 / 4076 1743"
  },
  {
    school: "hes",
    campusId: "leipzig",
    degree: "Bachelor",
    program: "Ernährungstherapie und Ernährungsberatung",
    cluster: "Health",
    email: "sara.ramminger@srh.de",
    phone: "+49 365 / 773 40717"
  },
  {
    school: "hes",
    campusId: "leipzig",
    degree: "Bachelor",
    program: "Physician Assistant",
    cluster: "Health",
    email: "peter.rupp@srh.de",
    phone: "+49 365 / 773 4070"
  },
  {
    school: "hes",
    campusId: "leipzig",
    degree: "Master",
    program: "",
    cluster: "Health",
    email: "sara.ramminger@srh.de",
    phone: "+49 365 / 773 40717"
  },
  {
    school: "teac",
    campusId: "leipzig",
    degree: "Bachelor",
    program: "Computer Science",
    cluster: "Computer Science",
    email: "fakhteh.ghanbarnejad@srh.de",
    phone: "tbd"
  },
  {
    school: "teac",
    campusId: "leipzig",
    degree: "Master",
    program: "Computer Science",
    cluster: "Computer Science",
    email: "Klaus.schwarz@srh.de",
    phone: "tbd"
  },
  {
    school: "hes",
    campusId: "leverkusen",
    degree: "Bachelor",
    program: "Physiotherapie (ausbildungsintegrierend)",
    cluster: "Therapy",
    email: "tobias.erhardt@srh.de",
    phone: "+49 721 / 3545 328"
  },
  {
    school: "aim",
    campusId: "munich",
    degree: "Bachelor",
    program: "Applied Data Science and Artificial Intelligence",
    cluster: "Information",
    email: "clemens.werkmeister@srh.de",
    phone: "+49 911 766069-23"
  },
  {
    school: "bls",
    campusId: "munich",
    degree: "Bachelor",
    program: "International Business Administration",
    cluster: "International Business",
    email: "frauke.kempner@srh.de",
    phone: "145"
  },
  {
    school: "bls",
    campusId: "munich",
    degree: "Master",
    program: "International Business and Leadership",
    cluster: "International Business",
    email: "frauke.kempner@srh.de",
    phone: "145"
  },
  {
    school: "bls",
    campusId: "munich",
    degree: "Bachelor",
    program: "Internationales Tourismus- und Eventmanagement",
    cluster: "Tourism/Event and Hospitality",
    email: "Carolin.Steinhauser@srh.de",
    phone: "+49 30 51 56 50 918"
  },
  {
    school: "teac",
    campusId: "munich",
    degree: "Master",
    program: "Applied Computer Science",
    cluster: "Computer Science",
    email: "gerd.moeckel@srh.de",
    phone: "+49 30 51 56 50 204"
  },
  {
    school: "teac",
    campusId: "munich",
    degree: "Bachelor",
    program: "Computer Science",
    cluster: "Computer Science",
    email: "peter.dillinger@srh.de",
    phone: "+49 30 51 56 50 213"
  },
  {
    school: "hes",
    campusId: "stuttgart",
    degree: "Bachelor",
    program: "Logopädie (ausbildungsintegrierend)",
    cluster: "Therapy",
    email: "Elisabeth.Meffert@srh.de",
    phone: ""
  },
  {
    school: "hes",
    campusId: "stuttgart",
    degree: "Bachelor",
    program: "Medizinpädagogik",
    cluster: "Education",
    email: "eva.kircher@srh.de",
    phone: "tbd"
  },
  {
    school: "hes",
    campusId: "stuttgart",
    degree: "Bachelor",
    program: "Physiotherapie (ausbildungsintegrierend)",
    cluster: "Therapy",
    email: "tobias.erhardt@srh.de",
    phone: "+49 721 / 3545 328"
  },
  {
    school: "hes",
    campusId: "stuttgart",
    degree: "Master",
    program: "",
    cluster: "Social Sciences",
    email: "martin.albert@srh.de",
    phone: ""
  },
  {
    school: "psy",
    campusId: "stuttgart",
    degree: "Bachelor",
    program: "Psychologie",
    cluster: "Psychology",
    email: "willi.neuthinger@srh-hochschulen.de",
    phone: "+49 6221 / 6799 516"
  },
  {
    school: "teac",
    campusId: "stuttgart",
    degree: "Master",
    program: "Applied Computer Science",
    cluster: "Computer Science",
    email: "gerd.moeckel@srh.de",
    phone: "+49 30 51 56 50 204"
  },
  {
    school: "hes",
    campusId: "tuebingen",
    degree: "Bachelor",
    program: "Physiotherapie (ausbildungsbegleitend",
    cluster: "Therapy",
    email: "tobias.erhardt@srh.de",
    phone: "+49 721 / 3545 328"
  }
];
