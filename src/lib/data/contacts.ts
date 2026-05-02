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
  tags?: string[];
}

export interface ProgramDirector {
  school: string;
  campusId: string;
  degree: string;
  program: string;
  cluster: string;
  person: string;
  email: string;
  phone: string;
  tags?: string[];
}

// ── University-wide contacts (not campus-specific) ────────────────────────────
export const generalContacts: CampusContact[] = [
  { campusId: 'general', service: 'Admission', person: 'Melanie Kunz (Teamleitung)', email: 'apply.hsg@srh.de', tags: ['Admissions'] },
  { campusId: 'general', service: 'Assistant to School Board – AIM', person: 'Linda Metz', email: 'Linda.Metz@srh.de', tags: ['Board Assistant', 'school:AIM'] },
  { campusId: 'general', service: 'Assistant to School Board – BLS', person: 'Julia Neef / Minh Phuong Phung', email: 'Julia.Neef@srh.de', tags: ['Board Assistant', 'school:BLS'] },
  { campusId: 'general', service: 'Assistant to School Board – HES', person: 'Joann Jahr / Michaela Kuhn / Carmen Schlüter / Carolin Thiel', email: 'Joann.Jahr@srh.de', tags: ['Board Assistant', 'school:HES'] },
  { campusId: 'general', service: 'Assistant to School Board – PSY', person: 'Lilli Kolbe', email: 'Lilli.Kolbe@srh.de', tags: ['Board Assistant', 'school:PSY'] },
  { campusId: 'general', service: 'Assistant to School Board – TEAC', person: 'Himanshu Khadse', email: 'HimanshuDilip.Khadse@srh.de', tags: ['Board Assistant', 'school:TEAC'] },
  { campusId: 'general', service: 'E-Campus Support', person: 'Kerstin Nakoinz / Jasmin Adler / Rosalie Wohlauf / Nicole Hofmann / Caroline Liss / Linus Theuringer', email: 'ecampus-support.hsg@srh.de', tags: ['E-Campus', 'IT Support'] },
  { campusId: 'general', service: 'Erasmus (Heidelberg)', person: 'Adel Kovacs', email: 'Adel.Kovacs@srh.de', tags: ['Erasmus', 'International'] },
  { campusId: 'general', service: 'Erasmus (Gera)', person: 'Prof. Dr. Claudia Wahn', email: 'Claudia.Wahn@srh.de', tags: ['Erasmus', 'International'] },
  { campusId: 'general', service: 'Erasmus (Berlin)', person: 'Kirsten Matthes', email: 'outgoingexchange.hsg@srh.de', tags: ['Erasmus', 'International'] },
  { campusId: 'general', service: 'International Office', person: 'Kirsten Matthes (Teamlead)', email: 'internationaloffice.hsg@srh.de', tags: [] },
  { campusId: 'general', service: 'PROMOS', person: 'Iris Ulbrich / María Doris Kolle', email: 'outgoingexchange.hsg@srh.de', tags: ['International', 'Promos'] },
  { campusId: 'general', service: 'Residence Permit / Visa', person: 'Anooth Prabagaran', email: 'residencepermit.hsg@srh.de', tags: ['Visa & Residence'] },
  { campusId: 'general', service: 'Rektorat', person: 'Kamilla Prutek', email: 'rektorat.hshd@srh.de', tags: [] },
  { campusId: 'general', service: 'Scholarships', person: 'Sinje Peulings (Teamlead)', email: 'scholarship.hsg@srh.de', tags: [] },
  { campusId: 'general', service: 'Student Service', person: 'Julia Brendler (Teamlead) und Team', email: 'student-service.hsg@srh.de', tags: [] },
  { campusId: 'general', service: 'Career Service & Development', person: 'Sinje Peulings (Teamlead) und Team', email: 'careerservice.hsg@srh.de', tags: ['Career Service'] },
  { campusId: 'general', service: 'Centre for Languages', person: 'Nathalie Vogelwiesche (Teamlead) und Team', email: 'languages.hsg@srh.de', tags: ['Languages'] },
];

// ── Campus-specific service contacts ──────────────────────────────────────────
export const campusContacts: CampusContact[] = [
  // Bamberg
  { campusId: 'bamberg', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'Pruefungsbuero.hsge@srh.de', tags: ['campus:Bamberg'] },
  { campusId: 'bamberg', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hsge@srh.de', tags: ['campus:Bamberg'] },
  { campusId: 'bamberg', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de', tags: ['campus:Bamberg'] },
  // Berlin
  { campusId: 'berlin', service: 'Campus Management', person: 'Marika Graupe-Fröhlich', email: 'Marika.Graupe-Froehlich@srh.de', tags: ['campus:Berlin'] },
  { campusId: 'berlin', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'berlin.course-coordination.hsg@srh.de', tags: ['campus:Berlin'] },
  { campusId: 'berlin', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'berlin.examination-office.hsg@srh.de', tags: ['campus:Berlin'] },
  { campusId: 'berlin', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsbe@srh.de', tags: ['campus:Berlin'] },
  { campusId: 'berlin', service: 'International Office', person: 'Kirsten Matthes (Teamlead) und Team', email: 'internationaloffice.hsg@srh.de', tags: ['campus:Berlin'] },
  { campusId: 'berlin', service: 'University IT', person: 'Tom Zacharias Schiller (Teamlead) und Team', email: 'Itdesk.hsbe@srh.de', tags: ['IT Support', 'campus:Berlin'] },
  { campusId: 'berlin', service: 'Library', person: 'Anne Fischer', email: 'library.hsg@srh.de', tags: ['campus:Berlin'] },
  // Bremen
  { campusId: 'bremen', service: 'Campus Management', person: 'Simon Ehlers', email: 'Simon.Ehlers@srh-hochschulen.de', tags: ['campus:Bremen'] },
  { campusId: 'bremen', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead) und Team', email: 'bremen.course-coordination.hsg@srh.de', tags: ['campus:Bremen'] },
  { campusId: 'bremen', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'bremen.examination-office.hsg@srh.de', tags: ['campus:Bremen'] },
  { campusId: 'bremen', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'Marion.Mueller@srh.de', tags: ['campus:Bremen'] },
  { campusId: 'bremen', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de', tags: ['campus:Bremen'] },
  // Dresden
  { campusId: 'dresden', service: 'Campus Management', person: 'Katja Kretzschmar', email: 'Katja.Kretzschmar@srh.de', tags: ['campus:Dresden'] },
  { campusId: 'dresden', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'dresden.course-coordination.hsg@srh.de', tags: ['campus:Dresden'] },
  { campusId: 'dresden', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'dresden.examination-office.hsg@srh.de', tags: ['campus:Dresden'] },
  { campusId: 'dresden', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsbe@srh.de', tags: ['campus:Dresden'] },
  { campusId: 'dresden', service: 'University IT', person: 'Tom Zacharias Schiller (Teamlead) und Team', email: 'Itdesk.hsbe@srh.de', tags: ['IT Support', 'campus:Dresden'] },
  { campusId: 'dresden', service: 'Library', person: 'Anne Fischer', email: 'library.hsg@srh.de', tags: ['campus:Dresden'] },
  // Düsseldorf
  { campusId: 'duesseldorf', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'gera.examination-office.hsg@srh.de', tags: ['campus:Düsseldorf'] },
  { campusId: 'duesseldorf', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hsge@srh.de', tags: ['campus:Düsseldorf'] },
  { campusId: 'duesseldorf', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de', tags: ['campus:Düsseldorf'] },
  // Fürth
  { campusId: 'fuerth', service: 'Campus Management', person: 'Rafael Titzler und Peter Jänsch', email: 'Rafael.Titzler@srh.de', tags: ['campus:Fürth'] },
  { campusId: 'fuerth', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead) und Team', email: 'fuerth.course-coordination.hsg@srh.de', tags: ['campus:Fürth'] },
  { campusId: 'fuerth', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'fuerth.examination-office.hsg@srh.de', tags: ['campus:Fürth'] },
  { campusId: 'fuerth', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'invoice.wlh@srh.de', tags: ['campus:Fürth'] },
  { campusId: 'fuerth', service: 'Library', person: 'Claudia Kunz', email: 'Claudia.Kunz@srh.de', tags: ['campus:Fürth'] },
  // Gera
  { campusId: 'gera', service: 'Campus Management', person: 'Juliane Neumann', email: 'Juliane.neumann@srh.de', tags: ['campus:Gera'] },
  { campusId: 'gera', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'gera.course-coordination.hsg@srh.de', tags: ['campus:Gera'] },
  { campusId: 'gera', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'gera.examination-office.hsg@srh.de', tags: ['campus:Gera'] },
  { campusId: 'gera', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hsge@srh.de', tags: ['campus:Gera'] },
  { campusId: 'gera', service: 'Library', person: 'Rosalie Wohlauf', email: 'Rosalie.Wohlauf@srh.de', tags: ['campus:Gera'] },
  { campusId: 'gera', service: 'IT Service', person: 'Uwe Teichmann', email: 'Uwe.Teichmann@srh.de', tags: ['IT Support', 'campus:Gera'] },
  // Hamburg
  { campusId: 'hamburg', service: 'Campus Management', person: 'Liz Marie Leistikow', email: 'Lizmarie.Leistikow@srh.de', tags: ['campus:Hamburg'] },
  { campusId: 'hamburg', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'hamburg.course-coordination.hsg@srh.de', tags: ['campus:Hamburg'] },
  { campusId: 'hamburg', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'hamburg.examination-office.hsg@srh.de', tags: ['campus:Hamburg'] },
  { campusId: 'hamburg', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsbe@srh.de', tags: ['campus:Hamburg'] },
  { campusId: 'hamburg', service: 'Library', person: 'Britta Weißbrod', email: 'Britta.Weissbrod@srh.de', tags: ['campus:Hamburg'] },
  { campusId: 'hamburg', service: 'University IT', person: 'Tom Zacharias Schiller (Teamlead) und Team', email: 'Itdesk.hsbe@srh.de', tags: ['IT Support', 'campus:Hamburg'] },
  // Hamm
  { campusId: 'hamm', service: 'Campus Management', person: 'Carina Stuckemeier', email: 'Carina.Stuckemeier@srh.de', tags: ['campus:Hamm'] },
  { campusId: 'hamm', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'hamm.course-coordination.hsg@srh.de', tags: ['campus:Hamm'] },
  { campusId: 'hamm', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'hamm.examination-office.hsg@srh.de', tags: ['campus:Hamm'] },
  { campusId: 'hamm', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsnrw@srh.de', tags: ['campus:Hamm'] },
  { campusId: 'hamm', service: 'Library', person: 'Armin Vetter (Teamlead) und Team', email: 'Armin.Vetter@srh.de', tags: ['campus:Hamm'] },
  // Heide
  { campusId: 'heide', service: 'Campus Management', person: 'Liz Marie Leistikow', email: 'Lizmarie.Leistikow@srh.de', tags: ['campus:Heide'] },
  { campusId: 'heide', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'heide.examination-office.hsg@srh.de', tags: ['campus:Heide'] },
  { campusId: 'heide', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hsge@srh.de', tags: ['campus:Heide'] },
  { campusId: 'heide', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de', tags: ['campus:Heide'] },
  // Heidelberg
  { campusId: 'heidelberg', service: 'Campus Management', person: 'Jörg Bethke und Sabine Westermann', email: 'Joerg.Bethke@srh.de', tags: ['campus:Heidelberg'] },
  { campusId: 'heidelberg', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'heidelberg.course-coordination.hsg@srh.de', tags: ['campus:Heidelberg'] },
  { campusId: 'heidelberg', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'heidelberg.examination-office.hsg@srh.de', tags: ['campus:Heidelberg'] },
  { campusId: 'heidelberg', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hshd@srh.de', tags: ['campus:Heidelberg'] },
  { campusId: 'heidelberg', service: 'Library', person: 'Armin Vetter / Maike Bremer', email: 'hshdbibliothek@srh.de', tags: ['campus:Heidelberg'] },
  // Köln
  { campusId: 'cologne', service: 'Campus Management', person: 'Isabell Rosenblatt', email: 'Isabell.Rosenblatt@srh.de', tags: ['campus:Köln'] },
  { campusId: 'cologne', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'koeln.course-coordination.hsg@srh.de', tags: ['campus:Köln'] },
  { campusId: 'cologne', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'koeln.examination-office.hsg@srh.de', tags: ['campus:Köln'] },
  { campusId: 'cologne', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsnrw@srh.de', tags: ['campus:Köln'] },
  { campusId: 'cologne', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de', tags: ['campus:Köln'] },
  // Leipzig
  { campusId: 'leipzig', service: 'Campus Management', person: 'Raluca Eugenia Modoiu', email: 'Raluca.Modoiu@srh.de', tags: ['campus:Leipzig'] },
  { campusId: 'leipzig', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead) und Team', email: 'leipzig.course-coordination.hsg@srh.de', tags: ['campus:Leipzig'] },
  { campusId: 'leipzig', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'leipzig.examination-office.hsg@srh.de', tags: ['campus:Leipzig'] },
  { campusId: 'leipzig', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'feemanagement.hsbe@srh.de', tags: ['campus:Leipzig'] },
  { campusId: 'leipzig', service: 'Library', person: 'Anne Fischer', email: 'library.hsg@srh.de', tags: ['campus:Leipzig'] },
  // München
  { campusId: 'munich', service: 'Campus Management', person: 'Christine Kainrath', email: 'Christine.Kainrath@srh.de', tags: ['campus:München'] },
  { campusId: 'munich', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'muenchen.examination-office.hsg@srh.de', tags: ['campus:München'] },
  { campusId: 'munich', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'invoice.wlh@srh.de', tags: ['campus:München'] },
  { campusId: 'munich', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de', tags: ['campus:München'] },
  // Stuttgart
  { campusId: 'stuttgart', service: 'Campus Management', person: 'Nicola Westermann', email: 'Nicola.Westermann@srh.de', tags: ['campus:Stuttgart'] },
  { campusId: 'stuttgart', service: 'Course Coordination', person: 'Nadine Schindler (Teamlead)', email: 'stuttgart.course-coordination.hsg@srh.de', tags: ['campus:Stuttgart'] },
  { campusId: 'stuttgart', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'stuttgart.examination-office.hsg@srh.de', tags: ['campus:Stuttgart'] },
  { campusId: 'stuttgart', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hshd@srh.de', tags: ['campus:Stuttgart'] },
  { campusId: 'stuttgart', service: 'Library', person: 'Armin Vetter', email: 'Armin.Vetter@srh.de', tags: ['campus:Stuttgart'] },
  // Tübingen
  { campusId: 'tuebingen', service: 'Examination Office', person: 'Hendrik Unger (Teamlead) und Team', email: 'gera.examination-office.hsg@srh.de', tags: ['campus:Tübingen'] },
  { campusId: 'tuebingen', service: 'Fee Management', person: 'Marion Müller (Teamlead) und Team', email: 'finanzen.hshd@srh.de', tags: ['campus:Tübingen'] },
  { campusId: 'tuebingen', service: 'Library', person: 'Rosalie Wohlauf', email: 'Rosalie.Wohlauf@srh.de', tags: ['campus:Tübingen'] },
];

// ── Program Directors ────────────────────────────────────────────────────────
export const programDirectors: ProgramDirector[] = [
  { school: "hes", campusId: "bamberg", degree: "Bachelor", program: "Pflege (ausbildungsbegleitend)", cluster: "Health", person: "Tamara Gehring-Vorbeck", email: "tamara.gehring-vorbeck@srh.de", phone: "+49 172 7503028", tags: ['Health', 'Nursing', 'campus:Bamberg', 'school:HES'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Advertising & Brand Design", cluster: "Media", person: "Markus Wente", email: "markus.wente@srh.de", phone: "+49 30 515650-906", tags: ['Design', 'Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Audiodesign / Audio Design", cluster: "Arts", person: "Tilman Ehrhorn", email: "tilman.ehrhorn@srh.de", phone: "+49 30 515650-708", tags: ['Arts', 'Audio', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Classical Music", cluster: "Arts", person: "Robert Lingnau", email: "robert.lingnau@srh.de", phone: "+49 177 9270000", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Creative Industries Management", cluster: "Media", person: "Brigitte Biehl", email: "brigitte.biehl@srh.de", phone: "+49 30 515650-908", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Film und Fernsehen", cluster: "Arts", person: "Rolf Teigler", email: "rolf.teigler@srh.de", phone: "+49 30 515650-720", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Film & Motion Design", cluster: "Media", person: "Gilbert Beronneau", email: "gilbert.beronneau@srh.de", phone: "+49 30 515650-700", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Fotografie / Photography", cluster: "Arts", person: "Sebastian Denz", email: "sebastian.denz@srh.de", phone: "+49 30 515650-701", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Illustration / Illustration", cluster: "Arts", person: "Nele Anders", email: "nele.anders@srh.de", phone: "+49 30 515650-725", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Kommunikationsdesign", cluster: "Media", person: "Christopher Jung", email: "christopher.jung@srh.de", phone: "+49 30 515650-702", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Kreatives Schreiben und Texten", cluster: "Arts", person: "Karl-Wolfgang Flender", email: "karl-wolfgang.flender@srh.de", phone: "+49 30 515650-719", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Management der Kreativwirtschaft", cluster: "Media", person: "Agnes Schipanski", email: "agnes.schipanski@srh.de", phone: "+49 30 515650-914", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Musikproduktion / Music Production", cluster: "Arts", person: "Robert Kessler", email: "robert.kessler@srh.de", phone: "+49 30 515650-713", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Popularmusik / Popular Music", cluster: "Arts", person: "Robert Kessler", email: "robert.kessler@srh.de", phone: "+49 30 515650-713", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "User Experience Design and Content Creation", cluster: "Media", person: "Gabor Kovacs", email: "gabor.kovacs@srh.de", phone: "+49 30 515650-800", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Virtual Reality & Game Development", cluster: "Information", person: "Anke Schuster", email: "anke.schuster@srh.de", phone: "+49 30 515650-211", tags: ['Information', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "Web Development", cluster: "Media", person: "Gabor Kovacs", email: "gabor.kovacs@srh.de", phone: "+49 30 515650-800", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Bachelor", program: "World Music", cluster: "Arts", person: "Robert Lingnau", email: "robert.lingnau@srh.de", phone: "+49 177 9270000", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Master", program: "Classical Music", cluster: "Arts", person: "Robert Lingnau", email: "robert.lingnau@srh.de", phone: "+49 177 9270000", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Master", program: "Film, Television and Digital Narratives", cluster: "Media", person: "Gilbert Beronneau", email: "gilbert.beronneau@srh.de", phone: "+49 30 515650-700", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Master", program: "Marketing Management", cluster: "Media", person: "Benjamin Schwenn", email: "benjamin.schwenn@srh.de", phone: "+49 30 515650-905", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Master", program: "Medienkommunikation und Medienproduktion", cluster: "Media", person: "Marcus S. Kleiner", email: "marcusS.kleiner@srh.de", phone: "+49 30 515650-729", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Master", program: "Photography", cluster: "Arts", person: "Sebastian Denz", email: "sebastian.denz@srh.de", phone: "+49 30 515650-701", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Master", program: "Social Design & Sustainable Innovation", cluster: "Media", person: "Gilbert Beronneau", email: "gilbert.beronneau@srh.de", phone: "+49 30 515650-700", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Master", program: "Strategic Design", cluster: "Media", person: "Katrin Androschin", email: "katrin.androschin@srh.de", phone: "+49 30 515650-703", tags: ['Media', 'campus:Berlin', 'school:AIM'] },
  { school: "aim", campusId: "berlin", degree: "Master", program: "World Music", cluster: "Arts", person: "Robert Lingnau", email: "robert.lingnau@srh.de", phone: "+49 177 9270000", tags: ['Arts', 'campus:Berlin', 'school:AIM'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "AI in Business", cluster: "Business & Law", person: "Torsten Becker", email: "torsten.beckern@srh-hochschulen.de", phone: "+49 30 515650-947", tags: ['Business & Law', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "Business Coaching und New Work", cluster: "International Business", person: "Franziska Schölmerich", email: "franziska.schoelmerich@srh.de", phone: "+49 30 515650-953", tags: ['International Business', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "Executive MBA General Management", cluster: "International Business", person: "Mile Vasic", email: "mile.vasic@srh.de", phone: "+49 30 515650-953", tags: ['International Business', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "General Management (MBA)", cluster: "International Business", person: "Mile Vasic", email: "mile.vasic@srh.de", phone: "+49 30 515650-953", tags: ['International Business', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "Healthcare Management (MBA)", cluster: "International Business", person: "Franz Hessel", email: "franz.hessel@srh.de", phone: "+49 30 515650-953", tags: ['International Business', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Bachelor", program: "International Business Administration", cluster: "International Business", person: "Hannes Antonschmidt", email: "hannes.antonschmidt@srh.de", phone: "+49 351 407617-43", tags: ['International Business', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "International Management", cluster: "International Business", person: "Bert Eichhorn", email: "bert.eichhorn@srh.de", phone: "+49 30 515650-921", tags: ['International Business', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "International Management - Creative Leadership", cluster: "International Business", person: "Bert Eichhorn", email: "bert.eichhorn@srh.de", phone: "+49 30 515650-921", tags: ['International Business', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "Entrepreneurship / Intrapreneurship", cluster: "International Business", person: "Bert Eichhorn", email: "bert.eichhorn@srh.de", phone: "+49 30 515650-921", tags: ['International Business', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Bachelor", program: "Internationale Betriebswirtschaftslehre", cluster: "International Business", person: "Dimitrios Zikos", email: "dimitrios.zikos@srh.de", phone: "+49 30 515650-921", tags: ['International Business', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Bachelor", program: "Internationales Tourismus- und Eventmanagement", cluster: "Tourism/Event and Hospitality", person: "Alex Baumgärtner", email: "alex.baumgaertner@srh.de", phone: "+49 30 515650-916", tags: ['Tourism/Event and Hospitality', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Bachelor", program: "Law, Economics and Governance", cluster: "Business & Law", person: "Alexander Wulf", email: "alexander.wulf@srh.de", phone: "+49 30 515650-947", tags: ['Business & Law', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "Master of Laws - Law & Technology", cluster: "Business & Law", person: "Alexander Wulf", email: "alexander.wulf@srh.de", phone: "+49 30 515650-947", tags: ['Business & Law', 'campus:Berlin', 'school:BLS'] },
  { school: "bls", campusId: "berlin", degree: "Master", program: "Supply Chain Management", cluster: "Supply Chain Management", person: "Torsten Becker", email: "torsten.beckern@srh-hochschulen.de", phone: "+49 30 515650-947", tags: ['Supply Chain Management', 'campus:Berlin', 'school:BLS'] },
  { school: "teac", campusId: "berlin", degree: "Bachelor", program: "Applied Mechatronic Systems", cluster: "Engineering & Architecture", person: "Klaus-Ulrich Neumann", email: "klaus-ulrich.neumann@srh.de", phone: "+49 30 515650-654", tags: ['Engineering & Architecture', 'campus:Berlin', 'school:TEAC'] },
  { school: "teac", campusId: "berlin", degree: "Bachelor", program: "Computer Science", cluster: "Computer Science", person: "Joel Dokmegang", email: "joel.dokmegang@srh.de", phone: "+49 30 515650-800", tags: ['Computer Science', 'campus:Berlin', 'school:TEAC'] },
  { school: "teac", campusId: "berlin", degree: "Master", program: "CS – Big Data and AI", cluster: "Computer Science", person: "Alexander Iliev", email: "alexander.iliev@srh.de", phone: "+49 30 515650-809", tags: ['Computer Science', 'campus:Berlin', 'school:TEAC'] },
  { school: "teac", campusId: "berlin", degree: "Master", program: "CS – Cyber Security", cluster: "Computer Science", person: "Reiner Creutzburg", email: "reiner.creutzburg@srh.de", phone: "+49 30 515650-807", tags: ['Computer Science', 'campus:Berlin', 'school:TEAC'] },
  { school: "teac", campusId: "berlin", degree: "Master", program: "Renewable Energy, Water and Waste", cluster: "Sustainable Technologies", person: "Osvaldo Romero", email: "osvaldo.romero@srh.de", phone: "+49 30 515650-817", tags: ['Sustainable Technologies', 'campus:Berlin', 'school:TEAC'] },
  { school: "teac", campusId: "berlin", degree: "Master", program: "Industry 4.0: Automation, Robotics", cluster: "Sustainable Technologies", person: "Adele Nasti", email: "adele.nasti@srh.de", phone: "+49 30 515650-100", tags: ['Sustainable Technologies', 'campus:Berlin', 'school:TEAC'] },
  { school: "teac", campusId: "berlin", degree: "Master", program: "Mobility and Automotive Industry", cluster: "Sustainable Technologies", person: "Frank Wolter", email: "frank.wolter@srh.de", phone: "+49 30 515650-828", tags: ['Sustainable Technologies', 'campus:Berlin', 'school:TEAC'] },
  { school: "teac", campusId: "berlin", degree: "Master", program: "Smart Building Technologies", cluster: "Sustainable Technologies", person: "Stephan Szuppa", email: "stephan.szuppa@srh.de", phone: "+49 30 515650-819", tags: ['Sustainable Technologies', 'campus:Berlin', 'school:TEAC'] },
  { school: "teac", campusId: "berlin", degree: "Master", program: "Sustainable Battery Production", cluster: "Sustainable Technologies", person: "Minoo Tasbihi", email: "Minoo.Tasbihi@srh.de", phone: "+49 30 515650-850", tags: ['Sustainable Technologies', 'campus:Berlin', 'school:TEAC'] },
  { school: "hes", campusId: "bonn", degree: "Bachelor", program: "Logopädie", cluster: "Therapy", person: "Irene Ablinger", email: "irene.ablinger@srh.de", phone: "+49 22 89696286", tags: ['Therapy', 'school:HES'] },
  { school: "bls", campusId: "bremen", degree: "Bachelor", program: "Digital Supply Chain Management", cluster: "Business & Law", person: "Thomas Zink", email: "thomas.zink@srh.de", phone: "+49 421 94991023", tags: ['Business & Law', 'campus:Bremen', 'school:BLS'] },
  { school: "bls", campusId: "dresden", degree: "Bachelor", program: "Global Hospitality Management (EN)", cluster: "Tourism/Event and Hospitality", person: "Hartwig Bohne", email: "hartwig.bohne@srh.de", phone: "+49 351 407617-45", tags: ['Tourism/Event and Hospitality', 'campus:Dresden', 'school:BLS'] },
  { school: "bls", campusId: "dresden", degree: "Master", program: "Hospitality Management and Leadership", cluster: "Tourism/Event and Hospitality", person: "Farzaneh Soleimanizoghi", email: "farzaneh.soleimanizoghi@srh.de", phone: "+49 351 407617-53", tags: ['Tourism/Event and Hospitality', 'campus:Dresden', 'school:BLS'] },
  { school: "bls", campusId: "dresden", degree: "Bachelor", program: "Internationales Hotelmanagement", cluster: "Tourism/Event and Hospitality", person: "Matthias Straub", email: "matthias.straub@srh.de", phone: "+49 351 407617-46", tags: ['Tourism/Event and Hospitality', 'campus:Dresden', 'school:BLS'] },
  { school: "bls", campusId: "dresden", degree: "Bachelor", program: "Internationales Tourismus- und Eventmanagement", cluster: "Tourism/Event and Hospitality", person: "Susanne Gellweiler", email: "susanne.gellweiler@srh.de", phone: "+49 351 407617-20", tags: ['Tourism/Event and Hospitality', 'campus:Dresden', 'school:BLS'] },
  { school: "hes", campusId: "dresden", degree: "Bachelor", program: "Soziale Arbeit", cluster: "Social Sciences", person: "Brit Reimann-Bernhardt", email: "Brit.Reimann-Bernhardt@srh.de", phone: "+49 351 407617-62", tags: ['Social Sciences', 'campus:Dresden', 'school:HES'] },
  { school: "psy", campusId: "dresden", degree: "Bachelor", program: "Psychologie", cluster: "Psychology", person: "Andreas David", email: "andreas.david@srh.de", phone: "+49 351 40761720", tags: ['Psychology', 'campus:Dresden', 'school:PSY'] },
  { school: "hes", campusId: "duesseldorf", degree: "Bachelor", program: "Logopädie", cluster: "Therapy", person: "Irene Ablinger", email: "irene.ablinger@srh.de", phone: "+49 22 89696286", tags: ['Therapy', 'campus:Düsseldorf', 'school:HES'] },
  { school: "aim", campusId: "fuerth", degree: "Master", program: "Applied Data Science and AI", cluster: "Information", person: "Clemens Werkmeister", email: "clemens.werkmeister@srh.de", phone: "+49 911 766069-23", tags: ['Information', 'campus:Fürth', 'school:AIM'] },
  { school: "hes", campusId: "fuerth", degree: "Bachelor", program: "Berufspädagogik für Gesundheit", cluster: "Education", person: "Yvonne Sedelmaier", email: "yvonne.sedelmaier@srh.de", phone: "+49 911 766069-20", tags: ['Education', 'campus:Fürth', 'school:HES'] },
  { school: "hes", campusId: "fuerth", degree: "Bachelor", program: "Heilpädagogik", cluster: "Education", person: "Marion Wüchner-Fuchs", email: "marion.wuechner-fuchs@srh.de", phone: "+49 911 766069-15", tags: ['Education', 'campus:Fürth', 'school:HES'] },
  { school: "hes", campusId: "fuerth", degree: "Bachelor", program: "Pflege", cluster: "Health", person: "Christine Fiedler", email: "christine.fiedler@srh.de", phone: "+49 911 766069-25", tags: ['Health', 'campus:Fürth', 'school:HES'] },
  { school: "hes", campusId: "fuerth", degree: "Bachelor", program: "Soziale Arbeit", cluster: "Social Sciences", person: "Simon Kolbe", email: "simon.kolbe@srh.de", phone: "+49 911 766069-24", tags: ['Social Sciences', 'campus:Fürth', 'school:HES'] },
  { school: "hes", campusId: "fuerth", degree: "Master", program: "Digital Health and Data Analytics", cluster: "Health", person: "Stefanie Scholz", email: "stefanie.scholz@srh.de", phone: "+49 911 766069-52", tags: ['Health', 'campus:Fürth', 'school:HES'] },
  { school: "psy", campusId: "fuerth", degree: "Bachelor", program: "Psychologie", cluster: "Psychology", person: "Martin Köllner", email: "martin.koellner@srh.de", phone: "+49 911 766069-57", tags: ['Psychology', 'campus:Fürth', 'school:PSY'] },
  { school: "psy", campusId: "fuerth", degree: "Master", program: "Psychologie", cluster: "Psychology", person: "Maren Weiß", email: "maren.weiss@srh.de", phone: "+49 911 766069-37", tags: ['Psychology', 'campus:Fürth', 'school:PSY'] },
  { school: "psy", campusId: "fuerth", degree: "Master", program: "Sexualwissenschaft", cluster: "Psychology", person: "Philipp Stang", email: "philipp.stang@srh.de", phone: "+49 911 766069-47", tags: ['Psychology', 'campus:Fürth', 'school:PSY'] },
  { school: "hes", campusId: "gera", degree: "Bachelor", program: "Medizinpädagogik", cluster: "Education", person: "Maximilian Schochow", email: "maximilian.schochow@srh.de", phone: "+49 365 773407-13", tags: ['Education', 'campus:Gera', 'school:HES'] },
  { school: "hes", campusId: "gera", degree: "Bachelor", program: "Pflege", cluster: "Health", person: "Tamara Gehring-Vorbeck", email: "tamara.gehring-vorbeck@srh.de", phone: "+49 172 7503028", tags: ['Health', 'campus:Gera', 'school:HES'] },
  { school: "hes", campusId: "gera", degree: "Bachelor", program: "Soziale Arbeit", cluster: "Social Sciences", person: "Maren Zschach", email: "maren.zschach@srh.de", phone: "+49 365 7734070", tags: ['Social Sciences', 'campus:Gera', 'school:HES'] },
  { school: "hes", campusId: "gera", degree: "Master", program: "Neurorehabilitation", cluster: "Therapy", person: "Claudia Barthel", email: "claudia.barthel@srh.de", phone: "+49 365 7734070", tags: ['Therapy', 'campus:Gera', 'school:HES'] },
  { school: "hes", campusId: "gera", degree: "Master", program: "Systemische Beratung und Management", cluster: "Social Sciences", person: "Kerstin Mayhack", email: "Kerstin.Mayhack@srh.de", phone: "+49 365 773407-26", tags: ['Social Sciences', 'campus:Gera', 'school:HES'] },
  { school: "psy", campusId: "gera", degree: "Bachelor", program: "Psychologie", cluster: "Psychology", person: "Thomas Fankhänel", email: "thomas.fankhaenel@srh.de", phone: "+49 365 773407-41", tags: ['Psychology', 'campus:Gera', 'school:PSY'] },
  { school: "psy", campusId: "gera", degree: "Master", program: "Psychologie", cluster: "Psychology", person: "Susanne Hardecker", email: "susanne.hardecker@srh.de", phone: "+49 365 773407-23", tags: ['Psychology', 'campus:Gera', 'school:PSY'] },
  { school: "aim", campusId: "hamburg", degree: "Master", program: "Applied Data Science and AI", cluster: "Information", person: "Gayan de Silva", email: "gayan.deSilva@srh.de", phone: "+49 40 334656-430", tags: ['Information', 'campus:Hamburg', 'school:AIM'] },
  { school: "bls", campusId: "hamburg", degree: "Master", program: "Digital Transformation Management", cluster: "International Business", person: "Christian Kapteyn", email: "christian.kapteyn@srh.de", phone: "+49 40 334656-418", tags: ['International Business', 'campus:Hamburg', 'school:BLS'] },
  { school: "bls", campusId: "hamburg", degree: "Bachelor", program: "International Business", cluster: "International Business", person: "Michael Schellenberg", email: "michael.schellenberg@srh.de", phone: "+49 40 334656-0", tags: ['International Business', 'campus:Hamburg', 'school:BLS'] },
  { school: "bls", campusId: "hamburg", degree: "Master", program: "Supply Chain Management", cluster: "Supply Chain Management", person: "Nnamdi Oguji", email: "nnamdi.oguji@srh.de", phone: "+49 40 334656-419", tags: ['Supply Chain Management', 'campus:Hamburg', 'school:BLS'] },
  { school: "teac", campusId: "hamburg", degree: "Master", program: "Architecture", cluster: "Engineering & Architecture", person: "Urs Wedekind", email: "urs.wedekind@srh.de", phone: "+49 40 334656-0", tags: ['Engineering & Architecture', 'campus:Hamburg', 'school:TEAC'] },
  { school: "bls", campusId: "hamm", degree: "Master", program: "Supply Chain Management", cluster: "Supply Chain Management", person: "Lars Rickmann", email: "lars.rickmann@srh.de", phone: "+49 2381 9291-167", tags: ['Supply Chain Management', 'campus:Hamm', 'school:BLS'] },
  { school: "bls", campusId: "hamm", degree: "Master", program: "Sustainability and circular economy", cluster: "International Business", person: "Arno Lammerts", email: "arno.Lammerts@srh.de", phone: "+49 2381 9291-164", tags: ['International Business', 'campus:Hamm', 'school:BLS'] },
  { school: "hes", campusId: "hamm", degree: "Bachelor", program: "Soziale Arbeit", cluster: "Social Sciences", person: "Petra Richter", email: "Petra.Richter2@srh.de", phone: "+49 2381 9291-510", tags: ['Social Sciences', 'campus:Hamm', 'school:HES'] },
  { school: "psy", campusId: "hamm", degree: "Bachelor", program: "Psychologie", cluster: "Psychology", person: "Sabrina Krauss", email: "sabrina.krauss@srh.de", phone: "+49 2381 9291-509", tags: ['Psychology', 'campus:Hamm', 'school:PSY'] },
  { school: "hes", campusId: "heide", degree: "Bachelor", program: "Physician Assistant", cluster: "Health", person: "Henrik Herrmann", email: "henrik.herrmann@srh.de", phone: "+49 365 7734070", tags: ['Health', 'campus:Heide', 'school:HES'] },
  { school: "aim", campusId: "heidelberg", degree: "Bachelor", program: "Medien- und Kommunikationsmanagement", cluster: "Media", person: "Christian Blum", email: "christian.blum@srh.de", phone: "+49 6221 6799-220", tags: ['Media', 'campus:Heidelberg', 'school:AIM'] },
  { school: "aim", campusId: "heidelberg", degree: "Bachelor", program: "Virtual Reality & Game Development", cluster: "Information", person: "Anke Schuster", email: "anke.schuster@srh.de", phone: "+49 6221 6799-211", tags: ['Information', 'campus:Heidelberg', 'school:AIM'] },
  { school: "aim", campusId: "heidelberg", degree: "Master", program: "Applied Data Science and AI", cluster: "Information", person: "Swati Chandna", email: "swati.chandna@srh.de", phone: "+49 6221 6799-223", tags: ['Information', 'campus:Heidelberg', 'school:AIM'] },
  { school: "aim", campusId: "heidelberg", degree: "Master", program: "Strategic Communication & Leadership", cluster: "Media", person: "Jutta Milde", email: "jutta.milde@srh.de", phone: "+49 6221 6799-221", tags: ['Media', 'campus:Heidelberg', 'school:AIM'] },
  { school: "bls", campusId: "heidelberg", degree: "Bachelor", program: "Betriebswirtschaftslehre", cluster: "Business & Law", person: "Ziad Bakhaya", email: "Ziad.Bakhaya@srh.de", phone: "+49 6221 6799-143", tags: ['Business & Law', 'campus:Heidelberg', 'school:BLS'] },
  { school: "bls", campusId: "heidelberg", degree: "Master", program: "Global Business and Leadership", cluster: "International Business", person: "Jochen Schwind", email: "jochen.schwind@srh.de", phone: "+49 6221 6799-120", tags: ['International Business', 'campus:Heidelberg', 'school:BLS'] },
  { school: "bls", campusId: "heidelberg", degree: "Bachelor", program: "International Business Administration", cluster: "International Business", person: "Stefanie Schubert", email: "stefanie.schubert@srh.de", phone: "+49 6221 6799-127", tags: ['International Business', 'campus:Heidelberg', 'school:BLS'] },
  { school: "bls", campusId: "heidelberg", degree: "Master", program: "Management und Leadership", cluster: "Business & Law", person: "Friedrich Preiß", email: "friedrich.preiss@srh.de", phone: "+49 6221 6799-145", tags: ['Business & Law', 'campus:Heidelberg', 'school:BLS'] },
  { school: "bls", campusId: "heidelberg", degree: "Bachelor", program: "Wirtschaftsrecht", cluster: "Business & Law", person: "Carolin Sutter", email: "carolin.sutter@srh.de", phone: "+49 6221 6799-412", tags: ['Business & Law', 'campus:Heidelberg', 'school:BLS'] },
  { school: "hes", campusId: "heidelberg", degree: "Bachelor", program: "Ergotherapie", cluster: "Therapy", person: "Eliane von Gunten", email: "eliane.vonGunten@srh.de", phone: "+49 6221 6799-650", tags: ['Therapy', 'campus:Heidelberg', 'school:HES'] },
  { school: "hes", campusId: "heidelberg", degree: "Bachelor", program: "Musiktherapie", cluster: "Therapy", person: "Alexander Wormit", email: "alexander.wormit@srh.de", phone: "+49 6221 6799-615", tags: ['Therapy', 'campus:Heidelberg', 'school:HES'] },
  { school: "hes", campusId: "heidelberg", degree: "Bachelor", program: "Physiotherapie", cluster: "Therapy", person: "Annika Jahn", email: "annika.jahn@srh.de", phone: "+49 6221 6799-626", tags: ['Therapy', 'campus:Heidelberg', 'school:HES'] },
  { school: "hes", campusId: "heidelberg", degree: "Bachelor", program: "Soziale Arbeit", cluster: "Social Sciences", person: "Sabine Zimmermann", email: "sabine.zimmermann@srh.de", phone: "+49 6221 6799-420", tags: ['Social Sciences', 'campus:Heidelberg', 'school:HES'] },
  { school: "psy", campusId: "heidelberg", degree: "Bachelor", program: "Psychologie", cluster: "Psychology", person: "Willi Neuthinger", email: "willi.neuthinger@srh.de", phone: "+49 6221 6799-515", tags: ['Psychology', 'campus:Heidelberg', 'school:PSY'] },
  { school: "psy", campusId: "heidelberg", degree: "Master", program: "Psychologie", cluster: "Psychology", person: "Andres Steffanowski", email: "andres.steffanowski@srh.de", phone: "+49 6221 6799-513", tags: ['Psychology', 'campus:Heidelberg', 'school:PSY'] },
  { school: "teac", campusId: "heidelberg", degree: "Master", program: "Applied Computer Science", cluster: "Computer Science", person: "Gerd Möckel", email: "gerd.moeckel@srh.de", phone: "+49 6221 6799-204", tags: ['Computer Science', 'campus:Heidelberg', 'school:TEAC'] },
  { school: "teac", campusId: "heidelberg", degree: "Bachelor", program: "Architektur", cluster: "Engineering & Architecture", person: "Marc Kirschbaum", email: "marc.kirschbaum@srh.de", phone: "+49 6221 6799-304", tags: ['Engineering & Architecture', 'campus:Heidelberg', 'school:TEAC'] },
  { school: "teac", campusId: "heidelberg", degree: "Bachelor", program: "Computer Science", cluster: "Computer Science", person: "Peter Dillinger", email: "peter.dillinger@srh.de", phone: "+49 6221 6799-213", tags: ['Computer Science', 'campus:Heidelberg', 'school:TEAC'] },
  { school: "teac", campusId: "heidelberg", degree: "Bachelor", program: "Maschinenbau", cluster: "Engineering & Architecture", person: "Eckart Theophile", email: "eckart.theophile@srh.de", phone: "+49 6221 6799-317", tags: ['Engineering & Architecture', 'campus:Heidelberg', 'school:TEAC'] },
  { school: "teac", campusId: "heidelberg", degree: "Master", program: "Water Technology", cluster: "Sustainable Technologies", person: "Ulrike Gayh", email: "ulrike.gayh@srh.de", phone: "+49 6221 6799-320", tags: ['Sustainable Technologies', 'campus:Heidelberg', 'school:TEAC'] },
  { school: "hes", campusId: "karlsruhe", degree: "Bachelor", program: "Logopädie", cluster: "Therapy", person: "Claudia Wahn", email: "claudia.wahn@srh.de", phone: "+49 6221 882873", tags: ['Therapy', 'campus:Karlsruhe', 'school:HES'] },
  { school: "hes", campusId: "karlsruhe", degree: "Bachelor", program: "Physiotherapie", cluster: "Therapy", person: "Tobias Erhardt", email: "tobias.erhardt@srh.de", phone: "+49 721 3545328", tags: ['Therapy', 'campus:Karlsruhe', 'school:HES'] },
  { school: "bls", campusId: "koeln", degree: "Bachelor", program: "International Business Administration", cluster: "International Business", person: "Andreas Ledwon", email: "andreas.ledwon@srh.de", phone: "+49 214 33013945", tags: ['International Business', 'campus:Köln', 'school:BLS'] },
  { school: "hes", campusId: "koeln", degree: "Bachelor", program: "Nutrition Therapy", cluster: "Health", person: "Marcus Grimm", email: "marcus.grimm@srh.de", phone: "+49 365 7734070", tags: ['Health', 'campus:Köln', 'school:HES'] },
  { school: "hes", campusId: "koeln", degree: "Bachelor", program: "Soziale Arbeit", cluster: "Social Sciences", person: "Petra Richter", email: "Petra.Richter2@srh.de", phone: "+49 2381 9291-510", tags: ['Social Sciences', 'campus:Köln', 'school:HES'] },
  { school: "bls", campusId: "leipzig", degree: "Bachelor", program: "International Business Administration", cluster: "International Business", person: "Eva Koscher", email: "eva.koscher@srh.de", phone: "+49 351 407617-43", tags: ['International Business', 'campus:Leipzig', 'school:BLS'] },
  { school: "hes", campusId: "leipzig", degree: "Bachelor", program: "Physician Assistant", cluster: "Health", person: "Peter Rupp", email: "peter.rupp@srh.de", phone: "+49 365 7734070", tags: ['Health', 'campus:Leipzig', 'school:HES'] },
  { school: "teac", campusId: "leipzig", degree: "Bachelor", program: "Computer Science", cluster: "Computer Science", person: "Fakhteh Ghanbarnejad", email: "fakhteh.ghanbarnejad@srh.de", phone: "+49 351 407617-0", tags: ['Computer Science', 'campus:Leipzig', 'school:TEAC'] },
  { school: "aim", campusId: "munich", degree: "Bachelor", program: "Applied Data Science and AI", cluster: "Information", person: "Clemens Werkmeister", email: "clemens.werkmeister@srh.de", phone: "+49 911 766069-23", tags: ['Information', 'campus:München', 'school:AIM'] },
  { school: "bls", campusId: "munich", degree: "Bachelor", program: "International Business Administration", cluster: "International Business", person: "Frauke Kempner", email: "frauke.kempner@srh.de", phone: "+49 6221 6799-145", tags: ['International Business', 'campus:München', 'school:BLS'] },
  { school: "teac", campusId: "munich", degree: "Master", program: "Applied Computer Science", cluster: "Computer Science", person: "Gerd Möckel", email: "gerd.moeckel@srh.de", phone: "+49 6221 6799-204", tags: ['Computer Science', 'campus:München', 'school:TEAC'] },
  { school: "psy", campusId: "stuttgart", degree: "Bachelor", program: "Psychologie", cluster: "Psychology", person: "Willi Neuthinger", email: "willi.neuthinger@srh.de", phone: "+49 6221 6799-516", tags: ['Psychology', 'campus:Stuttgart', 'school:PSY'] },
  { school: "hes", campusId: "tuebingen", degree: "Bachelor", program: "Physiotherapie", cluster: "Therapy", person: "Tobias Erhardt", email: "tobias.erhardt@srh.de", phone: "+49 721 3545328", tags: ['Therapy', 'campus:Tübingen', 'school:HES'] },
];
