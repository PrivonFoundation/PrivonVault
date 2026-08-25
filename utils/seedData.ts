import { db, DBItem } from '../crypto-core/db';

const NAMES = {
  image: [
    'Vacation_Beach', 'Sunset_Mountain', 'Family_Dinner', 'Birthday_Party', 'Wedding_2026',
    'Puppy_Playful', 'City_Skyline', 'Forest_Walk', 'Ocean_Waves', 'Starry_Night',
    'Cherry_Blossom', 'Autumn_Leaves', 'Snowy_Peaks', 'Desert_Dunes', 'Rainbow_Falls',
    'Lake_Reflection', 'Meadow_Flowers', 'Rocky_Coast', 'Misty_Morning', 'Golden_Hour',
    'Tropical_Beach', 'Northern_Lights', 'Canyon_View', 'Waterfall_Mist', 'Lavender_Fields',
    'Coral_Reef', 'Bamboo_Forest', 'Sunrise_Summit', 'Moonlit_Valley', 'Crystal_Cave',
    'Wildflower_Meadow', 'Glacier_Blue', 'Volcano_Sunset', 'Palm_Trees', 'Maple_Lane',
    'River_Bend', 'Cliff_Dive', 'Sand_Dune', 'Ice_Castle', 'Thunder_Storm',
  ],
  audio: [
    'Morning_Jazz', 'Summer_Nights', 'Road_Trip', 'Chill_Vibes', 'Workout_Energy',
    'Study_Session', 'Late_Night', 'Acoustic_Set', 'Electronic_Dreams', 'Classical_Remix',
    'Live_Concert', 'Podcast_Ep1', 'Audio_Book_Ch1', 'Ambient_Sounds', 'LoFi_Beats',
    'Guitar_Riffs', 'Piano_Sonata', 'Drum_Bass', 'Soulful_Vocals', 'Blues_Jam',
    'Dance_Mix', 'Reggae_Rhythms', 'Folk_Melodies', 'Indie_Rock', 'Jazz_Quartet',
    'Symphony_No5', 'Rainy_Day', 'Ocean_Waves', 'Forest_Birds', 'Thunder_Rain',
    'Vinyl_Record', 'Live_Session', 'Acoustic_Cover', 'Remix_2026', 'Demo_Track',
  ],
  doc: [
    'Project_Report', 'Meeting_Notes', 'Budget_2026', 'Contract_Draft', 'Research_Paper',
    'Tax_Returns', 'Recipe_Book', 'Travel_Plan', 'Study_Guide', 'Workout_Plan',
    'Investment_Portfolio', 'Insurance_Policy', 'Medical_Records', 'Property_Deed', 'Will_Testament',
    'Business_Plan', 'Marketing_Strategy', 'Sales_Report', 'Employee_Handbook', 'Training_Manual',
    'Academic_Thesis', 'Lab_Results', 'Survey_Data', 'Interview_Transcript', 'Legal_Brief',
    'Invoice_2026_01', 'Invoice_2026_02', 'Invoice_2026_03', 'Invoice_2026_04', 'Invoice_2026_05',
    'Invoice_2026_06', 'Invoice_2026_07', 'Invoice_2026_08', 'Invoice_2026_09', 'Invoice_2026_10',
    'Newsletter_Jan', 'Newsletter_Feb', 'Newsletter_Mar', 'Newsletter_Apr', 'Newsletter_May',
  ],
  video: [
    'Graduation_Ceremony', 'Vacation_Compilation', 'Kids_Recital', 'Sport_Highlights', 'Tutorial_React',
    'DIY_Project', 'Cooking_Show', 'Travel_Vlog_01', 'Music_Video', 'Time_Lapse',
    'Drone_Footage', 'GoPro_Adventure', 'Birthday_Montage', 'Wedding_Highlights', 'Concert_Record',
  ],
};

const EXTENSIONS: Record<string, string[]> = {
  image: ['.jpg', '.png', '.heic', '.webp'],
  audio: ['.mp3', '.flac', '.wav', '.aac', '.ogg'],
  doc: ['.pdf', '.docx', '.xlsx', '.txt', '.md'],
  video: ['.mp4', '.mov', '.mkv', '.avi'],
  other: ['.zip', '.appimage', '.dmg', '.msi', '.apk'],
};

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(): string {
  const start = new Date('2024-01-01');
  const end = new Date();
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

function randomSize(category: string): string {
  const sizes: Record<string, [number, number]> = {
    image: [0.1, 25],
    audio: [2, 80],
    doc: [0.01, 10],
    video: [50, 2000],
    other: [0.5, 500],
  };
  const [min, max] = sizes[category] || [0.1, 10];
  const mb = min + Math.random() * (max - min);
  if (mb < 1) return Math.round(mb * 1000) + ' KB';
  return mb.toFixed(1) + ' MB';
}

function yieldToBrowser(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

async function seedTestData(count: number = 1000) {
  const batchSize = 25;
  const items: DBItem[] = [];

  for (let i = 1; i <= count; i++) {
    const catRoll = Math.random();
    const category = catRoll < 0.35 ? 'image' : catRoll < 0.55 ? 'audio' : catRoll < 0.75 ? 'doc' : catRoll < 0.9 ? 'video' : 'other';
    const namePool = NAMES[category as keyof typeof NAMES] || NAMES.image;
    const baseName = randomItem(namePool);
    const ext = randomItem(EXTENSIONS[category as keyof typeof EXTENSIONS] || EXTENSIONS.other);
    const isFavorite = Math.random() < 0.15;

    items.push({
      id: `test-${String(i).padStart(6, '0')}`,
      parentId: null,
      type: 'file',
      name: `${baseName}${ext}`,
      size: randomSize(category),
      date: randomDate(),
      category: category as DBItem['category'],
      isFavorite,
      isTrashed: false,
      fileData: new Blob([new Uint8Array(64)]),
    });
  }

  const total = items.length;
  let added = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(item => db.addItem(item).catch(() => {})));
    added += batch.length;
    console.log(`Progress: ${added}/${total}`);
    await yieldToBrowser();
  }

  console.log(`Done! Added ${added} test items.`);
}

async function clearTestData() {
  const all = await db.getAllItems();
  const testItems = all.filter(item => item.id.startsWith('test-'));

  const batchSize = 50;
  for (let i = 0; i < testItems.length; i += batchSize) {
    const batch = testItems.slice(i, i + batchSize);
    await Promise.all(batch.map(item => db.deleteItem(item.id).catch(() => {})));
    await yieldToBrowser();
  }

  console.log(`Removed ${testItems.length} test items.`);
}

export { seedTestData, clearTestData };
