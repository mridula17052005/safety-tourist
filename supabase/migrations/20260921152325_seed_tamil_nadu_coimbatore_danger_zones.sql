/*
# Seed local Tamil Nadu and Coimbatore danger zones

1. Purpose
- Populate the `danger_zones` table with real local danger zones across Coimbatore city,
  other Tamil Nadu districts (Chennai, Madurai, etc.), and key tourist destinations in
  Tamil Nadu (Ooty, Kodaikanal, Rameswaram, Mahabalipuram, etc.).
- These zones warn tourists about restricted / high-risk local areas so they can avoid them.

2. Data
- Inserts ~20 new rows into the existing `danger_zones` table.
- All rows use `is_active = true` (column default) and are permanent (non-temporary) zones.
- Covers categories: crime, scam, nightlife, natural_hazard, civil_unrest, general.
- Uses `ON CONFLICT DO NOTHING` against the existing seed so re-running is safe.

3. Security
- No schema changes. RLS policies already exist on `danger_zones`.
- No new tables, columns, or policies.

4. Important notes
- These are seed entries only — admins can still edit/deactivate/delete them via the admin panel.
- Coordinates are approximate centers of the known-risk areas.
*/

INSERT INTO danger_zones (name, description, latitude, longitude, radius_meters, severity, zone_type, country, city)
VALUES
-- === COIMBATORE CITY ===
('Gandhipuram Bus Stand Pickpocket Zone', 'Frequent pickpocketing and bag-snatching incidents reported around Gandhipuram central bus terminus, especially during rush hour and festival seasons.', 11.0168, 76.9658, 500, 'medium', 'crime', 'India', 'Coimbatore'),
('Ukkadam Lake Area After Dark', 'Poorly lit stretch near Ukkadam lake. Chain-snatching and harassment incidents reported after sunset. Avoid walking alone at night.', 10.9900, 76.9700, 600, 'high', 'crime', 'India', 'Coimbatore'),
('Sukrawar Pettai Narrow Lanes', 'Congested old-city lanes with recurring petty theft and scam targeting visitors. Keep valuables hidden and avoid after dark.', 11.0040, 76.9620, 400, 'medium', 'scam', 'India', 'Coimbatore'),
('Singanallur Lake Isolated Stretch', 'Isolated eastern shoreline of Singanallur lake. Robberies reported targeting lone visitors and couples, especially evenings.', 11.0050, 77.0050, 500, 'high', 'crime', 'India', 'Coimbatore'),
('Pollachi Road Highway Robbery Zone', 'Stretch of Pollachi Road on the outskirts where highway robberies and vehicle break-ins have been reported at night.', 10.9600, 76.8400, 800, 'high', 'crime', 'India', 'Coimbatore'),

-- === CHENNAI ===
('Chennai Central Railway Station Touts', 'Aggressive touts and taxi scam operators around Chennai Central station. Verify fares beforehand and use prepaid taxi counters only.', 13.0827, 80.2785, 400, 'medium', 'scam', 'India', 'Chennai'),
('George Town Bazaar Pickpockets', 'Dense wholesale market area with high pickpocketing. Keep wallets and phones secured; avoid displaying jewelry.', 13.0890, 80.2820, 500, 'medium', 'crime', 'India', 'Chennai'),
('Marina Beach Night Isolation', 'Marina Beach after 10 PM is poorly lit and isolated. Harassment and robbery incidents reported. Avoid visiting alone at night.', 13.0500, 80.2824, 700, 'high', 'crime', 'India', 'Chennai'),
('Koyambedu Market Cash-Carry Risk', 'Wholesale vegetable market area with high cash flow. Pickpocketing and overcharging of visitors reported.', 13.0690, 80.1940, 500, 'medium', 'scam', 'India', 'Chennai'),

-- === MADURAI ===
('Madurai Meenakshi Temple Surrounding Touts', 'Aggressive guide touts and flower-seller scams around the temple complex. Use official guides only.', 9.9195, 78.1193, 400, 'medium', 'scam', 'India', 'Madurai'),
('Madurai Mattuthavani Bus Stand Theft', 'Theft and bag-snatching incidents reported at the Mattuthavani bus terminus, especially during festival crowds.', 9.9400, 78.1400, 450, 'medium', 'crime', 'India', 'Madurai'),

-- === TOURIST DESTINATIONS IN TAMIL NADU ===
('Ooty Doddabetta Peak Unsupervised Trail', 'Unsupervised trails near Doddabetta Peak. Tourists have gotten lost and injured. Stay on marked paths and avoid after sunset.', 11.4064, 76.7340, 600, 'medium', 'natural_hazard', 'India', 'Ooty'),
('Kodaikanal Pillar Rocks Edge', 'Steep drop-offs near Pillar Rocks viewpoint with inadequate barriers. Fatal falls have occurred. Keep away from edges.', 10.2300, 77.4600, 300, 'high', 'natural_hazard', 'India', 'Kodaikanal'),
('Kodaikanal Bryant Park After Dark', 'Isolated area around Bryant Park after closing hours. Mugging incidents reported targeting tourists.', 10.2360, 77.4690, 400, 'medium', 'crime', 'India', 'Kodaikanal'),
('Rameswaram Pamban Bridge High Winds', 'Strong crosswinds on Pamban Bridge can be dangerous for two-wheelers and pedestrians during monsoon. Avoid stopping on the bridge.', 9.2795, 79.1190, 500, 'medium', 'natural_hazard', 'India', 'Rameswaram'),
('Mahabalipuram Shore Temple Erosion Zone', 'Coastal erosion and slippery rocks around Shore Temple. Tourists have been swept off rocks by waves. Stay behind safety barriers.', 12.6269, 80.1927, 350, 'medium', 'natural_hazard', 'India', 'Mahabalipuram'),
('Yercaud Lady''s Seat Cliff Edge', 'Unfenced cliff edge at Lady''s Seat viewpoint. Fatal falls have occurred. Do not approach the edge for photos.', 11.7760, 78.2090, 250, 'high', 'natural_hazard', 'India', 'Yercaud'),
('Courtallam Main Falls Slippery Rocks', 'Extremely slippery rocks at Courtallam Main Falls. Drowning and head injuries reported during peak season. Use designated bathing areas only.', 8.9010, 77.2980, 400, 'medium', 'natural_hazard', 'India', 'Courtallam'),

-- === OTHER TN DISTRICTS ===
('Trichy Rockfort Steps Theft', 'Pickpocketing on crowded Rockfort temple steps, especially during festival days. Keep valuables secured.', 10.7905, 78.7047, 300, 'medium', 'crime', 'India', 'Tiruchirappalli'),
('Thanjavur Bus Stand Touts', 'Aggressive auto-rickshaw touts and overcharging near Thanjavur new bus stand. Use prepaid auto counters.', 10.7870, 79.1400, 350, 'low', 'scam', 'India', 'Thanjavur'),
('Vellore Fort Surrounding Night Risk', 'Poorly lit areas around Vellore Fort after sunset. Chain-snatching incidents reported. Avoid walking alone at night.', 12.9165, 79.1320, 400, 'medium', 'crime', 'India', 'Vellore')
ON CONFLICT DO NOTHING;