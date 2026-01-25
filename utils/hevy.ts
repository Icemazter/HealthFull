// Hevy API Service for workout data integration

const HEVY_API_BASE = 'https://api.hevyapp.com/v1';

export interface HevySet {
  reps: number;
  weight: number;
  weightUnit: string;
  rpe?: number;
  rir?: number;
}

export interface HevyExerciseData {
  id: string;
  name: string;
  notes?: string;
  sets: HevySet[];
  muscleGroup?: string;
}

export interface HevyWorkout {
  id: string;
  startTime: string;
  endTime?: string;
  exercises: HevyExerciseData[];
  notes?: string;
}

interface HevyError {
  statusCode: number;
  message: string;
}

class HevyService {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Hevy API key not set. Get your key at https://hevy.com/settings?developer');
    }

    const response = await fetch(`${HEVY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: HevyError = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      }));
      throw new Error(`Hevy API Error: ${error.message}`);
    }

    return response.json();
  }

  async getWorkouts(limit: number = 100): Promise<HevyWorkout[]> {
    const response = await this.request<{ workouts: HevyWorkout[] }>(
      `/workouts?limit=${limit}`
    );
    return response.workouts || [];
  }

  async getWorkoutsSince(timestamp: number): Promise<HevyWorkout[]> {
    // Convert timestamp to ISO string
    const date = new Date(timestamp).toISOString();
    const response = await this.request<{ workouts: HevyWorkout[] }>(
      `/workouts?startDate=${date}`
    );
    return response.workouts || [];
  }

  async getExerciseHistory(exerciseName: string): Promise<any> {
    const response = await this.request<any>(
      `/exercises?name=${encodeURIComponent(exerciseName)}`
    );
    return response;
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const originalKey = this.apiKey;
      this.apiKey = key;
      
      // Test with a simple request
      await this.request('/workouts?limit=1');
      return true;
    } catch (error) {
      this.apiKey = originalKey;
      return false;
    }
  }
}

export const hevyService = new HevyService();
