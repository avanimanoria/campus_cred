-- Run this script to populate categories in your database
-- Execute from psql command line or your database GUI tool

\c clubverse;

\i seed_categories.sql

-- Verify categories were inserted
SELECT 
    SUBSTRING(name FROM 1 FOR 40) as category_name,
    max_points,
    status
FROM event_categories
ORDER BY name;

-- Count categories by main type
SELECT 
    SPLIT_PART(name, ' - ', 1) as main_category,
    COUNT(*) as count,
    SUM(max_points) as total_possible_points
FROM event_categories
WHERE status = 'approved'
GROUP BY SPLIT_PART(name, ' - ', 1)
ORDER BY main_category;
