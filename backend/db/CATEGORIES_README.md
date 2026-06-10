# Activity Categories Seed Data

This directory contains SQL scripts to populate the `event_categories` table with comprehensive activity point categories based on the CSBS Activity Points Framework.

## Categories Included

The seed data includes **10 main category types** with multiple subcategories:

1. **Technical Skills Development** (14 subcategories)
   - Workshops, Certifications, Hackathons, Coding Competitions

2. **Project & Research** (9 subcategories)
   - Projects, Research Papers, Patents, Conference Presentations

3. **Soft Skills & Personality Development** (7 subcategories)
   - Seminars, Communication, Leadership, Team Building

4. **Co-Curricular Activities** (8 subcategories)
   - Cultural, Sports, Literary, Quiz Events

5. **Entrepreneurship & Innovation** (6 subcategories)
   - Startup Ideas, Business Plans, Product Development

6. **Community Service & Social Activities** (6 subcategories)
   - NSS, Blood Donation, Environmental Campaigns

7. **Club & Committee Activities** (7 subcategories)
   - Club Membership, Event Organization, Student Council

8. **Internships & Industrial Training** (5 subcategories)
   - Summer Internships, Industrial Visits, Corporate Workshops

9. **Online Learning & MOOCs** (6 subcategories)
   - NPTEL, Coursera, edX, Udemy, Google/Microsoft Certifications

10. **Aptitude & Career Development** (6 subcategories)
    - Aptitude Training, Resume Building, Interview Preparation

**Total: 74 approved activity categories**

## How to Run

### Option 1: Using Node.js Script (Recommended)

```bash
node db/seedCategories.js
```

This will:
- Execute the seed SQL
- Show a summary of inserted categories
- Display category counts by type

### Option 2: Using psql Command Line

```bash
psql -U your_username -d clubverse -f db/seed_categories.sql
```

### Option 3: Using Database GUI Tools

1. Open your PostgreSQL GUI tool (pgAdmin, DBeaver, etc.)
2. Connect to the `clubverse` database
3. Open and execute `db/seed_categories.sql`

## Verify Seeding

After running the seed script, verify with:

```sql
-- Count total categories
SELECT COUNT(*) FROM event_categories WHERE status = 'approved';

-- View all categories
SELECT category_id, name, max_points, status 
FROM event_categories 
ORDER BY name;

-- Group by main category
SELECT 
    SPLIT_PART(name, ' - ', 1) as main_category,
    COUNT(*) as count,
    SUM(max_points) as total_possible_points
FROM event_categories
WHERE status = 'approved'
GROUP BY SPLIT_PART(name, ' - ', 1)
ORDER BY main_category;
```

## API Endpoint

After seeding, categories can be accessed via:

```
GET /api/proctor/categories
```

Response includes:
- `categories`: Flat array of all categories
- `grouped`: Categories grouped by main type
- `total`: Total count

## Customization

To modify categories:

1. Edit `seed_categories.sql`
2. Adjust `max_points` values as needed
3. Add/remove categories
4. Re-run the seed script

## Notes

- All categories are pre-approved (`status = 'approved'`)
- `proposed_by` references `user_id = 1` (default admin/faculty)
- Update this if your system uses a different default user ID
- Categories follow a hierarchical naming convention: "Main Category - Subcategory"
