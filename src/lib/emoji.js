// Fluent Emoji (3D) by Microsoft, MIT licence: https://github.com/microsoft/fluentui-emoji
// Every emoji MindTrack shows is drawn with these images instead of the device's emoji font, so the look
// is the same on every phone and computer. Images live in src/assets/emoji/<name>.webp.
const FILES = import.meta.glob('../assets/emoji/*.webp', { eager: true, query: '?url', import: 'default' });
const URLS = Object.fromEntries(Object.entries(FILES).map(([path, url]) => [path.split('/').pop().replace('.webp', ''), url]));

const NAMES = {
  "🎨": "artist_palette",
  "📊": "bar_chart",
  "🔔": "bell",
  "📚": "books",
  "🧠": "brain",
  "💼": "briefcase",
  "🫧": "bubbles",
  "🎯": "bullseye",
  "👤": "bust_in_silhouette",
  "👥": "busts_in_silhouette",
  "📅": "calendar",
  "📈": "chart_increasing",
  "✅": "check_mark_button",
  "🌸": "cherry_blossom",
  "📋": "clipboard",
  "💧": "droplet",
  "📧": "e_mail",
  "👁️": "eye",
  "🙏": "folded_hands",
  "⚙️": "gear",
  "🎓": "graduation_cap",
  "💚": "green_heart",
  "🤝": "handshake",
  "🌿": "herb",
  "☕": "hot_beverage",
  "⏳": "hourglass_not_done",
  "🏠": "house",
  "🤗": "hugging_face",
  "🔑": "key",
  "💡": "light_bulb",
  "🔒": "locked",
  "🔐": "locked_with_key",
  "🫁": "lungs",
  "🔍": "magnifying_glass_tilted_left",
  "📝": "memo",
  "💰": "money_bag",
  "🎵": "musical_note",
  "⛔": "no_entry",
  "📵": "no_mobile_phones",
  "🧑‍💼": "office_worker",
  "📖": "open_book",
  "📬": "open_mailbox_with_raised_flag",
  "🎉": "party_popper",
  "🛌": "person_in_bed",
  "🧘": "person_in_lotus_position",
  "🚶": "person_walking",
  "🚫": "prohibited",
  "🍎": "red_apple",
  "❤️": "red_heart",
  "🏫": "school",
  "🌱": "seedling",
  "😴": "sleeping_face",
  "😊": "smiling_face_with_smiling_eyes",
  "✨": "sparkles",
  "🔊": "speaker_high_volume",
  "🔈": "speaker_low_volume",
  "💬": "speech_balloon",
  "🗓️": "spiral_calendar",
  "⏱️": "stopwatch",
  "☀️": "sun",
  "🌤️": "sun_behind_small_cloud",
  "🍵": "teacup_without_handle",
  "📞": "telephone_receiver",
  "🕒": "three_oclock",
  "🚩": "triangular_flag",
  "⚠️": "warning",
  "🗑️": "wastebasket",
  "👋": "waving_hand",
};

// MindTrack's own kawaii icon set (src/assets/icons/<name>.webp). An emoji listed here is drawn with its
// kawaii icon; the rest keep their Fluent image.
const ICON_FILES = import.meta.glob('../assets/icons/*.webp', { eager: true, query: '?url', import: 'default' });
export const ICON_URLS = Object.fromEntries(Object.entries(ICON_FILES).map(([path, url]) => [path.split('/').pop().replace('.webp', ''), url]));

const ICONS = {
  "🌤️": "cloud_sun",
  "❤️": "heart",
  "💚": "heart",
  "😊": "heart",
  "🧠": "brain",
  "🧘": "brain_calm",
  "🌱": "sprout",
  "💬": "speech",
  "😴": "moon",
  "🛌": "moon",
  "🤗": "hug",
  "📅": "calendar",
  "🗓️": "calendar",
  "☀️": "sun",
  "💧": "water",
  "🎯": "mountain",
  "🙏": "hands_heart",
  "🤝": "lifebuoy",
  "📝": "journal",
  "🌿": "leaf",
  "🌸": "daisy",
  "✨": "star",
  "🎉": "star",
  "🎵": "headphones",
  "👥": "people",
  "🔒": "shield",
  "🔐": "shield",
  "📵": "phone",
  "☕": "cup",
  "🍵": "cup",
  "🚶": "signpost",
  "👤": "person",
  "📖": "document",
  "🏠": "house",
  "📊": "bar_chart",
  "📈": "chart_up",
  "📋": "clipboard",
  "🚩": "flag",
  "🔔": "bell",
  "🫁": "lungs",
  "🫧": "bubbles",
  "🔑": "key",
  "⚠️": "warning",
  "🗑️": "trash",
  "🔍": "magnifier",
  "📞": "telephone",
  "⚙️": "gear",
  "🎓": "grad_cap",
  "👋": "wave",
  "🧑‍💼": "counselor",
};

const strip = (e) => e.replace(/️/g, '');
const BY_EMOJI = new Map();
for (const [emoji, name] of Object.entries(NAMES)) {
  BY_EMOJI.set(emoji, URLS[name]);
  BY_EMOJI.set(strip(emoji), URLS[name]);
}
for (const [emoji, name] of Object.entries(ICONS)) {
  BY_EMOJI.set(emoji, ICON_URLS[name]);
  BY_EMOJI.set(strip(emoji), ICON_URLS[name]);
}

// URL of the image for an emoji (kawaii icon or Fluent), or null when MindTrack doesn't include one.
export const emojiUrl = (e) => (e ? BY_EMOJI.get(e) ?? BY_EMOJI.get(strip(e)) ?? null : null);

// Emoji that counselors can choose from when creating a daily challenge.
export const CHALLENGE_EMOJI = ['🌿', '🫁', '💧', '🚶', '🙏', '📵', '📝', '🫧', '💬', '🍎', '🎵', '📖', '☀️', '🧘', '🛌', '🤗', '🌸', '🎨', '🍵', '😊'];

// One emoji, including variation selectors, ZWJ sequences (e.g. 🧑‍💼) and skin tones.
export const EMOJI_RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*/gu;
