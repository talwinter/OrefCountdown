export type Language = 'he' | 'en';

export const translations = {
  // Alert phases
  'phase.safe': {
    he: 'אין התראה פעילה באזור',
    en: 'No active alert in the area'
  },
  'phase.earlyWarning': {
    he: 'התרעה מוקדמת',
    en: 'Early Warning'
  },
  'phase.yellow': {
    he: 'הזמן להגעה למרחב מוגן מוגבל',
    en: 'Limited time to reach shelter'
  },
  'phase.orange': {
    he: 'הזמן המוערך מתקצר',
    en: 'Time is running short'
  },
  'phase.red': {
    he: 'הזמן המוערך הסתיים',
    en: 'Estimated time has ended'
  },
  'phase.critical': {
    he: 'הישאר במקום והתכופף',
    en: 'Stay in place and brace yourself'
  },
  'phase.sheltering': {
    he: 'מומלץ להישאר במרחב מוגן',
    en: 'Recommended to stay in shelter'
  },
  'phase.canExit': {
    he: 'ניתן לצאת מהמרחב המוגן',
    en: 'You may exit the shelter'
  },

  // Instructions
  'instruction.earlyWarning': {
    he: 'יש להיכנס למרחב מוגן בהקדם',
    en: 'Enter shelter as soon as possible'
  },
  'instruction.yellow': {
    he: 'מומלץ לפעול ברוגע ובשיקול דעת',
    en: 'Act calmly and thoughtfully'
  },
  'instruction.orange': {
    he: 'מומלץ לפעול בהתאם להנחיות פיקוד העורף',
    en: 'Follow Home Front Command instructions'
  },
  'instruction.red': {
    he: 'יש לפעול לפי הנחיות פיקוד העורף',
    en: 'Follow Home Front Command instructions'
  },
  'instruction.critical': {
    he: 'התכופף, הגן על הראש, התרחק מחלונות',
    en: 'Crouch down, protect your head, stay away from windows'
  },
  'instruction.sheltering': {
    he: 'יש להמתין להודעת פיקוד העורף לפני יציאה',
    en: 'Wait for Home Front Command announcement before exiting'
  },
  'instruction.canExit': {
    he: 'ההתראה הסתיימה לפי פיקוד העורף',
    en: 'Alert ended per Home Front Command'
  },
  'instruction.enterShelter': {
    he: 'להגעה למרחב מוגן לפי הנחיות פיקוד העורף',
    en: 'Reach shelter per Home Front Command instructions'
  },

  // Voice announcements
  'voice.enterShelter': {
    he: 'יש להיכנס למרחב מוגן',
    en: 'Enter the shelter'
  },
  'voice.braceYourself': {
    he: 'הישאר במקום והתכופף. הגן על הראש',
    en: 'Stay in place and brace yourself. Protect your head'
  },
  'voice.earlyWarning': {
    he: 'התרעה מוקדמת. יש להתכונן להיכנס למרחב מוגן',
    en: 'Early warning. Prepare to enter shelter'
  },
  'voice.earlyWarningEnded': {
    he: 'ההתרעה המוקדמת הסתיימה',
    en: 'The early warning has ended'
  },
  'voice.canExit': {
    he: 'ניתן לצאת מהמרחב המוגן',
    en: 'You may exit the shelter'
  },

  // Status badge
  'badge.alertActive': {
    he: 'אזעקה נשמעה באזור',
    en: 'Alert sounded in the area'
  },
  'badge.earlyWarning': {
    he: 'התרעה מוקדמת',
    en: 'Early Warning'
  },

  // Time estimates
  'estimate.enough': {
    he: 'הערכה: זמן מספיק',
    en: 'Estimate: Enough time'
  },
  'estimate.reasonable': {
    he: 'הערכה: זמן סביר',
    en: 'Estimate: Reasonable time'
  },
  'estimate.limited': {
    he: 'הערכה: זמן מוגבל',
    en: 'Estimate: Limited time'
  },
  'estimate.ended': {
    he: 'הערכה: הזמן הסתיים',
    en: 'Estimate: Time ended'
  },
  'estimate.critical': {
    he: 'מיידי!',
    en: 'Immediate!'
  },

  // UI elements
  'ui.changeArea': {
    he: 'החלף אזור',
    en: 'Change Area'
  },
  'ui.currentLocation': {
    he: 'מיקום נוכחי',
    en: 'Current Location'
  },
  'ui.home': {
    he: 'בית',
    en: 'Home'
  },
  'ui.migunTime': {
    he: 'זמן המיגון באזור שלך:',
    en: 'Shelter time in your area:'
  },
  'ui.seconds': {
    he: 'שניות',
    en: 'seconds'
  },
  'ui.loading': {
    he: 'טוען נתונים...',
    en: 'Loading data...'
  },
  'ui.error': {
    he: 'שגיאה בטעינת נתונים',
    en: 'Error loading data'
  },
  'ui.retry': {
    he: 'נסה שוב',
    en: 'Try Again'
  },
  'ui.selectArea': {
    he: 'בחר אזור',
    en: 'Select Area'
  },
  'ui.searchArea': {
    he: 'חפש אזור...',
    en: 'Search area...'
  },

  // Alert messages
  'alert.calmInstruction': {
    he: 'לפי הנחיות פיקוד העורף, קיים פרק זמן מוגדר להגעה למרחב מוגן באזור זה',
    en: 'Per Home Front Command, there is a defined time to reach shelter in this area'
  },
  'alert.reassurance': {
    he: 'מומלץ לפעול ברוגע ובהתאם ליכולת האישית',
    en: 'Act calmly according to your ability'
  },
  'alert.criticalInstruction': {
    he: 'אין מספיק זמן להגיע למרחב מוגן',
    en: 'Not enough time to reach shelter'
  },
  'alert.stayCalm': {
    he: 'שמירה על קור רוח חשובה לבטיחותך',
    en: 'Staying calm is important for your safety'
  },
  'alert.estimate': {
    he: 'מדובר בהערכה כללית בהתאם לאזור ולהנחיות פיקוד העורף',
    en: 'This is a general estimate based on area and Home Front Command guidelines'
  },

  // Dual alert banner
  'dualAlert.alsoAt': {
    he: 'התראה פעילה גם ב',
    en: 'Alert also active at'
  },
  'dualAlert.tapToSwitch': {
    he: 'הקש למעבר',
    en: 'Tap to switch'
  },

  // Location permission modal
  'location.title': {
    he: 'הצגת התראות לפי מיקום',
    en: 'Show alerts by location'
  },
  'location.description': {
    he: 'האפליקציה יכולה להציג התראות גם לפי המיקום הנוכחי שלך, בנוסף לאזור הבית שבחרת.',
    en: 'The app can show alerts for your current location, in addition to your home area.'
  },
  'location.privacy': {
    he: 'משמש רק להצגת התראות באזור הנוכחי שלך. המיקום נשמר במכשיר בלבד ולא נשלח לשום מקום.',
    en: 'Used only to show alerts in your current area. Location is stored on device only and not sent anywhere.'
  },
  'location.approve': {
    he: 'אשר מיקום',
    en: 'Allow Location'
  },
  'location.dismiss': {
    he: 'לא עכשיו',
    en: 'Not Now'
  },
  'location.notFound': {
    he: 'לא נמצא אזור קרוב',
    en: 'No nearby area found'
  },

  // NewsFlash
  'newsFlash.title': {
    he: 'התרעה מוקדמת',
    en: 'Early Warning'
  },
  'newsFlash.defaultInstruction': {
    he: 'יש להיכנס למרחב מוגן',
    en: 'Enter shelter'
  },
  'newsFlash.areas': {
    he: 'אזורים:',
    en: 'Areas:'
  },

  // Disclaimer
  'disclaimer.text': {
    he: 'המידע מבוסס על נתונים ציבוריים מפיקוד העורף ומוצג כהערכה כללית בלבד. אין מדובר בשירות חירום רשמי. יש לפעול תמיד לפי הנחיות פיקוד העורף.',
    en: 'Information is based on public data from Home Front Command and shown as a general estimate only. This is not an official emergency service. Always follow Home Front Command instructions.'
  },

  // Settings
  'settings.language': {
    he: 'שפה',
    en: 'Language'
  },
  'settings.hebrew': {
    he: 'עברית',
    en: 'Hebrew'
  },
  'settings.english': {
    he: 'English',
    en: 'English'
  }
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, language: Language): string {
  return translations[key][language];
}
