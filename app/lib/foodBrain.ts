'use client';

/* ══════════════════════════════════════════════════════════════════════════════
   NOURISH SELECT — CULTURAL FOOD BRAIN v2.0
   Nigerian-first recommendation engine with Yoruba / Igbo cultural intelligence
   ═════════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DietTag =
  | 'Vegetarian'
  | 'Vegan'
  | 'Gluten-Free'
  | 'Low-Carb'
  | 'Dairy-Free'
  | 'Keto'
  | 'Paleo'
  | 'Kosher'
  | 'Halal';

export type TimeKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type CountryKey =
  | 'ng' | 'us' | 'in' | 'za' | 'gh'
  | 'gb' | 'jp' | 'mx' | 'it' | 'cn' | 'br' | 'eg';

export type VibeType =
  | 'nostalgic'
  | 'everyday'
  | 'sap'
  | 'wow'
  | 'healthy'
  | 'comfort'
  | 'light'
  | 'indulgent'
  | 'adventurous';

/** Sub-cuisine tags drive the cultural scoring layer */
export type CuisineTag =
  | 'yoruba'
  | 'igbo'
  | 'hausa'
  | 'nigerian-street'
  | 'nigerian-modern'
  | 'nigerian'
  | 'south-african'
  | 'ghanaian'
  | 'british'
  | 'american'
  | 'indian'
  | 'japanese'
  | 'mexican'
  | 'italian'
  | 'chinese'
  | 'brazilian'
  | 'egyptian';

export interface MealNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  name: string;
  slug: string;
  description: string;
  nutrition: MealNutrition;
  tags: DietTag[];
  vibe: VibeType;
  ingredients: string[];
  country: CountryKey;
  timeOfDay: TimeKey;
  cuisine: CuisineTag;
  rating: number;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: number;
  cookTime: number;
  unsplashQuery: string;
}

export interface RecommendationContext {
  country?: CountryKey;
  timeOfDay?: TimeKey;
  preferredVibes?: VibeType[];
  dietPreferences?: DietTag[];
  diets?: DietTag[];
  maxCalories?: number;
  calorieTarget?: number;
  minProtein?: number;
  excludeMeals?: string[];
  history?: string[];
}

export interface MealScoreBreakdown {
  meal: Meal;
  scores: {
    vibeScore: number;
    dietScore: number;
    calorieScore: number;
    proteinScore: number;
    culturalScore: number;
    diversityScore: number;
  };
  totalScore: number;
}

export interface ScoredMeal {
  meal: Meal;
  score: MealScoreBreakdown;
}

// ─────────────────────────────────────────────────────────────────────────────
// CULTURAL INTELLIGENCE CONSTANTS
// The brain that makes the engine feel Nigerian-first
// ─────────────────────────────────────────────────────────────────────────────

const CULTURAL_WEIGHTS: Record<CuisineTag, number> = {
  'yoruba':           48,   // Highest — amala/ewedu/ofada/ayamase/asun
  'igbo':             44,   // Second — ofe/oha/egusi/abacha/nkwobi
  'hausa':            34,   // Strong — tuwo/miyan/suya/masa
  'nigerian-street':  30,   // Boli, suya, puff puff, chin chin
  'nigerian-modern':  24,   // Indomie, Nigerian shawarma, fried rice
  'nigerian':         28,   // General Nigerian (jollof, moi moi, etc.)
  'ghanaian':         12,   // Sisterly culture
  'south-african':    10,
  'british':           8,   // Soft secondary
  'egyptian':          6,
  'brazilian':         4,
  'indian':            3,
  'american':          2,
  'mexican':           2,
  'italian':           2,
  'japanese':          2,
  'chinese':           2,
};

// ─────────────────────────────────────────────────────────────────────────────
// MEAL FACTORY
// ─────────────────────────────────────────────────────────────────────────────

const createMeal = (
  name: string,
  description: string,
  country: CountryKey,
  timeOfDay: TimeKey,
  cuisine: CuisineTag,
  nutrition: MealNutrition,
  tags: DietTag[],
  vibe: VibeType,
  ingredients: string[],
  difficulty: 'easy' | 'medium' | 'hard' = 'easy',
  prepTime = 15,
  cookTime = 25,
  rating = 4.5,
  unsplashQuery?: string
): Meal => ({
  id: `${country}-${timeOfDay}-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  description,
  country,
  timeOfDay,
  cuisine,
  nutrition,
  tags,
  vibe,
  ingredients,
  difficulty,
  prepTime,
  cookTime,
  rating,
  unsplashQuery: unsplashQuery || name,
});

// ─────────────────────────────────────────────────────────────────────────────
// MEAL DATABASE
// ─────────────────────────────────────────────────────────────────────────────

export const MEALS: Record<CountryKey, Record<TimeKey, Meal[]>> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇳🇬  NIGERIA  ─ The heart of the engine
  // ═══════════════════════════════════════════════════════════════════════════
  ng: {

    // ── BREAKFAST ────────────────────────────────────────────────────────────
    breakfast: [
      createMeal('Akara & Ogi (Pap)',
        'Crispy deep-fried bean fritters paired with smooth, warm fermented corn porridge. The Lagos street breakfast that never left the soul.',
        'ng','breakfast','nigerian-street',
        {calories:380,protein:14,carbs:52,fat:12},
        ['Vegetarian','Vegan','Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['black-eyed peas','corn flour','onions','peppers','scotch bonnet','palm oil'],
        'easy',10,25,4.8,'akara bean fritters ogi pap Nigeria street breakfast'),

      createMeal('Amala & Light Ewedu (Morning Bowl)',
        'A small morning serving of smooth dark amala with thin jute-leaf ewedu soup — the Yoruba way to start a heavy day. Earthy, grounding, deeply ancestral.',
        'ng','breakfast','yoruba',
        {calories:360,protein:12,carbs:58,fat:8},
        ['Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['yam flour','ewedu leaves','locust beans','palm oil','crayfish','salt'],
        'easy',5,20,4.7,'amala ewedu soup Yoruba Nigerian breakfast'),

      createMeal('Moi Moi & Ogi',
        'Silky steamed bean pudding packed with boiled egg and flaked fish, paired with warm pap. A protein-rich morning staple across Nigeria.',
        'ng','breakfast','nigerian',
        {calories:340,protein:20,carbs:38,fat:9},
        ['Gluten-Free'],
        'everyday',
        ['black-eyed peas','eggs','peppers','tomatoes','crayfish','palm oil','onions'],
        'medium',15,30,4.7,'moi moi Nigerian steamed bean pudding breakfast'),

      createMeal('Agege Bread & Egg Sauce',
        'Thick, pillowy Agege bread torn and dunked into a fiery tomato-pepper scrambled egg sauce. The Lagos breakfast that built a generation.',
        'ng','breakfast','nigerian-street',
        {calories:420,protein:16,carbs:56,fat:14},
        ['Vegetarian'],
        'nostalgic',
        ['Agege bread','eggs','tomatoes','peppers','onions','vegetable oil','salt'],
        'easy',5,10,4.7,'Agege bread egg sauce Nigerian breakfast Lagos'),

      createMeal('Fried Yam & Egg Sauce',
        'Golden, crispy-edged fried yam with a spiced tomato and egg sauce on the side. The classic Yoruba household morning — beloved by every age group.',
        'ng','breakfast','yoruba',
        {calories:440,protein:12,carbs:66,fat:14},
        ['Vegetarian','Gluten-Free'],
        'nostalgic',
        ['yam','eggs','tomatoes','peppers','onions','vegetable oil','salt'],
        'medium',15,20,4.8,'fried yam egg sauce Yoruba Nigeria breakfast'),

      createMeal('Cornflakes & Peak Milk',
        'Cold crunchy cornflakes with chilled Peak condensed milk — or full cream milk. The Saturday morning of every Nigerian 90s childhood. No explanation needed.',
        'ng','breakfast','nigerian-modern',
        {calories:300,protein:8,carbs:54,fat:6},
        ['Vegetarian'],
        'nostalgic',
        ['cornflakes','Peak milk','banana','sugar'],
        'easy',2,0,4.6,'cornflakes cereal peak milk Nigerian breakfast nostalgic'),

      createMeal('Boiled Plantain & Egg Sauce',
        'Sweet boiled unripe plantain served alongside a fiery tomato-egg sauce. Gluten-free, naturally sweet, and a staple in households across southern Nigeria.',
        'ng','breakfast','nigerian',
        {calories:390,protein:10,carbs:64,fat:10},
        ['Vegetarian','Gluten-Free','Dairy-Free'],
        'everyday',
        ['unripe plantain','eggs','tomatoes','peppers','onions','palm oil','salt'],
        'easy',10,20,4.6,'boiled plantain egg sauce Nigerian breakfast'),

      createMeal('Indomie & Fried Egg',
        'Spiced instant noodles stir-fried dry with a fried egg on top. The Nigerian student\'s breakfast, the child\'s reward, the adult\'s guilty pleasure. Still peak.',
        'ng','breakfast','nigerian-modern',
        {calories:410,protein:16,carbs:52,fat:14},
        [],
        'nostalgic',
        ['Indomie noodles','eggs','green onions','butter','seasoning','scotch bonnet'],
        'easy',2,8,4.8,'indomie noodles fried egg Nigerian breakfast student'),

      createMeal('Okpa (Bambara Nut Pudding)',
        'Dense, dark, mildly spiced steamed pudding from Bambara nut flour — an Enugu and Igbo staple. Rich, protein-packed, wrapped in leaves. Earthy and unlike anything else.',
        'ng','breakfast','igbo',
        {calories:340,protein:18,carbs:36,fat:14},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['Bambara nut flour','palm oil','crayfish','pepper','onions','salt','water'],
        'medium',20,40,4.9,'okpa Bambara nut pudding Igbo Nigeria breakfast Enugu'),

      createMeal('Ogi (Akamu) & Akara',
        'Smooth, slightly fermented corn or guinea corn porridge — warm, silky — alongside fresh akara bean cakes. A timeless pairing found from Lagos to Kano.',
        'ng','breakfast','nigerian',
        {calories:350,protein:13,carbs:52,fat:10},
        ['Vegetarian','Vegan','Gluten-Free','Dairy-Free'],
        'comfort',
        ['guinea corn / corn flour','black-eyed peas','palm oil','onions','pepper','salt'],
        'easy',10,20,4.7,'ogi akamu pap akara bean fritters Nigeria breakfast'),

      createMeal('Bread & Sardine (Naija Style)',
        'Thick bread spread with canned tomato sardine seasoned with diced onion, sliced scotch bonnet, and a squeeze of lime. The ultimate Nigerian hunger fix.',
        'ng','breakfast','nigerian-street',
        {calories:370,protein:20,carbs:42,fat:13},
        ['Dairy-Free'],
        'sap',
        ['sliced bread','canned sardines','onions','scotch bonnet','lime','salt'],
        'easy',3,0,4.6,'bread sardines tomato onion Nigeria breakfast quick'),

      createMeal('Puff Puff & Syrup',
        'Soft, golden deep-fried dough balls — airy inside, slightly crisp outside — dusted with sugar. Birthday parties, roadside sellers, grandma\'s kitchen. Pure comfort.',
        'ng','breakfast','nigerian-street',
        {calories:320,protein:5,carbs:48,fat:12},
        ['Vegetarian','Dairy-Free'],
        'nostalgic',
        ['flour','yeast','sugar','eggs','vanilla','warm water','vegetable oil'],
        'medium',30,20,4.7,'puff puff Nigerian sweet fried dough breakfast'),

      createMeal('Oatmeal with Groundnut',
        'Rolled oats cooked with roasted groundnut (peanut) paste stirred in, a touch of honey, and sliced banana. Clean fuel — the Lagos health-conscious breakfast.',
        'ng','breakfast','nigerian-modern',
        {calories:360,protein:13,carbs:46,fat:13},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'healthy',
        ['oats','groundnut paste','honey','banana','water','salt'],
        'easy',5,10,4.5,'oatmeal groundnut peanut butter Nigerian healthy breakfast'),

      createMeal('Tuwo Shinkafa & Miyan Kuka',
        'Smooth pounded rice swallow paired with baobab-leaf soup — a Hausa breakfast tradition from the North. Light, aromatic, and deeply restorative.',
        'ng','breakfast','hausa',
        {calories:380,protein:14,carbs:58,fat:10},
        ['Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['rice','baobab leaves','beef','onions','dawadawa','palm oil','crayfish'],
        'medium',20,30,4.7,'tuwo shinkafa miyan kuka Hausa Nigerian breakfast'),

      createMeal('Beans & Garri (Eba)',
        'Smooth-mashed spiced beans — ewa agoyin style — paired with a small ball of eba (cassava swallow). The working-class Nigerian breakfast that powers cities.',
        'ng','breakfast','nigerian-street',
        {calories:420,protein:16,carbs:64,fat:10},
        ['Vegetarian','Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['honey beans','palm oil','peppers','onions','garri','water','crayfish'],
        'easy',15,40,4.7,'ewa beans garri eba Nigerian breakfast street'),

      createMeal('Boli & Egg (Roasted Plantain & Egg)',
        'Fire-roasted unripe plantain with a side of scrambled spiced eggs. A humble, filling Port Harcourt breakfast — no fuss, just fuel.',
        'ng','breakfast','nigerian-street',
        {calories:380,protein:14,carbs:52,fat:12},
        ['Vegetarian','Gluten-Free','Dairy-Free'],
        'sap',
        ['unripe plantain','eggs','onions','peppers','salt','vegetable oil'],
        'easy',5,15,4.6,'boli roasted plantain egg Nigerian breakfast'),

      createMeal('Socarrat Rice & Tomato Stew',
        'White rice with a layer of crispy caramelized bottom, served with a quick tomato-based pepper stew. Breakfast meets lunch energy.',
        'ng','breakfast','nigerian-modern',
        {calories:420,protein:12,carbs:68,fat:10},
        ['Vegetarian','Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['rice','tomatoes','peppers','onions','palm oil','crayfish','salt'],
        'easy',5,25,4.6,'socarrat rice tomato stew Nigerian breakfast'),

      createMeal('Cassava Porridge',
        'Grated cassava cooked down into a thick, earthy porridge with palm oil, crayfish, and leafy greens. A Cross River special.',
        'ng','breakfast','igbo',
        {calories:360,protein:8,carbs:58,fat:10},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'comfort',
        ['cassava','palm oil','crayfish','pepper','leafy greens','onions','salt'],
        'medium',15,40,4.7,'cassava porridge Cross River Nigeria breakfast'),

      createMeal('Gwate (Hausa Rice Porridge)',
        'Rice cooked soft and smooth in broth with vegetables, served in a light pepper sauce. A Northern Nigerian morning staple.',
        'ng','breakfast','hausa',
        {calories:340,protein:10,carbs:54,fat:8},
        ['Gluten-Free','Dairy-Free'],
        'everyday',
        ['rice','vegetable broth','peppers','onions','crayfish','tomatoes','salt'],
        'easy',10,25,4.6,'gwate rice porridge Hausa Nigeria breakfast'),

      createMeal('Boiled Maize & Beans (Corn & Beans)',
        'Fresh boiled corn kernels mixed with cooked beans — simple, protein-rich, sold at every Nigerian morning market.',
        'ng','breakfast','nigerian-street',
        {calories:280,protein:14,carbs:52,fat:3},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'healthy',
        ['corn','beans','salt','water'],
        'easy',10,45,4.5,'boiled corn beans Nigeria breakfast street'),

      createMeal('Pap & Akara (Large Portion)',
        'Warm, thick pap paired with 5–6 crispy golden akara fritters. The breakfast that fuels a 12-hour day.',
        'ng','breakfast','nigerian-street',
        {calories:480,protein:18,carbs:64,fat:16},
        ['Vegetarian','Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['corn flour','black-eyed peas','palm oil','peppers','onions','salt'],
        'easy',10,35,4.8,'pap akara large portion Nigeria breakfast'),

      createMeal('Egg Fried Rice',
        'Leftover rice stir-fried with scrambled eggs, peppers, onions, and green peas. The quick Nigerian breakfast when time is tight.',
        'ng','breakfast','nigerian-modern',
        {calories:360,protein:14,carbs:56,fat:8},
        ['Vegetarian','Gluten-Free'],
        'sap',
        ['cooked rice','eggs','peas','peppers','onions','vegetable oil','salt'],
        'easy',5,10,4.6,'egg fried rice Nigerian breakfast quick'),
    ],

    // ── LUNCH ─────────────────────────────────────────────────────────────────
    lunch: [
      createMeal('Amala & Ewedu + Gbegiri',
        'Dark, smooth yam-flour swallow with slippery jute-leaf ewedu soup and creamy gbegiri bean soup — finished with a ladle of Yoruba beef stew. The Yoruba holy trinity.',
        'ng','lunch','yoruba',
        {calories:620,protein:28,carbs:84,fat:18},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['yam flour','ewedu leaves','black-eyed peas','locust beans','beef','palm oil','crayfish'],
        'medium',15,40,4.9,'amala ewedu gbegiri Yoruba Nigerian lunch'),

      createMeal('Pounded Yam & Egusi Soup',
        'Smooth, elastic pounded yam met by a thick, rich ground melon-seed soup simmered with stockfish, assorted meat, and crayfish. The quintessential Nigerian meal.',
        'ng','lunch','igbo',
        {calories:740,protein:34,carbs:90,fat:28},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['yam','egusi seeds','beef','stockfish','uziza leaves','palm oil','onions','crayfish'],
        'hard',30,60,4.9,'pounded yam egusi soup Nigerian Igbo lunch'),

      createMeal('Ofada Rice & Ayamase',
        'Nutty, unpolished local ofada rice paired with fiery green-pepper designer stew — complex, smoky, packed with assorted offal. A Yoruba masterpiece.',
        'ng','lunch','yoruba',
        {calories:680,protein:36,carbs:76,fat:22},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['ofada rice','assorted offal','green peppers','bleached palm oil','onions','locust beans'],
        'hard',30,60,4.9,'ofada rice ayamase Yoruba designer stew Nigerian'),

      createMeal('Jollof Rice & Chicken',
        'Nigeria\'s crown jewel — tomato-pepper party rice with that unmistakable smoky bottom, served with well-seasoned grilled or fried chicken. The dish that won the internet.',
        'ng','lunch','nigerian',
        {calories:620,protein:36,carbs:72,fat:16},
        ['Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['long-grain rice','chicken','tomato paste','onions','peppers','stock cube','bay leaf'],
        'medium',20,45,4.9,'Nigerian jollof rice chicken party'),

      createMeal('Eba & Ogbono Soup',
        'Garri swallow with gelatinous wild-mango seed draw soup — dark, nutty, and deeply satisfying. The "draw" is either your love language or it isn\'t. It\'s a love language.',
        'ng','lunch','igbo',
        {calories:640,protein:28,carbs:88,fat:22},
        ['Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['garri','ogbono seeds','beef','dried fish','palm oil','onions','crayfish','uziza'],
        'medium',15,35,4.8,'eba garri ogbono draw soup Nigerian Igbo lunch'),

      createMeal('Ofe Onugbu (Bitter Leaf Soup) & Fufu',
        'Meticulously washed bitter leaf cooked with assorted meat, cocoyam thickener, and crayfish. Bittersweet, complex, deeply Igbo. Served with cassava fufu.',
        'ng','lunch','igbo',
        {calories:680,protein:30,carbs:78,fat:26},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['bitter leaves','cocoyam','assorted beef','dried fish','palm oil','crayfish','onions'],
        'hard',40,50,4.9,'ofe onugbu bitter leaf soup Igbo fufu Nigerian'),

      createMeal('Efo Riro & Semovita',
        'Sautéed Yoruba spinach stew — robust, peppery, loaded with assorted meat, stockfish, and panla — served with smooth semolina swallow. Lagos Sunday standard.',
        'ng','lunch','yoruba',
        {calories:580,protein:28,carbs:72,fat:20},
        ['Gluten-Free','Dairy-Free'],
        'comfort',
        ['tete/spinach','assorted meat','stockfish','palm oil','peppers','onions','crayfish'],
        'medium',20,30,4.8,'efo riro Yoruba spinach stew semovita Nigerian'),

      createMeal('Beans & Dodo (Ewa & Dodo)',
        'Creamy honey beans in dark ewa agoyin pepper sauce with golden fried ripe plantain. Protein-packed, vegan-friendly, and a roadside classic.',
        'ng','lunch','nigerian-street',
        {calories:540,protein:22,carbs:84,fat:10},
        ['Vegetarian','Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['honey beans','ripe plantain','palm oil','blended peppers','onions','crayfish'],
        'easy',15,40,4.8,'beans dodo ewa agoyin plantain Nigerian lunch'),

      createMeal('Ofe Akwu (Ofe Palm) & Rice',
        'Silky, aromatic palm nut soup simmered with fresh fish and assorted meat — served over plain white rice. An Igbo classic that hits different on a slow afternoon.',
        'ng','lunch','igbo',
        {calories:660,protein:30,carbs:76,fat:26},
        ['Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['palm nuts','beef','fresh fish','uziza','onions','crayfish','salt'],
        'medium',30,50,4.8,'ofe akwu palm nut soup Igbo rice Nigerian'),

      createMeal('Nigerian Seafood Jollof',
        'Tomato-based smoky jollof with tiger prawns, crayfish, and fresh fish. Coastal Nigeria on a plate — rich, briny, and deeply aromatic.',
        'ng','lunch','nigerian',
        {calories:640,protein:40,carbs:68,fat:18},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['rice','tiger prawns','fresh fish','tomato paste','onions','peppers','palm oil'],
        'medium',20,40,4.8,'Nigerian seafood jollof rice prawns fish'),

      createMeal('Afang Soup & Fufu',
        'Efik/Ibibio soup of afang leaves and waterleaf loaded with assorted seafood, periwinkle, and dried fish. Dark, mineral, powerfully flavoured. Cross-River perfection.',
        'ng','lunch','igbo',
        {calories:700,protein:32,carbs:76,fat:28},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['afang leaves','waterleaf','periwinkle','assorted meat','palm oil','crayfish','cassava fufu'],
        'hard',30,50,4.8,'afang soup fufu Cross River Nigeria'),

      createMeal('Macaroni Nigerian Style',
        'Pasta cooked in a spiced tomato-pepper sauce with minced beef, boiled egg, and a touch of palm oil. Every Nigerian student\'s masterpiece.',
        'ng','lunch','nigerian-modern',
        {calories:520,protein:24,carbs:66,fat:14},
        [],
        'sap',
        ['macaroni','ground beef','tomato paste','onions','peppers','boiled egg','palm oil'],
        'easy',10,25,4.6,'Nigerian macaroni pasta tomato sauce minced beef'),

      createMeal('Asaro (Yam Porridge)',
        'Yam pieces cooked down into a thick spiced stew with palm oil, iru locust beans, peppers, and leafy greens. Comfort in a pot. Yoruba home-cooking soul food.',
        'ng','lunch','yoruba',
        {calories:490,protein:8,carbs:86,fat:10},
        ['Vegetarian','Vegan','Gluten-Free','Dairy-Free'],
        'comfort',
        ['yam','palm oil','iru locust beans','peppers','onions','spinach','crayfish'],
        'easy',15,30,4.7,'asaro yam porridge Yoruba Nigerian'),

      createMeal('Miyan Taushe & Tuwo Shinkafa',
        'Bright yellow Hausa pumpkin and groundnut soup served with smooth pounded rice swallow. Northern Nigeria\'s gift to lunch — warming, slightly sweet, deeply nutritious.',
        'ng','lunch','hausa',
        {calories:560,protein:20,carbs:78,fat:18},
        ['Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['pumpkin','groundnut','rice','mutton','onions','tomatoes','palm oil','spices'],
        'medium',20,40,4.7,'miyan taushe Hausa pumpkin soup tuwo Nigerian'),

      createMeal('Rice & Ayamase (Designer Stew)',
        'Plain white rice with the legendary Yoruba green-pepper bleached-palm-oil stew. Boiled eggs, assorted offal, and deep smoky flavour. A weekend luxury.',
        'ng','lunch','yoruba',
        {calories:660,protein:32,carbs:78,fat:24},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['long-grain rice','green peppers','bleached palm oil','assorted offal','boiled eggs','onions'],
        'medium',20,45,4.8,'rice ayamase Yoruba green pepper stew Nigerian'),

      createMeal('Concoction Rice (Budget Lunch)',
        'Plain white rice cooked with whatever vegetables and protein are available — tomatoes, onions, beans, sometimes fish. The resourceful Nigerian lunch.',
        'ng','lunch','nigerian-street',
        {calories:420,protein:14,carbs:72,fat:6},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'sap',
        ['rice','mixed vegetables','beans','onions','salt','water'],
        'easy',10,30,4.5,'concoction rice Nigerian budget lunch'),

      createMeal('Egg & Jollof Rice',
        'Smoky tomato jollof rice with boiled and sliced hard eggs scattered on top. A simple, protein-filled lunch in one plate.',
        'ng','lunch','nigerian-modern',
        {calories:540,protein:20,carbs:76,fat:12},
        ['Vegetarian','Gluten-Free'],
        'sap',
        ['rice','tomato paste','eggs','onions','peppers','stock cube','palm oil'],
        'easy',15,35,4.7,'egg jollof rice Nigerian lunch'),

      createMeal('Fisherman\'s Soup & Rice',
        'A light, brothy soup loaded with fresh fish, leafy greens, and aromatic herbs. Coastal Nigeria in a bowl.',
        'ng','lunch','igbo',
        {calories:480,protein:36,carbs:48,fat:10},
        ['Gluten-Free','Dairy-Free','Low-Carb'],
        'comfort',
        ['fresh fish','leafy greens','peppers','tomatoes','onions','crayfish','rice'],
        'medium',15,30,4.7,'fishermans soup rice Nigerian coastal'),

      createMeal('Yam & Oil (Yam & Palm Oil)',
        'Boiled yam cubes served with warm palm oil seasoned with salt and pepper. The Yoruba peasant\'s lunch that tastes like luxury.',
        'ng','lunch','yoruba',
        {calories:380,protein:6,carbs:68,fat:10},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'sap',
        ['yam','palm oil','salt','pepper','onions'],
        'easy',10,25,4.6,'yam palm oil Yoruba Nigerian lunch'),

      createMeal('Plain Rice & Stew (Everyday)',
        'Simple white rice with a basic tomato-onion-pepper stew. No fancy technique, just home cooking. The average Nigerian lunch.',
        'ng','lunch','nigerian-street',
        {calories:420,protein:10,carbs:72,fat:8},
        ['Vegetarian','Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['rice','tomatoes','onions','peppers','palm oil','salt'],
        'easy',10,25,4.5,'plain rice stew Nigerian everyday lunch'),

      createMeal('Roasted Yam & Pepper',
        'Yam roasted on charcoal with a smoky crust, served with hot pepper sauce and cold water to cool the heat. Street food perfection.',
        'ng','lunch','nigerian-street',
        {calories:360,protein:5,carbs:76,fat:3},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'sap',
        ['yam','charcoal','peppers','onions','salt','water'],
        'easy',0,30,4.6,'roasted yam pepper Nigerian street lunch'),

      createMeal('Corn & Water (Boiled Corn)',
        'Freshly boiled corn on the cob sold at market stalls. The most affordable, most filling street lunch in Nigeria.',
        'ng','lunch','nigerian-street',
        {calories:210,protein:5,carbs:48,fat:2},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'sap',
        ['corn','salt','water','pepper'],
        'easy',5,25,4.4,'boiled corn water Nigerian street lunch'),

      createMeal('Biscuit & Water (Budget Meal)',
        'Simple biscuits dunked in hot water with salt — the absolute bottom-line Nigerian lunch for the broke. It sustains.',
        'ng','lunch','nigerian-street',
        {calories:240,protein:4,carbs:44,fat:4},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'sap',
        ['biscuits','hot water','salt','sugar'],
        'easy',2,5,3.8,'biscuit water budget Nigerian lunch'),

      createMeal('Bread & Water (Bread & Water)',
        'A slice of thick Nigerian bread with a glass of cold water — survival lunch for students and manual workers on a budget.',
        'ng','lunch','nigerian-street',
        {calories:220,protein:6,carbs:44,fat:2},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'sap',
        ['sliced bread','cold water','salt'],
        'easy',2,0,3.7,'bread water budget Nigerian lunch'),
    ],

    // ── DINNER ────────────────────────────────────────────────────────────────
    dinner: [
      createMeal('Oha Soup & Pounded Yam',
        'Delicate oha leaves slow-cooked with cocoyam thickener, assorted meat, and uziza — served with smooth pounded yam. Anambra\'s finest dinner. Herbal, nuanced, beautiful.',
        'ng','dinner','igbo',
        {calories:680,protein:30,carbs:88,fat:24},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['oha leaves','uziza','cocoyam','assorted beef','palm oil','crayfish','stockfish'],
        'hard',30,50,4.9,'oha soup pounded yam Igbo Anambra Nigerian dinner'),

      createMeal('Amala & Abula (Full Set)',
        'A full Yoruba abula — amala with ewedu, gbegiri, and stew all ladled together. The dish that defines Ibadan evenings and Lagos owambe culture.',
        'ng','dinner','yoruba',
        {calories:660,protein:30,carbs:86,fat:20},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['yam flour','ewedu','black-eyed peas','assorted beef','palm oil','locust beans','crayfish'],
        'medium',15,40,4.9,'amala abula ewedu gbegiri Yoruba Ibadan Nigerian dinner'),

      createMeal('Nkwobi',
        'Spiced cow-foot cooked until fall-off-the-bone tender in a thick palm-oil utazi sauce with onions. An Igbo evening delicacy. Messy, glorious, unforgettable.',
        'ng','dinner','igbo',
        {calories:520,protein:40,carbs:10,fat:32},
        ['Gluten-Free','Dairy-Free','Low-Carb'],
        'wow',
        ['cow foot','palm oil','utazi leaves','onions','crayfish','edible potash','salt'],
        'hard',20,120,4.9,'nkwobi cow foot Igbo Nigerian dinner delicacy'),

      createMeal('Banga Soup & Starch',
        'Delta palm-nut soup with its unmistakable spice blend — oburunbebe stick and beletete — served with wheaten starch swallow. A south-south Nigerian masterpiece.',
        'ng','dinner','igbo',
        {calories:700,protein:28,carbs:80,fat:30},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['palm nuts','assorted meat','beletete leaf','oburunbebe stick','crayfish','onions'],
        'hard',30,60,4.9,'banga soup starch Delta Nigerian dinner'),

      createMeal('Eba & Okro Soup',
        'Garri swallow paired with viscous okro soup enriched with dried fish, assorted meat, and crayfish. The everyday Nigerian dinner that never gets old.',
        'ng','dinner','nigerian',
        {calories:600,protein:28,carbs:84,fat:16},
        ['Gluten-Free','Dairy-Free'],
        'everyday',
        ['garri','okra','assorted beef','dried fish','palm oil','onions','crayfish'],
        'easy',10,25,4.7,'eba garri okro soup Nigerian dinner everyday'),

      createMeal('Pepper Soup (Goat Meat)',
        'Clear, intensely spiced broth with tender goat meat, utazi leaves, and the aromatic pepper soup spice blend. The Nigerian cure for everything including the common cold.',
        'ng','dinner','nigerian-street',
        {calories:320,protein:36,carbs:6,fat:14},
        ['Gluten-Free','Dairy-Free','Low-Carb'],
        'comfort',
        ['goat meat','pepper soup spices','utazi leaves','onions','crayfish','salt'],
        'easy',10,30,4.8,'goat meat pepper soup Nigerian dinner'),

      createMeal('Suya & Jollof Rice Combo',
        'The late-night combination: smoky suya skewers alongside a small portion of jollof rice. The Nigerian owambe afters experience in one plate.',
        'ng','dinner','nigerian-street',
        {calories:640,protein:38,carbs:64,fat:22},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['beef','yaji suya spice','rice','tomato paste','peppers','onions','groundnut oil'],
        'medium',20,35,4.8,'suya jollof rice combo Nigerian dinner street'),

      createMeal('Semovita & Egusi Soup',
        'Smooth semolina swallow with a thick melon-seed soup loaded with beef, dried fish, and spinach. A midweek Nigerian dinner that feels like a weekend.',
        'ng','dinner','nigerian',
        {calories:620,protein:26,carbs:80,fat:20},
        ['Gluten-Free','Dairy-Free'],
        'comfort',
        ['semolina','egusi seeds','beef','dried fish','spinach','palm oil','onions','crayfish'],
        'medium',20,35,4.7,'semovita egusi soup Nigerian dinner'),

      createMeal('Iwuk Edesi (Native Jollof Rice)',
        'Palm-oil rice cooked with periwinkle, dried fish, leafy greens, and crayfish. Deeply aromatic, rusty-red in colour — a Cross River/Efik rice dish that surpasses regular jollof.',
        'ng','dinner','igbo',
        {calories:660,protein:26,carbs:84,fat:20},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['local rice','palm oil','periwinkle','dried fish','leafy greens','crayfish','onions'],
        'medium',20,40,4.8,'iwuk edesi native jollof rice Efik Nigeria dinner'),

      createMeal('Asun & Fried Plantain',
        'Peppered smoked goat meat — fiery, sticky, full of deep smoky flavour — with slices of golden fried plantain on the side. A Yoruba celebration plate that also works on a Tuesday.',
        'ng','dinner','yoruba',
        {calories:520,protein:38,carbs:36,fat:24},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['goat meat','scotch bonnet','tatashe','onions','palm oil','vegetable oil','ripe plantain'],
        'medium',20,40,4.9,'asun peppered goat meat Yoruba fried plantain Nigeria'),

      createMeal('Eka (Black Soup)',
        'Dark, rich Annang/Efik soup made from black potash and leafy greens with assorted meat. An acquired taste — deeply cultural, intensely flavourful.',
        'ng','dinner','igbo',
        {calories:480,protein:28,carbs:24,fat:28},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['black potash','leafy greens','assorted meat','palm oil','crayfish','onions','salt'],
        'hard',15,40,4.8,'eka black soup Annang Efik Nigeria'),

      createMeal('Boiled Rice & Stew',
        'Plain boiled white rice with a simple pepper stew. The everyday dinner that requires no flair, just sustenance.',
        'ng','dinner','nigerian-street',
        {calories:420,protein:10,carbs:72,fat:8},
        ['Vegetarian','Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['rice','tomatoes','peppers','onions','palm oil','salt','water'],
        'easy',10,25,4.5,'boiled rice stew Nigerian dinner everyday'),

      createMeal('Plantain Porridge (Jivu)',
        'Unripe plantain cooked down into a thick, hearty porridge with palm oil, vegetables, and fish. A filling dinner that sticks to your ribs.',
        'ng','dinner','igbo',
        {calories:520,protein:16,carbs:84,fat:12},
        ['Gluten-Free','Dairy-Free'],
        'comfort',
        ['unripe plantain','palm oil','dried fish','peppers','onions','leafy greens','salt'],
        'medium',15,40,4.7,'plantain porridge jivu Nigerian dinner'),

      createMeal('Fish Pepper Soup (Light)',
        'A brothy, aromatic pepper soup made with fresh fish fillets. Light, quick, and deeply satisfying for a weeknight.',
        'ng','dinner','nigerian',
        {calories:280,protein:32,carbs:8,fat:12},
        ['Gluten-Free','Dairy-Free','Low-Carb'],
        'comfort',
        ['fresh fish fillets','pepper soup spices','utazi leaves','ginger','onions','crayfish'],
        'easy',10,20,4.7,'fish pepper soup light Nigerian dinner'),

      createMeal('Fried Plantain with Pepper Sauce',
        'Golden-fried ripe plantain slices served with a side of spiced pepper sauce. A simple, satisfying dinner.',
        'ng','dinner','nigerian-street',
        {calories:360,protein:2,carbs:72,fat:8},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['ripe plantain','vegetable oil','peppers','onions','crayfish','salt'],
        'easy',5,20,4.6,'fried plantain pepper sauce Nigerian dinner'),

      createMeal('Pasta with Meat Sauce',
        'Spaghetti or penne tossed in a quick tomato-minced meat sauce. The quick Nigerian dinner when time is short.',
        'ng','dinner','nigerian-modern',
        {calories:480,protein:22,carbs:68,fat:12},
        ['Dairy-Free'],
        'sap',
        ['pasta','ground beef','tomatoes','onions','garlic','peppers','olive oil'],
        'easy',5,25,4.6,'pasta meat sauce Nigerian dinner quick'),

      createMeal('Watermelon & Groundnut (Late Snack Dinner)',
        'Sliced fresh watermelon eaten with roasted salted groundnuts. A light, refreshing evening meal after a hot day.',
        'ng','dinner','nigerian-street',
        {calories:240,protein:6,carbs:42,fat:8},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'light',
        ['fresh watermelon','roasted groundnuts','salt'],
        'easy',3,0,4.5,'watermelon groundnut Nigerian light evening'),
    ],

    // ── SNACK ─────────────────────────────────────────────────────────────────
    snack: [
      createMeal('Suya',
        'Grilled beef skewers caked in yaji — a spice blend of groundnut powder, ginger, garlic, and pepper. Night markets, roadside stalls, Lagos traffic. Nigeria\'s greatest street food.',
        'ng','snack','nigerian-street',
        {calories:240,protein:28,carbs:4,fat:12},
        ['Gluten-Free','Dairy-Free','Low-Carb'],
        'wow',
        ['beef','groundnut powder','ginger','garlic','cayenne pepper','onion powder','salt'],
        'easy',10,15,4.9,'suya grilled beef skewers yaji Nigerian street food'),

      createMeal('Boli & Groundnut',
        'Fire-roasted unripe plantain — charred, smoky, and sweet — eaten with seasoned roasted groundnuts. A Lagos bridge culture classic. Pure nostalgia in two ingredients.',
        'ng','snack','nigerian-street',
        {calories:280,protein:7,carbs:52,fat:8},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['unripe plantain','groundnuts','salt','pepper'],
        'easy',0,15,4.8,'boli roasted plantain groundnut Nigerian street Lagos'),

      createMeal('Gala Sausage Roll',
        'Nigeria\'s legendary roadside sausage roll — flaky pastry wrapped around spiced minced meat filling. Best eaten slightly warm from a roadside hawker at a traffic jam.',
        'ng','snack','nigerian-street',
        {calories:280,protein:10,carbs:30,fat:14},
        [],
        'nostalgic',
        ['pastry flour','minced beef','onions','peppers','spices','butter','egg wash'],
        'easy',10,25,4.7,'gala sausage roll Nigerian street food pastry'),

      createMeal('Meat Pie',
        'Golden-crusted Nigerian meat pie with spiced minced beef, diced potato, and carrot filling. Birthday parties, school tuck shops, Mama\'s kitchen. Childhood sealed in pastry.',
        'ng','snack','nigerian-modern',
        {calories:320,protein:10,carbs:38,fat:14},
        [],
        'sap',
        ['flour','ground beef','potatoes','carrots','onions','peppers','butter','egg'],
        'medium',15,30,4.8,'Nigerian meat pie pastry party'),

      createMeal('Chin Chin',
        'Crispy deep-fried dough snacks with nutmeg and a hint of coconut — crunchy all the way through. Christmas tins, grandma\'s kitchen, festive season nostalgia.',
        'ng','snack','nigerian-street',
        {calories:260,protein:4,carbs:36,fat:13},
        ['Vegetarian'],
        'nostalgic',
        ['flour','eggs','butter','coconut milk','nutmeg','sugar','salt'],
        'medium',15,20,4.7,'chin chin Nigerian crispy fried snack festive'),

      createMeal('Puff Puff',
        'Soft, golden, airy deep-fried dough balls — slightly chewy, slightly sweet. Roadside sellers, birthday parties, church after-service. Nigeria\'s favourite sweet street snack.',
        'ng','snack','nigerian-street',
        {calories:270,protein:4,carbs:38,fat:11},
        ['Vegetarian','Dairy-Free'],
        'nostalgic',
        ['flour','yeast','sugar','eggs','vanilla','warm water','vegetable oil'],
        'medium',30,20,4.8,'puff puff Nigerian sweet fried dough street snack'),

      createMeal('Yamarita (Yam in Egg Batter)',
        'Yam slices dipped in seasoned egg batter and pan-fried until golden and crispy on the outside, fluffy inside. A Nigerian remix that upgraded the humble yam.',
        'ng','snack','nigerian-modern',
        {calories:310,protein:10,carbs:48,fat:12},
        ['Vegetarian','Gluten-Free'],
        'wow',
        ['yam','eggs','flour','onion powder','pepper','salt','vegetable oil'],
        'easy',10,15,4.8,'yamarita yam egg batter fried Nigerian snack'),

      createMeal('Asun (Mini Portion)',
        'A small plate of peppered smoked goat meat — fiery, sticky, utterly addictive. Best at an owambe buffet table at midnight. The Yoruba snack that makes you stay late.',
        'ng','snack','yoruba',
        {calories:220,protein:24,carbs:4,fat:12},
        ['Gluten-Free','Dairy-Free','Low-Carb'],
        'wow',
        ['goat meat','scotch bonnet','tatashe','onions','vegetable oil','salt'],
        'medium',10,25,4.9,'asun peppered goat meat Yoruba snack owambe'),

      createMeal('Kuli Kuli',
        'Dense, crunchy groundnut cake — the pressed residue after groundnut oil extraction, spiced with pepper. A Northern Nigerian snack that is fiercely addictive and surprisingly high in protein.',
        'ng','snack','hausa',
        {calories:190,protein:10,carbs:12,fat:12},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['groundnuts','pepper','salt'],
        'medium',15,30,4.7,'kuli kuli groundnut cake Hausa Nigerian snack North'),

      createMeal('Nigerian Sharwama',
        'Naija-style flatbread wrap stuffed with grilled chicken strips, cabbage slaw, fried plantain, fries, and a generous drizzle of mayo and ketchup. Lagos party food.',
        'ng','snack','nigerian-modern',
        {calories:460,protein:22,carbs:50,fat:18},
        ['Dairy-Free'],
        'sap',
        ['flatbread','chicken','cabbage','carrots','plantain','mayonnaise','ketchup','peppers'],
        'easy',10,15,4.7,'Nigerian shawarma wrap chicken Lagos street food'),

      createMeal('Garden Egg & Ose Oji',
        'Fresh African garden eggs dipped into creamy groundnut paste (ose oji) with crayfish and pepper. A wholesome Igbo traditional snack — humble, delicious, ancestral.',
        'ng','snack','igbo',
        {calories:160,protein:6,carbs:14,fat:10},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['garden eggs','groundnut paste','crayfish','pepper','onions','salt'],
        'easy',5,0,4.7,'garden egg ose oji groundnut Igbo Nigerian snack traditional'),

      createMeal('Pounded Cassava & Pepper Sauce',
        'Smooth pounded cassava served with fiery pepper sauce spiked with crayfish. Simple, filling, deeply satisfying — the ultimate road trip snack across Nigeria.',
        'ng','snack','nigerian-street',
        {calories:220,protein:8,carbs:44,fat:4},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['cassava','peppers','onions','crayfish','salt','palm oil'],
        'medium',10,20,4.7,'pounded cassava pepper sauce Nigerian snack street'),

      createMeal('Boiled Corn & Roasted Peanuts',
        'Fresh boiled corn kernels with roasted salted peanuts — a simple, protein-rich combo sold at every Nigerian market. Pure, honest, satisfying.',
        'ng','snack','nigerian-street',
        {calories:240,protein:10,carbs:32,fat:10},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['corn','peanuts','salt'],
        'easy',5,20,4.6,'boiled corn roasted peanuts Nigeria snack'),

      createMeal('Fried Fish Paste (Fishcake)',
        'Flaked dried fish mixed with peppers, onions, and flour, then pan-fried into golden patties. A protein-packed snack from coastal Nigeria.',
        'ng','snack','nigerian-street',
        {calories:200,protein:14,carbs:18,fat:8},
        ['Gluten-Free'],
        'sap',
        ['dried fish','peppers','onions','flour','eggs','vegetable oil','salt'],
        'easy',10,15,4.6,'fishcake fried fish patty Nigerian snack'),

      createMeal('Agidi (Corn Jelly) & Sauce',
        'Smooth gelatinous corn jelly served with spiced pepper sauce. An underrated Lagos snack that is light, refreshing, and deeply nostalgic.',
        'ng','snack','nigerian-street',
        {calories:180,protein:4,carbs:42,fat:2},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['corn flour','water','salt','peppers','onions','crayfish'],
        'easy',10,30,4.5,'agidi corn jelly sauce Nigerian snack Lagos'),

      createMeal('Roasted Plantain Chips',
        'Thin-sliced green plantain deep-fried until crispy and golden. A healthier alternative to suya — equally addictive at football matches and bus stations.',
        'ng','snack','nigerian-modern',
        {calories:260,protein:2,carbs:38,fat:12},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['unripe plantain','vegetable oil','salt','spices'],
        'easy',5,15,4.7,'plantain chips fried Nigerian snack crispy'),

      createMeal('Cashew Nuts & Pepper',
        'Roasted salted cashews with a dusting of pepper and ginger powder. The fancy Nigerian snack you serve at owambe and still eat by yourself.',
        'ng','snack','nigerian-modern',
        {calories:320,protein:9,carbs:18,fat:27},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'wow',
        ['cashew nuts','pepper','ginger','salt'],
        'easy',0,20,4.8,'roasted cashews pepper Nigerian snack'),

      createMeal('Boiled Peanuts (Boil Boil)',
        'Soft peanuts boiled with salt and pepper. A humble street snack that tastes impossibly rich and creamy for its simplicity.',
        'ng','snack','nigerian-street',
        {calories:210,protein:9,carbs:20,fat:11},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['raw peanuts','salt','pepper','water'],
        'easy',10,60,4.6,'boiled peanuts Nigeria street snack'),

      createMeal('Ginger & Turmeric Root Chew',
        'Fresh raw ginger and turmeric root sold at Nigerian markets — you buy, you chew, you feel alive. Natural energy, sharp taste, Yoruba wisdom.',
        'ng','snack','nigerian-street',
        {calories:40,protein:1,carbs:10,fat:0},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'sap',
        ['fresh ginger','turmeric root'],
        'easy',0,0,4.3,'ginger turmeric root Nigerian snack market'),

      createMeal('Zobo (Hibiscus Drink)',
        'Tart, burgundy hibiscus tea sweetened with ginger, clove, and sugar. Served cold — the ultimate Nigerian refreshment on a hot day.',
        'ng','snack','nigerian-modern',
        {calories:80,protein:0,carbs:20,fat:0},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'everyday',
        ['dried hibiscus','ginger','clove','sugar','water','lime'],
        'easy',10,20,4.7,'zobo hibiscus drink Nigerian refreshment'),

      createMeal('Masa (Spiced Cornmeal Cake)',
        'Hausa steamed or fried cornmeal pudding cake with roasted groundnuts — slightly sweet, deeply satisfying. Northern Nigeria\'s greatest snack secret.',
        'ng','snack','hausa',
        {calories:280,protein:7,carbs:42,fat:10},
        ['Vegetarian','Dairy-Free'],
        'comfort',
        ['cornmeal','roasted groundnuts','honey','ginger','cinnamon','salt'],
        'medium',15,30,4.7,'masa spiced cornmeal Hausa Nigerian snack'),

      createMeal('Gala & Water (Budget Combo)',
        'A Gala sausage roll paired with a sachet of cold water. The ultimate sapa meal — cheap, filling, undeniably satisfying.',
        'ng','snack','nigerian-street',
        {calories:320,protein:11,carbs:35,fat:15},
        [],
        'sap',
        ['gala pastry','minced beef','cold water','salt'],
        'easy',1,1,4.5,'gala water budget Nigerian sapa snack'),

      createMeal('Bread & Groundnut Paste',
        'Soft bread spread with creamy roasted groundnut paste and a pinch of salt. The poor man\'s peanut butter sandwich.',
        'ng','snack','nigerian-street',
        {calories:280,protein:10,carbs:38,fat:10},
        ['Vegan'],
        'sap',
        ['sliced bread','groundnut paste','salt'],
        'easy',2,0,4.4,'bread groundnut paste Nigerian sapa snack'),

      createMeal('Hot Dog (Nigerian Style)',
        'A sausage wrapped in a slice of bread with mustard and mayonnaise. The hybrid snack that sits between sapa and wow.',
        'ng','snack','nigerian-modern',
        {calories:320,protein:12,carbs:32,fat:14},
        [],
        'sap',
        ['sliced bread','sausage','mustard','mayonnaise','onions'],
        'easy',3,10,4.6,'hot dog Nigerian style snack'),

      createMeal('Butter Bread (Bread & Butter)',
        'Fresh sliced bread spread with salted butter — sometimes with a bit of sugar. A nostalgic comfort that feeds the soul.',
        'ng','snack','nigerian-street',
        {calories:280,protein:5,carbs:36,fat:12},
        ['Vegetarian'],
        'nostalgic',
        ['sliced bread','butter','salt','sugar'],
        'easy',2,0,4.5,'butter bread Nigerian snack nostalgic'),

      createMeal('Roasted Corn & Water',
        'Fire-roasted corn on the cob with a glass of cold water to cool the heat. Market-side perfection for 100 naira.',
        'ng','snack','nigerian-street',
        {calories:150,protein:4,carbs:36,fat:1},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'sap',
        ['corn on the cob','charcoal','salt','water'],
        'easy',0,15,4.4,'roasted corn water Nigerian sapa street'),

      createMeal('Fried Eggs & Bread',
        'A couple of fried eggs between soft bread with a dab of mayo. The protein-packed student snack.',
        'ng','snack','nigerian-street',
        {calories:360,protein:16,carbs:28,fat:18},
        ['Vegetarian'],
        'sap',
        ['eggs','bread','vegetable oil','mayo','salt','pepper'],
        'easy',5,10,4.5,'fried eggs bread Nigerian snack student'),

      createMeal('Watermelon (Fresh Sliced)',
        'Sweet, cold watermelon sold in slices at every Nigerian market — the ultimate hot-day refreshment.',
        'ng','snack','nigerian-street',
        {calories:60,protein:1,carbs:14,fat:0},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'light',
        ['fresh watermelon'],
        'easy',2,0,4.6,'watermelon fresh sliced Nigerian snack'),

      createMeal('Mango (Fresh or Dried)',
        'Sweet, juicy mango — fresh in season or dried year-round. The affordable Nigerian street snack that brightens any day.',
        'ng','snack','nigerian-street',
        {calories:120,protein:1,carbs:28,fat:0},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'healthy',
        ['fresh mango / dried mango strips'],
        'easy',1,0,4.7,'mango fresh dried Nigerian snack'),

      createMeal('Orange (Peeled)',
        'Fresh-squeezed orange from a street vendor — juice running down your fingers. The most Nigerian snack.',
        'ng','snack','nigerian-street',
        {calories:100,protein:2,carbs:24,fat:0},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'healthy',
        ['fresh orange'],
        'easy',2,0,4.5,'orange fresh peeled Nigerian snack street'),

      createMeal('Coconut (Fresh)',
        'Fresh green coconut cracked open — you drink the water, eat the soft white meat. Pure tropical simplicity.',
        'ng','snack','nigerian-street',
        {calories:140,protein:3,carbs:6,fat:12},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'light',
        ['fresh green coconut'],
        'easy',3,0,4.8,'coconut fresh Nigerian snack tropical'),

      createMeal('Pawpaw (Ripe)',
        'Soft, sweet ripe pawpaw — sometimes served with lime. A market staple that costs almost nothing.',
        'ng','snack','nigerian-street',
        {calories:110,protein:2,carbs:24,fat:0},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'healthy',
        ['ripe pawpaw','lime'],
        'easy',2,0,4.6,'pawpaw ripe Nigerian snack fruit'),

      createMeal('Guava (Ripe & Sweet)',
        'Bright pink or yellow guava eaten fresh with a pinch of salt — the cheapest nutritious snack.',
        'ng','snack','nigerian-street',
        {calories:80,protein:3,carbs:18,fat:0},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'healthy',
        ['ripe guava','salt'],
        'easy',1,0,4.5,'guava ripe sweet Nigerian snack'),

      createMeal('Paw Paw & Lime (Light Snack)',
        'Sliced ripe pawpaw with fresh lime juice squeezed over — refreshing, light, virtually free.',
        'ng','snack','nigerian-street',
        {calories:90,protein:1,carbs:22,fat:0},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'light',
        ['ripe pawpaw','lime'],
        'easy',3,0,4.5,'pawpaw lime light Nigerian snack'),

      createMeal('Suya & Bread (Suya Sandwich)',
        'Sliced suya meat placed between bread — DIY suya sandwich. The street food remix.',
        'ng','snack','nigerian-street',
        {calories:420,protein:28,carbs:36,fat:16},
        ['Dairy-Free'],
        'wow',
        ['beef','yaji spice','bread','onions','salt'],
        'easy',10,20,4.7,'suya bread sandwich Nigerian snack combo'),

      createMeal('Sardines & Crackers',
        'Canned sardines spread on butter crackers — protein-packed, tasty, portable.',
        'ng','snack','nigerian-street',
        {calories:240,protein:14,carbs:20,fat:12},
        [],
        'sap',
        ['canned sardines','butter crackers','salt','pepper'],
        'easy',2,5,4.5,'sardines crackers Nigerian snack'),

      createMeal('Peanut Brittle (Hausa)',
        'Caramelized peanuts in hardened sugar — crunchy, sweet, fiercely addictive. The Hausa market standard.',
        'ng','snack','nigerian-modern',
        {calories:300,protein:8,carbs:38,fat:14},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'nostalgic',
        ['roasted peanuts','sugar','butter','salt'],
        'medium',5,15,4.7,'peanut brittle Hausa caramelized Nigerian snack'),

      createMeal('Boli & Suya Combo',
        'Roasted plantain with a side of suya — the perfect pairing of sweet and spicy. Roadside genius.',
        'ng','snack','nigerian-street',
        {calories:380,protein:20,carbs:56,fat:10},
        ['Gluten-Free','Dairy-Free'],
        'wow',
        ['unripe plantain','beef','yaji spice','salt'],
        'easy',5,25,4.8,'boli suya combo Nigerian snack perfect pairing'),

      createMeal('Roasted Pumpkin Seeds (Egusi)',
        'Roasted and salted pumpkin seeds — crunchy, nutty, high in protein. A healthier street snack.',
        'ng','snack','nigerian-street',
        {calories:240,protein:10,carbs:8,fat:20},
        ['Vegan','Gluten-Free','Dairy-Free'],
        'healthy',
        ['pumpkin seeds','salt','pepper'],
        'easy',5,20,4.6,'pumpkin seeds egusi roasted Nigerian snack'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇿🇦  SOUTH AFRICA
  // ═══════════════════════════════════════════════════════════════════════════
  za: {
    breakfast: [
      createMeal('Pap & Scrambled Eggs','Smooth maize pap with soft scrambled eggs and grilled tomato. The South African morning anchored in simplicity.','za','breakfast','south-african',{calories:370,protein:15,carbs:48,fat:12},['Vegetarian','Gluten-Free'],'everyday',['maize meal','eggs','tomato','butter','salt'],'easy',5,15,4.5,'maize pap scrambled eggs South Africa breakfast'),
      createMeal('Vetkoek & Mince','Deep-fried dough bread split and stuffed with spiced minced beef. A township breakfast legend.','za','breakfast','south-african',{calories:520,protein:22,carbs:54,fat:22},['Dairy-Free'],'nostalgic',['flour','yeast','ground beef','onions','peppers','spices'],'medium',30,20,4.7,'vetkoek fried bread mince South Africa'),
      createMeal('Rooibos & Rusks','Caffeine-free rooibos tea with twice-baked buttermilk rusks for dunking. Quintessentially South African.','za','breakfast','south-african',{calories:220,protein:4,carbs:40,fat:5},['Vegetarian'],'nostalgic',['rooibos tea','buttermilk rusks'],'easy',2,0,4.6,'rooibos tea rusks South Africa'),
      createMeal('Boerewors Scramble','Crumbled boerewors sausage pan-fried with eggs, onion, and tomato. A hearty weekend opener.','za','breakfast','south-african',{calories:480,protein:28,carbs:8,fat:34},['Gluten-Free'],'wow',['boerewors','eggs','onion','tomato','salt'],'easy',5,15,4.7,'boerewors sausage scramble South Africa breakfast'),
    ],
    lunch: [
      createMeal('Bunny Chow','A hollowed half-loaf of white bread filled to the brim with Durban curry — beef, chicken, or beans. The iconic South African street food experience.','za','lunch','south-african',{calories:720,protein:30,carbs:88,fat:20},['Dairy-Free'],'wow',['white bread','beef curry','onions','tomato','spices'],'medium',20,40,4.8,'bunny chow Durban curry bread South Africa'),
      createMeal('Bobotie & Yellow Rice','Spiced minced meat baked under savoury egg custard with saffron-turmeric rice and Mrs Ball\'s chutney.','za','lunch','south-african',{calories:640,protein:32,carbs:62,fat:24},[],'nostalgic',['minced beef','eggs','cream','turmeric','rice','chutney','dried fruit'],'medium',20,45,4.7,'bobotie yellow rice chutney South Africa'),
      createMeal('Samp & Beans (Umngqusho)','Crushed corn kernels slow-cooked with sugar beans until tender. Mandela\'s favourite — nourishing, simple, deeply flavourful.','za','lunch','south-african',{calories:480,protein:18,carbs:86,fat:4},['Vegan','Gluten-Free','Dairy-Free'],'everyday',['samp','sugar beans','onions','salt'],'easy',20,90,4.6,'samp beans umngqusho South Africa'),
      createMeal('Gatsby Sandwich','A massive Cape Town roll loaded with steak, fried chips, sauces, and salad. One roll feeds two. The ultimate Cape Flats comfort.','za','lunch','south-african',{calories:860,protein:42,carbs:92,fat:36},['Dairy-Free'],'wow',['french loaf','steak','chips','lettuce','tomato','mayo','ketchup'],'easy',10,15,4.8,'gatsby sandwich Cape Town South Africa'),
    ],
    dinner: [
      createMeal('Braai Meat & Pap','Wood-fired mix of boerewors, lamb chops, and chicken with chakalaka relish and smooth pap. South Africa\'s love language.','za','dinner','south-african',{calories:780,protein:48,carbs:42,fat:38},['Gluten-Free','Dairy-Free'],'wow',['boerewors','lamb chops','chicken','chakalaka','maize meal'],'medium',20,40,4.8,'braai South Africa BBQ boerewors pap'),
      createMeal('Potjiekos','Slow-cooked cast-iron pot stew layered with meat, vegetables, and warm spices. Rich, complex, made with patience.','za','dinner','south-african',{calories:620,protein:38,carbs:44,fat:26},['Gluten-Free','Dairy-Free'],'comfort',['lamb','potatoes','carrots','onions','spices'],'hard',20,180,4.7,'potjiekos cast iron stew South Africa'),
      createMeal('Umleqwa Braised Chicken','Free-range village chicken braised low and slow with indigenous herbs and root vegetables. Tender with incredible depth.','za','dinner','south-african',{calories:540,protein:44,carbs:18,fat:28},['Gluten-Free','Dairy-Free'],'nostalgic',['free-range chicken','herbs','root vegetables','onions','spices'],'medium',15,90,4.7,'umleqwa braised village chicken South Africa'),
    ],
    snack: [
      createMeal('Biltong','Air-dried spiced beef or game meat. South Africa\'s answer to jerky — high-protein, low-carb, deeply satisfying.','za','snack','south-african',{calories:180,protein:30,carbs:2,fat:6},['Gluten-Free','Dairy-Free','Low-Carb'],'everyday',['beef','coriander','pepper','salt','vinegar'],'easy',0,0,4.7,'biltong dried beef South Africa snack'),
      createMeal('Koeksisters','Twisted deep-fried dough soaked in ice-cold sugar syrup until glistening. Irresistibly sticky and sweet.','za','snack','south-african',{calories:290,protein:3,carbs:50,fat:10},['Vegetarian','Dairy-Free'],'nostalgic',['flour','yeast','syrup','cinnamon','ginger'],'hard',60,20,4.7,'koeksisters South Africa fried pastry syrup'),
      createMeal('Chikhalwane (Fat Cake)','Fried dough soufflé — light, airy, fluffy — served with sweetened condensed milk or savory curry. A township favorite.','za','snack','south-african',{calories:280,protein:3,carbs:42,fat:12},['Vegetarian','Dairy-Free'],'comfort',['flour','yeast','sugar','vanilla','vegetable oil'],'medium',30,20,4.6,'chikhalwane fat cake fried dough South Africa'),
      createMeal('Droëwors (Dry Sausage)','Thin dried beef sausage with coriander, black pepper, and vinegar. Chewier than biltong, packed with spice.','za','snack','south-african',{calories:200,protein:28,carbs:1,fat:10},['Gluten-Free','Dairy-Free','Low-Carb'],'everyday',['beef mince','coriander','pepper','salt','vinegar','casings'],'medium',20,7,4.7,'droewors dry sausage South Africa'),
      createMeal('Pap & Vleis (Maize & Meat Skewer)','Grilled meat skewers with soft pap and tomato sauce. A village braai snack that tastes like home.','za','snack','south-african',{calories:320,protein:24,carbs:28,fat:14},['Gluten-Free','Dairy-Free'],'comfort',['beef','maize meal','tomato sauce','onions','spices'],'easy',10,20,4.6,'pap meat skewer braai South Africa snack'),
      createMeal('Mogodu (Tripe & Vegetables)','Slow-cooked tripe with potatoes, onions, and peppers — earthy, rich, deeply nourishing. A township treasure.','za','snack','south-african',{calories:240,protein:26,carbs:18,fat:8},['Gluten-Free','Dairy-Free'],'wow',['beef tripe','potatoes','onions','peppers','salt','spices'],'medium',15,90,4.7,'mogodu tripe vegetables South Africa'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇬🇭  GHANA
  // ═══════════════════════════════════════════════════════════════════════════
  gh: {
    breakfast: [
      createMeal('Hausa Koko & Koose','Spiced millet porridge with crispy deep-fried bean fritters. A warming Ghanaian street breakfast with West African soul.','gh','breakfast','ghanaian',{calories:360,protein:12,carbs:58,fat:10},['Vegan','Gluten-Free','Dairy-Free'],'nostalgic',['millet','black-eyed peas','ginger','pepper'],'easy',10,20,4.7,'hausa koko millet porridge koose Ghana breakfast'),
      createMeal('Bread & Egg Stew','Soft white bread with rich tomato and onion egg scramble. Quick and satisfying across Accra households.','gh','breakfast','ghanaian',{calories:380,protein:14,carbs:44,fat:14},['Vegetarian','Dairy-Free'],'everyday',['bread','eggs','tomatoes','onions','vegetable oil'],'easy',5,10,4.5,'bread egg stew Ghana breakfast Accra'),
    ],
    lunch: [
      createMeal('Jollof Rice & Grilled Tilapia','Ghanaian jollof with its distinctive smoky base, served with whole grilled tilapia and fried plantain.','gh','lunch','ghanaian',{calories:640,protein:38,carbs:70,fat:18},['Gluten-Free','Dairy-Free'],'wow',['rice','tilapia','tomatoes','onions','peppers','palm oil','plantain'],'medium',20,40,4.8,'Ghanaian jollof rice tilapia fish'),
      createMeal('Fufu & Light Soup','Hand-pounded cassava-plantain fufu with a delicately spiced tomato-pepper soup with fresh fish.','gh','lunch','ghanaian',{calories:560,protein:28,carbs:76,fat:14},['Gluten-Free','Dairy-Free'],'nostalgic',['cassava','plantain','fresh fish','tomatoes','peppers','ginger'],'hard',40,30,4.7,'fufu light soup Ghana'),
      createMeal('Waakye','Rice and black-eyed peas cooked with sorghum leaves until reddish, served with stew, boiled egg, and spaghetti. A Ghanaian institution.','gh','lunch','ghanaian',{calories:580,protein:20,carbs:88,fat:8},['Dairy-Free'],'wow',['rice','black-eyed peas','sorghum leaves','eggs','tomato stew'],'easy',15,45,4.8,'waakye rice beans Ghana street food'),
    ],
    dinner: [
      createMeal('Banku & Fried Tilapia','Fermented corn-and-cassava dough with whole fried tilapia and fiery fresh pepper sauce.','gh','dinner','ghanaian',{calories:660,protein:40,carbs:74,fat:18},['Gluten-Free','Dairy-Free'],'wow',['fermented corn dough','cassava','tilapia','peppers','onions','vegetable oil'],'medium',20,30,4.8,'banku fried tilapia Ghana dinner'),
      createMeal('Red Red & Fried Plantain','Spiced black-eyed pea stew in palm oil served with golden fried plantain. The iconic Ghanaian plant-based meal.','gh','dinner','ghanaian',{calories:520,protein:18,carbs:82,fat:12},['Vegan','Gluten-Free','Dairy-Free'],'everyday',['black-eyed peas','palm oil','plantain','onions','peppers'],'easy',15,40,4.7,'red red Ghana beans stew plantain'),
    ],
    snack: [
      createMeal('Kelewele','Cubed ripe plantain deep-fried with ginger, pepper, and anise until caramelised and crispy. Sweet, spicy, deeply addictive.','gh','snack','ghanaian',{calories:240,protein:2,carbs:44,fat:8},['Vegan','Gluten-Free','Dairy-Free'],'wow',['ripe plantain','ginger','pepper','anise','vegetable oil'],'easy',5,15,4.8,'kelewele fried spiced plantain Ghana'),
      createMeal('Roasted Corn & Coconut','Fire-roasted roadside corn eaten with fresh coconut. A beloved Ghanaian afternoon snack.','gh','snack','ghanaian',{calories:220,protein:5,carbs:44,fat:6},['Vegan','Gluten-Free','Dairy-Free'],'nostalgic',['corn','fresh coconut'],'easy',0,15,4.5,'roasted corn coconut Ghana street snack'),
      createMeal('Groundnut Brittle (Peanut Brittle)','Crunchy caramelized peanut candy — sweet and buttery with crispy edges. A Ghanaian market staple that\'s dangerously addictive.','gh','snack','ghanaian',{calories:300,protein:8,carbs:36,fat:14},['Vegan','Gluten-Free','Dairy-Free'],'nostalgic',['roasted peanuts','sugar','butter','salt'],'medium',5,20,4.8,'peanut brittle Ghana snack candy'),
      createMeal('Kokonte & Okro Sauce (Cassava Ball Snack)','Pounded cassava balls served with okro sauce — light, starchy, perfectly paired with peppery sauce. Street-level elegance.','gh','snack','ghanaian',{calories:200,protein:4,carbs:46,fat:2},['Vegan','Gluten-Free','Dairy-Free'],'everyday',['cassava','okra','peppers','onions','palm oil','crayfish'],'medium',15,25,4.6,'kokonte cassava balls okro sauce Ghana'),
      createMeal('Boiled Groundnuts & Salt','Simple roasted peanuts boiled in salt water until soft and creamy inside — a Ghanaian obsession, a protein bomb.','gh','snack','ghanaian',{calories:240,protein:10,carbs:20,fat:14},['Vegan','Gluten-Free','Dairy-Free'],'everyday',['roasted peanuts','salt','water'],'easy',10,45,4.7,'boiled groundnuts peanuts Ghana snack'),
      createMeal('Chin Chin (Ghanaian Style)','Crispy bite-sized fried snack, often with ginger and spices. Less dense than Nigerian chin chin — more airy and delicate.','gh','snack','ghanaian',{calories:240,protein:4,carbs:32,fat:12},['Vegetarian','Dairy-Free'],'nostalgic',['flour','eggs','butter','ginger','sugar','salt'],'medium',15,20,4.6,'chin chin fried snack Ghana'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇺🇸  USA
  // ═══════════════════════════════════════════════════════════════════════════
  us: {
    breakfast: [
      createMeal('Avocado Toast & Poached Eggs','Smashed avocado on sourdough with poached eggs, red pepper flakes, and everything bagel seasoning.','us','breakfast','american',{calories:420,protein:18,carbs:36,fat:22},['Vegetarian'],'healthy',['sourdough','avocado','eggs','lemon','microgreens'],'easy',10,5,4.7,'avocado toast poached eggs sourdough breakfast'),
      createMeal('Fluffy Buttermilk Pancakes','Stacked pancakes with maple syrup, fresh berries, and whipped butter. Weekend ritual.','us','breakfast','american',{calories:480,protein:12,carbs:72,fat:14},['Vegetarian'],'indulgent',['flour','eggs','buttermilk','butter','blueberries','maple syrup'],'easy',5,15,4.7,'fluffy pancakes maple syrup American breakfast'),
      createMeal('Corn Flakes & Cold Milk','Crispy golden cornflakes with cold whole milk. The American breakfast since 1894.','us','breakfast','american',{calories:280,protein:7,carbs:56,fat:4},['Vegetarian','Gluten-Free'],'everyday',['cornflakes','milk','banana'],'easy',2,0,4.3,'cornflakes cold milk American breakfast'),
      createMeal('Eggs Benedict','English muffin, Canadian bacon, poached eggs, hollandaise sauce. The ultimate weekend brunch.','us','breakfast','american',{calories:650,protein:22,carbs:32,fat:46},[],'indulgent',['english muffin','eggs','canadian bacon','butter','lemon juice'],'medium',10,15,4.8,'eggs benedict hollandaise American brunch'),
      createMeal('Greek Yogurt Parfait','Thick yogurt layered with granola, blueberries, and honey. High-protein and naturally sweet.','us','breakfast','american',{calories:320,protein:20,carbs:44,fat:7},['Vegetarian','Gluten-Free'],'healthy',['greek yogurt','granola','blueberries','honey','almonds'],'easy',5,0,4.6,'greek yogurt parfait granola berries'),
    ],
    lunch: [
      createMeal('Classic Cheeseburger','Juicy beef patty with American cheese, lettuce, pickled onion, and house sauce on sesame bun.','us','lunch','american',{calories:720,protein:44,carbs:48,fat:36},[],'comfort',['beef patty','bun','cheddar','lettuce','tomato','pickles','mayo'],'easy',5,15,4.6,'cheeseburger American lunch'),
      createMeal('Grilled Chicken Caesar Salad','Romaine with parmesan, croutons, and creamy dressing. A lunch staple.','us','lunch','american',{calories:480,protein:38,carbs:22,fat:26},[],'healthy',['romaine','chicken','parmesan','croutons','caesar dressing'],'easy',10,15,4.5,'caesar salad chicken American lunch'),
      createMeal('BBQ Pulled Pork Sandwich','Slow-smoked pork on a brioche bun with tangy coleslaw and pickles.','us','lunch','american',{calories:680,protein:36,carbs:58,fat:26},['Dairy-Free'],'wow',['pulled pork','brioche bun','coleslaw','BBQ sauce','pickles'],'medium',10,240,4.7,'pulled pork BBQ sandwich American'),
      createMeal('New England Clam Chowder','Thick cream soup with clam meat, potatoes, and bacon in a bread bowl.','us','lunch','american',{calories:640,protein:22,carbs:58,fat:32},[],'comfort',['clams','potatoes','cream','bacon','onions','celery'],'easy',15,30,4.6,'clam chowder bread bowl New England American'),
    ],
    dinner: [
      createMeal('Grilled Salmon & Asparagus','Atlantic salmon with lemon-herb butter and roasted asparagus. Clean, balanced, beautiful.','us','dinner','american',{calories:560,protein:46,carbs:28,fat:28},['Gluten-Free'],'healthy',['salmon','asparagus','lemon','butter','herbs'],'easy',10,20,4.8,'grilled salmon asparagus American dinner'),
      createMeal('Chicken Pot Pie','Tender chicken and vegetables in rich gravy under a golden flaky pastry crust.','us','dinner','american',{calories:680,protein:32,carbs:56,fat:34},[],'comfort',['chicken','mixed vegetables','pastry','cream','onions'],'medium',20,45,4.7,'chicken pot pie American dinner'),
      createMeal('Mac & Cheese','Elbow macaroni in a rich five-cheese sauce, baked with a golden breadcrumb crust. American comfort royalty.','us','dinner','american',{calories:640,protein:22,carbs:72,fat:28},['Vegetarian'],'comfort',['macaroni','cheddar','gruyere','breadcrumbs','butter','cream'],'easy',15,30,4.7,'mac cheese baked American dinner comfort'),
    ],
    snack: [
      createMeal('Celery & Peanut Butter','Fresh celery with natural peanut butter. Classic American low-carb protein snack.','us','snack','american',{calories:180,protein:7,carbs:12,fat:12},['Vegan','Gluten-Free','Dairy-Free'],'healthy',['celery','peanut butter','salt'],'easy',3,0,4.4,'celery peanut butter snack American'),
      createMeal('Chocolate Chip Cookies & Milk','Warm gooey chocolate chip cookies with cold whole milk. The American afterschool classic.','us','snack','american',{calories:380,protein:8,carbs:48,fat:16},['Vegetarian'],'nostalgic',['flour','butter','chocolate chips','eggs','sugar','milk'],'easy',10,12,4.7,'chocolate chip cookies milk American snack'),
      createMeal('Beef Jerky','Strips of dried seasoned beef — chewy, protein-packed, lightly spiced. The road trip essential.','us','snack','american',{calories:160,protein:28,carbs:3,fat:4},['Gluten-Free','Dairy-Free','Low-Carb'],'everyday',['beef strips','soy sauce','worcestershire','garlic','pepper'],'easy',10,180,4.8,'beef jerky American snack road trip'),
      createMeal('Nachos with Cheese & Jalapeño','Crispy tortilla chips piled with melted cheddar, jalapeño, sour cream, and guacamole. Stadium food perfection.','us','snack','american',{calories:420,protein:12,carbs:42,fat:20},['Vegetarian','Gluten-Free'],'wow',['tortilla chips','cheddar','jalapeño','sour cream','guacamole'],'easy',5,10,4.7,'nachos cheese jalapeño American snack'),
      createMeal('Rice Krispie Treat','Marshmallow-bound crispy rice bars — sweet, gooey, nostalgic. Every school bake sale legend.','us','snack','american',{calories:240,protein:2,carbs:48,fat:6},['Vegetarian','Gluten-Free','Dairy-Free'],'nostalgic',['rice krispies','marshmallows','butter','salt'],'easy',10,15,4.8,'rice krispie treat American snack dessert'),
      createMeal('Pretzel & Beer Cheese Dip','Warm soft pretzel twisted in salt chunks with tangy beer cheese dip. Pub classic meets American comfort.','us','snack','american',{calories:380,protein:14,carbs:48,fat:14},['Vegetarian'],'sap',['flour','yeast','salt','cheddar','beer','mustard'],'medium',20,20,4.7,'pretzel beer cheese dip American snack'),
      createMeal('Trail Mix (Granola & Nuts)','A custom blend of almonds, cashews, dried cranberries, dark chocolate, and seeds. The hiker\'s protein fuel.','us','snack','american',{calories:320,protein:10,carbs:34,fat:16},['Vegan','Gluten-Free','Dairy-Free'],'healthy',['almonds','cashews','dried cranberries','dark chocolate','seeds'],'easy',5,0,4.6,'trail mix granola nuts American snack'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇬🇧  UK
  // ═══════════════════════════════════════════════════════════════════════════
  gb: {
    breakfast: [
      createMeal('Full English Breakfast','Back bacon, sausages, baked beans, fried egg, grilled tomato, mushrooms, and toast. A proper British fry-up.','gb','breakfast','british',{calories:640,protein:36,carbs:44,fat:36},[],'wow',['bacon','sausages','baked beans','eggs','tomato','mushrooms','toast'],'easy',10,20,4.7,'full English breakfast fry up British'),
      createMeal('Porridge & Berries','Steel-cut oats with mixed berries and honey. Simple, warm, honest.','gb','breakfast','british',{calories:340,protein:12,carbs:54,fat:8},['Vegetarian'],'healthy',['oats','milk','blueberries','raspberries','honey'],'easy',5,10,4.5,'porridge berries honey British breakfast'),
      createMeal('Smoked Salmon Bagel','Toasted bagel with cream cheese, smoked Scottish salmon, capers, and dill.','gb','breakfast','british',{calories:420,protein:26,carbs:44,fat:16},[],'wow',['bagel','cream cheese','smoked salmon','capers','dill','lemon'],'easy',5,5,4.6,'smoked salmon bagel cream cheese British'),
    ],
    lunch: [
      createMeal('Fish & Chips','Battered crispy cod with thick-cut chips, mushy peas, and malt vinegar. Britain\'s most beloved dish.','gb','lunch','british',{calories:720,protein:34,carbs:76,fat:32},['Dairy-Free'],'nostalgic',['cod fillet','potatoes','flour','batter','mushy peas','malt vinegar'],'medium',15,20,4.7,'fish chips mushy peas British lunch'),
      createMeal('Chicken Tikka Masala','Marinated grilled chicken in a creamy, mildly spiced tomato sauce. The UK\'s most ordered dish — British by adoption.','gb','lunch','british',{calories:580,protein:38,carbs:28,fat:28},['Gluten-Free'],'everyday',['chicken','tomato sauce','cream','spices','rice'],'medium',15,25,4.7,'chicken tikka masala British curry'),
      createMeal('Ploughman\'s Lunch','Mature cheddar, crusty bread, Branston pickle, pickled onions, ham, and salad. No cooking required.','gb','lunch','british',{calories:560,protein:26,carbs:42,fat:28},[],'nostalgic',['cheddar','crusty bread','Branston pickle','pickled onions','ham'],'easy',5,0,4.5,'ploughmans lunch British pub'),
    ],
    dinner: [
      createMeal('Sunday Roast','Slow-roasted beef with Yorkshire pudding, roast potatoes, seasonal veg, and rich gravy. British Sunday tradition.','gb','dinner','british',{calories:820,protein:52,carbs:62,fat:36},[],'wow',['beef joint','Yorkshire pudding','potatoes','carrots','gravy','horseradish'],'hard',20,90,4.8,'Sunday roast beef Yorkshire pudding British'),
      createMeal('Shepherd\'s Pie','Minced lamb with root vegetables in rich gravy, topped with golden mashed potato.','gb','dinner','british',{calories:640,protein:34,carbs:54,fat:28},['Gluten-Free'],'comfort',['minced lamb','potatoes','carrots','onions','gravy'],'medium',20,45,4.6,'shepherds pie mashed potato British dinner'),
    ],
    snack: [
      createMeal('Scone with Clotted Cream','Freshly baked scone with thick clotted cream and strawberry jam. Cream tea perfection.','gb','snack','british',{calories:320,protein:6,carbs:42,fat:14},['Vegetarian'],'wow',['scone','clotted cream','strawberry jam','flour'],'medium',10,20,4.7,'scone clotted cream jam British cream tea'),
      createMeal('Digestives & Tea','Wholemeal biscuits with a builder\'s tea. The quintessential British afternoon in two things.','gb','snack','british',{calories:180,protein:3,carbs:28,fat:7},['Vegetarian'],'everyday',['digestive biscuits','builder\'s tea','milk'],'easy',2,0,4.4,'digestive biscuits tea British afternoon'),
      createMeal('Pork Pie','Golden pastry-encased pressed pork and jelly — a picnic essential and pub counter staple.','gb','snack','british',{calories:380,protein:18,carbs:28,fat:22},[],'nostalgic',['pork','aspic jelly','flour','butter','eggs'],'medium',15,40,4.7,'pork pie British picnic snack'),
      createMeal('Shortbread Fingers','Buttery, crumbly, barely sweet Scottish shortbread. Pure melting bliss in a biscuit.','gb','snack','british',{calories:220,protein:3,carbs:26,fat:12},['Vegetarian'],'nostalgic',['butter','flour','sugar','salt'],'easy',15,20,4.8,'shortbread fingers British Scottish biscuit'),
      createMeal('Prawn Cocktail Crisps','Flavorful seasoned potato crisps in that iconic pink prawn packet. British snacking royalty since the 1960s.','gb','snack','british',{calories:200,protein:2,carbs:24,fat:11},['Vegetarian','Gluten-Free','Dairy-Free'],'nostalgic',['potatoes','prawn seasoning','salt','vegetable oil'],'easy',0,10,4.5,'prawn cocktail crisps British potato snack'),
      createMeal('Fish Paste & Cracker','Potted fish paste on butter crackers — umami-rich, salty, tradition in a jar.','gb','snack','british',{calories:160,protein:6,carbs:18,fat:8},[],'everyday',['fish paste','butter crackers','anchovies','peppers'],'easy',3,0,4.3,'fish paste crackers British snack'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇮🇳  INDIA
  // ═══════════════════════════════════════════════════════════════════════════
  in: {
    breakfast: [
      createMeal('Masala Dosa','Thin crispy fermented rice crepe stuffed with spiced potato, served with coconut chutney and sambar.','in','breakfast','indian',{calories:420,protein:12,carbs:68,fat:14},['Vegan','Gluten-Free','Dairy-Free'],'wow',['rice flour','urad dal','potatoes','mustard seeds','curry leaves'],'medium',20,25,4.8,'masala dosa Indian breakfast'),
      createMeal('Idli & Sambar','Steamed fermented rice-and-lentil cakes with tangy vegetable sambar.','in','breakfast','indian',{calories:280,protein:10,carbs:48,fat:4},['Vegan','Gluten-Free','Dairy-Free'],'healthy',['rice','urad dal','vegetables','toor dal','tamarind'],'easy',20,15,4.6,'idli sambar Indian breakfast'),
      createMeal('Aloo Paratha','Potato-filled flatbread pan-fried in ghee, served with cool yogurt and pickle.','in','breakfast','indian',{calories:420,protein:10,carbs:54,fat:18},['Vegetarian'],'comfort',['wheat flour','potatoes','onions','green chillies','ghee','yogurt'],'easy',10,25,4.7,'aloo paratha potato flatbread Indian breakfast'),
    ],
    lunch: [
      createMeal('Butter Chicken & Naan','Tandoor-grilled chicken in silky tomato-cream sauce with pillowy butter naan.','in','lunch','indian',{calories:680,protein:40,carbs:56,fat:28},[],'wow',['chicken','tomato sauce','cream','butter','naan','spices'],'medium',15,40,4.8,'butter chicken naan Indian'),
      createMeal('Dal Tadka & Basmati Rice','Yellow lentils tempered with ghee, cumin, garlic, and red chilli over steamed basmati.','in','lunch','indian',{calories:480,protein:18,carbs:82,fat:9},['Vegan','Gluten-Free','Dairy-Free'],'everyday',['lentils','basmati rice','cumin','garlic','dried red chilli','ghee'],'easy',10,30,4.6,'dal tadka basmati rice Indian lunch'),
      createMeal('Chole Bhature','Fiery spiced chickpeas with puffed deep-fried leavened bread.','in','lunch','indian',{calories:720,protein:22,carbs:96,fat:24},['Vegan'],'indulgent',['chickpeas','flour','yogurt','spices','oil'],'medium',20,60,4.7,'chole bhature chickpea Indian lunch'),
    ],
    dinner: [
      createMeal('Chicken Biryani','Layered basmati rice slow-cooked with saffron, whole spices, caramelised onions, and marinated chicken.','in','dinner','indian',{calories:680,protein:34,carbs:88,fat:18},['Gluten-Free','Dairy-Free'],'wow',['basmati rice','chicken','saffron','fried onions','spices','mint'],'hard',30,90,4.9,'chicken biryani Indian dinner'),
      createMeal('Palak Paneer','Fresh paneer in smooth spiced spinach gravy. One of India\'s most beloved vegetarian dishes.','in','dinner','indian',{calories:480,protein:22,carbs:24,fat:30},['Vegetarian','Gluten-Free'],'everyday',['spinach','paneer','cream','spices','garlic','ginger'],'medium',10,25,4.7,'palak paneer spinach Indian dinner'),
    ],
    snack: [
      createMeal('Samosa','Crispy pastry triangles filled with spiced potato and peas. India\'s most popular street snack.','in','snack','indian',{calories:240,protein:5,carbs:32,fat:11},['Vegan'],'nostalgic',['flour','potatoes','peas','spices','oil'],'medium',15,30,4.6,'samosa Indian street food snack'),
      createMeal('Masala Chai','Spiced milk tea brewed with ginger, cardamom, cinnamon, and clove. India\'s daily ritual in a cup.','in','snack','indian',{calories:80,protein:3,carbs:12,fat:3},['Vegetarian'],'everyday',['black tea','milk','ginger','cardamom','cinnamon','clove','sugar'],'easy',5,5,4.7,'masala chai spiced tea India'),
      createMeal('Bhel Puri','Light puffed rice mixed with diced potato, onion, tamarind, and mint chutney. Street snack brilliance.','in','snack','indian',{calories:220,protein:5,carbs:42,fat:3},['Vegan','Gluten-Free','Dairy-Free'],'sap',['puffed rice','potatoes','onions','tamarind','mint','spices'],'easy',10,0,4.7,'bhel puri Indian street snack'),
      createMeal('Pakora (Vegetable Fritters)','Battered and fried mixed vegetables — crispy, savory, perfect with tamarind sauce.','in','snack','indian',{calories:240,protein:6,carbs:28,fat:12},['Vegan','Gluten-Free'],'wow',['chickpea flour','potatoes','onions','peppers','spices','oil'],'medium',10,15,4.7,'pakora vegetable fritters Indian snack'),
      createMeal('Kachumber Salad','Diced cucumber, tomato, onion, and lime with cumin — refreshing and light.','in','snack','indian',{calories:90,protein:2,carbs:18,fat:1},['Vegan','Gluten-Free','Dairy-Free'],'healthy',['cucumber','tomato','onion','lime','cumin','coriander'],'easy',10,0,4.5,'kachumber salad Indian fresh snack'),
      createMeal('Pav Bhaji','Spiced mashed vegetable curry served with buttered bread rolls. Mumbai street food legend.','in','snack','indian',{calories:320,protein:8,carbs:48,fat:10},['Vegetarian'],'wow',['mixed vegetables','pav bread','butter','pav bhaji spice','onions'],'medium',15,25,4.8,'pav bhaji Indian street food'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇯🇵  JAPAN
  // ═══════════════════════════════════════════════════════════════════════════
  jp: {
    breakfast: [
      createMeal('Tamago Gohan (TKG)','Raw egg over hot steamed rice with soy sauce and mirin. Simple, umami-rich, deeply Japanese.','jp','breakfast','japanese',{calories:280,protein:14,carbs:42,fat:7},['Vegetarian','Gluten-Free','Dairy-Free'],'everyday',['steamed rice','egg','soy sauce','mirin'],'easy',2,0,4.6,'tamago gohan rice egg Japan breakfast'),
      createMeal('Miso Soup & Rice','White miso broth with tofu, wakame, and spring onion. A Japanese morning tradition.','jp','breakfast','japanese',{calories:260,protein:12,carbs:44,fat:4},['Vegan','Gluten-Free','Dairy-Free'],'healthy',['miso','tofu','wakame','spring onion','rice'],'easy',5,8,4.5,'miso soup rice Japanese breakfast'),
    ],
    lunch: [
      createMeal('Tonkotsu Ramen','Rich pork bone broth with springy noodles, soft-boiled egg, chashu pork, and nori.','jp','lunch','japanese',{calories:620,protein:32,carbs:72,fat:20},['Dairy-Free'],'wow',['ramen noodles','pork broth','chashu pork','soft egg','nori','spring onion'],'medium',30,120,4.8,'tonkotsu ramen pork Japan lunch'),
      createMeal('Tonkatsu Set','Panko-breaded deep-fried pork cutlet with rice, miso soup, and shredded cabbage.','jp','lunch','japanese',{calories:680,protein:36,carbs:68,fat:24},['Dairy-Free'],'everyday',['pork loin','panko','eggs','cabbage','rice','miso'],'medium',15,20,4.7,'tonkatsu pork cutlet Japan lunch'),
    ],
    dinner: [
      createMeal('Sushi Platter','Nigiri and maki rolls of tuna, salmon, and prawn over seasoned rice with pickled ginger.','jp','dinner','japanese',{calories:520,protein:30,carbs:72,fat:8},['Gluten-Free','Dairy-Free'],'wow',['sushi rice','tuna','salmon','prawn','nori','ginger','wasabi'],'hard',30,30,4.9,'sushi platter Japan dinner'),
      createMeal('Yakitori','Charcoal-grilled chicken skewers with tare sauce. An izakaya classic.','jp','dinner','japanese',{calories:360,protein:34,carbs:12,fat:16},['Gluten-Free','Dairy-Free'],'everyday',['chicken','tare sauce','spring onion','charcoal'],'easy',10,15,4.7,'yakitori grilled chicken Japan dinner'),
    ],
    snack: [
      createMeal('Onigiri','Triangular rice ball wrapped in nori, filled with pickled plum or salmon.','jp','snack','japanese',{calories:180,protein:6,carbs:36,fat:2},['Gluten-Free','Dairy-Free'],'everyday',['rice','nori','pickled plum / salmon','salt'],'easy',10,0,4.6,'onigiri rice ball Japan snack'),
      createMeal('Edamame','Young soybeans steamed and salted. Protein-rich, low-cal, globally beloved.','jp','snack','japanese',{calories:120,protein:11,carbs:10,fat:5},['Vegan','Gluten-Free','Dairy-Free'],'healthy',['edamame','salt'],'easy',5,5,4.5,'edamame soybeans Japan snack'),
      createMeal('Pocky (Biscuit Stick)','Thin breadsticks dipped in flavored coating — green tea, strawberry, chocolate. Addictively crunchy.','jp','snack','japanese',{calories:140,protein:2,carbs:20,fat:6},['Vegetarian'],'nostalgic',['wheat flour','sugar','vegetable oil','flavoring'],'easy',0,10,4.6,'pocky biscuit stick Japan snack'),
      createMeal('Takoyaki (Octopus Ball)','Golden crispy fried batter ball with tender octopus inside, topped with takoyaki sauce and bonito flakes.','jp','snack','japanese',{calories:200,protein:8,carbs:22,fat:10},['Dairy-Free'],'wow',['octopus','flour','eggs','broth','takoyaki sauce','nori'],'medium',10,15,4.8,'takoyaki octopus ball Japan street food'),
      createMeal('Senbei (Rice Cracker)','Crispy roasted rice wafer with soy sauce, seaweed, or sesame. Light, satisfying, endlessly vary.','jp','snack','japanese',{calories:160,protein:4,carbs:28,fat:3},['Vegan','Gluten-Free','Dairy-Free'],'everyday',['rice flour','soy sauce','seaweed','sesame'],'easy',10,20,4.6,'senbei rice cracker Japan snack'),
      createMeal('Dango (Sweet Rice Ball)','Three colorful chewy rice flour balls stacked on a skewer — sweet, delicate, traditional.','jp','snack','japanese',{calories:180,protein:2,carbs:42,fat:2},['Vegan','Gluten-Free','Dairy-Free'],'nostalgic',['rice flour','sugar','water','food coloring'],'medium',20,30,4.7,'dango sweet rice ball Japan'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇲🇽  MEXICO
  // ═══════════════════════════════════════════════════════════════════════════
  mx: {
    breakfast: [
      createMeal('Chilaquiles','Fried tortilla chips simmered in salsa verde, topped with crema, queso fresco, and fried egg.','mx','breakfast','mexican',{calories:480,protein:16,carbs:52,fat:24},['Vegetarian','Gluten-Free'],'wow',['corn tortillas','salsa verde','eggs','crema','queso fresco'],'easy',10,15,4.7,'chilaquiles Mexican breakfast'),
      createMeal('Huevos Rancheros','Fried eggs on corn tortillas smothered in tomato-chilli salsa with refried beans and avocado.','mx','breakfast','mexican',{calories:440,protein:18,carbs:46,fat:20},['Vegetarian','Gluten-Free'],'everyday',['eggs','corn tortillas','salsa roja','refried beans','avocado'],'easy',10,15,4.7,'huevos rancheros Mexican breakfast'),
    ],
    lunch: [
      createMeal('Tacos al Pastor','Pork marinated in chillies and pineapple, rotisserie-cooked, on corn tortillas with onion and coriander.','mx','lunch','mexican',{calories:560,protein:30,carbs:54,fat:22},['Gluten-Free','Dairy-Free'],'wow',['pork','corn tortillas','pineapple','guajillo chilli','onion','coriander'],'medium',20,60,4.8,'tacos al pastor Mexico City'),
      createMeal('Pozole Rojo','Hearty hominy corn soup with braised pork, red chilli broth, and garnishes of cabbage and lime.','mx','lunch','mexican',{calories:580,protein:34,carbs:62,fat:16},['Gluten-Free','Dairy-Free'],'comfort',['hominy','pork','dried red chilli','cabbage','radish','lime'],'hard',20,120,4.7,'pozole rojo Mexican soup'),
    ],
    dinner: [
      createMeal('Mole Negro & Rice','Chicken in complex mole sauce made from 20+ ingredients including dried chillies and dark chocolate.','mx','dinner','mexican',{calories:680,protein:38,carbs:64,fat:28},['Gluten-Free','Dairy-Free'],'wow',['chicken','dried chillies','dark chocolate','spices','rice'],'hard',40,60,4.8,'mole negro chicken Mexico dinner'),
    ],
    snack: [
      createMeal('Elote (Street Corn)','Corn on the cob with mayo, cotija cheese, chilli powder, and lime. Mexico City street perfection.','mx','snack','mexican',{calories:250,protein:6,carbs:34,fat:11},['Vegetarian','Gluten-Free'],'wow',['corn','mayo','cotija cheese','chilli powder','lime'],'easy',5,15,4.8,'elote street corn Mexico snack'),
      createMeal('Guacamole & Chips','Fresh avocado with lime, jalapeño, and coriander with crispy tortilla chips.','mx','snack','mexican',{calories:280,protein:4,carbs:28,fat:18},['Vegan','Gluten-Free','Dairy-Free'],'healthy',['avocado','lime','jalapeño','coriander','corn tortilla chips'],'easy',8,0,4.6,'guacamole chips Mexican snack'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇮🇹  ITALY
  // ═══════════════════════════════════════════════════════════════════════════
  it: {
    breakfast: [
      createMeal('Cornetto & Cappuccino','A flaky pastry horn with jam, alongside a velvety Italian cappuccino. The Italian morning ritual.','it','breakfast','italian',{calories:320,protein:7,carbs:46,fat:13},['Vegetarian'],'everyday',['cornetto pastry','espresso','milk'],'easy',2,5,4.6,'cornetto cappuccino Italian breakfast'),
    ],
    lunch: [
      createMeal('Spaghetti Carbonara','Spaghetti in a silky emulsion of guanciale, Pecorino Romano, egg yolk, and black pepper. No cream — ever.','it','lunch','italian',{calories:620,protein:28,carbs:76,fat:22},['Dairy-Free'],'wow',['spaghetti','guanciale','eggs','Pecorino Romano','black pepper'],'medium',10,15,4.9,'spaghetti carbonara Italian lunch'),
      createMeal('Margherita Pizza','Thin Neapolitan crust with San Marzano tomato, buffalo mozzarella, and fresh basil.','it','lunch','italian',{calories:680,protein:24,carbs:88,fat:22},['Vegetarian'],'wow',['pizza dough','San Marzano tomatoes','buffalo mozzarella','basil'],'hard',60,10,4.8,'Neapolitan margherita pizza Italian'),
    ],
    dinner: [
      createMeal('Osso Buco & Risotto Milanese','Braised veal shanks in white wine with gremolata, over creamy saffron risotto.','it','dinner','italian',{calories:760,protein:48,carbs:58,fat:28},['Gluten-Free'],'wow',['veal shank','Arborio rice','saffron','white wine','gremolata'],'hard',20,90,4.9,'osso buco risotto Milanese Italian dinner'),
    ],
    snack: [
      createMeal('Arancini','Golden deep-fried risotto balls stuffed with ragù and mozzarella. Sicily\'s celebrated street food.','it','snack','italian',{calories:280,protein:10,carbs:36,fat:12},[],'wow',['Arborio rice','ground beef','mozzarella','tomato sauce','breadcrumbs'],'hard',30,20,4.7,'arancini risotto balls Sicilian Italian snack'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇨🇳  CHINA
  // ═══════════════════════════════════════════════════════════════════════════
  cn: {
    breakfast: [
      createMeal('Congee (Jook)','Silky slow-cooked rice porridge with century egg, pork mince, ginger, and sesame oil.','cn','breakfast','chinese',{calories:280,protein:14,carbs:44,fat:6},['Gluten-Free','Dairy-Free'],'comfort',['rice','century egg','pork mince','ginger','sesame oil','spring onion'],'easy',5,40,4.6,'congee jook Chinese breakfast'),
    ],
    lunch: [
      createMeal('Kung Pao Chicken','Diced chicken wok-tossed with dried chillies, Sichuan pepper, and roasted peanuts.','cn','lunch','chinese',{calories:520,protein:32,carbs:28,fat:28},['Gluten-Free','Dairy-Free'],'wow',['chicken','dried chilli','Sichuan pepper','peanuts','soy sauce','rice'],'medium',15,15,4.7,'kung pao chicken Sichuan Chinese'),
      createMeal('Dan Dan Noodles','Springy noodles in spicy sesame-chilli sauce with minced pork and spring onion.','cn','lunch','chinese',{calories:580,protein:24,carbs:70,fat:22},['Dairy-Free'],'wow',['noodles','sesame paste','chilli oil','minced pork','spring onion','Sichuan pepper'],'medium',10,15,4.7,'dan dan noodles Sichuan Chinese lunch'),
    ],
    dinner: [
      createMeal('Peking Duck','Crispy lacquered roast duck with thin pancakes, hoisin sauce, cucumber, and scallion.','cn','dinner','chinese',{calories:740,protein:44,carbs:48,fat:38},['Dairy-Free'],'wow',['duck','pancakes','hoisin sauce','cucumber','spring onion'],'hard',60,90,4.8,'Peking duck pancakes China dinner'),
    ],
    snack: [
      createMeal('Egg Tart','Flaky pastry shell with silky wobbly egg custard filling. Cantonese bakery staple.','cn','snack','chinese',{calories:220,protein:5,carbs:28,fat:10},['Vegetarian'],'nostalgic',['pastry','eggs','sugar syrup','milk'],'medium',15,20,4.7,'egg tart custard Hong Kong Chinese'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇧🇷  BRAZIL
  // ═══════════════════════════════════════════════════════════════════════════
  br: {
    breakfast: [
      createMeal('Pão de Queijo & Coffee','Warm stretchy cheese bread from tapioca flour with strong black Brazilian coffee.','br','breakfast','brazilian',{calories:320,protein:10,carbs:44,fat:12},['Vegetarian','Gluten-Free'],'everyday',['tapioca flour','queijo minas','eggs','coffee'],'easy',10,20,4.7,'pao de queijo cheese bread Brazil'),
      createMeal('Açaí Bowl','Thick frozen açaí with banana, granola, fresh fruit, and honey. Brazil\'s superfood bowl.','br','breakfast','brazilian',{calories:380,protein:6,carbs:66,fat:10},['Vegan','Gluten-Free','Dairy-Free'],'healthy',['açaí','banana','granola','strawberries','honey'],'easy',5,0,4.7,'acai bowl Brazil breakfast'),
    ],
    lunch: [
      createMeal('Feijoada','Brazil\'s national dish — black beans with smoked meats and sausage, served with rice, farofa, and orange.','br','lunch','brazilian',{calories:780,protein:44,carbs:76,fat:28},['Gluten-Free','Dairy-Free'],'wow',['black beans','smoked pork','linguiça','rice','farofa','orange'],'hard',30,120,4.8,'feijoada Brazilian national dish'),
    ],
    dinner: [
      createMeal('Churrasco (Mixed Grill)','Brazilian mixed grill — picanha, linguiça, and chicken hearts over charcoal with rock salt.','br','dinner','brazilian',{calories:720,protein:60,carbs:6,fat:44},['Gluten-Free','Dairy-Free','Low-Carb'],'wow',['picanha','linguiça','chicken hearts','rock salt','charcoal'],'medium',15,30,4.8,'churrasco Brazilian BBQ grill dinner'),
    ],
    snack: [
      createMeal('Coxinha','Crispy teardrop croquette filled with shredded chicken and cream cheese. Brazil\'s bar snack.','br','snack','brazilian',{calories:280,protein:12,carbs:28,fat:14},[],'nostalgic',['chicken','cream cheese','breadcrumbs','flour','eggs','vegetable oil'],'medium',20,20,4.7,'coxinha chicken croquette Brazil snack'),
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🇪🇬  EGYPT
  // ═══════════════════════════════════════════════════════════════════════════
  eg: {
    breakfast: [
      createMeal('Ful Medames','Slow-cooked fava beans with lemon, cumin, garlic, and olive oil with warm pita. Egypt\'s national breakfast.','eg','breakfast','egyptian',{calories:360,protein:16,carbs:58,fat:8},['Vegan','Dairy-Free'],'nostalgic',['fava beans','lemon','cumin','garlic','olive oil','pita'],'easy',10,30,4.7,'ful medames fava beans Egypt breakfast'),
      createMeal('Ta\'meya (Egyptian Falafel)','Fava bean falafel — crispy, bright green inside — with salad and tahini.','eg','breakfast','egyptian',{calories:380,protein:14,carbs:46,fat:16},['Vegan','Dairy-Free'],'wow',['fava beans','coriander','parsley','cumin','sesame','tahini'],'medium',15,15,4.7,'taameya Egyptian falafel fava bean'),
    ],
    lunch: [
      createMeal('Koshari','Egypt\'s street food king — lentils, rice, macaroni, chickpeas with spiced tomato sauce and crispy onions.','eg','lunch','egyptian',{calories:620,protein:20,carbs:108,fat:8},['Vegan','Dairy-Free'],'wow',['lentils','rice','macaroni','chickpeas','tomato sauce','fried onions'],'medium',20,30,4.8,'koshari Egyptian street food'),
      createMeal('Molokhia & Rice','Silky jute leaf soup with coriander and garlic, served over rice with braised chicken.','eg','lunch','egyptian',{calories:540,protein:32,carbs:66,fat:14},['Gluten-Free','Dairy-Free'],'nostalgic',['molokhia leaves','chicken','garlic','coriander','rice'],'medium',15,30,4.7,'molokhia jute leaf soup Egypt'),
    ],
    dinner: [
      createMeal('Kofta & Tahini','Grilled minced lamb and beef kofta with creamy tahini sauce and flatbread.','eg','dinner','egyptian',{calories:580,protein:38,carbs:28,fat:32},['Dairy-Free'],'wow',['minced lamb','beef','parsley','spices','tahini','flatbread'],'easy',15,15,4.7,'kofta tahini Egyptian dinner'),
    ],
    snack: [
      createMeal('Feteer Meshaltet','Flaky multi-layered butter pastry — sweet with honey or savoury with cheese. Egypt\'s ancient pie.','eg','snack','egyptian',{calories:310,protein:7,carbs:42,fat:14},['Vegetarian'],'wow',['flour','butter','honey','cheese'],'hard',30,20,4.7,'feteer meshaltet Egyptian pastry'),
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATIC WEEKLY PLAN
// ─────────────────────────────────────────────────────────────────────────────

export const STATIC_WEEKLY_PLAN: any = {
  Monday: {
    breakfast: { name: 'Amala & Light Ewedu (Morning Bowl)', cal: 360, desc: 'A small morning serving of smooth dark amala.' },
    lunch: { name: 'Asaro (Yam Porridge)', cal: 490, desc: 'Yam pieces cooked down into a thick spiced stew.' },
    dinner: { name: 'Oha Soup & Pounded Yam', cal: 680, desc: 'Delicate oha leaves slow-cooked with cocoyam.' },
    snack: { name: 'Asun (Mini Portion)', cal: 220, desc: 'Peppered smoked goat meat — fiery.' },
  },
  Tuesday: {
    breakfast: { name: 'Amala & Light Ewedu (Morning Bowl)', cal: 360, desc: 'A small morning serving of smooth dark amala.' },
    lunch: { name: 'Ofada Rice & Ayamase', cal: 680, desc: 'Nutty, unpolished local ofada rice with designer stew.' },
    dinner: { name: 'Banga Soup & Starch', cal: 700, desc: 'Delta palm-nut soup with its unmistakable spice.' },
    snack: { name: 'Masa (Spiced Cornmeal Cake)', cal: 280, desc: 'Hausa steamed or fried cornmeal pudding cake.' },
  },
  Wednesday: {
    breakfast: { name: 'Akamu & Moin Moin', cal: 340, desc: 'Smooth corn porridge with savory steamed bean cake.' },
    lunch: { name: 'Egusi Soup & Semovita', cal: 620, desc: 'Thick melon seed stew with leafy greens and semovita.' },
    dinner: { name: 'Isi Ewu & Eba', cal: 690, desc: 'Spiced goat head dish served with soft eba.' },
    snack: { name: 'Boli & Groundnut', cal: 240, desc: 'Roasted plantain with crunchy peanut bites.' },
  },
  Thursday: {
    breakfast: { name: 'Corn Pap & Fried Plantain', cal: 330, desc: 'Comforting pap with caramelized plantain slices.' },
    lunch: { name: 'Jollof Rice & Chicken', cal: 720, desc: 'Smoky tomato rice with tender seasoned chicken.' },
    dinner: { name: 'Ofe Onugbu & Fufu', cal: 670, desc: 'Bitterleaf soup paired with pounded cassava dough.' },
    snack: { name: 'Suya Skewers (Mini)', cal: 260, desc: 'Light spicy beef suya with crunchy onions.' },
  },
  Friday: {
    breakfast: { name: 'Beans & Fried Plantain', cal: 400, desc: 'Hearty beans topped with sweet fried plantain.' },
    lunch: { name: 'Ofada Rice & Ayamase', cal: 680, desc: 'Nutty local rice with rich green designer stew.' },
    dinner: { name: 'Oha Soup & Pounded Yam', cal: 680, desc: 'Leafy oha greens cooked slowly in rich broth.' },
    snack: { name: 'Plantain Chips & Pepper', cal: 230, desc: 'Crunchy plantain chips dressed with spicy pepper.' },
  },
  Saturday: {
    breakfast: { name: 'Akara & Ogi', cal: 380, desc: 'Crispy bean fritters with smooth fermented corn porridge.' },
    lunch: { name: 'Fried Rice & Peppered Shrimp', cal: 710, desc: 'Flavorful rice loaded with shrimp and veggies.' },
    dinner: { name: 'Egusi Soup & Amala', cal: 700, desc: 'Rich melon seed soup served with soft amala.' },
    snack: { name: 'Spicy Puff Puff', cal: 250, desc: 'Sweet fried dough balls with a hint of spice.' },
  },
  Sunday: {
    breakfast: { name: 'Boiled Yam & Egg Sauce', cal: 420, desc: 'Classic boiled yam served with savory egg sauce.' },
    lunch: { name: 'Banga Soup & Starch', cal: 700, desc: 'Palm nut soup with soft starch dumplings.' },
    dinner: { name: 'Fish Pepper Soup & Rice', cal: 650, desc: 'Light peppery fish soup with white rice.' },
    snack: { name: 'Masa (Sweet Slice)', cal: 260, desc: 'Tender northern rice cake with sweet notes.' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const imageCache = new Map<string, string>();

export const ImageEngine = {
  getImageUrl: (meal: Meal, width = 400, height = 300): string => {
    const cached = imageCache.get(meal.id);
    if (cached) return cached;
    return `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(meal.name)}`;
  },

  fetchImage: async (meal: Meal): Promise<string | null> => {
    try {
      const key = process.env.NEXT_PUBLIC_UNSPLASH_KEY;
      if (!key) return null;
      const query = meal.unsplashQuery || meal.name;
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${key}&per_page=1&orientation=landscape`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json() as { results?: Array<{ urls?: { regular?: string } }> };
      const img = data?.results?.[0]?.urls?.regular;
      if (!img) return null;
      const imageUrl = `${img}?w=800&h=500&fit=crop&q=80`;
      imageCache.set(meal.id, imageUrl);
      return imageUrl;
    } catch {
      return null;
    }
  },

  batchFetch: async (meals: Meal[]): Promise<void> => {
    await Promise.all(meals.map(m => ImageEngine.fetchImage(m)));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CULTURAL SCORING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const computeScore = (
  meal: Meal,
  context: RecommendationContext
): MealScoreBreakdown => {
  // ── Vibe score ──
  const preferredVibes = context.preferredVibes;
  const vibeScore = preferredVibes?.length
    ? (preferredVibes.includes(meal.vibe) ? 15 : 0)
    : 0;

  // ── Diet score ──
  const diets = context.diets ?? context.dietPreferences ?? [];
  let dietScore = 0;
  if (diets.length) {
    const matches = diets.filter(d => meal.tags.includes(d)).length;
    if (matches === diets.length) dietScore = 15;
    else if (matches > 0) dietScore = 8;
  }

  // ── Calorie score ──
  const target = context.calorieTarget ?? context.maxCalories;
  let calorieScore = 0;
  if (target) {
    const diff = Math.abs(meal.nutrition.calories - target);
    if (diff <= 50) calorieScore = 15;
    else if (diff <= 150) calorieScore = 10;
    else if (diff <= 300) calorieScore = 5;
  }

  // ── Protein score ──
  const proteinScore = context.minProtein && meal.nutrition.protein >= context.minProtein ? 12 : 0;

  // ── Cultural score (THE BRAIN) ──
  const culturalScore = CULTURAL_WEIGHTS[meal.cuisine] ?? 0;

  // ── Diversity penalty ──
  const history = context.history ?? context.excludeMeals ?? [];
  const diversityScore = history.includes(meal.id) ? -20 : 5;

  const totalScore = vibeScore + dietScore + calorieScore + proteinScore + culturalScore + diversityScore;

  return {
    meal,
    scores: { vibeScore, dietScore, calorieScore, proteinScore, culturalScore, diversityScore },
    totalScore,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDATION ENGINE API
// ─────────────────────────────────────────────────────────────────────────────

export const RecommendationEngine = {
  scoreMeal: computeScore,

  recommend: (meals: Meal[], context: RecommendationContext): MealScoreBreakdown[] =>
    meals.map(m => computeScore(m, context)).sort((a, b) => b.totalScore - a.totalScore),

  pickBest: (meals: Meal[], context: RecommendationContext): Meal | null => {
    const ranked = RecommendationEngine.recommend(meals, context);
    return ranked[0]?.meal ?? null;
  },

  /** Weighted random from top-5 — avoids always returning the same meal */
  pickWeightedRandom: (meals: Meal[], context: RecommendationContext): Meal | null => {
    const ranked = RecommendationEngine.recommend(meals, context);
    const top = ranked.slice(0, 5);
    if (!top.length) return null;
    // Shift scores so minimum is 1 (avoid negative weights)
    const min = Math.min(...top.map(r => r.totalScore));
    const offset = min < 1 ? Math.abs(min) + 1 : 0;
    const weights = top.map(r => r.totalScore + offset);
    const total = weights.reduce((s, w) => s + w, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < top.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return top[i].meal;
    }
    return top[0].meal;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// pickMeal — COUNTRY-SPECIFIC RECOMMENDER
//
// When you select a country flag, you get THAT country's authentic meals.
// Nigeria remains fully Nigerian. Other countries remain true to themselves.
// No cross-blending: each flag shows its own food culture.
// ─────────────────────────────────────────────────────────────────────────────

export const pickMeal = (
  country: CountryKey,
  timeOfDay: TimeKey,
  vibe: string,
  diet: string,
  excludeMealName?: string | null
): Meal | null => {
  // Get ONLY the selected country's meals — no blending
  const pool: Meal[] = MEALS[country]?.[timeOfDay] ?? [];

  if (!pool.length) return null;

  // Exclude the last shown meal by name
  let filteredPool = excludeMealName
    ? pool.filter(m => m.name !== excludeMealName)
    : pool;

  // Ensure at least something in pool
  if (!filteredPool.length) filteredPool = pool;

  // Build context
  const context: RecommendationContext = {
    preferredVibes: vibe && vibe !== 'all' ? [vibe as VibeType] : [],
    diets: diet && diet !== 'All' ? [diet as DietTag] : [],
  };

  // Apply vibe filter (soft — falls back if no match)
  if (context.preferredVibes?.length) {
    const vibeFiltered = filteredPool.filter(m => m.vibe === (vibe as VibeType));
    if (vibeFiltered.length >= 2) filteredPool = vibeFiltered;
  }

  // Apply diet filter (soft — falls back if no match)
  if (context.diets?.length) {
    const dietFiltered = filteredPool.filter(m =>
      (context.diets ?? []).every(d => m.tags.includes(d))
    );
    if (dietFiltered.length >= 1) filteredPool = dietFiltered;
  }

  // Use cultural scoring engine for final selection (weighted random from top 5)
  return RecommendationEngine.pickWeightedRandom(filteredPool, context);
};

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const storage = {
  get: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  set: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  getHistory: (): string[] => {
    const data = storage.get('meal_history');
    return data ? JSON.parse(data) : [];
  },
  addToHistory: (mealId: string): void => {
    const history = storage.getHistory();
    const updated = [mealId, ...history.filter(id => id !== mealId)].slice(0, 50);
    storage.set('meal_history', JSON.stringify(updated));
  },
};

/* ─── 💎 BUBU'S WISDOM ENGINE ─── */
const HEALTHY_TIPS = [
  "Drink a glass of water right now. Your brain will thank you! 💧",
  "Chew slowly. It takes 20 minutes for your brain to know you're full. 🧠",
  "A little bit of dodo (plantain) makes every problem disappear. 🍌",
  "Life is short, eat the Jollof first. 🇳🇬",
  "You look best when you're hydrated. Drink up! ✨",
  "Consistency is better than perfection. Just keep going.",
  "Sleep is just a time machine to breakfast. Get some rest! 😴"
];

export const getRandomTip = () => {
  return HEALTHY_TIPS[Math.floor(Math.random() * HEALTHY_TIPS.length)];
};