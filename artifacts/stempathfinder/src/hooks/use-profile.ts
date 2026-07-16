import { useState, useEffect, useCallback } from 'react';
import type { StudentProfile } from '@workspace/api-client-react';

const PROFILE_KEY = 'stempath_student_profile';

export function useStudentProfile() {
  const [profile, setProfileState] = useState<StudentProfile | null>(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) {
        return JSON.parse(stored) as StudentProfile;
      }
    } catch (e) {
      console.error("Failed to parse stored profile", e);
    }
    return null;
  });

  const setProfile = useCallback((newProfile: StudentProfile | null) => {
    setProfileState(newProfile);
    if (newProfile) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    } else {
      localStorage.removeItem(PROFILE_KEY);
    }
  }, []);

  return { profile, setProfile };
}
