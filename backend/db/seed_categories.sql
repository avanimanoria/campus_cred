-- Seed data for Activity Categories based on CSBS Activity Points Framework
-- This script populates the event_categories table with categories from the official framework

-- Clear existing categories (optional - comment out if you want to keep existing data)
-- TRUNCATE TABLE event_categories RESTART IDENTITY CASCADE;

-- 1. SOCIETAL NEEDS AND DEVELOPMENT
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('Societal Needs and Development - Create local job opportunities', 20, 1, 'approved'),
('Societal Needs and Development - Distribution of essential items during calamity or crisis', 20, 1, 'approved'),
('Societal Needs and Development - Blood Plasma or Other Donation Camp (Donor)', 10, 1, 'approved'),
('Societal Needs and Development - Social Service', 10, 1, 'approved'),
('Societal Needs and Development - Volunteer free tutoring for fellow students', 10, 1, 'approved'),
('Societal Needs and Development - Textbook donation camp', 10, 1, 'approved'),
('Societal Needs and Development - Food Clothes donation camp', 10, 1, 'approved'),
('Societal Needs and Development - Organizing any events or activities', 20, 1, 'approved'),
('Societal Needs and Development - Visiting / Helping Old age homes', 20, 1, 'approved'),
('Societal Needs and Development - Organizing any events or activities in Orphanage', 20, 1, 'approved'),
('Societal Needs and Development - Organizing any events or activities for Senior Citizens', 20, 1, 'approved'),
('Societal Needs and Development - Special Head', 20, 1, 'approved');

-- 2. ENVIRONMENT AND SUSTAINABILITY
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('Environment and Sustainability - Active member of a community', 20, 1, 'approved'),
('Environment and Sustainability - Promoting Reduce, Reuse and Recycle', 20, 1, 'approved'),
('Environment and Sustainability - Identifying & Analyzing Sustainability Problems', 20, 1, 'approved'),
('Environment and Sustainability - Possible Solutions for Zero Food Waste', 20, 1, 'approved'),
('Environment and Sustainability - Creating Innovative Solutions for Sustainable Future', 20, 1, 'approved'),
('Environment and Sustainability - Special Head', 20, 1, 'approved');

-- 3. CHILDHOOD DEVELOPMENT AND PEDAGOGY
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('Childhood Development and Pedagogy - Teaching in local schools', 20, 1, 'approved'),
('Childhood Development and Pedagogy - Events for school children', 20, 1, 'approved'),
('Childhood Development and Pedagogy - Promoting pedagogy', 20, 1, 'approved'),
('Childhood Development and Pedagogy - Tutoring the slow learning school children', 20, 1, 'approved'),
('Childhood Development and Pedagogy - Special Head', 20, 1, 'approved');

-- 4. WOMEN EMPOWERMENT OUTREACH
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('Women Empowerment Outreach - Helping women for skill development', 20, 1, 'approved'),
('Women Empowerment Outreach - Teaching basic English language', 20, 1, 'approved'),
('Women Empowerment Outreach - Teaching basic Technologies', 20, 1, 'approved'),
('Women Empowerment Outreach - Education about women rights', 20, 1, 'approved'),
('Women Empowerment Outreach - Organizing events on women outreach', 20, 1, 'approved'),
('Women Empowerment Outreach - Spreading awareness on health and hygiene', 20, 1, 'approved'),
('Women Empowerment Outreach - Special Head', 20, 1, 'approved');

-- 5. PROMOTE RURAL DEVELOPMENT
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('Promote Rural Development - Create rural job opportunities', 20, 1, 'approved'),
('Promote Rural Development - Improvement of Quality Education in Villages', 20, 1, 'approved'),
('Promote Rural Development - Improvement of Health Parameters in Villages', 20, 1, 'approved'),
('Promote Rural Development - Rural Skill Development for Village Youths', 20, 1, 'approved'),
('Promote Rural Development - Special Head', 20, 1, 'approved');

-- 6. QUALITY OF LIFE THROUGH TECHNOLOGY
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('Quality of Life through Technology - App Development', 20, 1, 'approved'),
('Quality of Life through Technology - Web Development', 20, 1, 'approved'),
('Quality of Life through Technology - Internal Software Development', 20, 1, 'approved'),
('Quality of Life through Technology - Special Head', 20, 1, 'approved');

-- 7. NATIONAL LEVEL INITIATIVES
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('National Level Initiatives - N.C.C', 20, 1, 'approved'),
('National Level Initiatives - N.S.S', 20, 1, 'approved'),
('National Level Initiatives - Digital India', 20, 1, 'approved'),
('National Level Initiatives - Skill India', 20, 1, 'approved'),
('National Level Initiatives - Swachh Bharat', 20, 1, 'approved'),
('National Level Initiatives - AICTE Internship', 20, 1, 'approved'),
('National Level Initiatives - Any Government Bodies/Agencies-Internships', 20, 1, 'approved'),
('National Level Initiatives - Special Head', 20, 1, 'approved');

-- 8. INNOVATIVE APPROACH TO PROMOTE LOCAL TOURISM
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('Innovative approach to promote local tourism - Promotion of local tourism', 20, 1, 'approved'),
('Innovative approach to promote local tourism - Promoting any tourist places', 20, 1, 'approved'),
('Innovative approach to promote local tourism - Special Head', 20, 1, 'approved');

-- 9. INNOVATIONS AND ENTREPRENEURSHIP
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('Innovations and Entrepreneurship - Prototype Development', 20, 1, 'approved'),
('Innovations and Entrepreneurship - Product Development', 20, 1, 'approved'),
('Innovations and Entrepreneurship - Innovative Technology Development', 20, 1, 'approved'),
('Innovations and Entrepreneurship - Funding for innovative ideas/product', 20, 1, 'approved'),
('Innovations and Entrepreneurship - Start-up Company/NGO or similar kind', 20, 1, 'approved'),
('Innovations and Entrepreneurship - Societal Innovations', 20, 1, 'approved'),
('Innovations and Entrepreneurship - Special Head', 20, 1, 'approved');

-- 10. LEADERSHIP AND MANAGEMENT
INSERT INTO event_categories (name, max_points, proposed_by, status) VALUES
('Leadership and Management - Professional Self Initiatives', 20, 1, 'approved'),
('Leadership and Management - Promoting any Technical Events', 20, 1, 'approved'),
('Leadership and Management - Promoting any Club Events', 20, 1, 'approved'),
('Leadership and Management - Professional Society (IEEE, Local Chapter, etc.)', 20, 1, 'approved'),
('Leadership and Management - Student Representatives or Team Members', 20, 1, 'approved'),
('Leadership and Management - Special Head', 20, 1, 'approved');

-- Note: The 'proposed_by' field references user_id=1 (default faculty/admin)
-- Adjust this if your system uses a different default user ID
-- Status is set to 'approved' so categories are immediately available for use
