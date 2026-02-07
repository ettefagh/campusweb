// SRH Campus links
export const srhLinks = [
	{
		id: 'campusweb',
		title: 'CampusWeb Portal',
		url: 'https://srh-community.campusweb.cloud',
		icon: '🎓',
		description: 'Main portal for all services',
		category_name: 'Academic'
	},
	{
		id: 'schedule',
		title: 'My Schedule',
		url: 'https://srh-community.campusweb.cloud/en/mein-studium/mein-stundenplan.php',
		icon: '📅',
		description: 'View your class schedule',
		category_name: 'Academic'
	},
	{
		id: 'grades',
		title: 'My Grades',
		url: 'https://srh-community.campusweb.cloud/en/mein-studium/meine-notenuebersicht.php',
		icon: '📊',
		description: 'Check your grades and results',
		category_name: 'Academic'
	},
	{
		id: 'profile',
		title: 'My Profile',
		url: 'https://srh-community.campusweb.cloud/en/mein-profil.php',
		icon: '👤',
		description: 'Manage your profile settings',
		category_name: 'Academic'
	},
	{
		id: 'moodle',
		title: 'Moodle',
		url: 'https://moodle.srh.de',
		icon: '📚',
		description: 'Course materials and assignments',
		category_name: 'Academic'
	},
	{
		id: 'library',
		title: 'Library',
		url: 'https://www.srh-hochschule-heidelberg.de/en/university/library',
		icon: '📖',
		description: 'Search books and journals',
		category_name: 'Resources'
	},
	{
		id: 'email',
		title: 'SRH Email',
		url: 'https://outlook.office.com',
		icon: '📧',
		description: 'Access your university email',
		category_name: 'Services'
	},
	{
		id: 'it-support',
		title: 'IT Support',
		url: 'https://www.srh-hochschule-heidelberg.de/en/university/it-services',
		icon: '💻',
		description: 'Technical help and support',
		category_name: 'Services'
	},
	{
		id: 'campus-map',
		title: 'Campus Map',
		url: 'https://www.srh-hochschule-heidelberg.de/en/university/campus',
		icon: '🗺️',
		description: 'Navigate the campus',
		category_name: 'Resources'
	},
	{
		id: 'student-services',
		title: 'Student Services',
		url: 'https://www.srh-hochschule-heidelberg.de/en/study/student-services',
		icon: '🛠️',
		description: 'Counseling and support services',
		category_name: 'Services'
	}
];

// Student tools
export const tools = [
	{
		id: 'calendar-enhancer',
		title: 'Calendar Enhancer',
		url: 'https://srh-calendar-enhancer.padarhava.workers.dev',
		icon: '📅',
		description: 'Enhance your university calendar',
		category_name: 'Utility'
	},
	{
		id: 'pdf-tools',
		title: 'PDF Tools',
		url: 'https://tools.pdf24.org/en/',
		icon: '📄',
		description: 'Edit, merge, and convert PDFs',
		category_name: 'Utility'
	},
	{
		id: 'library-resources',
		title: 'Library E-Resources',
		url: 'https://login.srh-berlin.idm.oclc.org/menu',
		icon: '📚',
		description: 'Access digital library resources',
		category_name: 'Academic'
	}
];

// Combined list for edit mode
export const allLinks = [...srhLinks, ...tools];
