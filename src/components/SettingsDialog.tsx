import { SpeakerHighIcon, SpeakerLowIcon, SpeakerSlashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { audio } from '../lib/audio';
import { REGIONS } from '../lib/region';
import { DIFFICULTIES } from '../lib/scoring';
import { resetAllProgress, settingsStore, type Theme } from '../lib/state';
import { useStore } from '../lib/store';
import type { Difficulty } from '../lib/types';
import { Dialog } from './Dialog';
import { Segmented } from './Segmented';

const ROUND_OPTIONS = [5, 10, 15, 20];

export function SettingsDialog({ open, onClose }: { open: boolean; onClose(): void }) {
    const settings = useStore(settingsStore);
    const [confirmReset, setConfirmReset] = useState(false);

    const setVolume = (v: number) => {
        settingsStore.set({ volume: v });
        audio.setVolume(v);
    };
    const VolumeIcon = settings.volume === 0 ? SpeakerSlashIcon : settings.volume < 0.5 ? SpeakerLowIcon : SpeakerHighIcon;

    return (
        <Dialog
            open={open}
            title="Settings"
            onClose={() => {
                setConfirmReset(false);
                onClose();
            }}
        >
            <div className="settings">
                <div className="field">
                    <span className="field-label" id="set-diff">
                        Difficulty
                    </span>
                    <Segmented<Difficulty>
                        labelledBy="set-diff"
                        value={settings.difficulty}
                        options={Object.values(DIFFICULTIES).map((d) => ({ value: d.id, label: d.label }))}
                        onChange={(difficulty) => settingsStore.set({ difficulty })}
                    />
                    <span className="field-hint">{DIFFICULTIES[settings.difficulty].description} The Daily is always Normal.</span>
                </div>

                <div className="field">
                    <span className="field-label" id="set-rounds">
                        Songs per game
                    </span>
                    <Segmented<number>
                        labelledBy="set-rounds"
                        value={settings.rounds}
                        options={ROUND_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
                        onChange={(rounds) => settingsStore.set({ rounds })}
                    />
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="set-region">
                        Search region
                    </label>
                    <select
                        id="set-region"
                        className="input"
                        value={settings.region}
                        onChange={(e) => settingsStore.set({ region: e.target.value })}
                    >
                        {REGIONS.map((r) => (
                            <option key={r.code} value={r.code}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                    <span className="field-hint">Song search and Artist mode use this music store.</span>
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="set-volume">
                        Volume
                    </label>
                    <div className="volume-row">
                        <button
                            type="button"
                            className="icon-btn"
                            aria-label={settings.volume === 0 ? 'Unmute' : 'Mute'}
                            onClick={() => setVolume(settings.volume === 0 ? 0.8 : 0)}
                        >
                            <VolumeIcon size={20} />
                        </button>
                        <input
                            id="set-volume"
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={settings.volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="field">
                    <span className="field-label" id="set-theme">
                        Theme
                    </span>
                    <Segmented<Theme>
                        labelledBy="set-theme"
                        value={settings.theme}
                        options={[
                            { value: 'system', label: 'System' },
                            { value: 'dark', label: 'Dark' },
                            { value: 'light', label: 'Light' },
                        ]}
                        onChange={(theme) => settingsStore.set({ theme })}
                    />
                </div>

                <div className="settings-danger">
                    {confirmReset ? (
                        <>
                            <p>Erase your streak, stats and best scores? This can&rsquo;t be undone.</p>
                            <div className="settings-danger-actions">
                                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(false)}>
                                    Keep them
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--sm btn--danger"
                                    onClick={() => {
                                        resetAllProgress();
                                        setConfirmReset(false);
                                    }}
                                >
                                    Erase everything
                                </button>
                            </div>
                        </>
                    ) : (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(true)}>
                            Reset stats
                        </button>
                    )}
                </div>
            </div>
        </Dialog>
    );
}
