import frappe
from frappe.utils import getdate


HOLIDAYS_DATA = {
    "Maharashtra": [
        ("Republic Day", "2026-01-26"),
        ("Chhatrapati Shivaji Maharaj Jayanti", "2026-02-19"),
        ("Holi (Second Day)", "2026-03-03"),
        ("Gudi Padwa", "2026-03-19"),
        ("Ramzan Eid (Eid Ul Fitr)", "2026-03-21"),
        ("Ram Navami", "2026-03-26"),
        ("Mahavir Jayanti", "2026-03-31"),
        ("Good Friday", "2026-04-03"),
        ("Dr Babasaheb Ambedkar Jayanti", "2026-04-14"),
        ("Maharashtra Day / Buddha Purnima", "2026-05-01"),
        ("Bakari Eid (Eid-Uz-Zuha)", "2026-05-28"),
        ("Moharam", "2026-06-26"),
        ("Independence Day / Parsi New Year Day", "2026-08-15"),
        ("Eid-A-Milad", "2026-08-26"),
        ("Ganesh Chaturthi", "2026-09-14"),
        ("Mahatma Gandhi Jayanti", "2026-10-02"),
        ("Dashera", "2026-10-20"),
        ("Diwali (Balipratipada)", "2026-11-10"),
        ("Bhau Beej", "2026-11-11"),
        ("Guru Nanak Jayanti", "2026-11-24"),
        ("Christmas", "2026-12-25"),
    ],
    "Chandigarh": [
        ("Republic Day", "2026-01-26"),
        ("Holi", "2026-03-04"),
        ("Ramzan Eid (Eid Ul Fitr)", "2026-03-21"),
        ("Dr Babasaheb Ambedkar Jayanti", "2026-04-14"),
        ("Buddha Purnima", "2026-05-01"),
        ("Bakari Eid (Eid-Uz-Zuha)", "2026-05-27"),
        ("Maharana Pratap Jayanti", "2026-06-17"),
        ("Independence Day", "2026-08-15"),
        ("Janmashtami", "2026-09-04"),
        ("Mahatma Gandhi Jayanti", "2026-10-02"),
        ("Dashera (Vijayadashmi)", "2026-10-20"),
        ("Maharshi Valmiki Jayanti", "2026-10-26"),
        ("Vishvakarma Jayanti", "2026-11-09"),
        ("Guru Nanak Jayanti", "2026-11-24"),
        ("Christmas", "2026-12-25"),
    ],
    "Karnataka": [
        ("Makar Sankranti", "2026-01-15"),
        ("Republic Day", "2026-01-26"),
        ("Ugadi Festival", "2026-03-19"),
        ("Khutub-E-Ramzan", "2026-03-21"),
        ("Mahavir Jayanti", "2026-03-31"),
        ("Good Friday", "2026-04-03"),
        ("Dr B.R Ambedkar Jayanti", "2026-04-14"),
        ("Basava Jayanti / Akshay Tritiya", "2026-04-20"),
        ("May Day", "2026-05-01"),
        ("Bakri Eid (Eid Ul Zuha)", "2026-05-28"),
        ("Last Day of Moharram", "2026-06-26"),
        ("Independence Day", "2026-08-15"),
        ("Eid-Milad", "2026-08-26"),
        ("Vara Siddhi Vinayaka Vrata", "2026-09-14"),
        ("Mahatma Gandhi Jayanti", "2026-10-02"),
        ("Mahalaya Amavasya", "2026-10-10"),
        ("Mahanavami", "2026-10-20"),
        ("Vijayadashami", "2026-10-21"),
        ("Balipadyami Deepavali", "2026-11-10"),
        ("Kanakadasa Jayanthi", "2026-11-27"),
        ("Christmas", "2026-12-25"),
    ],
    "Madhya Pradesh": [
        ("Republic Day", "2026-01-26"),
        ("Holi", "2026-03-03"),
        ("Ramzan Eid (Eid Ul Fitr)", "2026-03-21"),
        ("Ram Navami", "2026-03-27"),
        ("Mahavir Jayanti", "2026-03-31"),
        ("Good Friday", "2026-04-03"),
        ("Buddha Purnima", "2026-05-01"),
        ("Bakri Eid (Eid Ul Zuha)", "2026-05-27"),
        ("Moharam", "2026-06-26"),
        ("Independence Day", "2026-08-15"),
        ("Milad Un-Nabi", "2026-08-26"),
        ("Raksha Bandhan", "2026-08-28"),
        ("Janmashtami", "2026-09-04"),
        ("Mahatma Gandhi Jayanti", "2026-10-02"),
        ("Dashera (Vijayadashmi)", "2026-10-20"),
        ("Govardhan Pooja", "2026-11-09"),
        ("Guru Nanak Jayanti", "2026-11-24"),
        ("Christmas", "2026-12-25"),
    ],
    "Pondicherry": [
        ("New Year's Day", "2026-01-01"),
        ("Pongal", "2026-01-15"),
        ("Thiruvalluvar Day", "2026-01-16"),
        ("Uzhavar Thirunal", "2026-01-17"),
        ("Republic Day", "2026-01-26"),
        ("Telugu New Year's Day", "2026-03-19"),
        ("Ramzan Eid (Eid Ul Fitr)", "2026-03-21"),
        ("Mahaveer Jayanti", "2026-03-31"),
        ("Good Friday", "2026-04-03"),
        ("Tamil New Year / Dr B.R Ambedkar Birthday", "2026-04-14"),
        ("May Day", "2026-05-01"),
        ("Bakri Eid (Idul Azha)", "2026-05-28"),
        ("Muharram", "2026-06-26"),
        ("Independence Day", "2026-08-15"),
        ("Milad Un-Nabi (Prophet Birthday)", "2026-08-26"),
        ("Janmashtami", "2026-09-04"),
        ("Vinayaka Chaturthi", "2026-09-14"),
        ("Mahatma Gandhi Jayanti", "2026-10-02"),
        ("Ayutha Pooja", "2026-10-19"),
        ("Dashera (Vijayadashmi)", "2026-10-20"),
        ("Christmas", "2026-12-25"),
    ],
    "Himachal Pradesh": [
        ("Republic Day", "2026-01-26"),
        ("Holi", "2026-03-04"),
        ("Ram Navami", "2026-03-26"),
        ("Good Friday", "2026-04-03"),
        ("Himachal Day", "2026-04-15"),
        ("Buddha Purnima", "2026-05-01"),
        ("Bakri Eid (Eid-Ul-Zuha)", "2026-05-27"),
        ("Sant Guru Kabir Jayanti", "2026-06-29"),
        ("Independence Day", "2026-08-15"),
        ("Janmashtami", "2026-09-04"),
        ("Mahatma Gandhi Jayanti", "2026-10-02"),
        ("Dashera (Vijayadashmi)", "2026-10-20"),
        ("Maharshi Valmiki Jayanti", "2026-10-26"),
        ("Guru Nanak Jayanti", "2026-11-24"),
        ("Christmas", "2026-12-25"),
    ],
    "Jammu & Kashmir": [
        ("Republic Day", "2026-01-26"),
        ("Holi", "2026-03-04"),
        ("Shab-I-Qadr", "2026-03-17"),
        ("1st Navratra", "2026-03-19"),
        ("Jumat-ul-Vida", "2026-03-20"),
        ("Ramzan Eid (Eid Ul Fitr)", "2026-03-21"),
        ("Baisakhi / Dr B.R Ambedkar Jayanti", "2026-04-14"),
        ("Buddha Purnima", "2026-05-01"),
        ("Bakri Eid (Eid-Ul-Azha)", "2026-05-27"),
        ("Ashoora", "2026-06-26"),
        ("Independence Day", "2026-08-15"),
        ("Eid-I-Milad Ul Nabi", "2026-08-26"),
        ("Raksha Bandhan", "2026-08-28"),
        ("Janmashtami", "2026-09-04"),
        ("Maharaja Hari Singh Ji", "2026-09-23"),
        ("Mahatma Gandhi Jayanti", "2026-10-02"),
        ("Dashera (Vijayadashmi)", "2026-10-20"),
        ("Accession Day", "2026-10-26"),
        ("Guru Nanak Jayanti", "2026-11-24"),
        ("Christmas", "2026-12-25"),
    ],
    "Uttarakhand": [
        ("Republic Day", "2026-01-26"),
        ("Holika Dahan", "2026-03-03"),
        ("Holi", "2026-03-04"),
        ("Ramzan Eid (Eid Ul Fitr)", "2026-03-21"),
        ("Ram Navami", "2026-03-26"),
        ("Good Friday", "2026-04-03"),
        ("Dr B.R Ambedkar Jayanti", "2026-04-14"),
        ("Buddha Purnima", "2026-05-01"),
        ("Bakri Eid (Eid-Ul-Zuha)", "2026-05-27"),
        ("Harela", "2026-07-16"),
        ("Independence Day", "2026-08-15"),
        ("Eid-Milad", "2026-08-26"),
        ("Raksha Bandhan", "2026-08-28"),
        ("Janmashtami", "2026-09-04"),
        ("Mahatma Gandhi Jayanti", "2026-10-02"),
        ("Dashera (Vijayadashmi)", "2026-10-20"),
        ("Deepawali Govardhan Pooja", "2026-11-10"),
        ("Igas Bagwal", "2026-11-20"),
        ("Guru Nanak Jayanti", "2026-11-24"),
        ("Christmas", "2026-12-25"),
    ],
}


def execute():
    created = 0
    skipped = 0

    for state, holidays in HOLIDAYS_DATA.items():
        name = f"{state} - 2026"

        dates = [getdate(h[1]) for h in holidays]
        from_date = min(dates)
        to_date = max(dates)

        if frappe.db.exists("Holiday List", name):
            print(f"Skipping {name} — already exists")
            skipped += 1
            continue

        doc = frappe.get_doc({
            "doctype": "Holiday List",
            "holiday_list_name": name,
            "from_date": from_date,
            "to_date": to_date,
        })

        for holiday_name, holiday_date in holidays:
            doc.append("holidays", {
                "holiday_date": holiday_date,
                "description": holiday_name,
                "weekly_off": 0,
            })

        doc.insert(ignore_permissions=True)
        print(f"Created: {name} ({len(holidays)} holidays)")
        created += 1

    print(f"\nDone! Created: {created}, Skipped: {skipped}")
