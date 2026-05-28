export const patternCategories = [
  { id: 'your-patterns',   name: 'Your Patterns',   icon: '💚' },
  { id: 'american-liberty', name: 'American Liberty', icon: '🇺🇸' },
  { id: 'birthdays',       name: 'Birthdays',        icon: '🎂' },
  { id: 'canadian-strong', name: 'Canadian Strong',  icon: '🍁' },
  { id: 'christmas',       name: 'Christmas',        icon: '🎄' },
  { id: 'cinco-de-mayo',   name: 'Cinco de Mayo',    icon: '🌮' },
  { id: 'day-of-the-dead', name: 'Day of the Dead',  icon: '💀' },
  { id: 'easter',          name: 'Easter',           icon: '🐣' },
  { id: 'fathers-day',     name: "Father's Day",     icon: '👔' },
  { id: 'halloween',       name: 'Halloween',        icon: '🎃' },
  { id: 'hanukkah',        name: 'Hanukkah',         icon: '🕎' },
  { id: 'mothers-day',     name: "Mother's Day",     icon: '🌸' },
  { id: 'new-years',       name: 'New Years',        icon: '🎆' },
  { id: 'quinceanera',     name: 'Quinceañera',      icon: '👗' },
  { id: 'sports-week',     name: 'Sports Week',      icon: '🏆' },
];

export const scenes = [
  // Your Patterns
  { id: 1,  name: 'Warm Architectural', categoryId: 'your-patterns',   colors: ['#FFA852','#FFD4A3','#FFF1E0'],                       speed: 0, animation: 'Static',      favorite: true  },
  { id: 2,  name: 'Cool White',         categoryId: 'your-patterns',   colors: ['#E8EAF6','#C5CAE9','#F5F5F5'],                       speed: 0, animation: 'Static',      favorite: false },
  { id: 3,  name: 'Soft Glow',          categoryId: 'your-patterns',   colors: ['#FFCC80','#FFE0B2','#FFF8E1'],                       speed: 1, animation: 'Fade',        favorite: true  },

  // American Liberty
  { id: 4,  name: 'Fourth of July',     categoryId: 'american-liberty', colors: ['#D50000','#FFFFFF','#1565C0'],                      speed: 5, animation: 'Wave',        favorite: false },
  { id: 5,  name: 'Stars & Stripes',    categoryId: 'american-liberty', colors: ['#B71C1C','#FFFFFF','#0D47A1','#FFFFFF'],             speed: 4, animation: 'Chase',       favorite: false },
  { id: 6,  name: 'Liberty Blue',       categoryId: 'american-liberty', colors: ['#1565C0','#42A5F5','#FFFFFF'],                      speed: 2, animation: 'Pulse',       favorite: false },
  { id: 7,  name: 'Patriot Sparkle',    categoryId: 'american-liberty', colors: ['#EF5350','#FFFFFF','#1E88E5','#FFFFFF'],             speed: 3, animation: 'Sparkle',     favorite: false },
  { id: 8,  name: 'Old Glory',          categoryId: 'american-liberty', colors: ['#C62828','#EF9A9A','#FFFFFF'],                      speed: 0, animation: 'Static',      favorite: false },

  // Birthdays
  { id: 9,  name: 'Birthday Blast',     categoryId: 'birthdays',        colors: ['#FF5252','#FF9800','#FFEB3B','#4CAF50','#2196F3','#9C27B0'], speed: 3, animation: 'Gradient', favorite: false },
  { id: 10, name: 'Party Twinkle',      categoryId: 'birthdays',        colors: ['#F48FB1','#FFD700','#FFFFFF','#CE93D8'],             speed: 3, animation: 'Twinkle',     favorite: false },
  { id: 11, name: 'Happy Colors',       categoryId: 'birthdays',        colors: ['#FF7043','#FFCA28','#66BB6A','#29B6F6','#AB47BC'],  speed: 4, animation: 'Chase',       favorite: false },
  { id: 12, name: 'Celebration Wave',   categoryId: 'birthdays',        colors: ['#E91E63','#9C27B0','#FFD700'],                      speed: 3, animation: 'Wave',        favorite: false },

  // Canadian Strong
  { id: 13, name: 'Maple Leaf',         categoryId: 'canadian-strong',  colors: ['#D32F2F','#FFFFFF'],                                speed: 0, animation: 'Static',      favorite: false },
  { id: 14, name: 'True North',         categoryId: 'canadian-strong',  colors: ['#C62828','#FFFFFF','#C62828'],                      speed: 3, animation: 'Chase',       favorite: false },
  { id: 15, name: 'Canada Wave',        categoryId: 'canadian-strong',  colors: ['#D50000','#EF9A9A','#FFFFFF','#EF9A9A'],            speed: 4, animation: 'Wave',        favorite: false },

  // Christmas
  { id: 16, name: 'Christmas Classic',  categoryId: 'christmas',        colors: ['#FF1744','#FFFFFF','#4CAF50'],                      speed: 3, animation: 'Chase',       favorite: true  },
  { id: 17, name: 'Snowfall',           categoryId: 'christmas',        colors: ['#E3F2FD','#BBDEFB','#FFFFFF','#90CAF9'],            speed: 3, animation: 'Sparkle',     favorite: false },
  { id: 18, name: 'Candy Cane',         categoryId: 'christmas',        colors: ['#F44336','#FFFFFF','#F44336','#FFFFFF'],            speed: 4, animation: 'Alternating', favorite: false },
  { id: 19, name: 'Winter Wonderland',  categoryId: 'christmas',        colors: ['#FFFFFF','#B3E5FC','#E1F5FE','#FFFFFF'],            speed: 1, animation: 'Fade',        favorite: false },
  { id: 20, name: 'Festive Twinkle',    categoryId: 'christmas',        colors: ['#D32F2F','#2E7D32','#FFD600'],                      speed: 3, animation: 'Twinkle',     favorite: false },
  { id: 21, name: 'Holly Jolly',        categoryId: 'christmas',        colors: ['#E53935','#43A047','#FFD600'],                      speed: 4, animation: 'Bounce',      favorite: false },

  // Cinco de Mayo
  { id: 22, name: 'Fiesta',             categoryId: 'cinco-de-mayo',    colors: ['#C62828','#FFFFFF','#2E7D32'],                      speed: 4, animation: 'Chase',       favorite: false },
  { id: 23, name: 'Mariachi',           categoryId: 'cinco-de-mayo',    colors: ['#D32F2F','#43A047','#F9A825'],                      speed: 3, animation: 'Twinkle',     favorite: false },
  { id: 24, name: 'Mexican Colors',     categoryId: 'cinco-de-mayo',    colors: ['#388E3C','#FFFFFF','#D32F2F'],                      speed: 3, animation: 'Wave',        favorite: false },

  // Day of the Dead
  { id: 25, name: 'Sugar Skull',        categoryId: 'day-of-the-dead',  colors: ['#7B1FA2','#FF6D00','#F06292','#FFFFFF'],            speed: 4, animation: 'Twinkle',     favorite: false },
  { id: 26, name: 'Marigold Night',     categoryId: 'day-of-the-dead',  colors: ['#E65100','#FFD600','#6A1B9A'],                      speed: 2, animation: 'Fade',        favorite: false },
  { id: 27, name: 'Día de Muertos',     categoryId: 'day-of-the-dead',  colors: ['#6A1B9A','#F06292','#FF6D00'],                      speed: 3, animation: 'Wave',        favorite: false },

  // Easter
  { id: 28, name: 'Easter Pastels',     categoryId: 'easter',           colors: ['#F8BBD0','#B2EBF2','#C8E6C9','#FFF9C4'],           speed: 2, animation: 'Fade',        favorite: false },
  { id: 29, name: 'Spring Garden',      categoryId: 'easter',           colors: ['#66BB6A','#F06292','#FFFFFF'],                      speed: 3, animation: 'Chase',       favorite: false },
  { id: 30, name: 'Bunny Hop',          categoryId: 'easter',           colors: ['#F48FB1','#FFFFFF','#FFF9C4'],                      speed: 3, animation: 'Bounce',      favorite: false },
  { id: 31, name: 'Easter Sunrise',     categoryId: 'easter',           colors: ['#FFAB91','#FFD54F','#FFF9C4'],                      speed: 2, animation: 'Gradient',    favorite: false },

  // Fathers Day
  { id: 32, name: 'Cool Blue',          categoryId: 'fathers-day',      colors: ['#0D47A1','#1E88E5','#FFFFFF'],                      speed: 0, animation: 'Static',      favorite: false },
  { id: 33, name: 'Sport Day',          categoryId: 'fathers-day',      colors: ['#1565C0','#78909C','#FFFFFF'],                      speed: 3, animation: 'Chase',       favorite: false },
  { id: 34, name: 'BBQ Glow',           categoryId: 'fathers-day',      colors: ['#FF6F00','#FF8F00','#FFCA28'],                      speed: 2, animation: 'Fade',        favorite: false },

  // Halloween
  { id: 35, name: 'Halloween',          categoryId: 'halloween',        colors: ['#FF6D00','#AA00FF','#FFD600'],                      speed: 4, animation: 'Twinkle',     favorite: true  },
  { id: 36, name: "Witch's Brew",       categoryId: 'halloween',        colors: ['#00C853','#6A1B9A','#1B5E20'],                      speed: 3, animation: 'Wave',        favorite: false },
  { id: 37, name: 'Ghostly',            categoryId: 'halloween',        colors: ['#F5F5F5','#9E9E9E','#FFFFFF'],                      speed: 2, animation: 'Pulse',       favorite: false },
  { id: 38, name: 'Pumpkin Patch',      categoryId: 'halloween',        colors: ['#E65100','#FF6D00','#FFB300'],                      speed: 3, animation: 'Bounce',      favorite: false },
  { id: 39, name: 'Haunted House',      categoryId: 'halloween',        colors: ['#6A1B9A','#E65100','#1B5E20'],                      speed: 5, animation: 'Chase',       favorite: false },

  // Hanukkah
  { id: 40, name: 'Menorah',            categoryId: 'hanukkah',         colors: ['#1565C0','#FFFFFF','#F9A825'],                      speed: 3, animation: 'Chase',       favorite: false },
  { id: 41, name: 'Blue & White',       categoryId: 'hanukkah',         colors: ['#1E88E5','#90CAF9','#FFFFFF'],                      speed: 0, animation: 'Static',      favorite: false },
  { id: 42, name: 'Festival of Lights', categoryId: 'hanukkah',         colors: ['#1565C0','#F9A825','#FFFFFF'],                      speed: 3, animation: 'Twinkle',     favorite: false },

  // Mothers Day
  { id: 43, name: 'Pink Bliss',         categoryId: 'mothers-day',      colors: ['#F48FB1','#CE93D8','#FFFFFF'],                      speed: 2, animation: 'Fade',        favorite: false },
  { id: 44, name: 'Garden Rose',        categoryId: 'mothers-day',      colors: ['#E91E63','#F06292','#FFFFFF'],                      speed: 3, animation: 'Chase',       favorite: false },
  { id: 45, name: 'Spring Blossom',     categoryId: 'mothers-day',      colors: ['#F48FB1','#FFAB91','#FFFFFF'],                      speed: 2, animation: 'Twinkle',     favorite: false },

  // New Years
  { id: 46, name: 'Countdown',          categoryId: 'new-years',        colors: ['#B71C1C','#F9A825','#FFFFFF'],                      speed: 5, animation: 'Chase',       favorite: false },
  { id: 47, name: 'Fireworks',          categoryId: 'new-years',        colors: ['#F44336','#FF9800','#FFEB3B','#4CAF50','#2196F3','#9C27B0'], speed: 6, animation: 'Sparkle', favorite: false },
  { id: 48, name: 'Midnight',           categoryId: 'new-years',        colors: ['#1A237E','#7B1FA2','#F9A825'],                      speed: 3, animation: 'Wave',        favorite: false },
  { id: 49, name: 'New Year Sparkle',   categoryId: 'new-years',        colors: ['#F9A825','#FFFFFF','#B0BEC5'],                      speed: 4, animation: 'Twinkle',     favorite: false },

  // Quinceañera
  { id: 50, name: 'Quinceañera Dream',  categoryId: 'quinceanera',      colors: ['#F06292','#F9A825','#CE93D8'],                      speed: 3, animation: 'Wave',        favorite: false },
  { id: 51, name: 'Lavender Rose',      categoryId: 'quinceanera',      colors: ['#CE93D8','#F48FB1','#FFFFFF'],                      speed: 2, animation: 'Fade',        favorite: false },

  // Sports Week
  { id: 52, name: 'Game Day',           categoryId: 'sports-week',      colors: ['#FF6F00','#311B92'],                                speed: 4, animation: 'Bounce',      favorite: false },
  { id: 53, name: 'Home Team',          categoryId: 'sports-week',      colors: ['#4AAC00','#FFD600'],                                speed: 3, animation: 'Chase',       favorite: false },
  { id: 54, name: 'Touchdown',          categoryId: 'sports-week',      colors: ['#1A237E','#FF6D00'],                                speed: 4, animation: 'Wave',        favorite: false },
  { id: 55, name: 'Championship',       categoryId: 'sports-week',      colors: ['#F9A825','#FFFFFF','#F9A825'],                      speed: 4, animation: 'Twinkle',     favorite: false },
];
