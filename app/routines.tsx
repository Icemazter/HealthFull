import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { EXERCISES } from '@/constants/exercises';

interface Routine {
  id: string;
  name: string;
  exercises: string[];
  createdAt: number;
  lastUsed?: number;
}

export default function RoutinesScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    try {
      const stored = await AsyncStorage.getItem('workout_routines');
      if (stored) {
        setRoutines(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load routines:', error);
    }
  };

  const saveRoutine = async () => {
    if (!newRoutineName.trim()) {
      Alert.alert('Name Required', 'Please enter a routine name.');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('No Exercises', 'Please add at least one exercise.');
      return;
    }

    const routine: Routine = {
      id: Date.now().toString(),
      name: newRoutineName,
      exercises: selectedExercises,
      createdAt: Date.now(),
    };

    try {
      const newRoutines = [...routines, routine];
      await AsyncStorage.setItem('workout_routines', JSON.stringify(newRoutines));
      setRoutines(newRoutines);
      setShowCreateModal(false);
      setNewRoutineName('');
      setSelectedExercises([]);
      Alert.alert('Success', 'Routine created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save routine.');
    }
  };

  const deleteRoutine = async (id: string) => {
    Alert.alert('Delete Routine', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const newRoutines = routines.filter(r => r.id !== id);
            await AsyncStorage.setItem('workout_routines', JSON.stringify(newRoutines));
            setRoutines(newRoutines);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete routine.');
          }
        },
      },
    ]);
  };

  const toggleExercise = (exerciseId: string) => {
    if (selectedExercises.includes(exerciseId)) {
      setSelectedExercises(selectedExercises.filter(id => id !== exerciseId));
    } else {
      setSelectedExercises([...selectedExercises, exerciseId]);
    }
  };

  const filteredExercises = EXERCISES.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Routines</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {routines.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No routines yet</Text>
            <Text style={styles.emptySubtext}>Create a routine to quick-start workouts</Text>
          </View>
        ) : (
          routines.map((routine) => (
            <View key={routine.id} style={styles.routineCard}>
              <View>
                <Text style={styles.routineName}>{routine.name}</Text>
                <Text style={styles.routineInfo}>
                  {routine.exercises.length} exercises
                </Text>
                <View style={styles.exercisePreview}>
                  {routine.exercises.slice(0, 3).map(exId => {
                    const ex = EXERCISES.find(e => e.id === exId);
                    return ex ? (
                      <Text key={exId} style={styles.exercisePreviewText}>
                        • {ex.name}
                      </Text>
                    ) : null;
                  })}
                  {routine.exercises.length > 3 && (
                    <Text style={styles.exercisePreviewText}>
                      +{routine.exercises.length - 3} more
                    </Text>
                  )}
                </View>
              </View>
              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteRoutine(routine.id)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}>
        <Text style={styles.createButtonText}>+ Create Routine</Text>
      </Pressable>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowCreateModal(false);
        }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Routine</Text>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.nameInput}
              value={newRoutineName}
              onChangeText={setNewRoutineName}
              placeholder="Routine name (e.g., Push Day)"
              placeholderTextColor="#999"
            />

            <Text style={styles.sectionTitle}>
              Selected: {selectedExercises.length} exercises
            </Text>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor="#999"
            />

            <ScrollView style={styles.exerciseList}>
              {filteredExercises.map((ex) => {
                const isSelected = selectedExercises.includes(ex.id);
                return (
                  <Pressable
                    key={ex.id}
                    style={[
                      styles.exerciseOption,
                      isSelected && styles.exerciseOptionSelected,
                    ]}
                    onPress={() => toggleExercise(ex.id)}>
                    <Text style={styles.exerciseOptionName}>{ex.name}</Text>
                    {isSelected && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={styles.saveButton} onPress={saveRoutine}>
              <Text style={styles.saveButtonText}>Save Routine</Text>
            </Pressable>
          </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  routineCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  routineInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  exercisePreview: {
    gap: 2,
  },
  exercisePreviewText: {
    fontSize: 13,
    color: '#888',
  },
  deleteButton: {
    backgroundColor: '#fee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#c33',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  nameInput: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  exerciseList: {
    flex: 1,
    marginBottom: 16,
  },
  exerciseOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseOptionSelected: {
    backgroundColor: '#f0f9ff',
  },
  exerciseOptionName: {
    fontSize: 16,
    color: '#333',
  },
  checkmark: {
    fontSize: 18,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
