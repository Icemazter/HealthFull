export interface WorkoutSet {
  weight: number;
  reps: number;
  completed: boolean;
  timestamp?: number;
}

export interface ExerciseSession {
  exerciseId: string;
  sets: WorkoutSet[];
  note?: string;
}

export interface PersonalRecords {
  oneRepMax: number;
  maxWeight: number;
  maxVolume: number;
  lastUpdated: number;
}

// Calculate 1RM using Epley formula: weight × (1 + reps/30)
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Calculate volume for a single set
export function calculateSetVolume(weight: number, reps: number): number {
  return weight * reps;
}

// Get PRs for an exercise from workout history
export function calculatePRs(
  exerciseId: string,
  workoutHistory: any[]
): PersonalRecords {
  let oneRepMax = 0;
  let maxWeight = 0;
  let maxVolume = 0;
  let lastUpdated = 0;

  workoutHistory.forEach((workout) => {
    workout.exercises?.forEach((exercise: any) => {
      if (exercise.exerciseId === exerciseId) {
        exercise.sets?.forEach((set: WorkoutSet) => {
          if (set.completed && set.weight > 0 && set.reps > 0) {
            // Check 1RM
            const estimated1RM = calculate1RM(set.weight, set.reps);
            if (estimated1RM > oneRepMax) {
              oneRepMax = estimated1RM;
              lastUpdated = workout.timestamp || Date.now();
            }

            // Check max weight
            if (set.weight > maxWeight) {
              maxWeight = set.weight;
            }

            // Check max volume
            const volume = calculateSetVolume(set.weight, set.reps);
            if (volume > maxVolume) {
              maxVolume = volume;
            }
          }
        });
      }
    });
  });

  return { oneRepMax, maxWeight, maxVolume, lastUpdated };
}

// Check if a set achieves a new PR
export function checkForNewPR(
  weight: number,
  reps: number,
  currentPRs: PersonalRecords
): {
  isNew1RM: boolean;
  isNewMaxWeight: boolean;
  isNewMaxVolume: boolean;
  new1RM?: number;
  newMaxWeight?: number;
  newMaxVolume?: number;
} {
  const estimated1RM = calculate1RM(weight, reps);
  const volume = calculateSetVolume(weight, reps);

  return {
    isNew1RM: estimated1RM > currentPRs.oneRepMax,
    isNewMaxWeight: weight > currentPRs.maxWeight,
    isNewMaxVolume: volume > currentPRs.maxVolume,
    new1RM: estimated1RM > currentPRs.oneRepMax ? estimated1RM : undefined,
    newMaxWeight: weight > currentPRs.maxWeight ? weight : undefined,
    newMaxVolume: volume > currentPRs.maxVolume ? volume : undefined,
  };
}

// Get last workout data for an exercise
export function getLastWorkout(
  exerciseId: string,
  workoutHistory: any[]
): WorkoutSet[] | null {
  for (let i = workoutHistory.length - 1; i >= 0; i--) {
    const workout = workoutHistory[i];
    const exercise = workout.exercises?.find(
      (e: any) => e.exerciseId === exerciseId
    );
    if (exercise && exercise.sets && exercise.sets.length > 0) {
      return exercise.sets.filter((s: WorkoutSet) => s.completed);
    }
  }
  return null;
}
