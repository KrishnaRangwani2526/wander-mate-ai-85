-- ===== Social layer: creators, posts, comments, likes, follows, reviews, itineraries =====

CREATE TABLE public.creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  handle text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'influencer' CHECK (kind IN ('influencer','vendor')),
  category text,
  city text NOT NULL DEFAULT 'Udaipur',
  bio text,
  avatar_url text,
  cover_url text,
  verified boolean NOT NULL DEFAULT false,
  followers integer NOT NULL DEFAULT 0,
  phone text,
  address text,
  price_level text,
  rating numeric(2,1),
  lat double precision,
  lng double precision,
  maps_url text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.creators TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creators TO authenticated;
GRANT ALL ON public.creators TO service_role;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators are public" ON public.creators FOR SELECT USING (true);
CREATE POLICY "Users manage own creator page" ON public.creators FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own creator page" ON public.creators FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own creator page" ON public.creators FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER creators_updated_at BEFORE UPDATE ON public.creators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'post' CHECK (kind IN ('reel','story','post')),
  media_url text NOT NULL,
  video_url text,
  caption text,
  place_name text,
  lat double precision,
  lng double precision,
  tags text[] NOT NULL DEFAULT '{}',
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are public" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Creators insert own posts" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Creators update own posts" ON public.posts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Creators delete own posts" ON public.posts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Traveler',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are public" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Signed in users add comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments" ON public.post_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are public" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users like as themselves" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own likes" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.follows (
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (creator_id, user_id)
);
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are public" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users follow as themselves" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unfollow themselves" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Traveler',
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Signed in users add reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.creator_itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  city text NOT NULL DEFAULT 'Udaipur',
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget_inr integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.creator_itineraries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_itineraries TO authenticated;
GRANT ALL ON public.creator_itineraries TO service_role;
ALTER TABLE public.creator_itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator itineraries are public" ON public.creator_itineraries FOR SELECT USING (true);
CREATE POLICY "Creators insert own itineraries" ON public.creator_itineraries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Creators update own itineraries" ON public.creator_itineraries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Creators delete own itineraries" ON public.creator_itineraries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

-- ===== Dummy Udaipur data =====

INSERT INTO public.creators (id, user_id, handle, name, kind, category, bio, avatar_url, cover_url, verified, followers, address, phone, price_level, rating, lat, lng, maps_url, website) VALUES
('11111111-1111-4111-8111-000000000001','1092be55-3998-47f5-b63b-a9441f804d1c','aarav.wanders','Aarav Mehta','influencer','Lakes & sunsets','Udaipur born & raised. Sunrise ghats, rooftop chai, Aravalli drives. 4 yrs of shooting the City of Lakes.','https://picsum.photos/seed/aarav-udaipur/200/200','https://picsum.photos/seed/pichola-sunset/1200/600',true,128400,NULL,NULL,NULL,NULL,24.5760,73.6835,NULL,NULL),
('11111111-1111-4111-8111-000000000002','98ffcf39-43bc-4174-bef3-316452cd033e','meera.heritage','Meera Rathore','influencer','Heritage & crafts','Art historian turned creator. Palaces, miniature painting galleries and Mewari craft trails in Udaipur.','https://picsum.photos/seed/meera-udaipur/200/200','https://picsum.photos/seed/city-palace-udaipur/1200/600',true,86200,NULL,NULL,NULL,NULL,24.5760,73.6832,NULL,NULL),
('11111111-1111-4111-8111-000000000003','d4871243-b587-41d3-b05f-b8fb5d45be46','kabir.onbudget','Kabir Singh','influencer','Budget travel','₹1500/day Udaipur. Hostels, local buses, thali spots that locals actually eat at.','https://picsum.photos/seed/kabir-udaipur/200/200','https://picsum.photos/seed/udaipur-street/1200/600',false,42750,NULL,NULL,NULL,NULL,24.5854,73.6860,NULL,NULL),
('11111111-1111-4111-8111-000000000004','db4e68ba-24ab-4d88-b98f-5c1af6d84fa6','sanya.eats','Sanya Kapoor','influencer','Food & cafes','Dal baati to blueberry cheesecake. I eat my way through Udaipur so you don''t waste a meal.','https://picsum.photos/seed/sanya-udaipur/200/200','https://picsum.photos/seed/dal-baati/1200/600',true,61300,NULL,NULL,NULL,NULL,24.5790,73.6820,NULL,NULL),
('22222222-2222-4222-8222-000000000001','52d030b3-44ed-4723-8d9f-cd20472b5cf5','lakeview.haveli','Lakeview Haveli','vendor','Hotel','Heritage haveli stay with lake-facing balconies, 6 min walk from Jagdish Temple. Rooftop breakfast included.','https://picsum.photos/seed/lakeview-haveli/200/200','https://picsum.photos/seed/haveli-rooms/1200/600',true,9800,'Lal Ghat, Old City, Udaipur 313001','+91 294 240 1188','₹₹',4.6,24.5794,73.6830,'https://www.google.com/maps/search/?api=1&query=Lal+Ghat+Udaipur','https://example.com/lakeview-haveli'),
('22222222-2222-4222-8222-000000000002','1643418f-812e-402d-a713-8d577d16404a','ambrai.rooftop','Ambrai Rooftop Restro','vendor','Restaurant','Mewari thali, laal maas and a full view of City Palace across Lake Pichola. Sunset seating fills by 6pm.','https://picsum.photos/seed/ambrai-restro/200/200','https://picsum.photos/seed/rooftop-dinner-udaipur/1200/600',true,15400,'Amet Haveli Road, Hanuman Ghat, Udaipur','+91 294 243 1085','₹₹₹',4.7,24.5772,73.6786,'https://www.google.com/maps/search/?api=1&query=Hanuman+Ghat+Udaipur',NULL),
('22222222-2222-4222-8222-000000000003','4facffb8-fb93-419a-bb50-f21f079d0871','chotihaveli.cafe','Choti Haveli Cafe','vendor','Cafe','Slow coffee, Rajasthani breakfast and a courtyard full of jharokhas. Laptop friendly till 4pm.','https://picsum.photos/seed/choti-haveli-cafe/200/200','https://picsum.photos/seed/cafe-courtyard-udaipur/1200/600',false,4300,'Gangaur Ghat Marg, Udaipur','+91 98290 11223','₹',4.5,24.5806,73.6821,'https://www.google.com/maps/search/?api=1&query=Gangaur+Ghat+Udaipur',NULL),
('22222222-2222-4222-8222-000000000004','fb4ff0d3-9623-4119-b068-6209f04272fa','rajputana.guides','Rajputana Guides','vendor','Tourist guide service','Govt-licensed Udaipur guides. Heritage walks, Kumbhalgarh day trips, photo walks at sunrise. English/Hindi/French.','https://picsum.photos/seed/rajputana-guides/200/200','https://picsum.photos/seed/heritage-walk-udaipur/1200/600',true,6100,'Chandpole, Udaipur','+91 90010 55677','₹₹',4.8,24.5847,73.6795,'https://www.google.com/maps/search/?api=1&query=Chandpole+Udaipur',NULL);

INSERT INTO public.posts (id, creator_id, kind, media_url, caption, place_name, lat, lng, tags, likes, created_at) VALUES
('33333333-3333-4333-8333-000000000001','11111111-1111-4111-8111-000000000001','reel','https://picsum.photos/seed/pichola-boat-reel/720/1280','Sunset boat ride on Lake Pichola. Take the 5:30pm slot from Rameshwar Ghat — ₹400 gets you Jag Mandir at golden hour.','Lake Pichola',24.5715,73.6790,'{udaipur,lakepichola,sunset}',18400,now() - interval '2 hours'),
('33333333-3333-4333-8333-000000000002','11111111-1111-4111-8111-000000000001','story','https://picsum.photos/seed/ambrai-ghat-story/720/1280','6am at Ambrai Ghat. Zero crowd, all light.','Ambrai Ghat',24.5772,73.6786,'{sunrise,udaipur}',940,now() - interval '5 hours'),
('33333333-3333-4333-8333-000000000003','11111111-1111-4111-8111-000000000001','post','https://picsum.photos/seed/monsoon-palace-view/1080/1080','Monsoon Palace (Sajjangarh) at 6:15pm. Reach 45 min early, the last stretch is a shared jeep only.','Sajjangarh Monsoon Palace',24.5953,73.6483,'{viewpoint,udaipur}',7600,now() - interval '1 day'),
('33333333-3333-4333-8333-000000000004','11111111-1111-4111-8111-000000000002','reel','https://picsum.photos/seed/city-palace-reel/720/1280','The mirror room inside City Palace nobody photographs properly. Go weekday 9am, before the tour groups.','City Palace Udaipur',24.5760,73.6832,'{heritage,citypalace}',12250,now() - interval '7 hours'),
('33333333-3333-4333-8333-000000000005','11111111-1111-4111-8111-000000000002','post','https://picsum.photos/seed/bagore-ki-haveli/1080/1080','Bagore Ki Haveli dance show, 7pm daily, ₹150. Sit left side — that''s where the puppet stage faces.','Bagore Ki Haveli',24.5800,73.6819,'{culture,dance}',5310,now() - interval '2 days'),
('33333333-3333-4333-8333-000000000006','11111111-1111-4111-8111-000000000002','story','https://picsum.photos/seed/shilpgram-craft/720/1280','Shilpgram craft village — live block printing today.','Shilpgram',24.5876,73.6272,'{crafts,udaipur}',1120,now() - interval '9 hours'),
('33333333-3333-4333-8333-000000000007','11111111-1111-4111-8111-000000000003','reel','https://picsum.photos/seed/udaipur-budget-reel/720/1280','Udaipur on ₹1500/day: ₹450 hostel bed, ₹120 thali, ₹30 city bus, ₹400 boat, still ate twice more. Full breakdown in my itinerary.','Old City Udaipur',24.5854,73.6860,'{budget,backpacking}',9870,now() - interval '11 hours'),
('33333333-3333-4333-8333-000000000008','11111111-1111-4111-8111-000000000003','post','https://picsum.photos/seed/thali-udaipur/1080/1080','₹120 unlimited Rajasthani thali near Delhi Gate. Bajra roti + gatte ki sabzi is the move.','Delhi Gate',24.5905,73.6905,'{food,cheapeats}',4130,now() - interval '3 days'),
('33333333-3333-4333-8333-000000000009','11111111-1111-4111-8111-000000000004','reel','https://picsum.photos/seed/laal-maas-reel/720/1280','Laal maas at Ambrai vs dal baati churma at a 40-year-old thali house. Both won, for different reasons.','Hanuman Ghat',24.5772,73.6786,'{food,laalmaas}',15600,now() - interval '4 hours'),
('33333333-3333-4333-8333-000000000010','11111111-1111-4111-8111-000000000004','post','https://picsum.photos/seed/cafe-hopping-udaipur/1080/1080','5 cafes, 1 day, all inside the old city. Choti Haveli''s filter coffee + pyaaz kachori is my #1.','Gangaur Ghat',24.5806,73.6821,'{cafe,coffee}',6890,now() - interval '2 days'),
('33333333-3333-4333-8333-000000000011','11111111-1111-4111-8111-000000000004','story','https://picsum.photos/seed/kachori-story/720/1280','Morning kachori run. ₹25 each.','Jagdish Chowk',24.5794,73.6836,'{food,street}',780,now() - interval '3 hours'),
('33333333-3333-4333-8333-000000000012','22222222-2222-4222-8222-000000000001','post','https://picsum.photos/seed/haveli-lake-room/1080/1080','Lake-facing room 204 is open next week. ₹3,400/night with rooftop breakfast for two.','Lal Ghat',24.5794,73.6830,'{hotel,stay}',1240,now() - interval '1 day'),
('33333333-3333-4333-8333-000000000013','22222222-2222-4222-8222-000000000002','reel','https://picsum.photos/seed/ambrai-sunset-table/720/1280','The 6:40pm table. Laal maas, City Palace lighting up, live sarangi. Reserve a day ahead.','Ambrai Ghat',24.5772,73.6786,'{restaurant,sunset}',8420,now() - interval '6 hours'),
('33333333-3333-4333-8333-000000000014','22222222-2222-4222-8222-000000000003','post','https://picsum.photos/seed/cafe-breakfast-plate/1080/1080','New monsoon menu: masala filter coffee ₹90, pyaaz kachori plate ₹70, courtyard seating all day.','Gangaur Ghat Marg',24.5806,73.6821,'{cafe,breakfast}',960,now() - interval '2 days'),
('33333333-3333-4333-8333-000000000015','22222222-2222-4222-8222-000000000004','post','https://picsum.photos/seed/kumbhalgarh-trip/1080/1080','Kumbhalgarh + Ranakpur full-day guided trip, ₹2,800/person incl. cab. Sunrise heritage walk ₹700.','Chandpole',24.5847,73.6795,'{guide,daytrip}',1480,now() - interval '4 days');

INSERT INTO public.post_comments (post_id, author_name, body, created_at) VALUES
('33333333-3333-4333-8333-000000000001','Meera Rathore','That 5:30 slot is unbeatable. Add Jag Mandir coffee stop!',now() - interval '90 minutes'),
('33333333-3333-4333-8333-000000000001','Rhea T','Booked for Friday because of this 🙌',now() - interval '40 minutes'),
('33333333-3333-4333-8333-000000000004','Sanya Kapoor','Weekday 9am tip is gold, went twice on weekends and regretted it.',now() - interval '5 hours'),
('33333333-3333-4333-8333-000000000007','Aarav Mehta','Respect. ₹1500/day in Udaipur is genuinely doable in monsoon.',now() - interval '8 hours'),
('33333333-3333-4333-8333-000000000009','Kabir Singh','Thali house wins on value, Ambrai wins on the view.',now() - interval '3 hours'),
('33333333-3333-4333-8333-000000000013','Sanya Kapoor','Sarangi + laal maas is the whole Udaipur experience.',now() - interval '4 hours'),
('33333333-3333-4333-8333-000000000015','Meera Rathore','Their Kumbhalgarh guide knows the fort history properly.',now() - interval '3 days');

INSERT INTO public.reviews (creator_id, author_name, rating, body, created_at) VALUES
('22222222-2222-4222-8222-000000000001','Aarav Mehta',5,'Room 204 balcony looks straight at the lake. Staff arranged a 6am boat.',now() - interval '6 days'),
('22222222-2222-4222-8222-000000000001','Nikhil P',4,'Great location and breakfast, stairs are steep with heavy luggage.',now() - interval '2 days'),
('22222222-2222-4222-8222-000000000002','Sanya Kapoor',5,'Laal maas is the real deal and the sunset table is worth reserving.',now() - interval '5 days'),
('22222222-2222-4222-8222-000000000002','Ishita R',4,'Food excellent, wait was 25 min without a booking.',now() - interval '1 day'),
('22222222-2222-4222-8222-000000000003','Kabir Singh',5,'₹90 filter coffee, courtyard, and nobody rushes you. Best work cafe in the old city.',now() - interval '4 days'),
('22222222-2222-4222-8222-000000000003','Devansh M',4,'Lovely place, gets busy by noon.',now() - interval '12 hours'),
('22222222-2222-4222-8222-000000000004','Meera Rathore',5,'Licensed guides who actually know Mewar history, not just photo spots.',now() - interval '8 days'),
('22222222-2222-4222-8222-000000000004','Claire D',5,'Did the sunrise heritage walk in French. Superb.',now() - interval '3 days');

INSERT INTO public.creator_itineraries (creator_id, title, summary, budget_inr, days) VALUES
('11111111-1111-4111-8111-000000000001','Udaipur in 3 days: lakes & sunsets','My local route — sunrise ghats, City Palace early, boat at golden hour, Monsoon Palace on day 3.',9500,
 '[{"day":1,"stops":[{"time":"06:15","title":"Ambrai Ghat sunrise","note":"Empty, best light","cost":0},{"time":"09:00","title":"City Palace","note":"Buy ticket online","cost":400},{"time":"13:00","title":"Lunch at Ambrai Rooftop","cost":900},{"time":"17:30","title":"Lake Pichola boat + Jag Mandir","cost":400}]},{"day":2,"stops":[{"time":"08:00","title":"Bagore Ki Haveli museum","cost":150},{"time":"11:00","title":"Saheliyon Ki Bari","cost":50},{"time":"16:00","title":"Fateh Sagar cycle loop","cost":150},{"time":"19:00","title":"Bagore dance show","cost":150}]},{"day":3,"stops":[{"time":"09:00","title":"Shilpgram crafts","cost":100},{"time":"17:00","title":"Sajjangarh Monsoon Palace sunset","note":"Shared jeep only","cost":300}]}]'::jsonb),
('11111111-1111-4111-8111-000000000002','Heritage & crafts trail (2 days)','Palace interiors, miniature painting studios and Mewari craft workshops.',7200,
 '[{"day":1,"stops":[{"time":"09:00","title":"City Palace + Crystal Gallery","cost":700},{"time":"12:30","title":"Miniature painting studio, Lal Ghat","cost":500},{"time":"16:00","title":"Jagdish Temple architecture walk","cost":0},{"time":"19:00","title":"Dharohar folk show","cost":150}]},{"day":2,"stops":[{"time":"09:30","title":"Shilpgram live workshops","cost":100},{"time":"13:00","title":"Block printing class","cost":900},{"time":"17:30","title":"Gangaur Ghat evening aarti","cost":0}]}]'::jsonb),
('11111111-1111-4111-8111-000000000003','₹1500/day Udaipur (3 days)','Hostel beds, city buses, thali spots. Everything priced, nothing padded.',4500,
 '[{"day":1,"stops":[{"time":"08:00","title":"Hostel breakfast, Lal Ghat","cost":80},{"time":"10:00","title":"Jagdish Temple + free ghat walk","cost":0},{"time":"13:00","title":"₹120 unlimited thali, Delhi Gate","cost":120},{"time":"18:00","title":"Sunset at Ambrai Ghat (free)","cost":0}]},{"day":2,"stops":[{"time":"09:00","title":"City bus to Fateh Sagar","cost":30},{"time":"11:00","title":"Nehru Garden boat","cost":100},{"time":"19:00","title":"Street kachori dinner","cost":90}]},{"day":3,"stops":[{"time":"07:00","title":"Free sunrise at Doodh Talai","cost":0},{"time":"12:00","title":"Shared jeep Monsoon Palace","cost":300}]}]'::jsonb),
('11111111-1111-4111-8111-000000000004','Udaipur food crawl (2 days)','Dal baati, laal maas, kachori and the five best cafes, walkable order.',6800,
 '[{"day":1,"stops":[{"time":"08:30","title":"Pyaaz kachori, Jagdish Chowk","cost":50},{"time":"11:00","title":"Choti Haveli Cafe filter coffee","cost":90},{"time":"13:30","title":"Dal baati churma thali","cost":250},{"time":"19:00","title":"Laal maas at Ambrai Rooftop","cost":1200}]},{"day":2,"stops":[{"time":"09:00","title":"Cafe hop: Gangaur Ghat side","cost":400},{"time":"13:00","title":"Mewari mutton lunch, Chandpole","cost":600},{"time":"18:00","title":"Lakeside dessert + coffee","cost":350}]}]'::jsonb);
