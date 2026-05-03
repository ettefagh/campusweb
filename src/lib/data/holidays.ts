export interface Holiday {
  id: string;
  date: string; // MM-DD
  nameEn: string;
  nameDe: string;
  states: string[] | "ALL";
}

export const HOLIDAYS: Holiday[] = [
  {
    "id": "holiday_01-01_new_year's_day",
    "date": "01-01",
    "nameEn": "New Year's Day",
    "nameDe": "Neujahrstag",
    "states": "ALL"
  },
  {
    "id": "holiday_01-06_epiphany",
    "date": "01-06",
    "nameEn": "Epiphany",
    "nameDe": "Heilige Drei Könige",
    "states": [
      "BW",
      "BY",
      "ST"
    ]
  },
  {
    "id": "holiday_03-08_international_women's_day",
    "date": "03-08",
    "nameEn": "International Women's Day",
    "nameDe": "Internationaler Tag der Frauen",
    "states": [
      "BE",
      "MV"
    ]
  },
  {
    "id": "holiday_04-03_good_friday",
    "date": "04-03",
    "nameEn": "Good Friday",
    "nameDe": "Karfreitag",
    "states": "ALL"
  },
  {
    "id": "holiday_04-05_easter_sunday",
    "date": "04-05",
    "nameEn": "Easter Sunday",
    "nameDe": "Ostersonntag",
    "states": [
      "BB"
    ]
  },
  {
    "id": "holiday_04-06_easter_monday",
    "date": "04-06",
    "nameEn": "Easter Monday",
    "nameDe": "Ostermontag",
    "states": "ALL"
  },
  {
    "id": "holiday_05-01_labour_day",
    "date": "05-01",
    "nameEn": "Labour Day",
    "nameDe": "Tag der Arbeit",
    "states": "ALL"
  },
  {
    "id": "holiday_05-14_ascension_day",
    "date": "05-14",
    "nameEn": "Ascension Day",
    "nameDe": "Christi Himmelfahrt",
    "states": "ALL"
  },
  {
    "id": "holiday_05-24_whit_sunday",
    "date": "05-24",
    "nameEn": "Whit Sunday",
    "nameDe": "Pfingstsonntag",
    "states": [
      "BB"
    ]
  },
  {
    "id": "holiday_05-25_whit_monday",
    "date": "05-25",
    "nameEn": "Whit Monday",
    "nameDe": "Pfingstmontag",
    "states": "ALL"
  },
  {
    "id": "holiday_06-04_corpus_christi",
    "date": "06-04",
    "nameEn": "Corpus Christi",
    "nameDe": "Fronleichnam",
    "states": [
      "BW",
      "BY",
      "HE",
      "NW",
      "RP",
      "SL",
      "SN",
      "TH"
    ]
  },
  {
    "id": "holiday_08-15_assumption_day",
    "date": "08-15",
    "nameEn": "Assumption Day",
    "nameDe": "Mariä Himmelfahrt",
    "states": [
      "BY",
      "SL"
    ]
  },
  {
    "id": "holiday_09-20_children's_day",
    "date": "09-20",
    "nameEn": "Children's Day",
    "nameDe": "Weltkindertag",
    "states": [
      "TH"
    ]
  },
  {
    "id": "holiday_10-03_day_of_german_unity",
    "date": "10-03",
    "nameEn": "Day of German Unity",
    "nameDe": "Tag der Deutschen Einheit",
    "states": "ALL"
  },
  {
    "id": "holiday_10-31_reformation_day",
    "date": "10-31",
    "nameEn": "Reformation Day",
    "nameDe": "Reformationstag",
    "states": "ALL"
  },
  {
    "id": "holiday_11-01_all_saints'_day",
    "date": "11-01",
    "nameEn": "All Saints' Day",
    "nameDe": "Allerheiligen",
    "states": [
      "BW",
      "BY",
      "NW",
      "RP",
      "SL"
    ]
  },
  {
    "id": "holiday_11-18_repentance_day",
    "date": "11-18",
    "nameEn": "Repentance Day",
    "nameDe": "Buß- und Bettag",
    "states": [
      "SN"
    ]
  },
  {
    "id": "holiday_12-25_christmas_day",
    "date": "12-25",
    "nameEn": "Christmas Day",
    "nameDe": "1. Weihnachtsfeiertag",
    "states": "ALL"
  },
  {
    "id": "holiday_12-26_2nd_day_of_christmas",
    "date": "12-26",
    "nameEn": "2nd Day of Christmas",
    "nameDe": "2. Weihnachtsfeiertag",
    "states": "ALL"
  }
];
