-- Seed canonical tags
-- Cuisines
INSERT INTO tags (name, category) VALUES
  ('Italian', 'cuisine'),
  ('Mexican', 'cuisine'),
  ('Japanese', 'cuisine'),
  ('Chinese', 'cuisine'),
  ('Indian', 'cuisine'),
  ('Thai', 'cuisine'),
  ('French', 'cuisine'),
  ('Mediterranean', 'cuisine'),
  ('American', 'cuisine'),
  ('Korean', 'cuisine'),
  ('Middle Eastern', 'cuisine'),
  ('Greek', 'cuisine'),
  ('Vietnamese', 'cuisine'),
  ('Spanish', 'cuisine'),
  ('Ethiopian', 'cuisine')
ON CONFLICT (name, category) DO NOTHING;

-- Dietary
INSERT INTO tags (name, category) VALUES
  ('Vegetarian', 'dietary'),
  ('Vegan', 'dietary'),
  ('Gluten-Free', 'dietary'),
  ('Dairy-Free', 'dietary'),
  ('Nut-Free', 'dietary'),
  ('Halal', 'dietary'),
  ('Kosher', 'dietary'),
  ('Paleo', 'dietary'),
  ('Keto', 'dietary')
ON CONFLICT (name, category) DO NOTHING;

-- Meal types
INSERT INTO tags (name, category) VALUES
  ('Breakfast', 'meal_type'),
  ('Lunch', 'meal_type'),
  ('Dinner', 'meal_type'),
  ('Snack', 'meal_type'),
  ('Dessert', 'meal_type'),
  ('Drink', 'meal_type'),
  ('Appetizer', 'meal_type'),
  ('Side Dish', 'meal_type')
ON CONFLICT (name, category) DO NOTHING;

-- Difficulty
INSERT INTO tags (name, category) VALUES
  ('Easy', 'difficulty'),
  ('Medium', 'difficulty'),
  ('Hard', 'difficulty')
ON CONFLICT (name, category) DO NOTHING;
