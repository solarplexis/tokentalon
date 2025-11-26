/**
 * Cabinet configurations for the claw machine
 */

export interface Cabinet {
  id: string;
  name: string;
  image: string;
  description: string;
  theme?: string;
}

export const CABINETS: Cabinet[] = [
  {
    id: 'blue',
    name: 'Blue Arcade',
    image: '/assets/images/cabinet/cabinet_blue.jpg',
    description: 'The original claw machine experience',
    theme: 'blue'
  },
  {
    id: 'green',
    name: 'Green Arcade',
    image: '/assets/images/cabinet/cabinet_green.jpg',
    description: 'The original claw machine experience',
    theme: 'green'
  },
  //oilers
  {
    id: 'oilers',
    name: 'Oilers Arcade',
    image: '/assets/images/cabinet/cabinet_oilers.jpg',
    description: 'Edmonton Oilers themed claw machine',
    theme: 'oilers'
  },
  // orange
  {
    id: 'orange',
    name: 'Orange Arcade',
    image: '/assets/images/cabinet/cabinet_orange.jpg',
    description: 'The original claw machine experience',
    theme: 'orange'
  },
  // purple
  {
    id: 'purple',
    name: 'Purple Arcade',
    image: '/assets/images/cabinet/cabinet_purple.jpg',
    description: 'The original claw machine experience',
    theme: 'purple'
  },
  // red
  {
    id: 'red',
    name: 'Red Arcade',
    image: '/assets/images/cabinet/cabinet_red.jpg',
    description: 'The original claw machine experience',
    theme: 'red'
  },
  // tron
  {
    id: 'tron',
    name: 'Tron Arcade',
    image: '/assets/images/cabinet/cabinet_tron.jpg',
    description: 'The original claw machine experience',
    theme: 'tron'
  },
  // reto
  {
    id: 'retro',
    name: 'Retro Arcade',
    image: '/assets/images/cabinet/cabinet_retro.jpg',
    description: 'The original claw machine experience',
    theme: 'retro'
  } 
];

/**
 * Get a random cabinet from the available cabinets
 */
export function getRandomCabinet(): Cabinet {
  const randomIndex = Math.floor(Math.random() * CABINETS.length);
  return CABINETS[randomIndex];
}

/**
 * Get cabinet by ID
 */
export function getCabinetById(id: string): Cabinet | undefined {
  return CABINETS.find(cabinet => cabinet.id === id);
}
