/**
 * GOSH PHASE 9 LIFESTYLE MODULES TEST SUITE
 * Tests Memories, Diary (Encrypted), Together (Calendar, Tasks, Expenses),
 * Music (Playlists & Streaming), and Smart Search (Unified Multi-Module Index).
 */

// Setup Mock Environment for Node.js
if (typeof localStorage === 'undefined') {
  const storage = {};
  global.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
}

if (typeof sessionStorage === 'undefined') {
  const sessionStorageStore = {};
  global.sessionStorage = {
    getItem: (k) => sessionStorageStore[k] || null,
    setItem: (k, v) => { sessionStorageStore[k] = String(v); },
    removeItem: (k) => { delete sessionStorageStore[k]; },
    clear: () => { Object.keys(sessionStorageStore).forEach(k => delete sessionStorageStore[k]); }
  };
}

if (typeof window === 'undefined') {
  global.window = {
    screen: { width: 1920, height: 1080 },
    addEventListener: () => {},
    location: { hash: '' }
  };
}

try {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: 'NodeTest/1.0 (Windows NT 10.0)',
    configurable: true
  });
} catch {}

// Import dependencies
const { Auth } = await import('../services/auth.service.js');
const { DB } = await import('../services/db.service.js');
const { Crypto } = await import('../services/crypto.service.js');
const { MemoriesModule } = await import('../modules/memories/memories.module.js');
const { DiaryModule } = await import('../modules/diary/diary.module.js');
const { TogetherModule } = await import('../modules/together/together.module.js');
const { MusicModule } = await import('../modules/music/music.module.js');
const { SearchModule } = await import('../modules/search/search.module.js');

async function runLifestyleTests() {
  console.log('--- GOSH PHASE 9 LIFESTYLE MODULES TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 0. Setup: Authenticate as User 1
    localStorage.clear();
    DB.initDefaultSeed();
    const loginRes = await Auth.initiateLogin('prasanthgokul736@gmail.com', 'Gokul@709');
    await Auth.verifyOtp(loginRes.debugCode);
    const currentUser = Auth.getCurrentUser();
    assert(Auth.isAuthenticated() && currentUser.email === 'prasanthgokul736@gmail.com', 'Setup: Authenticated as User 1');

    // =========================================================================
    // 1. MEMORIES MODULE TESTS
    // =========================================================================
    // Create Album
    const album = await DB.insert('memory_albums', {
      title: 'Rome Summer Trip 2026',
      description: 'Photos and videos from our Italian getaway',
      created_by: currentUser.id
    });
    assert(album && album.id, 'MEMORIES: Photo album created with generated ID');
    assert(album.title === 'Rome Summer Trip 2026', 'MEMORIES: Album title persisted');

    // Add Memory Item
    const memory = await DB.insert('memories', {
      file_id: 'f-rome-01',
      album_id: album.id,
      caption: 'Sunset over the Colosseum with espresso',
      memory_date: '2026-07-15',
      tags: ['rome', 'summer', 'sunset'],
      thumbnail_url: 'https://images.unsplash.com/photo-rome-colosseum',
      is_favorite: true,
      created_by: currentUser.id
    });
    assert(memory && memory.id, 'MEMORIES: Memory item created in database');
    assert(memory.is_favorite === true, 'MEMORIES: Memory is_favorite flag initialized to true');
    assert(memory.tags.includes('colosseum') === false && memory.tags.includes('rome') === true, 'MEMORIES: Tag array persisted correctly');

    // Query & Toggle Favorite
    await DB.update('memories', memory.id, { is_favorite: false });
    const updatedMem = await DB.getById('memories', memory.id);
    assert(updatedMem.is_favorite === false, 'MEMORIES: is_favorite toggled to false');

    // Render Memories View
    const memHtml = await MemoriesModule.render();
    assert(typeof memHtml === 'string' && memHtml.includes('GOSH Memories'), 'MEMORIES: View renders title header');
    assert(memHtml.includes('Sunset over the Colosseum'), 'MEMORIES: View renders memory caption');
    assert(memHtml.includes('#rome'), 'MEMORIES: View renders hashtag pill');

    // =========================================================================
    // 2. DIARY MODULE TESTS
    // =========================================================================
    const rawTitle = 'Reflections on our journey so far';
    const rawContent = 'Today was a wonderful quiet day planning our upcoming travels and projects.';

    const encTitle = await Crypto.encrypt(rawTitle);
    const encContent = await Crypto.encrypt(rawContent);

    const diaryEntry = await DB.insert('diary_entries', {
      entry_date: '2026-11-19',
      mood: 'joyful',
      title_encrypted: encTitle.ciphertext,
      content_encrypted: encContent.ciphertext,
      iv: `${encTitle.iv}:${encContent.iv}`,
      created_by: currentUser.id
    });

    assert(diaryEntry && diaryEntry.id, 'DIARY: Encrypted entry saved to database');
    assert(diaryEntry.title_encrypted !== rawTitle, 'DIARY: Title is strongly encrypted hex (zero plaintext)');
    assert(diaryEntry.content_encrypted !== rawContent, 'DIARY: Body is strongly encrypted hex (zero plaintext)');

    // In-memory Decryption Test
    const [titleIv, contentIv] = diaryEntry.iv.split(':');
    const decTitle = await Crypto.decrypt(diaryEntry.title_encrypted, titleIv);
    const decContent = await Crypto.decrypt(diaryEntry.content_encrypted, contentIv);
    assert(decTitle === rawTitle, 'DIARY: Client-side decryption faithfully restores title');
    assert(decContent === rawContent, 'DIARY: Client-side decryption faithfully restores body');

    // Render Diary View
    const diaryHtml = await DiaryModule.render();
    assert(diaryHtml.includes('GOSH Shared Diary'), 'DIARY: View renders journal header');
    assert(diaryHtml.includes('Reflections on our journey so far'), 'DIARY: View renders decrypted entry title');
    assert(diaryHtml.includes('Joyful'), 'DIARY: View displays mood badge');

    // =========================================================================
    // 3. TOGETHER MODULE TESTS (CALENDAR, TASKS, EXPENSES)
    // =========================================================================
    // 3a. Calendar Event
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const event = await DB.insert('calendar_events', {
      title: 'Anniversary Dinner Reservation',
      description: 'Table for two at the rooftop bistro',
      start_time: futureDate.toISOString(),
      end_time: futureDate.toISOString(),
      is_all_day: false,
      category: 'anniversary',
      created_by: currentUser.id
    });
    assert(event && event.id, 'TOGETHER: Calendar event created');
    assert(event.category === 'anniversary', 'TOGETHER: Event category set to anniversary');

    // 3b. Shared Checklist Task
    const task = await DB.insert('shared_tasks', {
      title: 'Pack international plug adapters',
      priority: 'high',
      completed: false,
      created_by: currentUser.id
    });
    assert(task && task.id, 'TOGETHER: Shared task created');
    assert(task.completed === false, 'TOGETHER: Task initially pending');

    // Toggle Task Completed
    await DB.update('shared_tasks', task.id, { completed: true, completed_by: currentUser.id });
    const updatedTask = await DB.getById('shared_tasks', task.id);
    assert(updatedTask.completed === true, 'TOGETHER: Task marked completed');
    assert(updatedTask.completed_by === currentUser.id, 'TOGETHER: Completed by attributed to User 1');

    // 3c. Shared Expense Split
    const expense1 = await DB.insert('shared_expenses', {
      title: 'Flight Tickets to Rome',
      amount: 400.00,
      currency: 'USD',
      category: 'travel',
      paid_by: 'u1-auth-0000-0000-000000000001', // Gokul
      expense_date: '2026-11-19',
      split_ratio: '50/50'
    });

    const expense2 = await DB.insert('shared_expenses', {
      title: 'Airbnb Reservation',
      amount: 100.00,
      currency: 'USD',
      category: 'travel',
      paid_by: 'u2-auth-0000-0000-000000000002', // Sharanya
      expense_date: '2026-11-19',
      split_ratio: '50/50'
    });

    assert(expense1 && expense2, 'TOGETHER: Joint expenses recorded in ledger');

    // Settlement verification: Total = 500, Half = 250. Gokul paid 400 (overpaid by 150), Sharanya paid 100. Sharanya owes Gokul $150.
    const allExpenses = await DB.query('shared_expenses');
    let gokulTotal = 0, sharanyaTotal = 0;
    allExpenses.forEach(e => {
      if (e.paid_by === 'u1-auth-0000-0000-000000000001') gokulTotal += parseFloat(e.amount);
      else sharanyaTotal += parseFloat(e.amount);
    });
    const netDiff = gokulTotal - ((gokulTotal + sharanyaTotal) / 2);
    assert(netDiff === 150.00, 'TOGETHER: Net settlement correctly calculates Sharanya owes Gokul $150.00');

    // Render Together View
    TogetherModule.activeTab = 'calendar';
    const calHtml = await TogetherModule.render();
    assert(calHtml.includes('Anniversary Dinner Reservation'), 'TOGETHER: Calendar tab renders event');

    TogetherModule.activeTab = 'tasks';
    const taskHtml = await TogetherModule.render();
    assert(taskHtml.includes('Pack international plug adapters'), 'TOGETHER: Tasks tab renders checklist item');

    TogetherModule.activeTab = 'expenses';
    const expHtml = await TogetherModule.render();
    assert(expHtml.includes('Flight Tickets to Rome'), 'TOGETHER: Expenses tab renders transaction');
    assert(expHtml.includes('Sharanya owes Gokul $150.00'), 'TOGETHER: Expenses tab displays net settlement calculation');

    // =========================================================================
    // 4. MUSIC MODULE TESTS
    // =========================================================================
    const playlists = await DB.query('music_playlists');
    assert(playlists.length >= 2, 'MUSIC: Default shared playlists exist');

    const testPlaylist = playlists[0];
    const track = await DB.insert('music_items', {
      playlist_id: testPlaylist.id,
      title: 'Midnight City',
      artist: 'M83',
      external_url: 'https://open.spotify.com/track/1eyzqe2QqGZUmfcPZtrIyt',
      platform: 'spotify',
      added_by: currentUser.id
    });
    assert(track && track.id, 'MUSIC: Song added to shared playlist');
    assert(track.platform === 'spotify', 'MUSIC: Platform set to Spotify');

    // Playback state test
    MusicModule.playTrack(track);
    assert(MusicModule.currentTrack && MusicModule.currentTrack.id === track.id, 'MUSIC: Active playing track set');
    assert(MusicModule.isPlaying === true, 'MUSIC: isPlaying flag set to true');

    MusicModule.togglePlayPause();
    assert(MusicModule.isPlaying === false, 'MUSIC: togglePlayPause pauses audio');

    const musicHtml = await MusicModule.render();
    assert(musicHtml.includes('GOSH Music'), 'MUSIC: View renders music header');
    assert(musicHtml.includes('Midnight City'), 'MUSIC: View displays song title');
    assert(musicHtml.includes('Spotify'), 'MUSIC: View displays streaming platform badge');

    // =========================================================================
    // 5. SMART SEARCH MODULE TESTS (UNIFIED MULTI-MODULE INDEX)
    // =========================================================================
    // Search for "Rome" -> should match memory caption and flight expense
    const searchResultsRome = await SearchModule.executeSearch('Rome');
    assert(searchResultsRome.length >= 2, 'SEARCH: Multi-module search for "Rome" finds >= 2 items');
    const categoriesFound = searchResultsRome.map(r => r.category);
    assert(categoriesFound.includes('memories'), 'SEARCH: Found memory matching "Rome"');
    assert(categoriesFound.includes('together'), 'SEARCH: Found expense matching "Rome"');

    // Search for "journey" -> should match encrypted diary entry
    const searchResultsDiary = await SearchModule.executeSearch('journey');
    assert(searchResultsDiary.some(r => r.category === 'diary'), 'SEARCH: Decrypted diary search finds matching entry for "journey"');

    // Search for "plug" -> should match checklist task
    const searchResultsTask = await SearchModule.executeSearch('plug');
    assert(searchResultsTask.some(r => r.category === 'together' && r.title.includes('plug')), 'SEARCH: Found task matching "plug"');

    // Render Search View
    SearchModule.searchQuery = 'Rome';
    const searchHtml = await SearchModule.render();
    assert(searchHtml.includes('GOSH Smart Search'), 'SEARCH: View renders search header');
    assert(searchHtml.includes('Sunset over the Colosseum'), 'SEARCH: View displays matching memory result');
    assert(searchHtml.includes('Jump ↗'), 'SEARCH: Result contains navigation jump button');

    console.log(`\nPHASE 9 TESTS COMPLETED: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);

  } catch (err) {
    console.error('Test Suite Exception:', err);
    process.exit(1);
  }
}

runLifestyleTests();
