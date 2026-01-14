export type MuscleGroup = 
  | 'Chest' 
  | 'Back' 
  | 'Legs' 
  | 'Shoulders' 
  | 'Arms' 
  | 'Core' 
  | 'Glutes'
  | 'Cardio';

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary?: MuscleGroup[];
}

export const EXERCISES: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', primary: 'Chest', secondary: ['Arms', 'Shoulders'] },
  { id: 'incline-bench', name: 'Incline Bench Press', primary: 'Chest', secondary: ['Shoulders', 'Arms'] },
  { id: 'decline-bench', name: 'Decline Bench Press', primary: 'Chest', secondary: ['Arms'] },
  { id: 'dumbbell-press', name: 'Dumbbell Press', primary: 'Chest', secondary: ['Shoulders', 'Arms'] },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', primary: 'Chest', secondary: ['Shoulders', 'Arms'] },
  { id: 'chest-fly', name: 'Chest Fly', primary: 'Chest' },
  { id: 'incline-fly', name: 'Incline Fly', primary: 'Chest' },
  { id: 'cable-crossover', name: 'Cable Crossover', primary: 'Chest' },
  { id: 'low-cable-crossover', name: 'Low Cable Crossover', primary: 'Chest' },
  { id: 'pec-deck', name: 'Pec Deck Machine', primary: 'Chest' },
  { id: 'push-up', name: 'Push Up', primary: 'Chest', secondary: ['Arms', 'Core'] },
  { id: 'diamond-push-up', name: 'Diamond Push Up', primary: 'Chest', secondary: ['Arms'] },
  { id: 'wide-push-up', name: 'Wide Push Up', primary: 'Chest' },
  { id: 'dips-chest', name: 'Dips (Chest Focus)', primary: 'Chest', secondary: ['Arms'] },
  
  // Back
  { id: 'deadlift', name: 'Deadlift', primary: 'Back', secondary: ['Legs', 'Core'] },
  { id: 'sumo-deadlift', name: 'Sumo Deadlift', primary: 'Back', secondary: ['Legs', 'Glutes'] },
  { id: 'trap-bar-deadlift', name: 'Trap Bar Deadlift', primary: 'Back', secondary: ['Legs'] },
  { id: 'barbell-row', name: 'Barbell Row', primary: 'Back', secondary: ['Arms'] },
  { id: 'pendlay-row', name: 'Pendlay Row', primary: 'Back', secondary: ['Arms'] },
  { id: 'dumbbell-row', name: 'Dumbbell Row', primary: 'Back', secondary: ['Arms'] },
  { id: 'chest-supported-row', name: 'Chest Supported Row', primary: 'Back', secondary: ['Arms'] },
  { id: 'pull-up', name: 'Pull Up', primary: 'Back', secondary: ['Arms'] },
  { id: 'chin-up', name: 'Chin Up', primary: 'Back', secondary: ['Arms'] },
  { id: 'wide-grip-pull-up', name: 'Wide Grip Pull Up', primary: 'Back', secondary: ['Arms'] },
  { id: 'lat-pulldown', name: 'Lat Pulldown', primary: 'Back', secondary: ['Arms'] },
  { id: 'wide-lat-pulldown', name: 'Wide Lat Pulldown', primary: 'Back', secondary: ['Arms'] },
  { id: 'close-grip-pulldown', name: 'Close Grip Pulldown', primary: 'Back', secondary: ['Arms'] },
  { id: 't-bar-row', name: 'T-Bar Row', primary: 'Back' },
  { id: 'cable-row', name: 'Cable Row', primary: 'Back', secondary: ['Arms'] },
  { id: 'single-arm-cable-row', name: 'Single Arm Cable Row', primary: 'Back', secondary: ['Arms'] },
  { id: 'machine-row', name: 'Machine Row', primary: 'Back', secondary: ['Arms'] },
  { id: 'inverted-row', name: 'Inverted Row', primary: 'Back', secondary: ['Arms'] },
  { id: 'shrug', name: 'Shrug', primary: 'Back' },
  { id: 'dumbbell-shrug', name: 'Dumbbell Shrug', primary: 'Back' },
  { id: 'rack-pull', name: 'Rack Pull', primary: 'Back', secondary: ['Legs'] },
  
  // Legs
  { id: 'squat', name: 'Squat', primary: 'Legs', secondary: ['Glutes', 'Core'] },
  { id: 'front-squat', name: 'Front Squat', primary: 'Legs', secondary: ['Core'] },
  { id: 'goblet-squat', name: 'Goblet Squat', primary: 'Legs', secondary: ['Core'] },
  { id: 'box-squat', name: 'Box Squat', primary: 'Legs', secondary: ['Glutes'] },
  { id: 'hack-squat', name: 'Hack Squat', primary: 'Legs', secondary: ['Glutes'] },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', primary: 'Legs', secondary: ['Glutes'] },
  { id: 'leg-press', name: 'Leg Press', primary: 'Legs', secondary: ['Glutes'] },
  { id: 'leg-extension', name: 'Leg Extension', primary: 'Legs' },
  { id: 'leg-curl', name: 'Leg Curl', primary: 'Legs' },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', primary: 'Legs' },
  { id: 'lying-leg-curl', name: 'Lying Leg Curl', primary: 'Legs' },
  { id: 'lunge', name: 'Lunge', primary: 'Legs', secondary: ['Glutes'] },
  { id: 'walking-lunge', name: 'Walking Lunge', primary: 'Legs', secondary: ['Glutes'] },
  { id: 'reverse-lunge', name: 'Reverse Lunge', primary: 'Legs', secondary: ['Glutes'] },
  { id: 'step-up', name: 'Step Up', primary: 'Legs', secondary: ['Glutes'] },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', primary: 'Legs', secondary: ['Back', 'Glutes'] },
  { id: 'stiff-leg-deadlift', name: 'Stiff Leg Deadlift', primary: 'Legs', secondary: ['Back', 'Glutes'] },
  { id: 'single-leg-rdl', name: 'Single Leg RDL', primary: 'Legs', secondary: ['Glutes'] },
  { id: 'calf-raise', name: 'Calf Raise', primary: 'Legs' },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', primary: 'Legs' },
  { id: 'donkey-calf-raise', name: 'Donkey Calf Raise', primary: 'Legs' },
  { id: 'sissy-squat', name: 'Sissy Squat', primary: 'Legs' },
  
  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', primary: 'Shoulders', secondary: ['Arms'] },
  { id: 'seated-overhead-press', name: 'Seated Overhead Press', primary: 'Shoulders', secondary: ['Arms'] },
  { id: 'push-press', name: 'Push Press', primary: 'Shoulders', secondary: ['Arms', 'Legs'] },
  { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', primary: 'Shoulders', secondary: ['Arms'] },
  { id: 'seated-dumbbell-press', name: 'Seated Dumbbell Press', primary: 'Shoulders', secondary: ['Arms'] },
  { id: 'lateral-raise', name: 'Lateral Raise', primary: 'Shoulders' },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', primary: 'Shoulders' },
  { id: 'front-raise', name: 'Front Raise', primary: 'Shoulders' },
  { id: 'plate-front-raise', name: 'Plate Front Raise', primary: 'Shoulders' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', primary: 'Shoulders' },
  { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', primary: 'Shoulders' },
  { id: 'arnold-press', name: 'Arnold Press', primary: 'Shoulders', secondary: ['Arms'] },
  { id: 'face-pull', name: 'Face Pull', primary: 'Shoulders', secondary: ['Back'] },
  { id: 'upright-row', name: 'Upright Row', primary: 'Shoulders', secondary: ['Back'] },
  { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', primary: 'Shoulders', secondary: ['Arms'] },
  { id: 'landmine-press', name: 'Landmine Press', primary: 'Shoulders', secondary: ['Core'] },
  
  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', primary: 'Arms' },
  { id: 'ez-bar-curl', name: 'EZ Bar Curl', primary: 'Arms' },
  { id: 'dumbbell-curl', name: 'Dumbbell Curl', primary: 'Arms' },
  { id: 'alternating-dumbbell-curl', name: 'Alternating Dumbbell Curl', primary: 'Arms' },
  { id: 'hammer-curl', name: 'Hammer Curl', primary: 'Arms' },
  { id: 'cross-body-hammer-curl', name: 'Cross Body Hammer Curl', primary: 'Arms' },
  { id: 'preacher-curl', name: 'Preacher Curl', primary: 'Arms' },
  { id: 'concentration-curl', name: 'Concentration Curl', primary: 'Arms' },
  { id: 'cable-curl', name: 'Cable Curl', primary: 'Arms' },
  { id: 'spider-curl', name: 'Spider Curl', primary: 'Arms' },
  { id: 'incline-dumbbell-curl', name: 'Incline Dumbbell Curl', primary: 'Arms' },
  { id: 'tricep-extension', name: 'Tricep Extension', primary: 'Arms' },
  { id: 'overhead-tricep-extension', name: 'Overhead Tricep Extension', primary: 'Arms' },
  { id: 'tricep-dip', name: 'Tricep Dip', primary: 'Arms', secondary: ['Chest'] },
  { id: 'bench-dip', name: 'Bench Dip', primary: 'Arms' },
  { id: 'skull-crusher', name: 'Skull Crusher', primary: 'Arms' },
  { id: 'close-grip-bench', name: 'Close Grip Bench Press', primary: 'Arms', secondary: ['Chest'] },
  { id: 'cable-pushdown', name: 'Cable Pushdown', primary: 'Arms' },
  { id: 'rope-pushdown', name: 'Rope Pushdown', primary: 'Arms' },
  { id: 'reverse-grip-pushdown', name: 'Reverse Grip Pushdown', primary: 'Arms' },
  { id: 'kickback', name: 'Tricep Kickback', primary: 'Arms' },
  { id: 'diamond-push-up-tricep', name: 'Diamond Push Up (Tricep)', primary: 'Arms' },
  
  // Core
  { id: 'plank', name: 'Plank', primary: 'Core' },
  { id: 'side-plank', name: 'Side Plank', primary: 'Core' },
  { id: 'crunch', name: 'Crunch', primary: 'Core' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', primary: 'Core' },
  { id: 'reverse-crunch', name: 'Reverse Crunch', primary: 'Core' },
  { id: 'russian-twist', name: 'Russian Twist', primary: 'Core' },
  { id: 'leg-raise', name: 'Leg Raise', primary: 'Core' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', primary: 'Core' },
  { id: 'knee-raise', name: 'Knee Raise', primary: 'Core' },
  { id: 'ab-wheel', name: 'Ab Wheel', primary: 'Core' },
  { id: 'cable-crunch', name: 'Cable Crunch', primary: 'Core' },
  { id: 'mountain-climber', name: 'Mountain Climber', primary: 'Core', secondary: ['Cardio'] },
  { id: 'dead-bug', name: 'Dead Bug', primary: 'Core' },
  { id: 'hollow-hold', name: 'Hollow Hold', primary: 'Core' },
  { id: 'v-up', name: 'V-Up', primary: 'Core' },
  { id: 'woodchopper', name: 'Woodchopper', primary: 'Core' },
  { id: 'pallof-press', name: 'Pallof Press', primary: 'Core' },
  
  // Glutes
  { id: 'hip-thrust', name: 'Hip Thrust', primary: 'Glutes', secondary: ['Legs'] },
  { id: 'barbell-hip-thrust', name: 'Barbell Hip Thrust', primary: 'Glutes', secondary: ['Legs'] },
  { id: 'glute-bridge', name: 'Glute Bridge', primary: 'Glutes' },
  { id: 'single-leg-glute-bridge', name: 'Single Leg Glute Bridge', primary: 'Glutes' },
  { id: 'cable-kickback', name: 'Cable Kickback', primary: 'Glutes' },
  { id: 'donkey-kick', name: 'Donkey Kick', primary: 'Glutes' },
  { id: 'fire-hydrant', name: 'Fire Hydrant', primary: 'Glutes' },
  { id: 'glute-ham-raise', name: 'Glute Ham Raise', primary: 'Glutes', secondary: ['Legs'] },
  { id: 'sumo-squat', name: 'Sumo Squat', primary: 'Glutes', secondary: ['Legs'] },
  { id: 'abduction-machine', name: 'Hip Abduction Machine', primary: 'Glutes' },
  { id: 'adduction-machine', name: 'Hip Adduction Machine', primary: 'Glutes' },
  
  // Cardio
  { id: 'running', name: 'Running', primary: 'Cardio' },
  { id: 'treadmill', name: 'Treadmill', primary: 'Cardio' },
  { id: 'cycling', name: 'Cycling', primary: 'Cardio' },
  { id: 'stationary-bike', name: 'Stationary Bike', primary: 'Cardio' },
  { id: 'rowing-machine', name: 'Rowing Machine', primary: 'Cardio', secondary: ['Back'] },
  { id: 'elliptical', name: 'Elliptical', primary: 'Cardio' },
  { id: 'stairmaster', name: 'Stairmaster', primary: 'Cardio', secondary: ['Legs'] },
  { id: 'jump-rope', name: 'Jump Rope', primary: 'Cardio' },
  { id: 'battle-ropes', name: 'Battle Ropes', primary: 'Cardio', secondary: ['Arms'] },
  { id: 'burpee', name: 'Burpee', primary: 'Cardio', secondary: ['Core'] },
  { id: 'box-jump', name: 'Box Jump', primary: 'Cardio', secondary: ['Legs'] },
  { id: 'high-knees', name: 'High Knees', primary: 'Cardio' },
  { id: 'jumping-jack', name: 'Jumping Jack', primary: 'Cardio' },
];

export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  Chest: '#ef4444',
  Back: '#3b82f6',
  Legs: '#10b981',
  Shoulders: '#f59e0b',
  Arms: '#8b5cf6',
  Core: '#ec4899',
  Glutes: '#14b8a6',
  Cardio: '#6366f1',
};
