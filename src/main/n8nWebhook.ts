import {autorun, reaction} from 'mobx';
import {DeviceID} from 'prolink-connect/lib/types';

import {AppStore, DeviceStore} from 'src/shared/store';
import trackToObject from 'src/utils/trackToObject';

const sendTrackWebhook = async (url: string, deviceStore: DeviceStore) => {
  const {track, device, state} = deviceStore;

  if (!track) {
    return;
  }

  const payload = {
    loadedAt: new Date().toISOString(),
    device: {
      id: device.id,
      name: device.name,
      type: device.type,
    },
    source: state
      ? {
          slot: state.trackSlot,
          type: state.trackType,
          deviceId: state.trackDeviceId,
        }
      : undefined,
    track: {
      id: track.id,
      ...trackToObject(track),
    },
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('Failed to dispatch n8n webhook', error);
  }
};

const watchTrackLoads = (store: AppStore, url: string) => {
  const lastTrackIds = new Map<DeviceID, number>();

  return autorun(() => {
    store.devices.forEach(deviceStore => {
      const currentTrackId = deviceStore.track?.id;
      const previousTrackId = lastTrackIds.get(deviceStore.id);

      if (currentTrackId !== undefined && currentTrackId !== previousTrackId) {
        lastTrackIds.set(deviceStore.id, currentTrackId);
        void sendTrackWebhook(url, deviceStore);
      }

      if (currentTrackId === undefined && previousTrackId !== undefined) {
        lastTrackIds.delete(deviceStore.id);
      }
    });
  });
};

export const setupN8nWebhook = (store: AppStore) => {
  let disposeWatcher: (() => void) | null = null;

  reaction(
    () => ({
      enabled: store.config.n8nWebhook.enabled,
      url: store.config.n8nWebhook.url,
    }),
    ({enabled, url}) => {
      disposeWatcher?.();
      disposeWatcher = null;

      const webhookUrl = url.trim();

      if (!enabled || webhookUrl === '') {
        return;
      }

      disposeWatcher = watchTrackLoads(store, webhookUrl);
    },
    {fireImmediately: true}
  );
};
