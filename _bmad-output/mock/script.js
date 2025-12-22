const pins = Array.from(document.querySelectorAll('.pin'));
const cards = Array.from(document.querySelectorAll('.card'));
const timeline = document.getElementById('timeline');
const tripMenu = document.getElementById('tripMenu');
const tripDrawer = document.getElementById('tripDrawer');
const tripDrawerOverlay = document.getElementById('tripDrawerOverlay');
const closeTripDrawer = document.getElementById('closeTripDrawer');
const tripItems = Array.from(document.querySelectorAll('.trip-item'));
const createTrip = document.getElementById('createTrip');
const currentTrip = document.getElementById('currentTrip');
const userAvatar = document.getElementById('userAvatar');
const userMenu = document.getElementById('userMenu');
const logoutBtn = document.getElementById('logoutBtn');
const mainView = document.querySelector('.layout-column');
const detailView = document.getElementById('detailView');
const backToList = document.getElementById('backToList');
const detailTitle = document.getElementById('detailTitle');
const detailSummary = document.getElementById('detailSummary');
const detailLocation = document.getElementById('detailLocation');
const detailDate = document.getElementById('detailDate');
const detailBody = document.getElementById('detailBody');
const detailHero = document.getElementById('detailHero');
const detailPin = document.getElementById('detailPin');
const detailGallery = document.getElementById('detailGallery');
const heroAddEntry = document.getElementById('heroAddEntry');
const addMediaBtn = document.getElementById('addMediaBtn');
const editToggle = document.getElementById('editToggle');
const newEntryModal = document.getElementById('newEntryModal');
const closeNewEntry = document.getElementById('closeNewEntry');
const cancelNewEntry = document.getElementById('cancelNewEntry');
const saveNewEntry = document.getElementById('saveNewEntry');
const newTitle = document.getElementById('newTitle');
const newLocation = document.getElementById('newLocation');
const newDate = document.getElementById('newDate');
const newSummary = document.getElementById('newSummary');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeLightbox = document.getElementById('closeLightbox');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

let editMode = false;
let currentEntryId = null;
let currentGalleryIndex = 0;
let lightboxMode = 'gallery'; // 'gallery' or 'inline'

// Simple mapping between map pins and timeline cards
pins.forEach(pin => {
  pin.addEventListener('click', () => {
    const id = pin.dataset.id;
    activateCard(id);
  });
});

cards.forEach(card => {
  card.addEventListener('click', () => {
    const id = card.dataset.id;
    activateCard(id);
    openDetail(id);
  });
});

function activateCard(id) {
  cards.forEach(c => c.classList.toggle('active', c.dataset.id === id));
  const target = cards.find(c => c.dataset.id === id);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Trip menu drawer
tripMenu?.addEventListener('click', () => {
  tripDrawer.classList.add('show');
  tripDrawer.classList.remove('hidden');
});

const closeDrawer = () => {
  tripDrawer.classList.remove('show');
  tripDrawer.classList.add('hidden');
};

closeTripDrawer?.addEventListener('click', closeDrawer);
tripDrawerOverlay?.addEventListener('click', closeDrawer);

tripItems.forEach(item => {
  item.addEventListener('click', () => {
    tripItems.forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    if (currentTrip) currentTrip.textContent = item.textContent.split('·')[0].trim();
    closeDrawer();
  });
});

createTrip?.addEventListener('click', () => {
  alert('New trip creation flow goes here.');
  closeDrawer();
});

// User menu
userAvatar?.addEventListener('click', () => {
  if (userMenu.classList.contains('show')) {
    userMenu.classList.remove('show');
    userMenu.classList.add('hidden');
  } else {
    userMenu.classList.add('show');
    userMenu.classList.remove('hidden');
  }
});

userMenu?.addEventListener('click', (e) => {
  if (e.target === userMenu) {
    userMenu.classList.remove('show');
    userMenu.classList.add('hidden');
  }
});

logoutBtn?.addEventListener('click', () => {
  alert('Logout clicked.');
  userMenu.classList.remove('show');
  userMenu.classList.add('hidden');
});

const entriesData = {
  "1": {
    title: "Tsukiji Market lunch",
    summary: "Quick capture of street food stalls and seafood tasting notes.",
    location: "Tokyo",
    date: "Mar 12",
    hero: "url('https://images.unsplash.com/photo-1578925501403-779d06005d0e?auto=format&fit=crop&w=1600&q=80')",
    cardImage: "url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80')",
    body: [
      "Arrived just before noon; tried uni, toro, and tamago at the outer market stalls.",
      { type: "img", src: "https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=1200&q=80" },
      "Captured photos of the crowds and close-ups of dishes; noted best stalls for freshness.",
      { type: "img", src: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=1200&q=80" },
      "Reflection: pacing is key—small bites at multiple vendors beats one long sit-down."
    ],
    gallery: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=1200&q=80"
    ],
    pin: { top: "22%", left: "38%" }
  },
  "2": {
    title: "Fushimi Inari hike",
    summary: "Tori gates trail at sunrise; notes on crowd flow and photo spots.",
    location: "Kyoto",
    date: "Mar 11",
    hero: "url('https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1600&q=80')",
    cardImage: "url('https://images.unsplash.com/photo-1504788363733-507549153474?auto=format&fit=crop&w=900&q=80')",
    body: [
      "Started at 6am to beat crowds; first half-hour nearly empty.",
      { type: "img", src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80" },
      "Best photo angles at mid-stations; noted where to pause for light through gates.",
      { type: "img", src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80" },
      "Ended with tea at a small shop; legs sore but worth it."
    ],
    gallery: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80"
    ],
    pin: { top: "45%", left: "62%" }
  },
  "3": {
    title: "Dotonbori night walk",
    summary: "Neon, canal reflections, and takoyaki stand impressions.",
    location: "Osaka",
    date: "Mar 10",
    hero: "url('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1600&q=80')",
    cardImage: "url('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=900&q=80')",
    body: [
      "Glico sign, canal reflections; experimented with long exposure.",
      "Takoyaki comparison: crisp exterior vs soft; noted favorite stand.",
      "Crowd flow observations for future visits."
    ],
    gallery: [
      "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505761671935-1f96e1d33f5c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80"
    ],
    pin: { top: "70%", left: "28%" }
  },
  "4": {
    title: "Nara park stroll",
    summary: "Deer encounters, temples, and a calm afternoon sketching.",
    location: "Nara",
    date: "Mar 9",
    hero: "url('https://images.unsplash.com/photo-1478029038552-886ff55b44d0?auto=format&fit=crop&w=1600&q=80')",
    cardImage: "url('https://images.unsplash.com/photo-1478029038552-886ff55b44d0?auto=format&fit=crop&w=900&q=80')",
    body: [
      "Fed deer near the main gate; watched their behavior around tourists.",
      "Quiet temple stops; sketched pagoda lines in notebook.",
      "Warm light near sunset—great for portraits."
    ],
    gallery: [
      "https://images.unsplash.com/photo-1478029038552-886ff55b44d0?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494475673543-6a6a27143fc8?auto=format&fit=crop&w=1200&q=80"
    ],
    pin: { top: "58%", left: "72%" }
  },
  "5": {
    title: "Onsen break",
    summary: "Foggy morning, lake views, and notes on the best rotenburo.",
    location: "Hakone",
    date: "Mar 8",
    hero: "url('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1600&q=80')",
    cardImage: "url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80')",
    body: [
      "Early dip with mountain fog; minimal crowds.",
      "Compared rotenburo views; jotted ratings for heat and scenery.",
      "No photos inside; exterior shots of approach and lake."
    ],
    gallery: [
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
    ],
    pin: { top: "64%", left: "50%" }
  },
  "6": {
    title: "Shinjuku nights",
    summary: "Skyscraper views, bar hopping in Golden Gai, late ramen notes.",
    location: "Tokyo",
    date: "Mar 7",
    hero: "url('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1600&q=80')",
    cardImage: "url('https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=900&q=80')",
    body: [
      "Observation deck shots; city grid at night.",
      "Golden Gai bars: tiny, atmospheric; noted favorite spots.",
      "Late ramen: broth depth and noodle texture ratings."
    ],
    gallery: [
      "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505761671935-1f96e1d33f5c?auto=format&fit=crop&w=1200&q=80"
    ],
    pin: { top: "18%", left: "20%" }
  }
};

function openDetail(id) {
  const data = entriesData[id];
  if (!data) return;
  currentEntryId = id;
  mainView?.classList.add('hidden');
  detailView?.classList.remove('hidden');
  toggleEditMode(false);
  detailTitle.textContent = data.title;
  detailSummary.textContent = data.summary;
  detailLocation.textContent = data.location;
  detailDate.textContent = data.date;
  detailHero.style.setProperty('--hero-img', data.hero || "url('https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=1400&q=80')");
  detailBody.innerHTML = data.body.map(block => {
    if (typeof block === 'string') return `<p>${block}</p>`;
    if (block.type === 'img') return `<div class="inline-img" aria-label="inline photo" style="background-image:url('${block.src}')"></div>`;
    return '';
  }).join('');
  detailPin.style.top = data.pin.top;
  detailPin.style.left = data.pin.left;
  Array.from(detailBody.querySelectorAll('.inline-img')).forEach((imgEl, idx) => {
    imgEl.addEventListener('click', () => openLightboxInline(imgEl.style.backgroundImage));
  });
  const grid = detailGallery.querySelector('.gallery-grid');
  if (grid) {
    grid.innerHTML = '';
    (data.gallery || []).forEach((url, idx) => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.style.backgroundImage = `url('${url}')`;
      div.addEventListener('click', () => openLightbox(idx));
      grid.appendChild(div);
    });
  }
}

backToList?.addEventListener('click', () => {
  detailView?.classList.add('hidden');
  mainView?.classList.remove('hidden');
});

heroAddEntry?.addEventListener('click', () => {
  newEntryModal?.classList.remove('hidden');
});

function toggleEditMode(on) {
  editMode = on;
  const editableFields = [detailTitle, detailSummary, detailBody];
  editableFields.forEach(el => {
    if (el) el.contentEditable = on ? 'true' : 'false';
  });
  if (addMediaBtn) addMediaBtn.disabled = !on;
  const grid = detailGallery?.querySelector('.gallery-grid');
  if (grid) {
    if (on && !grid.querySelector('.gallery-item.add')) {
      const add = document.createElement('div');
      add.className = 'gallery-item add';
      add.textContent = '+';
      grid.prepend(add);
    } else if (!on) {
      const add = grid.querySelector('.gallery-item.add');
      if (add) add.remove();
    }
  }
}

detailTitle?.addEventListener('dblclick', () => toggleEditMode(true));
detailSummary?.addEventListener('dblclick', () => toggleEditMode(true));
detailBody?.addEventListener('dblclick', () => toggleEditMode(true));
addMediaBtn?.addEventListener('click', () => alert('Add media flow goes here.'));

// Populate list cards with real images
function setCardImages() {
  cards.forEach(card => {
    const data = entriesData[card.dataset.id];
    if (!data) return;
    const media = card.querySelector('.card-media');
    if (media && data.cardImage) {
      media.style.backgroundImage = data.cardImage;
    }
  });
}
setCardImages();

editToggle?.addEventListener('click', () => {
  toggleEditMode(!editMode);
  editToggle.textContent = editMode ? 'Save' : 'Edit';
  if (!editMode) {
    // Simulate saving edits
    alert('Changes saved.');
  }
});

const closeNewEntryModal = () => newEntryModal?.classList.add('hidden');
closeNewEntry?.addEventListener('click', closeNewEntryModal);
cancelNewEntry?.addEventListener('click', closeNewEntryModal);
newEntryModal?.addEventListener('click', (e) => {
  if (e.target === newEntryModal) closeNewEntryModal();
});

saveNewEntry?.addEventListener('click', () => {
  const title = newTitle?.value?.trim() || 'Untitled';
  alert(`New entry "${title}" saved (demo).`);
  closeNewEntryModal();
});

const openLightbox = (idx) => {
  const data = entriesData[currentEntryId];
  if (!data || !data.gallery || !data.gallery.length) return;
  lightboxMode = 'gallery';
  currentGalleryIndex = idx;
  lightbox?.classList.remove('nav-disabled');
  lightboxImage.style.backgroundImage = `url('${data.gallery[idx]}')`;
  lightbox?.classList.remove('hidden');
};

const openLightboxInline = (bgImage) => {
  lightboxMode = 'inline';
  lightbox?.classList.add('nav-disabled');
  lightboxImage.style.backgroundImage = bgImage;
  lightbox?.classList.remove('hidden');
};

closeLightbox?.addEventListener('click', () => lightbox?.classList.add('hidden'));
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) lightbox.classList.add('hidden');
});

const moveGallery = (dir) => {
  const data = entriesData[currentEntryId];
  if (lightboxMode !== 'gallery') return;
  if (!data || !data.gallery || !data.gallery.length) return;
  currentGalleryIndex = (currentGalleryIndex + dir + data.gallery.length) % data.gallery.length;
  lightboxImage.style.backgroundImage = `url('${data.gallery[currentGalleryIndex]}')`;
};
lightboxPrev?.addEventListener('click', () => moveGallery(-1));
lightboxNext?.addEventListener('click', () => moveGallery(1));
