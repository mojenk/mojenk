import { useState, useCallback } from 'react';
import {
  isSoundEnabled,
  getSoundVolume,
  toggleSound as _toggleSound,
  setVolume as _setVolume,
} from '../utils/sounds';

export function useSound() {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [vol, setVol] = useState(getSoundVolume());

  const toggleSound = useCallback((val) => {
    const result = _toggleSound(val);
    setSoundOn(result);
    return result;
  }, []);

  const setVolume = useCallback((v) => {
    _setVolume(v);
    setVol(v);
  }, []);

  return { soundOn, volume: vol, toggleSound, setVolume };
}
